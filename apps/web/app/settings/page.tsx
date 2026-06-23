import { AppShell } from "../../components/app-shell";
import { SettingsPanel } from "../../components/settings-panel";

export default function SettingsPage() {
  return (
    <AppShell eyebrow="Sistem yönetimi" title="Ayarlar">
      <SettingsPanel />
    </AppShell>
  );
}
