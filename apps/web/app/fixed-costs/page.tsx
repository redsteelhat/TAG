import { AppShell } from '../../components/app-shell';
import { FixedCostPanel } from '../../components/fixed-cost-panel';

export default function FixedCostsPage() {
  return (
    <AppShell eyebrow="Sabit gider dagitimi" title="Sabit Gider">
      <FixedCostPanel />
    </AppShell>
  );
}
