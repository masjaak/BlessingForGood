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
});
