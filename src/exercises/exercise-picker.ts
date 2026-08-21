export type ActiveVariant = {
  id: string
  name: string
  categoryId: string
  difficultyMultiplier: number
  archivedAt: Date | string | null
}

export type ActiveCategory = {
  id: string
  name: string
  archivedAt: Date | string | null
  variants: ActiveVariant[]
}

export type ExercisePickerGroup = {
  name: string
  variants: ActiveVariant[]
}

export function getExercisePickerGroups(
  library: ActiveCategory[]
): ExercisePickerGroup[] {
  const groups = new Map<string, ExercisePickerGroup>()

  for (const category of library) {
    if (category.archivedAt !== null) continue

    const variants = category.variants.filter(
      (variant) => variant.archivedAt === null
    )
    if (!variants.length) continue

    const group = groups.get(category.name)
    if (group) {
      group.variants.push(...variants)
    } else {
      groups.set(category.name, {
        name: category.name,
        variants: [...variants],
      })
    }
  }

  return [...groups.values()].map((group) => ({
    ...group,
    variants: group.variants.sort(
      (left, right) =>
        left.name.localeCompare(right.name) || left.id.localeCompare(right.id)
    ),
  }))
}
