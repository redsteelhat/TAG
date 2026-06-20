import { AppShell } from '../../components/app-shell';
import { DepreciationSettingsPanel } from '../../components/depreciation-settings-panel';

export default function DepreciationPage() {
  return (
    <AppShell eyebrow="Yipranma maliyeti" title="Amortisman">
      <DepreciationSettingsPanel />
    </AppShell>
  );
}
