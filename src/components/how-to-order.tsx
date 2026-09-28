import type { ReactNode } from "react";
import Link from "next/link";
import { Card, LinkButton } from "@/components/ui";

type OrderStepIconName = "discover" | "select" | "send" | "process" | "invoice" | "track" | "arrive";

type OrderStep = {
  title: string;
  description: ReactNode;
  icon: OrderStepIconName;
};

export const orderSteps: OrderStep[] = [
  {
    title: "Pilih bukunya",
    description: (
      <>
        Pilih buku melalui website atau konfirmasi pilihan di WhatsApp Group BFG. Admin dapat mencatat pesanan WhatsApp
        secara manual ke akun Blessfriend.
      </>
    ),
    icon: "discover",
  },
  {
    title: "History order buku kamu",
    description: (
      <>
        Buku yang sudah dicatat dapat kamu lihat kembali melalui <Link href="/account/orders">Buku Saya</Link> di
        account Blessfriend.
      </>
    ),
    icon: "select",
  },
  {
    title: "Invoice",
    description: (
      <>
        Admin menerbitkan invoice sesuai proses BFG. Saat tersedia, cek menu{" "}
        <Link href="/account/invoices">Tagihan</Link>; notifikasi akan muncul di akun Blessfriend.
      </>
    ),
    icon: "invoice",
  },
  {
    title: "Pembayaran",
    description:
      "Ketentuan DP mengikuti masing-masing PO. Untuk PO reguler, nominal atau persentasenya diumumkan melalui WhatsApp Group BFG dan tercantum pada tagihan.",
    icon: "send",
  },
  {
    title: "Pelunasan",
    description: "Pelunasan buku akan ditagihkan sekitar 3–5 minggu sebelum diperkirakan tiba di warehouse BFG.",
    icon: "process",
  },
  {
    title: "Cek perjalanan buku kamu",
    description: (
      <>
        PO reguler umumnya membutuhkan sekitar 4–5 bulan sejak pemesanan awal. Pantau perkembangan pesanan di{" "}
        <Link href="/account/orders">Buku Saya</Link>.
      </>
    ),
    icon: "track",
  },
  {
    title: "Buku sampai",
    description: "Setelah buku tiba dan selesai diproses oleh BFG, pesanan dilanjutkan ke fulfillment dan pengiriman.",
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
    title: "Gabung ke WhatsApp Group",
    description: "Bergabung ke WhatsApp Group BFG untuk mendapatkan update, kurasi buku, dan informasi PO.",
    icon: "discover",
  },
  {
    title: "Buat account di website kami",
    description:
      "Gunakan account Blessfriend untuk melihat pesanan, PO yang sedang berjalan, tagihan, dan tracking buku.",
    icon: "process",
  },
  {
    title: "Pilih buku yang ingin dibeli",
    description: "Pemesanan dapat dilakukan melalui website atau dikonfirmasi melalui WhatsApp Group BFG.",
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

export function HowToOrderVideoGuide({ url }: { url: string | null }) {
  if (!url) return null;
  try {
    if (new URL(url).protocol !== "https:") return null;
  } catch {
    return null;
  }

  return (
    <Card className="how-to-order-video-guide">
      <span className="card-kicker">Panduan website</span>
      <h2>Butuh panduan?</h2>
      <p>Lihat video singkat cara menggunakan website Blessing For Good.</p>
      <LinkButton href={url} target="_blank" rel="noopener noreferrer" variant="secondary">
        Tonton panduan penggunaan (buka tab baru) <span aria-hidden="true">↗</span>
      </LinkButton>
    </Card>
  );
}
