import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HowToOrderSteps, HowToOrderVideoGuide } from "@/components/how-to-order";

const globalsCss = readFileSync("src/app/globals.css", "utf8");

describe("How To Order journey", () => {
  it("keeps seven canonical steps in one accessible ordered journey", () => {
    render(<HowToOrderSteps />);

    const journey = screen.getByRole("list", { name: "Langkah cara memesan" });
    expect(journey.querySelectorAll(":scope > li")).toHaveLength(7);
    expect([...journey.querySelectorAll("h3")].map((heading) => heading.textContent)).toEqual([
      "Pilih bukunya",
      "History order buku kamu",
      "Invoice",
      "Pembayaran",
      "Pelunasan",
      "Cek perjalanan buku kamu",
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
      "invoice",
      "send",
      "process",
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

  it("links customer history and invoice steps to their existing routes", () => {
    render(<HowToOrderSteps />);

    expect(screen.getAllByRole("link", { name: "Buku Saya" }).map((link) => link.getAttribute("href"))).toEqual([
      "/account/orders",
      "/account/orders",
    ]);
    expect(screen.getByRole("link", { name: "Tagihan" }).getAttribute("href")).toBe("/account/invoices");
    expect(screen.getByText(/Admin dapat mencatat pesanan WhatsApp secara manual/)).toBeTruthy();
    expect(screen.getByText(/Admin menerbitkan invoice sesuai proses BFG/)).toBeTruthy();
    expect(screen.getByText(/notifikasi akan muncul di akun Blessfriend/)).toBeTruthy();
    expect(screen.getByText(/Ketentuan DP mengikuti masing-masing PO/)).toBeTruthy();
    expect(screen.getByText(/sekitar 3–5 minggu/)).toBeTruthy();
    expect(screen.getByText(/sekitar 4–5 bulan/)).toBeTruthy();
    expect(screen.queryByText(/H\+1|H\+2|30%|setelah PO ditutup/)).toBeNull();
  });

  it("keeps the client three-step homepage preview and avoids WhatsApp order imports", () => {
    render(<HowToOrderSteps preview />);

    const journey = screen.getByRole("list", { name: "Ringkasan cara memesan" });
    expect(journey.querySelectorAll(":scope > li")).toHaveLength(3);
    expect([...journey.querySelectorAll("h3")].map((heading) => heading.textContent)).toEqual([
      "Gabung ke WhatsApp Group",
      "Buat account di website kami",
      "Pilih buku yang ingin dibeli",
    ]);
    expect(
      screen.getByText("Pemesanan dapat dilakukan melalui website atau dikonfirmasi melalui WhatsApp Group BFG."),
    ).toBeTruthy();
    expect(screen.queryByText(/otomatis.*WhatsApp|import.*WhatsApp/i)).toBeNull();
  });

  it("shows only a safe HTTPS video link and omits the guide when unset", () => {
    const { rerender } = render(<HowToOrderVideoGuide url={null} />);
    expect(screen.queryByRole("link", { name: /Tonton panduan penggunaan/ })).toBeNull();

    rerender(<HowToOrderVideoGuide url="http://example.com/guide" />);
    expect(screen.queryByRole("link", { name: /Tonton panduan penggunaan/ })).toBeNull();

    rerender(<HowToOrderVideoGuide url="https://drive.google.com/file/d/example/view" />);
    const link = screen.getByRole("link", { name: /Tonton panduan penggunaan/ });
    expect(link.getAttribute("href")).toBe("https://drive.google.com/file/d/example/view");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("uses shared desktop rows instead of per-step headline spacing", () => {
    expect(globalsCss).toContain("grid-template-rows: auto auto auto;");
    expect(globalsCss).toContain("grid-template-rows: subgrid;");
    expect(globalsCss).toContain("--journey-step-gap-mobile");
  });
});
