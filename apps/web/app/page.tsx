import Link from 'next/link';
import {
  CalendarClock,
  Fuel,
  Gauge,
  Play,
  Plus,
  ReceiptText,
  Wrench
} from 'lucide-react';
import { AppShell } from '../components/app-shell';
import { DailyIncomeDashboard } from '../components/daily-income-dashboard';

const breakEvenItems = [
  ['Paket payi', '700 TL'],
  ['Yakit', '820 TL'],
  ['Sabit gider', '420 TL'],
  ['Bakim rezervi', '340 TL']
];

const expenses = [
  ['Yakit', '820 TL', 36],
  ['Paket payi', '700 TL', 31],
  ['Sabit gider', '420 TL', 18],
  ['Bakim rezervi', '340 TL', 15]
];

const trips = [
  ['09:20', 'Kadikoy - Atasehir', '18 km', '620 TL', '312 TL'],
  ['11:05', 'Uskudar - Besiktas', '12 km', '480 TL', '249 TL'],
  ['14:40', 'Sisli - Bakirkoy', '27 km', '910 TL', '396 TL'],
  ['18:15', 'Levent - Maltepe', '31 km', '1.040 TL', '426 TL']
];

const quickActions = [
  { label: 'Sefer ekle', href: '/income', icon: Plus },
  { label: 'Gider ekle', href: '/expenses', icon: ReceiptText },
  { label: 'Yakit ekle', href: '/fuel', icon: Fuel },
  { label: 'Bakim ekle', href: '/maintenance', icon: Wrench }
];

const profitableWindows = [
  ['08:00 - 10:00', '210 TL/saat'],
  ['12:00 - 14:00', '186 TL/saat'],
  ['18:00 - 21:00', '268 TL/saat']
];

export default function HomePage() {
  return (
    <AppShell
      actions={
        <>
          <Link className="secondary-button button-link" href="/login">
            Giris
          </Link>
          <Link className="secondary-button button-link" href="/register">
            Kayit
          </Link>
          <Link className="secondary-button button-link" href="/income">
            <Play aria-hidden="true" className="button-icon" />
            Vardiya Baslat
          </Link>
          <Link className="primary-button button-link" href="/income">
            <Plus aria-hidden="true" className="button-icon" />
            Sefer Ekle
          </Link>
        </>
      }
      eyebrow="Bugun"
      title="Gercek net kar ozeti"
    >
      <DailyIncomeDashboard />

      <section className="dashboard-grid">
        <div className="dashboard-main">
          <section className="panel break-even-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Break-even</p>
                <h2>Paket ve gunluk maliyet esigi</h2>
              </div>
              <span className="status-pill">Asildi</span>
            </div>

            <div className="break-even-summary">
              <strong>1.240 TL</strong>
              <span>Bugun kara gecmek icin gereken minimum gelir</span>
            </div>
            <div
              aria-label="Break-even ilerlemesi"
              className="progress-track"
              role="progressbar"
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={100}
            >
              <span style={{ width: '100%' }} />
            </div>
            <div className="break-even-list">
              {breakEvenItems.map(([name, amount]) => (
                <div className="expense-row" key={name}>
                  <span>{name}</span>
                  <strong>{amount}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Son kayitlar</p>
                <h2>Sefer karliligi</h2>
              </div>
              <Link className="text-link" href="/income">
                Tum gelirler
              </Link>
            </div>
            <div className="trip-table" role="table" aria-label="Seferler">
              {trips.map(([time, routeName, km, gross, profit]) => (
                <div className="trip-row" role="row" key={`${time}-${routeName}`}>
                  <span>{time}</span>
                  <strong>{routeName}</strong>
                  <span>{km}</span>
                  <span>{gross}</span>
                  <b>{profit}</b>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="dashboard-side">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Hizli kayit</p>
                <h2>Operasyon aksiyonlari</h2>
              </div>
            </div>
            <div className="quick-action-grid">
              {quickActions.map((action) => {
                const Icon = action.icon;

                return (
                  <Link className="quick-action" href={action.href} key={action.href}>
                    <Icon aria-hidden="true" />
                    <span>{action.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Gider etkisi</p>
                <h2>Kar eriten kalemler</h2>
              </div>
            </div>
            <div className="cost-stack">
              {expenses.map(([name, amount, percentage]) => (
                <div className="cost-row" key={name}>
                  <div>
                    <span>{name}</span>
                    <strong>{amount}</strong>
                  </div>
                  <div className="mini-bar">
                    <span style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Vardiya</p>
                <h2>Aktif calisma ozeti</h2>
              </div>
              <Gauge aria-hidden="true" className="panel-icon" />
            </div>
            <div className="shift-summary">
              <div>
                <span>Sure</span>
                <strong>6s 00d</strong>
              </div>
              <div>
                <span>Toplam km</span>
                <strong>103 km</strong>
              </div>
              <div>
                <span>Sefer</span>
                <strong>7</strong>
              </div>
            </div>
          </section>
        </aside>
      </section>

      <section className="analytics-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Haftalik trend</p>
              <h2>Net kar iskeleti</h2>
            </div>
            <CalendarClock aria-hidden="true" className="panel-icon" />
          </div>
          <div className="trend-bars" aria-label="Haftalik net kar grafigi">
            {[42, 58, 35, 72, 88, 64, 76].map((height, index) => (
              <span key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Gun/saat analizi</p>
              <h2>Kazanc pencereleri</h2>
            </div>
          </div>
          <div className="profit-window-list">
            {profitableWindows.map(([windowLabel, value]) => (
              <div className="expense-row" key={windowLabel}>
                <span>{windowLabel}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
