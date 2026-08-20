"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { AdminOperationalPage } from "@/components/admin-operational-page";
import { BFGSelect } from "@/components/bfg-select";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";
import { Button, Card, Field, StatusBadge } from "@/components/ui";

type ContentKey = "community" | "how_to_order" | "help";

function ContentEditor() {
  const [key, setKey] = useState<ContentKey>("community");
  const block = useQuery(api.contentBlocks.getForAdmin, { key });
  const upsert = useMutation(api.contentBlocks.upsert);
  const publish = useMutation(api.contentBlocks.publish);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState("");
  async function run(name: string, action: () => Promise<unknown>, success: string) {
    setPending(name);
    setMessage("");
    try {
      await action();
      setMessage(success);
    } catch {
      setMessage("Konten tidak dapat disimpan.");
    } finally {
      setPending("");
    }
  }
  return (
    <AdminOperationalPage
      eyebrow="Manajemen konten"
      title="Konten terstruktur"
      description="Edit field yang disetujui tanpa mengubah kode. Draf tidak tampil ke pelanggan sampai dipublikasikan."
    >
      <Card className="notice-card">
        <span className="card-kicker">Untuk apa Konten?</span>
        <h2>Atur pesan publik BFG di satu tempat.</h2>
        <p>
          Konten mengatur label, judul, dan isi yang tampil di halaman Komunitas, Cara memesan, dan Bantuan setelah
          diterbitkan.
        </p>
        <p className="subtle">
          Ini bukan CMS, blog, pengaturan toko, atau otomasi pemasaran. Pengaturan operasional ada di Pengaturan.
        </p>
      </Card>
      <Card>
        <div className="split-heading">
          <Field label="Ruang konten">
            <BFGSelect value={key} onChange={(event) => setKey(event.target.value as ContentKey)}>
              <option value="community">Komunitas</option>
              <option value="how_to_order">Cara memesan</option>
              <option value="help">Bantuan</option>
            </BFGSelect>
          </Field>
          {block ? (
            <StatusBadge tone={block.status === "published" ? "positive" : "neutral"}>
              {block.status === "published" ? "Terbit" : "Draf"}
            </StatusBadge>
          ) : null}
        </div>
        <form
          className="form-card"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            void run(
              "save",
              () =>
                upsert({
                  key,
                  eyebrow: String(data.get("eyebrow")),
                  title: String(data.get("title")),
                  body: String(data.get("body")),
                }),
              "Draf tersimpan.",
            );
          }}
          key={`${key}-${block?.updatedAt || "empty"}`}
        >
          <Field label="Label pembuka">
            <input className="input" name="eyebrow" defaultValue={block?.eyebrow || ""} required />
          </Field>
          <Field label="Judul">
            <input className="input" name="title" defaultValue={block?.title || ""} required />
          </Field>
          <Field label="Isi">
            <textarea className="textarea" name="body" defaultValue={block?.body || ""} required />
          </Field>
          <div className="form-actions">
            <Button pending={pending === "save"} pendingLabel="Menyimpan…">
              Simpan draf
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!block}
              pending={pending === "publish"}
              pendingLabel="Menerbitkan…"
              onClick={() => void run("publish", () => publish({ key }), "Konten dipublikasikan.")}
            >
              Terbitkan
            </Button>
          </div>
        </form>
      </Card>
      {message ? (
        <p className="success-banner" role="status">
          {message}
        </p>
      ) : null}
    </AdminOperationalPage>
  );
}

export default function AdminContentPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="admin">
        <ContentEditor />
      </ProductAccessGuard>
    </SiteShell>
  );
}
