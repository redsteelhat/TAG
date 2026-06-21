import { AppShell } from '../../components/app-shell';
import { FuelPanel } from '../../components/fuel-panel';

export default function FuelPage() {
  return (
    <AppShell eyebrow="Yakıt analizi" title="Yakıt">
      <FuelPanel />
    </AppShell>
  );
}
