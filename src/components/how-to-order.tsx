import type { ReactNode } from "react";

type OrderStepIconName = "discover" | "select" | "send" | "process" | "invoice" | "track" | "arrive";

type OrderStep = {
  title: string;
  description: string;
  icon: OrderStepIconName;
};

export const orderSteps: OrderStep[] = [
  {
    title: "Temukan bukunya",
    description: "Jelajahi Ready Stock atau Secret Catalog sesuai akses dan ketersediaan.",
    icon: "discover",
  },
  {
    title: "Pilih buku & variannya",
    description: "Pilih judul, format, ISBN, dan jumlah yang tersedia.",
    icon: "select",
  },
  {
    title: "Kirim pesanan",
    description: "BFG mencatat pesananmu dan menyimpan detail pilihan saat dibuat.",
    icon: "send",
  },
  {
    title: "Pesanan diproses",
    description: "Preorder masuk ke Batch PO; Ready Stock diproses tanpa supplier Batch PO.",
    icon: "process",
  },
  {
    title: "Cek tagihan & konfirmasi pembayaran",
    description: "Invoice muncul saat diterbitkan; kirim konfirmasi pembayaran dari halaman Tagihan.",
    icon: "invoice",
  },
  {
    title: "Pantau perjalanannya",
    description: "Lihat batch, shipment, fulfillment, dan pembaruan pesanan dari Buku Saya.",
    icon: "track",
  },
  {
    title: "Buku sampai",
    description: "Setelah diproses BFG, pesanan dilanjutkan ke fulfillment dan pengiriman.",
    icon: "arrive",
  },
];

const compactOrderSteps: OrderStep[] = [
  orderSteps[0],
  orderSteps[1],
  orderSteps[2],
  orderSteps[3],
  {
    title: "Cek tagihan & bayar",
    description: "Invoice, konfirmasi pembayaran, dan statusnya tercatat di akunmu.",
    icon: "invoice",
  },
  {
    title: "Ikuti sampai tiba",
    description: "Pantau perjalanan fulfillment dan pengiriman dari Buku Saya.",
    icon: "arrive",
  },
];

const previewOrderSteps: OrderStep[] = [
  {
    title: "Temukan bukunya",
    description: "Pilih Ready Stock atau Secret Catalog sesuai akses dan ketersediaan.",
    icon: "discover",
  },
  {
    title: "Pesan & tunggu proses BFG",
    description: "Pilih varian, kirim pesanan, lalu cek invoice dan pembayaran.",
    icon: "process",
  },
  {
    title: "Pantau sampai buku datang",
    description: "Ikuti batch, fulfillment, dan pengiriman dari Buku Saya.",
    icon: "arrive",
  },
];

/** Tabler Icons v3.46.0 outline paths, MIT-licensed: https://github.com/tabler/tabler-icons */
function JourneyIcon({ name }: { name: OrderStepIconName }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
  };

  const icons: Record<OrderStepIconName, ReactNode> = {
    discover: (
      <>
        <path {...common} d="M3 10a7 7 0 1 0 14 0a7 7 0 0 0 -14 0" />
        <path {...common} d="M21 21l-6 -6" />
      </>
    ),
    select: (
      <>
        <path {...common} d="M19 4v16h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h12" />
        <path {...common} d="M19 16h-12a2 2 0 0 0 -2 2" />
        <path {...common} d="M9 8h6" />
      </>
    ),
    send: (
      <>
        <path {...common} d="M10 14l11 -11" />
        <path {...common} d="M21 3l-6.5 18a.55 .55 0 0 1 -1 0l-3.5 -7l-7 -3.5a.55 .55 0 0 1 0 -1l18 -6.5" />
      </>
    ),
    process: (
      <>
        <path {...common} d="M12 3l8 4.5l0 9l-8 4.5l-8 -4.5l0 -9l8 -4.5" />
        <path {...common} d="M12 12l8 -4.5" />
        <path {...common} d="M12 12l0 9" />
        <path {...common} d="M12 12l-8 -4.5" />
        <path {...common} d="M16 5.25l-8 4.5" />
      </>
    ),
    invoice: (
      <path
        {...common}
        d="M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16l-3 -2l-2 2l-2 -2l-2 2l-2 -2l-3 2m4 -14h6m-6 4h6m-2 4h2"
      />
    ),
    track: (
      <>
        <path {...common} d="M5 17a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
        <path {...common} d="M15 17a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
        <path {...common} d="M5 17h-2v-4m-1 -8h11v12m-4 0h6m4 0h2v-6h-8m0 -5h5l3 5" />
        <path {...common} d="M3 9l4 0" />
      </>
    ),
    arrive: (
      <>
        <path {...common} d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2" />
        <path {...common} d="M19 13.488v-1.488h2l-9 -9l-9 9h2v7a2 2 0 0 0 2 2h4.525" />
        <path {...common} d="M15 19l2 2l4 -4" />
      </>
    ),
  };

  return (
    <svg
      className="order-step-icon"
      data-icon={name}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  );
}

export function HowToOrderSteps({ compact = false, preview = false }: { compact?: boolean; preview?: boolean }) {
  const steps = preview ? previewOrderSteps : compact ? compactOrderSteps : orderSteps;
  return (
    <ol
      className={`order-steps${compact ? " order-steps-compact" : ""}${preview ? " order-steps-preview" : ""}`}
      aria-label={
        preview ? "Ringkasan cara memesan" : compact ? "Langkah cara memesan ringkas" : "Langkah cara memesan"
      }
    >
      {steps.map((step, index) => (
        <li className="order-step" key={`${step.title}-${index}`}>
          <div className="order-step-topline">
            <span className="order-step-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="order-step-icon-wrap">
              <JourneyIcon name={step.icon} />
            </span>
          </div>
          <div className="order-step-content">
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </div>
          {index < steps.length - 1 && (preview || (compact ? index % 3 !== 2 : index % 4 !== 3)) ? (
            <span className="order-step-arrow" aria-hidden="true">
              →
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
