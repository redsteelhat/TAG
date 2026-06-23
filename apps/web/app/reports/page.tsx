import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { AppShell } from "../../components/app-shell";
import { ReportsDecisionPanel } from "../../components/reports-decision-panel";

export default function ReportsPage() {
  return (
    <AppShell
      actions={
        <>
          <Link className="secondary-button button-link" href="/exports">
            <Download aria-hidden="true" className="button-icon" />
            Dışa Aktar
          </Link>
          <Link className="primary-button button-link" href="/income">
            <Plus aria-hidden="true" className="button-icon" />
            Sefer Ekle
          </Link>
        </>
      }
      eyebrow="Finans analizi"
      title="Raporlar"
    >
      <ReportsDecisionPanel />
    </AppShell>
  );
}
