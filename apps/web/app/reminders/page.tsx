import { AppShell } from '../../components/app-shell';
import { ReminderPanel } from '../../components/reminder-panel';

export default function RemindersPage() {
  return (
    <AppShell eyebrow="Hatirlaticilar" title="Hatirlatici Yonetimi">
      <ReminderPanel />
    </AppShell>
  );
}
