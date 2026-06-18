import { AppShell } from '../../components/app-shell';
import { PackagePanel } from '../../components/package-panel';

export default function PackagesPage() {
  return (
    <AppShell eyebrow="Paket giderleri" title="Paketler">
      <PackagePanel />
    </AppShell>
  );
}
