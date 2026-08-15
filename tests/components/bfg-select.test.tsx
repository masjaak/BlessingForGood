import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { BFGSelect } from "@/components/bfg-select";

function SelectHarness() {
  const [value, setValue] = useState("draft");
  return (
    <form>
      <BFGSelect name="status" value={value} onChange={(event) => setValue(event.target.value)}>
        <option value="draft">Draf</option>
        <option value="published">Terbit</option>
        <option value="archived">Diarsipkan</option>
      </BFGSelect>
    </form>
  );
}

describe("BFGSelect", () => {
  it("uses a portaled listbox, propagates values, and returns focus on close", () => {
    render(<SelectHarness />);
    const trigger = screen.getByRole("combobox");

    expect(document.querySelector("select")).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(screen.getByRole("listbox")).toBeTruthy();
    expect(screen.getByRole("option", { name: "Draf" }).getAttribute("aria-selected")).toBe("true");

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(trigger.textContent).toContain("Terbit");
    expect((document.querySelector('input[name="status"]') as HTMLInputElement).value).toBe("published");
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("supports Home/End navigation and disabled options", () => {
    render(
      <BFGSelect defaultValue="draft">
        <option value="draft">Draf</option>
        <option value="published" disabled>
          Terbit
        </option>
        <option value="archived">Diarsipkan</option>
      </BFGSelect>,
    );
    const trigger = screen.getByRole("combobox");

    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: "End" });
    expect(screen.getByRole("option", { name: "Diarsipkan" }).className).toContain("is-active");
    fireEvent.keyDown(trigger, { key: "Home" });
    expect(screen.getByRole("option", { name: "Draf" }).className).toContain("is-active");
    expect(screen.getByRole("option", { name: "Terbit" }).getAttribute("aria-disabled")).toBe("true");
  });
});
