import Link from 'next/link';
import { Play, Plus } from 'lucide-react';
import { AppShell } from '../components/app-shell';
import { DailyIncomeDashboard } from '../components/daily-income-dashboard';

export default function HomePage() {
  return (
    <AppShell
      actions={
        <>
          <Link className="secondary-button button-link" href="/login">
            Giriş
          </Link>
          <Link className="secondary-button button-link" href="/register">
            Kayıt
          </Link>
          <Link className="secondary-button button-link" href="/income">
            <Play aria-hidden="true" className="button-icon" />
            Vardiya Başlat
          </Link>
          <Link className="primary-button button-link" href="/income">
            <Plus aria-hidden="true" className="button-icon" />
            Sefer Ekle
          </Link>
        </>
      }
      eyebrow="Bugün"
      title="Gerçek net kâr özeti"
    >
      <DailyIncomeDashboard />
    </AppShell>
  );
}
