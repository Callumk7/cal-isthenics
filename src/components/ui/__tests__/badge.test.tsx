import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Badge } from "../badge"

describe("Badge", () => {
  it("renders its children", () => {
    render(<Badge>New</Badge>)
    expect(screen.getByText("New")).toBeInTheDocument()
  })
})
