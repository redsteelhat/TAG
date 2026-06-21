import { AppShell } from '../../components/app-shell';
import { VehicleCreateForm } from '../../components/vehicle-create-form';

export default function VehiclesPage() {
  return (
    <AppShell eyebrow="Araç yönetimi" title="Araç oluşturma">
      <VehicleCreateForm />
    </AppShell>
  );
}
