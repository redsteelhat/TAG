# TAG Surucu Finans Yonetim Platformu PRD

**Dokuman tarihi:** 17 Haziran 2026  
**Hedef cikti:** Production seviyesinde MVP  
**Production MVP hedefi:** 13 Eylul 2026  
**Beta yayin hedefi:** 14-20 Eylul 2026  
**Urun tipi:** Web + mobil finans operasyon platformu

## 1. Ozet

Bu urun, TAG yapan suruculerin gunluk, haftalik ve aylik gercek net karini hesaplayan profesyonel bir finans operasyon uygulamasidir. Klasik gelir-gider takip uygulamalarindan farkli olarak sefer, vardiya, kilometre, yakit, paket/kullanim bedeli, bakim, lastik, sigorta, MTV, amortisman, telefon, HGS, otopark ve diger arac maliyetlerini birlikte degerlendirir.

Ana vaat:

> Surucu brut kazanci degil, tum gorunen ve gorunmeyen maliyetler dusuldukten sonra gercekten kac TL kazandigini gorur.

Uygulama Marti veya TAG markalarinin resmi urunu, resmi entegrasyonu ya da is ortagi olarak konumlandirilmayacaktir. Marti'nin resmi TAG sayfasinda komisyon alinmadigi belirtildigi icin urun dilinde "komisyon" yerine kullanici tanimli "paket", "uyelik" veya "operasyonel kullanim bedeli" kullanilacaktir.

Kaynak notlari:

- Marti TAG resmi sayfasi: https://marti.tech/tag/
- Haberturk e-ulasim lisansi haberi: https://www.haberturk.com/marti-danistay-karariyla-e-ulasim-lisansi-almaya-hak-kazandi-3832442-ekonomi
- TAG davasinin 24 Haziran 2026'ya ertelendigi haber ornekleri: https://www.cnbce.com/haberler/tag-ve-taksiciler-arasindaki-davada-yine-karar-cikmadi-marti-tag-tag-taksi-tag-mahkeme-h21577

## 2. Urun Vizyonu ve Deger Onerisi

Surucu uygulamayi actiginda asagidaki sorularin net cevabini almalidir:

| Soru | Uygulamanin cevabi |
|---|---|
| Bugun gercekten kac TL kar ettim? | Gelir - yakit - paket - degisken gider - paylastirilmis sabit gider |
| Km basina kac TL kazaniyorum? | Net kar / toplam km |
| Saat basina kac TL kazaniyorum? | Net kar / aktif calisma suresi |
| Yakit karimi ne kadar eritiyor? | Sefer, gun ve ay bazinda yakit maliyeti |
| Hangi gun/saat daha karli? | Trend ve sonraki surumde isi haritasi |
| Paket ucretini cikardim mi? | Gunluk/haftalik break-even analizi |
| Aracimin gercek maliyeti ne? | Bakim, lastik, sigorta, MTV, amortisman dahil |
| Bu is mantikli mi? | Aylik net kar, km basi kar, yipranma ve senaryo analizi |

North Star:

> Haftalik gercek net kar raporu goruntuleyen aktif surucu sayisi.

## 3. Hedef Kullanicilar

### 3.1 Birincil Persona: Aktif TAG Surucusu

Ozellikler:

- Gunluk veya haftalik TAG yapar.
- Yakit, paket, bakim ve km hesabini manuel tutmakta zorlanir.
- "Bugun iyi kazandim mi?" sorusuna net cevap alamaz.
- Brut geliri kar sanabilir.
- Telefondan hizli kayit girmek ister.
- Excel bilmeyebilir ama rapor gormek ister.

Urun onceligi:

- 10 saniyede sefer/gider ekleme.
- Mobil dashboard'da bugunku net kar cevabi.
- Yakit, paket ve km maliyetlerinin otomatik hesaba katilmasi.

### 3.2 Ikincil Persona: Yan Is Olarak TAG Yapan Arac Sahibi

Ozellikler:

- Haftada birkac gun calisir.
- Aracin masrafini cikarmak ister.
- Uzun vadeli yipranmayi genellikle hesaplamaz.
- En cok "bu is bana degiyor mu?" cevabini arar.

Urun onceligi:

- Aylik gercek kar raporu.
- Bakim, lastik, sigorta ve amortisman dahil arac maliyeti.
- Senaryo analizi.

### 3.3 Ucuncul Persona: Coklu Arac / Surucu Takip Eden Kullanici

Ilk surumde ana hedef degildir. B2B/Fleet paketi icin sonraki fazda ele alinacaktir.

## 4. MVP Kapsami

### 4.1 P0 - Olmazsa Olmaz

- Kullanici kayit/giris
- Arac tanimlama
- Gelir/sefer kaydi
- Gider kaydi
- Yakit kaydi
- TAG paket/kullanim gideri
- Gunluk net kar hesabi
- Haftalik/aylik rapor
- Km basi kar
- Saatlik kar
- Mobil hizli kayit
- Web dashboard
- Excel/PDF export
- Gunluk DB backup
- Monitoring

P0 kabul kriteri:

> Bir surucu aracini, yakit tuketimini ve paketini tanimlayip sefer/gider girdiginde uygulama bugunku gercek net kari, km basi kari, saatlik kari ve break-even durumunu dogru gosterebilmelidir.

### 4.2 P1 - Guclu Urun Algisi

- Bakim takibi
- Sabit gider dagitimi
- Amortisman
- Hedef belirleme
- Hatirlatmalar
- Fis/screenshot arsivi
- Kategori ozellestirme
- Gelismis grafikler

Bakim, sabit gider ve amortisman urun vaadi acisindan P0.5 olarak ele alinmalidir. Launch riski olusursa basit versiyonlariyla cikilabilir.

### 4.3 P2 - Rekabet Avantaji

- OCR ile fis okuma
- Screenshot'tan gelir/gider cikarma
- AI karlilik onerileri
- En karli saat/gun analizi
- Coklu arac
- Surucu karsilastirma
- Muhasebeci/ekip erisimi
- Topluluk benchmark verisi

### 4.4 Ilk MVP'de Olmayacaklar

- Marti hesabina otomatik baglanma
- Resmi olmayan scraping
- Tam otomatik banka entegrasyonu
- Coklu ulke destegi
- Muhasebe beyanname sistemi
- Karmasik filo yonetimi
- Sosyal ag/forum
- Gereksiz AI chatbot

## 5. Ana Kullanici Yolculuklari

### 5.1 Ilk Kurulum

Akis:

1. Kayit ol
2. Arac ekle
3. Yakit tuketimi gir
4. Sabit giderleri gir
5. TAG paket/kullanim giderini gir
6. Gunluk hedef belirle
7. Dashboard hazir

Kabul kriteri:

- Kullanici kurulum sonunda bos dashboard degil, hesaplama altyapisi hazir bir finans ekrani gormelidir.
- Ilk sefer ekleme CTA'si gorunmelidir.

### 5.2 Gunluk Calisma

Akis:

1. Vardiyaya basla
2. Sefer ekle
3. Yakit/gider ekle
4. Vardiyayi bitir
5. Gunluk net kari gor

Kabul kriteri:

- Vardiya sonunda brut gelir, net kar, toplam km, aktif sure, km basi kar, saatlik kar, paket durumu ve yakit maliyeti gorunmelidir.

### 5.3 Gercek Kar Analizi

Akis:

1. Aylik rapora gir
2. Brut geliri gor
3. Yakit giderini gor
4. Paket giderini gor
5. Bakim/amortisman payini gor
6. Gercek net kari gor

Kabul kriteri:

- Rapor nakit net kar ve gercek net kar ayrimini acik gostermelidir.

### 5.4 Karar Destek

Akis:

1. Senaryo analizi ac
2. Paket tutarini degistir
3. Yakit fiyatini degistir
4. Gunluk km hedefini degistir
5. Tahmini net kari gor

Kabul kriteri:

- Sistem tablo yerine karar cumlesi uretmelidir.
- Ornek: "Yakit 2 TL artarsa gunluk net karin yaklasik 74 TL duser."

## 6. Ana Ekranlar

### 6.1 Mobil Uygulama

Mobil uygulama surucunun ana calisma araci olacaktir.

#### Dashboard

Gosterilecek metrikler:

- Bugunku brut gelir
- Bugunku net kar
- Bugunku toplam gider
- Toplam km
- Km basi net kar
- Saatlik net kar
- Paket cikarildi mi?
- Yakit maliyeti
- Gunluk hedef durumu

Birincil aksiyonlar:

- `+ Sefer`
- `+ Gider`
- `Vardiyaya Basla`

#### Hizli Sefer Ekle

Varsayilan form 10 saniyede tamamlanabilecek kadar kisa olmalidir.

Zorunlu alanlar:

- Gelir
- Km
- Sure
- Odeme tipi

Opsiyonel alanlar:

- Bos km
- Bahsis/ekstra
- Not
- Screenshot
- Lokasyon
- Yakiti otomatik hesapla

Kayit sonrasi ozet:

- Bu sefer net kar
- Km basi net kar
- Yakit maliyeti

#### Hizli Gider Ekle

On tanimli butonlar:

- Yakit
- Paket
- Otopark
- HGS
- Yikama
- Bakim
- Ceza
- Diger

Yakit, paket ve bakim secimleri ozel akis acmalidir.

#### Vardiya Modu

Baslangic:

- Baslangic saati
- Baslangic km

Bitis:

- Bitis saati
- Bitis km
- Toplam sure
- Toplam km
- Sefer sayisi
- Gunluk net kar

### 6.2 Web Panel

Web, mobilin genisletilmis analiz ve yonetim panelidir.

| Ekran | Amac |
|---|---|
| Dashboard | Genel finans ozeti |
| Gelirler | Sefer bazli gelir listesi |
| Giderler | Detayli gider yonetimi |
| Yakit | Yakit tuketim analizi |
| Araclar | Arac bilgileri |
| Paketler | TAG paket/kullanim giderleri |
| Bakim | Servis ve bakim takibi |
| Raporlar | Detayli analiz |
| Hedefler | Gunluk/aylik hedefler |
| Disa Aktarma | Excel/PDF |
| Ayarlar | Kategoriler, arac, kullanici |

## 7. Fonksiyonel Gereksinimler

### 7.1 Auth

- Kullanici register/login yapabilmelidir.
- JWT access token ve refresh token kullanilmalidir.
- Refresh token rotation zorunludur.
- Kullanici aktif cihaz/oturumlarini gorebilmelidir.
- Kullanici tum cihazlardan cikis yapabilmelidir.
- Kullanici hesap silme ve veri export talebi olusturabilmelidir.

### 7.2 Arac Profili

Alanlar:

- Marka/model
- Plaka
- Yakit tipi
- Ortalama tuketim litre/100 km
- Guncel km sayaci
- Amortisman acik/kapali
- Amortisman modeli
- Yillik tahmini deger kaybi
- Yillik tahmini km

Ilk surumde tek aktif arac varsayilir.

### 7.3 Gelir / Sefer

Sefer alanlari:

- Sefer tarihi
- Baslangic saati
- Bitis saati
- Brut gelir
- Bahsis/ekstra
- Iptal geliri
- Odeme tipi
- Baslangic lokasyonu
- Bitis lokasyonu
- Sefer km
- Bos km
- Toplam km
- Not
- Screenshot/ek

Her sefer su metrikleri uretmelidir:

- Net sefer kari
- Km basi gelir
- Km basi net kar
- Saatlik gelir
- Saatlik net kar
- Tahmini yakit maliyeti
- Paket payi

### 7.4 Gider

Giderler kategori degil, maliyet davranisi bazinda siniflandirilmalidir.

Gider tipleri:

- Degisken gider
- Sabit gider
- Yari degisken gider
- Platform/paket gideri
- Finansman gideri
- Amortisman
- Operasyon gideri

Dagitim tipleri:

- Aninda
- Gunluk
- Aylik
- Yillik
- Km basina
- Sefer basina
- Paket donemine

### 7.5 Yakit

Alanlar:

- Yakit tipi
- Litre
- Tutar
- Litre fiyati
- Km sayaci
- Depo doluluk tipi
- Full depo bilgisi
- Fis fotografi
- Istasyon
- Sehir/ilce
- Odeme tipi

Analizler:

- 100 km'de tuketim
- Km basi yakit maliyeti
- Gunluk yakit maliyeti
- Sefer basina tahmini yakit
- Bos km yakit maliyeti
- Yakit fiyat artisi etkisi
- Full depo yontemiyle gercek tuketim

### 7.6 TAG Paket / Kullanim Giderleri

Alanlar:

- Paket adi
- Paket tutari
- Baslangic tarihi
- Bitis tarihi
- Gecerlilik suresi
- Dagitim yontemi: gun, sefer veya km
- Break-even hedefi

Varsayilan dagitim yontemi gun bazlidir.

Dashboard'da:

- Paket cikti/cikmadi
- Kalan break-even geliri
- Ortalama sefer gelirine gore tahmini sefer sayisi

### 7.7 Bakim ve Servis

Kategoriler:

- Periyodik bakim
- Mekanik
- Elektrik
- Lastik
- Klima
- Kaporta
- Temizlik

Bakim giderleri varsayilan olarak dogrudan o gune yazilmaz, km'ye dagitilir.

### 7.8 Sabit Giderler

Desteklenecek giderler:

- Trafik sigortasi
- Kasko
- MTV
- Muayene
- Egzoz muayene
- Arac kredisi
- Otopark aboneligi
- Telefon hatti
- Internet paketi

Kullanici dagitim metodunu secebilmelidir:

- Takvim gunu bazli
- Aktif gun bazli
- Km bazli

### 7.9 Amortisman

Kullanici amortismani acip kapatabilmelidir.

Modeller:

- Aylik amortisman
- Km bazli amortisman

Raporlarda nakit net kar ve gercek net kar ayrimi gosterilmelidir.

### 7.10 Export

Ilk surumde:

- Gunluk/haftalik/aylik Excel export
- Gunluk/haftalik/aylik PDF rapor
- Export job durumu
- Export gecmisi

## 8. Hesaplama Motoru

Hesaplama motoru ortak `packages/shared` paketi icinde yazilmalidir. Backend, web ve mobil ayni hesap fonksiyonlarini kullanmalidir.

### 8.1 Gunluk Net Kar

```text
 daily_net_profit =
 daily_gross_income
 - daily_fuel_cost
 - daily_tag_package_cost
 - daily_variable_expenses
 - daily_allocated_fixed_expenses
 - daily_maintenance_reserve
 - daily_depreciation
```

Iki farkli kar tipi uretilecektir:

```text
 daily_cash_profit =
 daily_gross_income
 - daily_fuel_cost
 - daily_tag_package_cost
 - daily_variable_expenses
```

```text
 daily_true_profit =
 daily_cash_profit
 - daily_allocated_fixed_expenses
 - daily_maintenance_reserve
 - daily_depreciation
```

### 8.2 Yakit Maliyeti

```text
 fuel_cost_per_km =
 last_fuel_price_per_liter * average_liter_per_100km / 100
```

```text
 trip_fuel_cost =
 trip_total_km * fuel_cost_per_km
```

### 8.3 Sabit Gider Dagitimi

Takvim gunu:

```text
 daily_fixed_cost = monthly_fixed_expenses / days_in_month
```

Aktif gun:

```text
 daily_fixed_cost = monthly_fixed_expenses / active_days_in_month
```

Km bazli:

```text
 fixed_cost_per_km = monthly_fixed_expenses / monthly_total_km
 daily_fixed_cost = fixed_cost_per_km * daily_total_km
```

Varsayilan: takvim gunu bazli.

### 8.4 Paket Dagitimi

Gun bazli:

```text
 package_cost_per_day = package_amount / package_duration_days
```

Sefer bazli:

```text
 package_cost_per_trip = package_amount / trip_count_in_package_period
```

Km bazli:

```text
 package_cost_per_km = package_amount / total_km_in_package_period
```

Varsayilan: gun bazli.

### 8.5 Bakim Rezervi

```text
 maintenance_cost_per_km =
 maintenance_amount / maintenance_interval_km
```

```text
 daily_maintenance_reserve =
 daily_total_km * maintenance_cost_per_km
```

### 8.6 Amortisman

Aylik model:

```text
 daily_depreciation =
 annual_depreciation_amount / 12 / days_in_month
```

Km bazli model:

```text
 depreciation_per_km =
 annual_depreciation_amount / annual_estimated_km
```

```text
 daily_depreciation =
 daily_total_km * depreciation_per_km
```

### 8.7 Koruma Kurallari

- `total_km = 0` ise km basi metrik "hesaplanamadi" olmalidir.
- `active_hours = 0` ise saatlik metrik "hesaplanamadi" olmalidir.
- Paket yoksa paket maliyeti `0`.
- Amortisman kapaliysa amortisman `0`.
- Bakim verisi yoksa bakim rezervi `0`, ancak kullaniciya uyari gosterilir.
- Her raporda kullanilan hesaplama metodu gosterilir.
- Hesaplanan kayitlarda hesaplama versiyonu saklanir.

## 9. Veri Modeli

Ana tablolar:

- users
- vehicles
- driver_profiles
- shifts
- trips
- income_entries
- expense_entries
- fuel_entries
- maintenance_entries
- recurring_expenses
- tag_packages
- goals
- attachments
- reports
- categories
- payment_methods
- export_jobs
- notifications

Temel iliskiler:

- User 1-n Vehicle
- Vehicle 1-n Trip
- Vehicle 1-n Expense
- Vehicle 1-n FuelEntry
- Vehicle 1-n MaintenanceEntry
- User 1-n Shift
- Shift 1-n Trip
- Trip 1-n Attachment
- Expense 1-n Attachment
- Vehicle 1-n TagPackage

### 9.1 Trips

Alanlar:

- id
- user_id
- vehicle_id
- shift_id
- trip_date
- started_at
- ended_at
- gross_income
- tip_amount
- cancellation_income
- payment_method
- pickup_location
- dropoff_location
- trip_km
- deadhead_km
- total_km
- estimated_fuel_cost
- allocated_package_cost
- allocated_fixed_cost
- allocated_maintenance_cost
- allocated_depreciation_cost
- allocated_other_variable_cost
- net_profit
- profit_calculation_version
- note
- created_at
- updated_at

### 9.2 Expense Entries

Alanlar:

- id
- user_id
- vehicle_id
- category_id
- expense_type
- amount
- expense_date
- allocation_type
- allocation_period_start
- allocation_period_end
- odometer_km
- is_recurring
- payment_method
- receipt_url
- note
- created_at
- updated_at

### 9.3 Fuel Entries

Alanlar:

- id
- user_id
- vehicle_id
- fuel_type
- amount
- liters
- price_per_liter
- odometer_km
- station_name
- full_tank
- payment_method
- receipt_url
- created_at

### 9.4 Attachments

Polymorphic iliski yerine acik nullable foreign key kullanilmalidir.

Alanlar:

- id
- user_id
- trip_id nullable
- expense_entry_id nullable
- fuel_entry_id nullable
- maintenance_entry_id nullable
- file_url
- file_type
- original_name
- created_at

## 10. Onerilen Teknik Mimari

Monorepo:

```text
 TAG/
   apps/
     web/
     mobile/
     api/
   packages/
     shared/
     config/
   prisma/
   docker-compose.yml
   pnpm-workspace.yaml
```

### 10.1 Web

- Next.js
- Tailwind CSS
- shadcn/ui
- Recharts
- Zustand
- TanStack Query
- React Hook Form
- Zod

### 10.2 Mobil

- React Native
- Expo
- SQLite
- Zustand
- TanStack Query
- Expo Notifications
- Expo Image Picker

### 10.3 Backend

- NestJS
- PostgreSQL
- Prisma
- JWT + refresh token
- BullMQ + Redis
- S3/R2 compatible storage
- Swagger
- Pino
- Sentry + OpenTelemetry

### 10.4 Deployment

- Web: Vercel veya VPS
- API: Hetzner VPS / Railway / Render
- DB: Managed PostgreSQL veya VPS PostgreSQL
- Storage: Cloudflare R2 / AWS S3
- CDN: Cloudflare
- Monitoring: Sentry
- Analytics: PostHog

## 11. Admin Panel

Ilk surumde minimum admin panel olmalidir.

Ozellikler:

- Kullanici listesi
- Aktif kullanici sayisi
- Kayit sayilari
- Hata loglari
- Abonelik durumu
- Feedback listesi
- Export talepleri
- Sistem metrikleri
- Kategori sablonlari
- Duyuru gonderme

Admin rolleri:

- USER
- ADMIN
- SUPER_ADMIN

MVP'de ADMIN yeterlidir; SUPER_ADMIN ileride ayrilabilir.

## 12. KVKK ve Guvenlik

Mutlaka olmalidir:

- Sifre hash: Argon2 tercih, bcrypt kabul edilebilir
- JWT access + refresh token
- Refresh token rotation
- Rate limiting
- Device/session management
- Loglarda kisisel veri maskeleme
- Dosya yukleme guvenligi
- S3/R2 private bucket
- Gunluk DB backup
- Kullanici veri silme talebi
- Acik riza ve aydinlatma metni
- Export account data
- Delete account

Hassas veriler:

- Plaka
- Telefon
- E-posta
- Lokasyon
- Gelir bilgisi
- Gider bilgisi
- Arac ruhsat/fis gorselleri
- Sefer saatleri
- Kullanici finansal performansi
- Cihaz/oturum bilgileri

Log maskeleme ornekleri:

```text
 34ABC123 -> 34***123
 +90 555 123 45 67 -> +90 555 *** ** 67
```

## 13. Riskler ve Onlemler

### 13.1 Hukuki / Pazar Riski

Risk:

- TAG tarafinda hukuki surecler ve kamuoyu tartismalari degisebilir.
- Uygulama resmi Marti/TAG araci gibi algilanirsa marka ve hukuki risk dogar.

Onlemler:

- Uygulama adinda Marti markasi kullanilmaz.
- Logo, renk ve ikonlar Marti'yi cagristiracak sekilde tasarlanmaz.
- "Resmi entegrasyon" veya "resmi surucu paneli" dili kullanilmaz.
- Resmi izin olmadan API entegrasyonu yapilmaz.
- Veri manuel, CSV, foto veya ileride OCR ile alinir.
- KVKK metni, kullanim sartlari ve acik riza metni launch oncesi hazirlanir.
- 24 Haziran 2026 durusmasi sonrasi landing ve reklam dili tekrar gozden gecirilir.

### 13.2 Veri Girisi Zorlugu

Risk:

- Surucu surekli veri girmek istemeyebilir.

Onlemler:

- 10 saniyede gelir ekleme
- 10 saniyede gider ekleme
- Varsayilan degerler
- Kopyala/tekrar et
- Vardiya bazli toplu giris
- Screenshot/fis ekleme
- Sonraki surumde OCR

### 13.3 Hesaplama Guveni

Risk:

- Yanlis kar hesabi kullanici guvenini oldurur.

Onlemler:

- Her hesaplamanin altinda aciklama gosterilir.
- Tahmini ve kesin giderler ayrilir.
- Kullanici hesaplama metodunu secebilir.
- Finans motoru icin unit test yazilir.
- Rapor ekraninda formul gosterilir.

## 14. Basari Metrikleri

### 14.1 Urun Metrikleri

| Metrik | Hedef |
|---|---:|
| Ilk kayit sonrasi arac ekleme orani | %70+ |
| Ilk gun gelir/gider kaydi giren kullanici | %50+ |
| 7 gun retention | %35+ |
| 30 gun retention | %20+ |
| Haftalik aktif kullanici | %30+ |
| Ucretli donusum | %5-10 |
| Gunluk ortalama kayit | 5+ |
| Export kullanan kullanici | %15+ |

Ek metrikler:

- Ilk dashboard degerini goren kullanici
- Ilk 3 gunde en az 2 gun kayit giren kullanici
- Net kar detayini acan kullanici
- Paket break-even kartini goren kullanici
- Vardiya baslatip bitiren kullanici
- Hesaplama metodu degistiren kullanici

### 14.2 Finansal Metrikler

| Metrik | Hedef |
|---|---:|
| Ilk 100 beta kullanici | 30 gun |
| Ilk 20 ucretli kullanici | 60 gun |
| Ilk 100 ucretli kullanici | 4-6 ay |
| Churn | Aylik <%8 |
| ARPU | Orta segment abonelik |

## 15. Ucretlendirme

Onerilen model:

| Paket | Fiyat mantigi | Ozellik |
|---|---|---|
| Free Trial | 7 gun ucretsiz | Tum Pro ozellikleri sinirli sure |
| Pro | Aylik abonelik | Sinirsiz kayit, dashboard, rapor, export |
| Premium | Daha yuksek abonelik | OCR, AI oneri, gelismis analiz |
| Fleet | Arac basi fiyat | Coklu arac, surucu, yetkiler, filo raporlari |

Ana satis mesaji:

> Bir yanlis yakit/kar hesabi zaten aylik abonelik ucretinden fazla zarar ettirir.

## 16. Landing Page Mesaji

Ana baslik:

> TAG Suruculeri Icin Gercek Kar Takibi

Alt baslik:

> Gunluk gelirini, yakitini, paket ucretini, bakimini, sigortani, kilometrini ve gercek net karini tek ekrandan takip et.

CTA:

> Net Karimi Hesaplamaya Basla

One cikan faydalar:

- Bugunku gercek net karini gor
- Paket ucretini cikardin mi aninda ogren
- Km basi ve saat basi kazancini hesapla
- Yakitin karini ne kadar azalttigini gor
- Bakim, lastik ve amortismani hesaba kat
- Excel/PDF rapor al

Bagimsizlik notu:

> Bu uygulama bagimsiz bir finans takip aracidir. Marti veya TAG markalarinin resmi urunu, is ortagi ya da entegrasyonu degildir.

## 17. Sprint ve Termin Plani

### Sprint 0 - Hazirlik ve Urun Netlestirme

**Tarih:** 17-21 Haziran 2026  
**Hedef:** Urun kapsamini kilitlemek, teknik mimariyi belirlemek, backlog hazirlamak.

Ciktilar:

- PRD dokumani
- MVP kapsam listesi
- Kullanici akislari
- Wireframe taslaklari
- DB sema taslagi
- API contract taslagi
- Tasarim sistemi baslangici
- GitHub repo kurulumu
- CI/CD iskeleti

### Sprint 1 - Foundation, Auth, Arac Profili

**Tarih:** 22 Haziran-5 Temmuz 2026  
**Cikti:** Kullanici kayit olup arac tanimlayabilecek.

### Sprint 2 - Gelir, Sefer ve Vardiya Modulu

**Tarih:** 6-19 Temmuz 2026  
**Cikti:** Surucu gunluk seferlerini ve vardiyasini kaydedebilecek.

### Sprint 3 - Gider, Yakit ve Paket Modulu

**Tarih:** 20 Temmuz-2 Agustos 2026  
**Cikti:** Surucu gelir + gider + yakit + paket maliyetini birlikte gorebilecek.

### Sprint 4 - Kar-Zarar Motoru ve Raporlama

**Tarih:** 3-16 Agustos 2026  
**Cikti:** Uygulama "Bugun gercekten kac TL kar ettin?" sorusuna cevap verir.

### Sprint 5 - Bakim, Sabit Gider, Export ve Bildirimler

**Tarih:** 17-30 Agustos 2026  
**Cikti:** Urun profesyonel finans takip araci seviyesine yaklasir.

### Sprint 6 - Production Hardening ve Beta

**Tarih:** 31 Agustos-13 Eylul 2026  
**Cikti:** Beta kullanicilarina acilabilecek production MVP.

### Launch Haftasi

**Tarih:** 14-20 Eylul 2026  
**Cikti:** Ilk kullanicilarla canli validasyon.

## 18. Kabul Kriterleri

Production MVP tamamlanmis sayilmasi icin:

- Kullanici kayit olabilir ve giris yapabilir.
- Kullanici arac profili olusturabilir.
- Kullanici sefer, gider, yakit ve paket kaydi girebilir.
- Gunluk dashboard gercek net kari gosterir.
- Haftalik ve aylik raporlar calisir.
- Km basi ve saatlik kar hesaplanir.
- Paket break-even durumu gosterilir.
- Nakit net kar ve gercek net kar ayrilir.
- Excel/PDF export alinabilir.
- Backup ve monitoring aktiftir.
- KVKK temel akislar tamamdir: aydinlatma, riza, veri export, hesap silme.
- Hesaplama motoru unit testleri gecmektedir.
- Mobil hizli kayit akisinda gelir ve gider kaydi 10 saniye hedefini karsilar.

## 19. Varsayimlar

- Ilk surum tek kullanici + tek aktif arac odaklidir.
- Coklu arac veri modeli desteklenebilir, ancak UI/abonelik olarak P2'de acilir.
- Resmi Marti/TAG entegrasyonu yoktur.
- Tum veriler kullanici tarafindan manuel, dosya veya ileride OCR ile girilir.
- Ilk surumde offline draft desteklenir; tam offline sync sonraki fazdir.
- Hukuki metinler launch oncesi avukat kontrolunden gecmelidir.

