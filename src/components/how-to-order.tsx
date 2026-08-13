import type { ReactNode } from "react";

type OrderStepIconName = "discover" | "select" | "send" | "process" | "invoice" | "payment" | "track" | "arrive";

type OrderStep = {
  title: string;
  description: string;
  icon: OrderStepIconName;
};

export const orderSteps: OrderStep[] = [
  {
    title: "Temukan bukunya",
    description: "Browse Ready Stock atau Secret Catalog sesuai akses dan ketersediaan.",
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
    icon: "payment",
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

function OrderStepIcon({ name }: { name: OrderStepIconName }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
  };

  const icons: Record<OrderStepIconName, ReactNode> = {
    discover: (
      <>
        <circle {...common} cx="10.5" cy="10.5" r="5.5" />
        <path {...common} d="m15 15 5 5M6 19.5h5.5M6 17v2.5" />
      </>
    ),
    select: (
      <>
        <path
          {...common}
          d="M4.5 5.5a2 2 0 0 1 2-2h4.75v15H6.5a2 2 0 0 0-2 2zM19.5 5.5a2 2 0 0 0-2-2h-4.25v15h4.25a2 2 0 0 1 2 2z"
        />
        <path {...common} d="m14.5 12 2 2 3.5-4" />
      </>
    ),
    send: (
      <>
        <path {...common} d="m4 5 16 7-16 7 3.5-7z" />
        <path {...common} d="M7.5 12H20M9 12l-5-7" />
      </>
    ),
    process: (
      <>
        <path {...common} d="M5 8.5 12 4l7 4.5-7 4zM5 8.5V16l7 4 7-4V8.5M12 12.5V20" />
        <path {...common} d="M4 4v-1h5M4 3l2 2M20 20v1h-5M20 21l-2-2" />
      </>
    ),
    invoice: (
      <>
        <path {...common} d="M6 3.5h12v17l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5z" />
        <path {...common} d="M9 8h6M9 12h6M9 16h3" />
      </>
    ),
    payment: (
      <>
        <rect {...common} x="3.5" y="5" width="17" height="14" rx="2" />
        <path {...common} d="M3.5 9h17M7 14h3" />
      </>
    ),
    track: (
      <>
        <path {...common} d="M4 7h10v10H4zM14 10h3l3 3v4h-6z" />
        <circle {...common} cx="8" cy="19" r="1.5" />
        <circle {...common} cx="17" cy="19" r="1.5" />
        <path {...common} d="M17 10v3h3" />
      </>
    ),
    arrive: (
      <>
        <path {...common} d="m4 10 8-6 8 6v9H4zM9 19v-5h6v5" />
        <path {...common} d="M12 8v5M9.5 10.5 12 13l2.5-2.5" />
      </>
    ),
  };

  return (
    <svg className="order-step-icon" viewBox="0 0 24 24" aria-hidden="true">
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
              <OrderStepIcon name={step.icon} />
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
