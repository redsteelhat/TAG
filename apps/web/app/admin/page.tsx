import { AppShell } from '../../components/app-shell';
import { AdminOverviewPanel } from '../../components/admin-overview-panel';

export default function AdminPage() {
  return (
    <AppShell eyebrow="Sistem operasyonu" title="Admin Panel">
      <AdminOverviewPanel />
    </AppShell>
  );
}
