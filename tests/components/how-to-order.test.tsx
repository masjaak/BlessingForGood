import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HowToOrderSteps } from "@/components/how-to-order";

describe("How To Order journey", () => {
  it("keeps seven canonical steps in one accessible ordered journey", () => {
    render(<HowToOrderSteps />);

    const journey = screen.getByRole("list", { name: "Langkah cara memesan" });
    expect(journey.querySelectorAll(":scope > li")).toHaveLength(7);
    expect([...journey.querySelectorAll("h3")].map((heading) => heading.textContent)).toEqual([
      "Temukan bukunya",
      "Pilih buku & variannya",
      "Kirim pesanan",
      "Pesanan diproses",
      "Cek tagihan & konfirmasi pembayaran",
      "Pantau perjalanannya",
      "Buku sampai",
    ]);
    expect(document.querySelectorAll(".order-steps")).toHaveLength(1);
    expect(document.querySelectorAll(".order-step")).toHaveLength(7);
  });

  it("uses one normalized outline icon treatment for every canonical step", () => {
    render(<HowToOrderSteps />);

    const icons = [...document.querySelectorAll<SVGElement>(".order-step-icon")];
    expect(icons).toHaveLength(7);
    expect(new Set(icons.map((icon) => icon.getAttribute("viewBox")))).toEqual(new Set(["0 0 24 24"]));
    expect(icons.map((icon) => icon.getAttribute("data-icon"))).toEqual([
      "discover",
      "select",
      "send",
      "process",
      "invoice",
      "track",
      "arrive",
    ]);
    expect(new Set(icons.map((icon) => icon.getAttribute("fill")))).toEqual(new Set(["none"]));
    expect(new Set(icons.map((icon) => icon.getAttribute("stroke")))).toEqual(new Set(["currentColor"]));
    expect(new Set(icons.map((icon) => icon.getAttribute("stroke-width")))).toEqual(new Set(["2"]));
    expect(new Set(icons.map((icon) => icon.getAttribute("stroke-linecap")))).toEqual(new Set(["round"]));
    expect(new Set(icons.map((icon) => icon.getAttribute("stroke-linejoin")))).toEqual(new Set(["round"]));
    expect(
      new Set(
        icons.flatMap((icon) =>
          [...icon.querySelectorAll<SVGElement>("*")].map((path) => path.getAttribute("stroke-width")),
        ),
      ),
    ).toEqual(new Set(["2"]));
  });
});
