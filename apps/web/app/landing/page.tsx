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
    title: 'Gerçek net kâr',
    text: 'Gelirden yakıt, paket, sabit gider, bakım ve amortisman payını düş.'
  },
  {
    icon: Gauge,
    title: 'Km ve saat kârlılığı',
    text: 'Km başı ve saat başı kazancı aynı gün içinde net gör.'
  },
  {
    icon: PackageCheck,
    title: 'Paket başabaş noktası',
    text: 'Günlük paket payını çıkarmak için gereken minimum geliri hesapla.'
  },
  {
    icon: Fuel,
    title: 'Yakıt etkisi',
    text: 'Litre, tutar ve km sayacı ile yakıtın kârı ne kadar azalttığını izle.'
  }
];

const workflow = [
  ['01', 'Araç ve yakıt varsayımını gir'],
  ['02', 'Vardiya veya sefer ekle'],
  ['03', 'Yakıt, paket ve gideri kaydet'],
  ['04', 'Günlük net kârı raporda doğrula']
];

const costItems = [
  ['Yakıt', '820 TL'],
  ['Paket payı', '700 TL'],
  ['Sabit gider', '420 TL'],
  ['Bakım rezervi', '340 TL'],
  ['Amortisman', '260 TL']
];

const modules = [
  { icon: ReceiptText, label: 'Sefer bazlı gelir' },
  { icon: Fuel, label: 'Yakıt analizi' },
  { icon: PackageCheck, label: 'TAG paket gideri' },
  { icon: Wrench, label: 'Bakım rezervi' },
  { icon: Car, label: 'Araç maliyeti' },
  { icon: Download, label: 'PDF / Excel dışa aktarma' }
];

const pricing = [
  ['Free deneme', '7 gün', 'Gerçek verinle net kâr motorunu test et.'],
  ['Pro', 'Aylık', 'Sınırsız kayıt, detaylı rapor ve export.'],
  ['Premium', 'Yakında', 'OCR, AI öneriler ve gelişmiş analiz.']
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
            <Link href="/login">Giriş</Link>
            <Link className="primary-button" href="/register">
              Net Kârımı Hesaplamaya Başla
            </Link>
          </div>
        </nav>

        <div className="landing-hero-content">
          <p className="eyebrow">
            TAG sürücüleri için finans operasyon uygulaması
          </p>
          <h1>TAG Sürücüleri İçin Gerçek Kâr Takibi</h1>
          <p>
            Günlük gelirini, yakıtını, paket ücretini, bakımını, sigortanı,
            kilometreni ve gerçek net kârını tek panelden takip et.
          </p>
          <div className="landing-hero-actions">
            <Link className="primary-button" href="/register">
              Net Kârımı Hesaplamaya Başla
            </Link>
            <Link className="secondary-button" href="/login">
              Web panele gir
            </Link>
          </div>
          <div className="landing-hero-metrics" aria-label="Ürün metrikleri">
            <span>
              <strong>Km başı kâr</strong>
              Net kâr / toplam km
            </span>
            <span>
              <strong>Saatlik kâr</strong>
              Net kâr / aktif süre
            </span>
            <span>
              <strong>Başabaş</strong>
              Paket + gider eşiği
            </span>
          </div>
        </div>
      </section>

      <section className="landing-band landing-proof">
        <div className="landing-section-heading">
          <p className="eyebrow">Brüt değil, net sonuç</p>
          <h2>Sürücünün her gün sorduğu sorulara tek ekranda cevap verir.</h2>
        </div>
        <div className="landing-proof-grid">
          <article className="landing-profit-panel">
            <div>
              <span>Bugünkü brüt gelir</span>
              <strong>3.850 TL</strong>
            </div>
            <div>
              <span>Gerçek net kâr</span>
              <strong>1.310 TL</strong>
            </div>
            <div>
              <span>Km başı net kâr</span>
              <strong>12,70 TL</strong>
            </div>
            <div>
              <span>Saatlik net kâr</span>
              <strong>218 TL</strong>
            </div>
          </article>

          <article className="landing-cost-panel">
            <h3>Kâr eriten kalemler</h3>
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
          <p className="eyebrow">Farklı konumlandırma</p>
          <h2>Gelir-gider defteri değil, sefer bazlı kârlılık motoru.</h2>
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
          <p className="eyebrow">Günlük akış</p>
          <h2>10 saniyelik kayıtlarla rapor güveni oluştur.</h2>
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
          <p className="eyebrow">MVP kapsamındaki modüller</p>
          <h2>Sürücünün gerçek maliyetini parçalara ayırır.</h2>
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
          <p className="eyebrow">Ücretlendirme</p>
          <h2>Bir yanlış kâr hesabı abonelikten daha pahalı olabilir.</h2>
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
          <p className="eyebrow">İlk hedef</p>
          <h2>Bugün gerçekten kaç TL kâr ettiğini hesapla.</h2>
        </div>
        <Link className="primary-button" href="/register">
          Hesap oluştur
        </Link>
      </section>
    </main>
  );
}
