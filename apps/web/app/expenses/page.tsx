import { AppShell } from '../../components/app-shell';
import { ExpenseList } from '../../components/expense-list';

export default function ExpensesPage() {
  return (
    <AppShell eyebrow="Gider operasyonu" title="Giderler">
      <ExpenseList />
    </AppShell>
  );
}
