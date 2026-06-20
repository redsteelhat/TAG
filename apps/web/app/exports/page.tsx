import { AppShell } from '../../components/app-shell';
import { ExportPanel } from '../../components/export-panel';

export default function ExportsPage() {
  return (
    <AppShell eyebrow="Disa aktarma" title="Disa Aktar">
      <ExportPanel />
    </AppShell>
  );
}
