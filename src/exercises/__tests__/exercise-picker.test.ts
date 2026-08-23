import { describe, expect, it } from "vitest"

import { getExercisePickerGroups } from "../exercise-picker"
import type { ActiveCategory } from "../exercise-picker"

function category(
  id: string,
  name: string,
  variants: Array<{ id: string; name: string; archivedAt?: string | null }>,
  archivedAt: string | null = null
): ActiveCategory {
  return {
    id,
    name,
    archivedAt,
    variants: variants.map((variant) => ({
      categoryId: id,
      difficultyMultiplier: 1,
      archivedAt: null,
      ...variant,
    })),
  }
}

describe("getExercisePickerGroups", () => {
  it("omits empty and archived groups and archived variants", () => {
    const groups = getExercisePickerGroups([
      category("empty", "Empty", []),
      category("active", "Push", [
        { id: "push-up", name: "Push-up" },
        { id: "archived", name: "Archived", archivedAt: "2026-08-01" },
      ]),
      category(
        "archived-category",
        "Old",
        [{ id: "hidden", name: "Hidden" }],
        "2026-08-01"
      ),
    ])

    expect(groups).toEqual([
      {
        name: "Push",
        variants: [expect.objectContaining({ id: "push-up", name: "Push-up" })],
      },
    ])
  })

  it("combines categories with the same display name into one sorted group", () => {
    const groups = getExercisePickerGroups([
      category("custom-pull", "Pull-up", [
        { id: "bands", name: "Pull-up with bands" },
        { id: "chin", name: "Chin-up" },
      ]),
      category("seed-pull", "Pull-up", [{ id: "standard", name: "Pull-up" }]),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0].name).toBe("Pull-up")
    expect(groups[0].variants.map((variant) => variant.name)).toEqual([
      "Chin-up",
      "Pull-up",
      "Pull-up with bands",
    ])
  })
})
