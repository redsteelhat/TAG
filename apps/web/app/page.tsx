import Link from 'next/link';

const metrics = [
  {
    label: 'Bugunku brut gelir',
    value: '3.850 TL',
    detail: '7 sefer'
  },
  {
    label: 'Bugunku net kar',
    value: '1.460 TL',
    detail: 'Paket ve yakit dusuldu'
  },
  {
    label: 'Km basi net kar',
    value: '14,20 TL',
    detail: '103 km toplam'
  },
  {
    label: 'Saatlik net kar',
    value: '243 TL',
    detail: '6 saat aktif sure'
  }
];

const expenses = [
  ['Yakit', '820 TL'],
  ['Paket payi', '700 TL'],
  ['HGS / otopark', '110 TL'],
  ['Sabit gider payi', '420 TL'],
  ['Bakim rezervi', '340 TL']
];

const trips = [
  ['09:20', 'Kadikoy - Atasehir', '18 km', '620 TL', '312 TL'],
  ['11:05', 'Uskudar - Besiktas', '12 km', '480 TL', '249 TL'],
  ['14:40', 'Sisli - Bakirkoy', '27 km', '910 TL', '396 TL'],
  ['18:15', 'Levent - Maltepe', '31 km', '1.040 TL', '426 TL']
];

export default function HomePage() {
  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Ana navigasyon">
        <Link className="brand" href="/">
          <span className="brand-mark">TF</span>
          <div>
            <p className="brand-name">TAG Finans</p>
            <p className="brand-subtitle">Surucu operasyon paneli</p>
          </div>
        </Link>

        <nav className="nav-list">
          <a className="nav-item active" href="/">
            Dashboard
          </a>
          <a className="nav-item" href="/">
            Gelirler
          </a>
          <a className="nav-item" href="/">
            Giderler
          </a>
          <a className="nav-item" href="/">
            Yakit
          </a>
          <a className="nav-item" href="/">
            Paketler
          </a>
          <a className="nav-item" href="/">
            Raporlar
          </a>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Bugun</p>
            <h1>Gercek net kar ozeti</h1>
          </div>
          <div className="actions">
            <Link className="secondary-button button-link" href="/login">
              Giris
            </Link>
            <Link className="secondary-button button-link" href="/register">
              Kayit
            </Link>
            <button className="secondary-button" type="button">
              Vardiya Baslat
            </button>
            <button className="primary-button" type="button">
              Sefer Ekle
            </button>
          </div>
        </header>

        <section className="metric-grid" aria-label="Gunluk metrikler">
          {metrics.map((metric) => (
            <article className="metric-card" key={metric.label}>
              <p>{metric.label}</p>
              <strong>{metric.value}</strong>
              <span>{metric.detail}</span>
            </article>
          ))}
        </section>

        <section className="content-grid">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Kar zarari etkileyenler</p>
                <h2>Gider kirilimi</h2>
              </div>
              <span className="status-pill">Break-even asildi</span>
            </div>
            <div className="expense-list">
              {expenses.map(([name, amount]) => (
                <div className="expense-row" key={name}>
                  <span>{name}</span>
                  <strong>{amount}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Son kayitlar</p>
                <h2>Sefer karliligi</h2>
              </div>
            </div>
            <div className="trip-table" role="table" aria-label="Seferler">
              {trips.map(([time, route, km, gross, profit]) => (
                <div className="trip-row" role="row" key={`${time}-${route}`}>
                  <span>{time}</span>
                  <strong>{route}</strong>
                  <span>{km}</span>
                  <span>{gross}</span>
                  <b>{profit}</b>
                </div>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
