import { AppShell } from '../../components/app-shell';
import { ExpenseList } from '../../components/expense-list';
import { FixedCostPanel } from '../../components/fixed-cost-panel';

export default function ExpensesPage() {
  return (
    <AppShell eyebrow="Gider operasyonu" title="Giderler">
      <FixedCostPanel />
      <ExpenseList />
    </AppShell>
  );
}
