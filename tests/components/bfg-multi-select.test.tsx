import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { BFGMultiSelect } from "@/components/bfg-multi-select";

const options = [
  { value: "one", label: "Publisher One" },
  { value: "two", label: "Publisher Two" },
  { value: "three", label: "Publisher Three" },
];

function MultiSelectHarness() {
  const [value, setValue] = useState<string[]>([]);
  const summary = value.length ? `${value.length} publisher dipilih` : "Semua Publisher";
  return (
    <BFGMultiSelect
      aria-label="Publisher"
      defaultLabel="Semua Publisher"
      options={options}
      selectedLabel={summary}
      value={value}
      onChange={setValue}
    />
  );
}

describe("BFGMultiSelect", () => {
  it("keeps a checklist open for multiple selections and clears through the default row", () => {
    render(<MultiSelectHarness />);
    const trigger = screen.getByRole("button", { name: "Publisher" });

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("checkbox")).toBeNull();

    fireEvent.click(trigger);
    const menu = screen.getByRole("dialog", { name: "Publisher" });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(within(menu).getAllByRole("checkbox")).toHaveLength(3);

    fireEvent.click(within(menu).getByRole("checkbox", { name: "Publisher One" }));
    fireEvent.click(within(menu).getByRole("checkbox", { name: "Publisher Three" }));
    fireEvent.click(within(menu).getByRole("checkbox", { name: "Publisher Two" }));
    expect(screen.getByRole("dialog", { name: "Publisher" })).toBeTruthy();
    expect(trigger.textContent).toContain("3 publisher dipilih");
    expect(within(menu).getByRole("checkbox", { name: "Publisher One" })).toHaveProperty("checked", true);
    expect(within(menu).getByRole("checkbox", { name: "Publisher Two" })).toHaveProperty("checked", true);

    fireEvent.click(within(menu).getByRole("button", { name: "Semua Publisher" }));
    expect(trigger.textContent).toContain("Semua Publisher");
    expect(
      within(menu)
        .getAllByRole("checkbox")
        .every((checkbox) => !(checkbox as HTMLInputElement).checked),
    ).toBe(true);
  });

  it("closes from Escape and returns focus to the trigger", () => {
    render(<MultiSelectHarness />);
    const trigger = screen.getByRole("button", { name: "Publisher" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });

    fireEvent.keyDown(screen.getByRole("dialog", { name: "Publisher" }), { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Publisher" })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
