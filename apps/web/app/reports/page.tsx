import Link from 'next/link';
import { Download, Plus } from 'lucide-react';
import { AppShell } from '../../components/app-shell';
import { DailyReport } from '../../components/daily-report';
import { FuelTrendChart } from '../../components/fuel-trend-chart';
import { KmProfitTrendChart } from '../../components/km-profit-trend-chart';
import { MonthlyReport } from '../../components/monthly-report';
import { WeeklyReport } from '../../components/weekly-report';

export default function ReportsPage() {
  return (
    <AppShell
      actions={
        <>
          <Link className="secondary-button button-link" href="/exports">
            <Download aria-hidden="true" className="button-icon" />
            Disa Aktar
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
      <div className="reports-page-stack">
        <FuelTrendChart />
        <KmProfitTrendChart />
        <DailyReport />
        <WeeklyReport />
        <MonthlyReport />
      </div>
    </AppShell>
  );
}
