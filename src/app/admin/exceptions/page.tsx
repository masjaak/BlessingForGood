import { AdminExceptions } from "@/components/admin-exceptions";
import { PrototypeModeGuard } from "@/components/prototype-mode-guard";
import { SiteShell } from "@/components/site-shell";

export default function AdminExceptionsPage() {
  return (
    <SiteShell>
      <PrototypeModeGuard requiredRole="admin">
        <AdminExceptions />
      </PrototypeModeGuard>
    </SiteShell>
  );
}
