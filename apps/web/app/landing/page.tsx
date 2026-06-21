import Link from 'next/link';
import {
  Calculator,
  Car,
  CheckCircle2,
  Download,
  Fuel,
  Gauge,
  LineChart,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  Timer,
  Wrench
} from 'lucide-react';

const benefits = [
  {
    icon: Calculator,
    title: 'Gercek net kar',
    text: 'Gelirden yakit, paket, sabit gider, bakim ve amortisman payini dus.'
  },
  {
    icon: Gauge,
    title: 'Km ve saat karliligi',
    text: 'Km basi ve saat basi kazanci ayni gun icinde net gor.'
  },
  {
    icon: PackageCheck,
    title: 'Paket break-even',
    text: 'Gunluk paket payini cikarmak icin gereken minimum geliri hesapla.'
  },
  {
    icon: Fuel,
    title: 'Yakit etkisi',
    text: 'Litre, tutar ve km sayaci ile yakitin kari ne kadar azalttigini izle.'
  }
];

const workflow = [
  ['01', 'Arac ve yakit varsayimini gir'],
  ['02', 'Vardiya veya sefer ekle'],
  ['03', 'Yakit, paket ve gideri kaydet'],
  ['04', 'Gunluk net kari raporda dogrula']
];

const costItems = [
  ['Yakit', '820 TL'],
  ['Paket payi', '700 TL'],
  ['Sabit gider', '420 TL'],
  ['Bakim rezervi', '340 TL'],
  ['Amortisman', '260 TL']
];

const modules = [
  { icon: ReceiptText, label: 'Sefer bazli gelir' },
  { icon: Fuel, label: 'Yakit analizi' },
  { icon: PackageCheck, label: 'TAG paket gideri' },
  { icon: Wrench, label: 'Bakim rezervi' },
  { icon: Car, label: 'Arac maliyeti' },
  { icon: Download, label: 'PDF / Excel export' }
];

const pricing = [
  ['Free deneme', '7 gun', 'Gercek verinle net kar motorunu test et.'],
  ['Pro', 'Aylik', 'Sinirsiz kayit, detayli rapor ve export.'],
  ['Premium', 'Yakinda', 'OCR, AI oneriler ve gelismis analiz.']
];

export default function LandingPage() {
  return (
    <main className="landing-page">
      <section className="landing-hero">
        <nav className="landing-nav" aria-label="Landing navigasyon">
          <Link className="landing-brand" href="/landing">
            <span className="brand-mark">TF</span>
            <span>TAG Finans</span>
          </Link>
          <div>
            <Link href="/login">Giris</Link>
            <Link className="primary-button" href="/register">
              Net Karimi Hesaplamaya Basla
            </Link>
          </div>
        </nav>

        <div className="landing-hero-content">
          <p className="eyebrow">
            TAG suruculeri icin finans operasyon uygulamasi
          </p>
          <h1>TAG Suruculeri Icin Gercek Kar Takibi</h1>
          <p>
            Gunluk gelirini, yakitini, paket ucretini, bakimini, sigortani,
            kilometreni ve gercek net karini tek panelden takip et.
          </p>
          <div className="landing-hero-actions">
            <Link className="primary-button" href="/register">
              Net Karimi Hesaplamaya Basla
            </Link>
            <Link className="secondary-button" href="/login">
              Web panele gir
            </Link>
          </div>
          <div className="landing-hero-metrics" aria-label="Urun metrikleri">
            <span>
              <strong>Km basi kar</strong>
              Net kar / toplam km
            </span>
            <span>
              <strong>Saatlik kar</strong>
              Net kar / aktif sure
            </span>
            <span>
              <strong>Break-even</strong>
              Paket + gider esigi
            </span>
          </div>
        </div>
      </section>

      <section className="landing-band landing-proof">
        <div className="landing-section-heading">
          <p className="eyebrow">Brut degil, net sonuc</p>
          <h2>Surucunun her gun sordugu sorulara tek ekranda cevap verir.</h2>
        </div>
        <div className="landing-proof-grid">
          <article className="landing-profit-panel">
            <div>
              <span>Bugunku brut gelir</span>
              <strong>3.850 TL</strong>
            </div>
            <div>
              <span>Gercek net kar</span>
              <strong>1.310 TL</strong>
            </div>
            <div>
              <span>Km basi net kar</span>
              <strong>12,70 TL</strong>
            </div>
            <div>
              <span>Saatlik net kar</span>
              <strong>218 TL</strong>
            </div>
          </article>

          <article className="landing-cost-panel">
            <h3>Kar eriten kalemler</h3>
            {costItems.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </article>
        </div>
      </section>

      <section className="landing-band">
        <div className="landing-section-heading">
          <p className="eyebrow">Farkli konumlandirma</p>
          <h2>Gelir-gider defteri degil, sefer bazli karlilik motoru.</h2>
        </div>
        <div className="landing-benefit-grid">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;

            return (
              <article className="landing-card" key={benefit.title}>
                <Icon aria-hidden="true" />
                <h3>{benefit.title}</h3>
                <p>{benefit.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="landing-band landing-workflow-band">
        <div className="landing-section-heading">
          <p className="eyebrow">Gunluk akis</p>
          <h2>10 saniyelik kayitlarla rapor guveni olustur.</h2>
        </div>
        <div className="landing-workflow">
          {workflow.map(([step, label]) => (
            <article key={step}>
              <strong>{step}</strong>
              <span>{label}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-band">
        <div className="landing-section-heading">
          <p className="eyebrow">MVP kapsamindaki moduller</p>
          <h2>Surucunun gercek maliyetini parcalara ayirir.</h2>
        </div>
        <div className="landing-module-grid">
          {modules.map((module) => {
            const Icon = module.icon;

            return (
              <div key={module.label}>
                <Icon aria-hidden="true" />
                <span>{module.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="landing-band landing-pricing-band">
        <div className="landing-section-heading">
          <p className="eyebrow">Ucretlendirme</p>
          <h2>Bir yanlis kar hesabi abonelikten daha pahali olabilir.</h2>
        </div>
        <div className="landing-pricing-grid">
          {pricing.map(([name, price, text]) => (
            <article className="landing-card" key={name}>
              <CheckCircle2 aria-hidden="true" />
              <h3>{name}</h3>
              <strong>{price}</strong>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-final-cta">
        <LineChart aria-hidden="true" />
        <div>
          <p className="eyebrow">Ilk hedef</p>
          <h2>Bugun gercekten kac TL kar ettigini hesapla.</h2>
        </div>
        <Link className="primary-button" href="/register">
          Hesap olustur
        </Link>
      </section>
    </main>
  );
}
