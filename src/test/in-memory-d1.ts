import { Column, Param, SQL, StringChunk } from "drizzle-orm"
import type { DrizzleD1Database } from "drizzle-orm/d1"

import * as schema from "@/db/schema"

/** Plain rows are intentional: this fake exercises domain orchestration, not SQL. */
type Row = Record<string, unknown>
type Table = object
type Predicate = SQL | undefined
type Projection = Record<string, Column>
type QueryOptions = {
  where?: Predicate
  orderBy?: SQL[]
  with?: Record<string, true | QueryOptions>
  columns?: Record<string, boolean>
  limit?: number
}
type StoredTable = { rows: Row[] }
type Statement = PromiseLike<unknown> & { execute: () => Promise<unknown> }

const tableDefinitions = {
  users: schema.users,
  sessions: schema.sessions,
  exerciseCategories: schema.exerciseCategories,
  exerciseVariants: schema.exerciseVariants,
  workoutTemplates: schema.workoutTemplates,
  workoutTemplateExercises: schema.workoutTemplateExercises,
  workouts: schema.workouts,
  workoutExercises: schema.workoutExercises,
  workoutSets: schema.workoutSets,
}

type TableName = keyof typeof tableDefinitions
type Tables = {
  [Name in TableName]: { table: (typeof tableDefinitions)[Name]; rows: Row[] }
}

const byTable = new Map<Table, TableName>(
  Object.entries(tableDefinitions).map(([name, table]) => [
    table,
    name as TableName,
  ])
)

function chunks(value: unknown): unknown[] {
  if (value instanceof SQL) return value.queryChunks.flatMap(chunks)
  if (Array.isArray(value)) return value.flatMap(chunks)
  return [value]
}

function text(value: unknown): string {
  return chunks(value)
    .filter((chunk): chunk is StringChunk => chunk instanceof StringChunk)
    .flatMap((chunk) => chunk.value)
    .join("")
    .toLowerCase()
}

function columnKey(column: Column): string {
  const tableName = byTable.get(column.table)
  if (!tableName)
    throw new Error("The in-memory D1 fake received an unknown table.")
  const key = Object.entries(tableDefinitions[tableName]).find(
    ([, value]) => value === column
  )?.[0]
  if (!key) throw new Error(`Unknown column: ${column.name}`)
  return key
}

function compare(left: unknown, right: unknown): number {
  if (left === right) return 0
  if (left === null || left === undefined) return -1
  if (right === null || right === undefined) return 1
  return left < right ? -1 : 1
}

function leafPredicates(value: SQL): SQL[] {
  const nested = value.queryChunks.flatMap((chunk) =>
    chunk instanceof SQL
      ? leafPredicates(chunk)
      : Array.isArray(chunk)
        ? chunk.flatMap((item) =>
            item instanceof SQL ? leafPredicates(item) : []
          )
        : []
  )
  return nested.length ? nested : [value]
}

function matches(row: Row, predicate: Predicate): boolean {
  if (!predicate) return true
  const expression = text(predicate)
  const leaves = leafPredicates(predicate)
  if (leaves.length > 1 && expression.includes(" and "))
    return leaves.every((part) => matches(row, part))

  const all = chunks(predicate)
  const column = all.find((chunk): chunk is Column => chunk instanceof Column)
  if (!column) {
    if (expression.includes("false")) return false
    throw new Error(`Unsupported in-memory predicate: ${expression}`)
  }
  const value = row[columnKey(column)]
  const params = all
    .filter((chunk): chunk is Param => chunk instanceof Param)
    .map((param) => param.value)
  if (expression.includes(" is null")) return value === null
  if (expression.includes(" in ")) return params.includes(value)
  if (expression.includes(">=")) return compare(value, params[0]) >= 0
  if (expression.includes("<=")) return compare(value, params[0]) <= 0
  if (expression.includes(" = ")) return value === params[0]
  throw new Error(`Unsupported in-memory predicate: ${expression}`)
}

function project(row: Row, columns?: Record<string, boolean>): Row {
  if (!columns) return { ...row }
  return Object.fromEntries(
    Object.entries(row).filter(([key]) => columns[key] === true)
  )
}

const relations: Partial<
  Record<
    TableName,
    Record<string, { target: TableName; local: string; foreign: string }>
  >
> = {
  exerciseCategories: {
    variants: {
      target: "exerciseVariants",
      local: "id",
      foreign: "categoryId",
    },
  },
  exerciseVariants: {
    category: {
      target: "exerciseCategories",
      local: "categoryId",
      foreign: "id",
    },
  },
  workoutTemplates: {
    exercises: {
      target: "workoutTemplateExercises",
      local: "id",
      foreign: "templateId",
    },
  },
  workoutTemplateExercises: {
    variant: { target: "exerciseVariants", local: "variantId", foreign: "id" },
  },
  workouts: {
    exercises: {
      target: "workoutExercises",
      local: "id",
      foreign: "workoutId",
    },
  },
  workoutExercises: {
    sets: {
      target: "workoutSets",
      local: "id",
      foreign: "workoutExerciseId",
    },
  },
}

function statement(run: () => unknown | Promise<unknown>): Statement {
  const execute = async () => run()
  return {
    execute,
    then: (resolve, reject) => execute().then(resolve, reject),
  }
}

export function createInMemoryD1() {
  const tables = Object.fromEntries(
    Object.entries(tableDefinitions).map(([name, table]) => [
      name,
      { table, rows: [] },
    ])
  ) as unknown as Tables

  function select(
    name: TableName,
    options: QueryOptions = {},
    sourceRows = tables[name].rows
  ): Row[] {
    let rows = sourceRows.filter((row) => matches(row, options.where))
    if (options.orderBy) {
      rows = [...rows].sort((left, right) => {
        for (const order of options.orderBy ?? []) {
          const column = chunks(order).find(
            (chunk): chunk is Column => chunk instanceof Column
          )
          if (!column) continue
          const result = compare(
            left[columnKey(column)],
            right[columnKey(column)]
          )
          if (result) return text(order).includes("desc") ? -result : result
        }
        return 0
      })
    }
    if (options.limit !== undefined) rows = rows.slice(0, options.limit)
    return rows.map((source) => {
      const row = project(source, options.columns)
      for (const [relationName, relationOptions] of Object.entries(
        options.with ?? {}
      )) {
        const relation = relations[name]?.[relationName]
        if (!relation)
          throw new Error(`Unsupported relation: ${name}.${relationName}`)
        const nestedOptions = relationOptions === true ? {} : relationOptions
        const candidates = tables[relation.target].rows.filter(
          (candidate) => candidate[relation.foreign] === source[relation.local]
        )
        const joined = select(relation.target, nestedOptions, candidates)
        const isOne = relationName === "category" || relationName === "variant"
        row[relationName] = isOne ? joined[0] : joined
      }
      return row
    })
  }

  function cascadeDelete(name: TableName, deleted: Row[]) {
    if (name === "workouts") {
      const ids = new Set(deleted.map((row) => row.id))
      const children = tables.workoutExercises.rows.filter((row) =>
        ids.has(row.workoutId)
      )
      tables.workoutExercises.rows = tables.workoutExercises.rows.filter(
        (row) => !ids.has(row.workoutId)
      )
      cascadeDelete("workoutExercises", children)
    } else if (name === "workoutExercises") {
      const ids = new Set(deleted.map((row) => row.id))
      tables.workoutSets.rows = tables.workoutSets.rows.filter(
        (row) => !ids.has(row.workoutExerciseId)
      )
    } else if (name === "workoutTemplates") {
      const ids = new Set(deleted.map((row) => row.id))
      tables.workoutTemplateExercises.rows =
        tables.workoutTemplateExercises.rows.filter(
          (row) => !ids.has(row.templateId)
        )
    }
  }

  function nameOf(table: Table): TableName {
    const found = Object.entries(tables).find(
      ([, entry]) => entry.table === table
    )
    if (!found)
      throw new Error("The in-memory D1 fake received an unknown table.")
    return found[0] as TableName
  }

  const query = Object.fromEntries(
    (Object.keys(tables) as TableName[]).map((name) => [
      name,
      {
        findMany: async (options?: QueryOptions) => select(name, options),
        findFirst: async (options?: QueryOptions) => select(name, options)[0],
      },
    ])
  )

  const db = {
    query,
    insert(table: Table) {
      const name = nameOf(table)
      return {
        values(values: Row | Row[]) {
          return statement(() => {
            tables[name].rows.push(
              ...(Array.isArray(values) ? values : [values]).map((row) => ({
                ...row,
              }))
            )
            return { success: true }
          })
        },
      }
    },
    update(table: Table) {
      const name = nameOf(table)
      return {
        set(values: Row) {
          return {
            where(where: Predicate) {
              const affected = () => {
                const rows = tables[name].rows.filter((row) =>
                  matches(row, where)
                )
                rows.forEach((row) => Object.assign(row, values))
                return rows.map((row) => ({ ...row }))
              }
              return mutationStatement(affected)
            },
          }
        },
      }
    },
    delete(table: Table) {
      const name = nameOf(table)
      return {
        where(where: Predicate) {
          const affected = () => {
            const deleted = tables[name].rows.filter((row) =>
              matches(row, where)
            )
            tables[name].rows = tables[name].rows.filter(
              (row) => !matches(row, where)
            )
            cascadeDelete(name, deleted)
            return deleted.map((row) => ({ ...row }))
          }
          return mutationStatement(affected)
        },
      }
    },
    async batch(items: Statement[]) {
      const results: unknown[] = []
      for (const item of items) results.push(await item.execute())
      return results
    },
    seed(name: TableName, rows: Row | Row[]) {
      tables[name].rows.push(
        ...(Array.isArray(rows) ? rows : [rows]).map((row) => ({ ...row }))
      )
    },
    reset() {
      Object.values(tables).forEach((entry) => {
        entry.rows = []
      })
    },
    _tables: Object.fromEntries(
      Object.entries(tables).map(([name, entry]) => [
        name,
        entry as StoredTable,
      ])
    ) as Record<TableName, StoredTable>,
  }

  function mutationStatement(run: () => Row[]) {
    let result: Row[] | undefined
    const execute = () => (result ??= run())
    const base = statement(execute) as Statement & {
      returning: (
        projection?: Projection
      ) => Statement & { all: () => Promise<Row[]> }
    }
    base.returning = (projection) => {
      const returned = () => {
        const rows = execute()
        if (!projection) return rows
        return rows.map((row) =>
          Object.fromEntries(
            Object.entries(projection).map(([key, column]) => [
              key,
              row[columnKey(column)],
            ])
          )
        )
      }
      const returning = statement(returned) as Statement & {
        all: () => Promise<Row[]>
      }
      returning.all = async () => returned()
      return returning
    }
    return base
  }

  return db as typeof db & DrizzleD1Database<typeof schema>
}

export type InMemoryD1 = ReturnType<typeof createInMemoryD1>
