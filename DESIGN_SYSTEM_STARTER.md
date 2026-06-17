# TAG Surucu Finans Yonetim Platformu - Tasarim Sistemi Baslangici

**Dokuman tarihi:** 17 Haziran 2026  
**Kapsam:** MVP icin UI temel kararları, tasarim tokenlari ve ana bilesenler  
**Hedef deneyim:** Profesyonel, hizli, guvenilir, finans odakli operasyon uygulamasi

## 1. Tasarim Yonu

Bu urun klasik gelir-gider takip uygulamasi gibi hafif ve genel hissettirmemelidir. Surucunun calisirken kullanacagi, net karini hizli anlayacagi profesyonel bir finans operasyon araci gibi hissettirmelidir.

Ana tasarim prensipleri:

- Mobilde tek elle hizli kayit.
- Dashboard'da once cevap, sonra detay.
- Finansal hesaplarda seffaflik.
- Tahmini ve kesin giderleri ayirma.
- Gereksiz dekorasyon yerine okunabilirlik.
- Web'de yogun ama taranabilir veri.
- Marka olarak Marti/TAG'i taklit etmeyen bagimsiz gorsel kimlik.

## 2. Marka ve Hukuki Konumlandirma

Uygulama Marti veya TAG markalarinin resmi urunu gibi gorunmemelidir.

Kacinilacaklar:

- Marti logosu, renkleri veya ikonlarini cagristiran tasarim.
- "Resmi TAG paneli" gibi ifadeler.
- Platform entegrasyonu varmis gibi UI.
- Marti uygulama ekranlarina benzer layout.

Kullanilabilecek konumlandirma:

> TAG yapan suruculer icin bagimsiz net kar takip araci.

Footer/landing notu:

> Bu uygulama bagimsiz bir finans takip aracidir. Marti veya TAG markalarinin resmi urunu, is ortagi ya da entegrasyonu degildir.

## 3. Gorsel Karakter

Hedef his:

- Net
- Guvenilir
- Finansal
- Modern
- Saha kullanimina uygun
- Abartisiz

Kacinilacak his:

- Sosyal medya uygulamasi gibi oyuncu
- Muhasebe programi kadar karmasik
- Tek renkli, agir ve koyu
- Resmi platform taklidi
- Pazarlama landing sayfasi agirlikli

## 4. Renk Sistemi

Renkler semantic token olarak kullanilmalidir. UI kodunda dogrudan renk adi yerine rol kullanilmalidir.

### 4.1 Ana Roller

```text
--color-bg
--color-surface
--color-surface-subtle
--color-border
--color-text
--color-text-muted
--color-primary
--color-primary-contrast
--color-success
--color-danger
--color-warning
--color-info
```

### 4.2 Finansal Roller

```text
--finance-profit
--finance-loss
--finance-cash-profit
--finance-true-profit
--finance-estimated-cost
--finance-fixed-cost
--finance-fuel
--finance-package
```

### 4.3 Onerilen Palet

Nötr zemin:

```text
bg: #F7F8FA
surface: #FFFFFF
surface-subtle: #EEF1F4
border: #D9DEE5
text: #111827
text-muted: #667085
```

Ana aksiyon:

```text
primary: #0F766E
primary-hover: #115E59
primary-contrast: #FFFFFF
```

Durum renkleri:

```text
success/profit: #15803D
danger/loss: #B42318
warning/estimated: #B54708
info: #2563EB
```

Maliyet kalemleri:

```text
fuel: #2563EB
package: #7C3AED
fixed-cost: #475467
maintenance: #B54708
depreciation: #93370D
```

Not:

- UI tek bir yesil/teal palete bogulmamali.
- Finans kartlarinda renk sadece anlam tasimak icin kullanilmali.
- Kirmizi sadece zarar, hata veya kritik uyari icin kullanilmali.

## 5. Tipografi

Onerilen font:

- Web: Inter veya system sans
- Mobil: platform system font

Tipografi rolleri:

```text
display-md: 32px / 40px / 700
heading-lg: 24px / 32px / 700
heading-md: 20px / 28px / 650
heading-sm: 16px / 24px / 650
body-md: 14px / 22px / 400
body-sm: 13px / 20px / 400
caption: 12px / 16px / 400
metric-lg: 36px / 42px / 750
metric-md: 28px / 34px / 750
metric-sm: 20px / 26px / 700
```

Kurallar:

- Finansal ana metrikler buyuk ve okunakli olmalidir.
- Kart icinde gereksiz hero boyutlu baslik kullanilmaz.
- Rapor tablolarinda 13-14px arasi okunabilir yogunluk hedeflenir.
- Harf araligi `0` olmalidir.
- Font boyutu viewport genisligiyle otomatik scale edilmez.

## 6. Spacing ve Layout

Spacing scale:

```text
4, 8, 12, 16, 20, 24, 32, 40, 48
```

Radius:

```text
sm: 4px
md: 6px
lg: 8px
```

Kurallar:

- Kart radius maksimum 8px.
- UI kart icine kart yerlestirilmez.
- Dashboard bolumleri net grid yapisinda olur.
- Mobilde tek kolon, webde 2-3 kolon metrik grid kullanilir.
- Tablo satir yuksekligi webde 44-52px arasi olmalidir.

## 7. Ikonografi

Onerilen ikon seti:

- Web: lucide-react
- Mobil: lucide-react-native veya Expo uyumlu ikon seti

Ikon kurallari:

- Hizli aksiyonlarda ikon + kisa label kullanilir.
- Finans kategorilerinde anlamli ikonlar kullanilir.
- Bilinmeyen ikonlarda tooltip veya label bulunur.
- Manuel SVG ikon cizimi yerine mevcut ikon kutuphanesi tercih edilir.

Onerilen ikon eslesmeleri:

```text
Sefer: Route
Gider: Receipt
Yakit: Fuel
Paket: Package
Bakim: Wrench
Rapor: BarChart3
Export: Download
Vardiya: Timer
Arac: Car
Ayar: Settings
Hedef: Target
Uyari: AlertTriangle
Kar: TrendingUp
Zarar: TrendingDown
```

## 8. Ana Bilesenler

### 8.1 MetricCard

Kullanim:

- Dashboard ana finans metrikleri.
- Rapor ozetleri.

Alanlar:

```text
title
value
currency/unit
subtitle
delta
status
onDetailsClick
```

Varyantlar:

- `profit`
- `loss`
- `neutral`
- `warning`
- `info`

Kurallar:

- Ana metrik tek bakista okunmali.
- Kart icinde hesaplama detayi degil, detay drawer linki bulunmali.

### 8.2 ProfitBreakdownDrawer

Kullanim:

- Net kar karti detaylari.
- Rapor hesap aciklamasi.

Icerik:

```text
Brut gelir
Yakit
Paket
Degisken gider
Sabit gider
Bakim/lastik
Amortisman
Nakit net kar
Gercek net kar
Hesaplama metodu
```

### 8.3 QuickActionBar

Mobil dashboard ana aksiyonlari:

```text
+ Sefer
+ Gider
Vardiyaya Basla / Bitir
```

Kurallar:

- Mobilde basparmak bolgesine yakin olmalidir.
- Aksiyonlar 44px altina dusmemelidir.

### 8.4 QuickTripForm

Zorunlu alanlar:

- Gelir
- Km
- Sure
- Odeme tipi

Opsiyonel alanlar:

- Bos km
- Bahsis
- Not
- Screenshot
- Lokasyon

Kurallar:

- Zorunlu alanlar ilk ekranda gorunur.
- Opsiyoneller "Detay ekle" altinda acilir.
- Kayit sonrasi sefer net kar sonucu gosterilir.

### 8.5 QuickExpenseForm

Kategori butonlari:

- Yakit
- Paket
- HGS
- Otopark
- Yikama
- Bakim
- Ceza
- Diger

Kurallar:

- Yakit, paket ve bakim secimi ozel forma yonlendirir.
- Diger giderlerde tutar + odeme tipi + kaydet yeterlidir.

### 8.6 ShiftStatusCard

Durumlar:

- Inactive
- Active
- Completed summary

Active state:

```text
Baslangic saati
Gecen sure
Sefer sayisi
Brut gelir
Anlik net kar
Toplam km
```

### 8.7 MissingDataWarning

Kullanim:

- Bakim maliyeti eksik
- Yakit tuketimi eksik
- Paket tanimli degil
- Amortisman kapali

Ton:

- Kullanici suclanmamalidir.
- Finansal etkinin ne oldugu soylenmelidir.

Ornek:

```text
Bakim maliyeti tanimli degil. Gercek net kar daha yuksek gorunuyor olabilir.
```

### 8.8 ReportPeriodTabs

Sekmeler:

- Gunluk
- Haftalik
- Aylik

Kurallar:

- Mobilde segmented control.
- Webde tabs + date picker.

### 8.9 ExportJobList

Alanlar:

- Donem
- Format
- Durum
- Olusturma tarihi
- Indir / Tekrar dene

## 9. Form Kurallari

Genel:

- Para alanlari TL formatli girilir.
- Decimal girislerde virgul ve nokta normalize edilir.
- Kaydet butonu form sonunda sabit ve net olmalidir.
- Form validasyonlari alan altinda gosterilir.
- Finansal sonuc etkisi mumkunse kaydetmeden once kisa ozetlenir.

Zorunlu alanlar:

- Minimum tutulur.
- Detayli veri opsiyonel olur.

Hata metinleri:

```text
Tutar 0'dan buyuk olmalidir.
Bitis km, baslangic km'den dusuk olamaz.
Bu tarih araliginda aktif paket var.
```

## 10. Tablo Kurallari

Web listelerinde tablo kullanilir.

Ortak kolonlar:

- Tarih
- Tip/kategori
- Tutar
- Km/sure
- Net etki
- Odeme tipi
- Islem

Kurallar:

- Satir tiklaninca detay paneli acilir.
- Filtreler tablo ustunde yer alir.
- Mobilde tablo yerine liste kartlari kullanilir.
- Finansal degerler saga hizalanir.
- Negatif degerler renk + isaret ile gosterilir.

## 11. Grafik Kurallari

Kutuphanesi:

- Web: Recharts
- Mobil MVP: sade kartlar; grafikler sinirli tutulabilir

Grafik tipleri:

- Gelir/gider trendi: line chart
- Gider dagilimi: donut veya horizontal bar
- Yakit trendi: line chart
- Km basi kar: line chart
- Saatlik kar: bar chart

Kurallar:

- Grafikler tek basina yorum gerektirmemeli; altinda kisa insight olabilir.
- Para eksenleri TL formatli olmalidir.
- Ayni grafikte cok fazla seri kullanilmaz.
- Mobilde grafikler basit tutulur, detay webde verilir.

## 12. Durumlar

### 12.1 Empty State

Ornek:

```text
Bugun henuz sefer kaydi yok.
Ilk seferini ekleyince net karini hesaplamaya baslayacagiz.
```

CTA:

```text
Ilk Seferi Ekle
```

### 12.2 Loading

- Skeleton kartlar kullanilir.
- Finansal metriklerde spinner yerine sabit alan skeleton tercih edilir.

### 12.3 Error

- Kullaniciya teknik hata detayi gosterilmez.
- Tekrar dene aksiyonu verilir.
- Request id sadece destek icin gosterilebilir.

### 12.4 Warning

- Hesaplama eksigi veya tahmini veri uyarilarinda amber ton kullanilir.
- Uyari kullanicinin kararini etkileyen bilgiyi net soyler.

## 13. Mobil Kurallari

- Ana aksiyonlar tek elle ulasilabilir olmalidir.
- Form alanlari buyuk dokunma hedeflerine sahip olmalidir.
- Minimum dokunma alani 44px.
- Dashboard kartlari dikey siralanir.
- Alt navigasyon en fazla 5 item icerir.
- Hizli sefer/gider kaydi modal veya bottom sheet olarak acilabilir.
- Detayli formlar tam ekran olabilir.

## 14. Web Kurallari

- Sol sidebar sabit olabilir.
- Topbar'da aktif arac ve tarih secimi bulunur.
- Dashboard 3 kolon metrik grid ile baslar.
- Liste ekranlarinda filtre, tablo ve detay paneli ayni ekranda yer alabilir.
- Admin panel kullanici uygulamasindan gorsel olarak ayirt edilmelidir.

## 15. Finansal Dil ve Mikro Metin

Kullanilacak dil:

- "Gercek net kar"
- "Nakit net"
- "Paket cikti"
- "Km basi net"
- "Saatlik net"
- "Yakit karin su kadarini goturdu"
- "Bakim/lastik payi"
- "Amortisman dahil"

Kacinilacak dil:

- "Komisyon"
- "Marti resmi"
- "Garanti kazanc"
- "Muhasebe beyannamesi"
- "Otomatik Marti baglantisi"

Ornek mesajlar:

```text
Bugun paket sonrasi kara gectin.
Kara gecmen icin 320 TL gelir gerekiyor.
Bakim maliyeti tanimli degil; gercek net kar yuksek gorunuyor olabilir.
Amortisman kapali. Sadece nakit akisini goruyorsun.
```

## 16. Erisilebilirlik

- Kontrast oranlari temel WCAG AA hedefini karsilamalidir.
- Kar/zarar sadece renkle anlatilmaz; isaret ve metin de kullanilir.
- Form alanlari label'siz birakilmaz.
- Hata mesajlari alanla iliskili olur.
- Klavye navigasyonu webde desteklenir.
- Grafikler icin metinsel ozet bulunur.

## 17. MVP Bilesen Envanteri

Ilk UI kutuphanesinde olmasi gerekenler:

- Button
- IconButton
- Input
- CurrencyInput
- DecimalInput
- Select
- SegmentedControl
- Tabs
- DatePicker
- Card
- MetricCard
- Badge
- Alert
- Drawer
- BottomSheet
- Modal
- Table
- EmptyState
- Skeleton
- Tooltip
- Progress
- Toast
- FileUpload
- ChartContainer

## 18. Tailwind Token Onerisi

Tailwind theme icin semantic renk anahtarlari:

```js
colors: {
  background: "var(--color-bg)",
  surface: "var(--color-surface)",
  border: "var(--color-border)",
  text: "var(--color-text)",
  muted: "var(--color-text-muted)",
  primary: "var(--color-primary)",
  success: "var(--color-success)",
  danger: "var(--color-danger)",
  warning: "var(--color-warning)",
  info: "var(--color-info)",
  finance: {
    profit: "var(--finance-profit)",
    loss: "var(--finance-loss)",
    cash: "var(--finance-cash-profit)",
    true: "var(--finance-true-profit)",
    estimated: "var(--finance-estimated-cost)",
    fuel: "var(--finance-fuel)",
    package: "var(--finance-package)"
  }
}
```

## 19. shadcn/ui Baslangic Bilesenleri

Ilk kurulacak shadcn/ui bilesenleri:

- button
- input
- label
- select
- checkbox
- switch
- tabs
- dialog
- sheet
- drawer
- dropdown-menu
- tooltip
- table
- badge
- alert
- card
- progress
- toast/sonner

## 20. Kabul Kriterleri

Tasarim sistemi MVP icin hazir sayilmasi icin:

- Semantic renk tokenlari tanimli olmalidir.
- MetricCard, QuickTripForm ve ProfitBreakdownDrawer tasarlanmis olmalidir.
- Mobil dashboard ve hizli kayit akislari tek elle kullanilabilir olmalidir.
- Web dashboard ve rapor tablolari taranabilir olmalidir.
- Kar/zarar/tahmini gider ayrimi sadece renkle degil metinle de yapilmalidir.
- UI Marti/TAG resmi urununu cagristirmemelidir.

