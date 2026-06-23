import { AppShell } from "../../components/app-shell";
import { VehicleManagementPanel } from "../../components/vehicle-management-panel";

export default function VehiclesPage() {
  return (
    <AppShell eyebrow="Araç yönetimi" title="Araç Yönetimi">
      <VehicleManagementPanel />
    </AppShell>
  );
}
