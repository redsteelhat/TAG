import { AppShell } from '../../components/app-shell';
import { FuelPanel } from '../../components/fuel-panel';

export default function FuelPage() {
  return (
    <AppShell eyebrow="Yakit analizi" title="Yakit">
      <FuelPanel />
    </AppShell>
  );
}
