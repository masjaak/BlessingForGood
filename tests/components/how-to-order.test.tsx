import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HowToOrderSteps, HowToOrderVideoGuide } from "@/components/how-to-order";
import { HowToOrderPageHeading } from "@/components/how-to-order-page-heading";

const globalsCss = readFileSync("src/app/globals.css", "utf8");

describe("How To Order journey", () => {
  it("keeps seven canonical steps in one accessible ordered journey", () => {
    render(<HowToOrderSteps />);

    const journey = screen.getByRole("list", { name: "Langkah cara memesan" });
    expect(journey.querySelectorAll(":scope > li")).toHaveLength(7);
    expect([...journey.querySelectorAll("h3")].map((heading) => heading.textContent)).toEqual([
      "pilih bukunya",
      "history order buku kamu",
      "invoice",
      "Pesanan diproses",
      "pembayaran",
      "cek perjalanan buku kamu",
      "Buku sampai",
    ]);
    const steps = [...journey.querySelectorAll(":scope > li")];
    expect(steps[3].querySelector("p")?.textContent).toBe(
      "Preorder masuk ke Batch PO; Ready Stock diproses tanpa supplier Batch PO.",
    );
    expect(journey.querySelectorAll("h3")).toHaveLength(7);
    expect([...journey.querySelectorAll("h3")].filter((heading) => heading.textContent === "pembayaran")).toHaveLength(
      1,
    );
    expect(screen.queryByRole("heading", { name: "Pembayaran" })).toBeNull();
    expect(
      screen.queryByText(
        "Ketentuan DP mengikuti masing-masing PO. Untuk PO reguler, nominal atau persentasenya diumumkan melalui WhatsApp Group BFG dan tercantum pada tagihan.",
      ),
    ).toBeNull();
    expect(steps[0].querySelector("p")?.textContent).toBe(
      "bisa fix lewat wa group (nantinya admin akan merekap ke account website masing2 blessfriends) atau bisa dilakukan pembelian via website langsung",
    );
    expect(steps[1].querySelector("p")?.textContent).toBe(
      "setiap pembelian baik di wa / di website akan langsung muncul di account masing2 blessfriends buku apa yang sudah dibeli di kami",
    );
    expect(steps[2].querySelector("p")?.textContent).toBe(
      "invoice akan muncul di website h+1/h+2 setelah close PO, karena kami membuka banyak cargo setiap batch, maka diperhatikan di bagian tagihan pada account website kamu, admin invoice kami akan pc masing2 customer menginfokan bahwa invoice sudah terbit di website",
    );
    expect(steps[3].querySelector("h3")?.textContent).toBe("Pesanan diproses");
    expect(steps[4].querySelector("p")?.textContent).toBe(
      "pembayaran di kami adalah DP 30% atau jika ada DP tertentu di tiap cargo akan kami infokan saat kami menurunkan matprom di group whatsapp",
    );
    expect(steps[5].querySelector("p")?.textContent).toBe(
      "PO reguler membutuhkan waktu 4-5 bulan sejak di order pertama kali, pembelian bukumu bisa langsung di tracking di account website kamu",
    );
    expect(steps[6].querySelector("h3")?.textContent).toBe("Buku sampai");
    expect(steps[6].querySelector("p")?.textContent).toBe(
      "Setelah buku tiba dan selesai diproses oleh BFG, pesanan dilanjutkan ke fulfillment dan pengiriman.",
    );
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

  it("keeps the client supplied operational display copy literal", () => {
    render(<HowToOrderSteps />);

    expect(screen.getByText(/h\+1\/h\+2/)).toBeTruthy();
    expect(screen.getByText(/DP 30%/)).toBeTruthy();
    expect(screen.getByText(/4-5 bulan/)).toBeTruthy();
    expect(screen.queryByText(/Buku yang sudah dicatat dapat kamu lihat kembali/)).toBeNull();
    expect(screen.queryByText(/Admin dapat mencatat pesanan WhatsApp secara manual/)).toBeNull();
    expect(screen.queryByText(/Admin menerbitkan invoice sesuai proses BFG/)).toBeNull();
    expect(screen.queryByText(/sekitar 3–5 minggu/)).toBeNull();
    expect(screen.queryByRole("heading", { name: "Pelunasan" })).toBeNull();
  });

  it("renders the exact How To Order page heading copy", () => {
    render(<HowToOrderPageHeading />);

    expect(screen.getByText("ketentuan order di BFG")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Dari memilih buku sampai tiba di tanganmu." })).toBeTruthy();
    expect(
      screen.getByText(
        "harap dibaca untuk ketentuan order di kami, agar setelahnya Blessfriends mengetahui sistem pembelian di kami",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("Ketentuan order di BFG", { exact: true })).toBeNull();
    expect(
      screen.queryByText("Harap baca ketentuan order agar Blessfriends memahami proses pembelian di BFG.", {
        exact: true,
      }),
    ).toBeNull();
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

  it("uses readable desktop cards and a vertical tablet timeline", () => {
    const start = globalsCss.indexOf(".customer-shell .order-steps {");
    const end = globalsCss.indexOf("/* Phase 07 Admin workspace", start);
    const orderJourneyStyles = globalsCss.slice(start, end);

    expect(orderJourneyStyles).toContain("grid-template-columns: repeat(2, minmax(0, 1fr));");
    expect(orderJourneyStyles).toContain("grid-template-columns: 58px minmax(0, 1fr);");
    expect(orderJourneyStyles).toContain("--journey-step-gap-mobile");
    expect(orderJourneyStyles).not.toContain("grid-template-columns: repeat(7, minmax(0, 1fr));");
    expect(orderJourneyStyles).not.toContain("grid-template-rows: subgrid;");
  });
});
