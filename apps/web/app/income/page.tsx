import { AppShell } from '../../components/app-shell';
import { IncomeTripList } from '../../components/income-trip-list';

export default function IncomePage() {
  return (
    <AppShell eyebrow="Gelir operasyonu" title="Gelirler">
      <IncomeTripList />
    </AppShell>
  );
}
