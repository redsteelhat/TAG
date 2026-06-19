import { AppShell } from '../../components/app-shell';
import { MaintenancePanel } from '../../components/maintenance-panel';

export default function MaintenancePage() {
  return (
    <AppShell eyebrow="Servis takibi" title="Bakim">
      <MaintenancePanel />
    </AppShell>
  );
}
