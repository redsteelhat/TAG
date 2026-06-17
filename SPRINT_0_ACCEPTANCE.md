# Sprint 0 Kabul Kriterleri

**Dokuman tarihi:** 17 Haziran 2026  
**Sprint:** Sprint 0 - Hazirlik ve Urun Netlestirme  
**Durum:** Kapanisa hazir

## 1. Kabul Kriteri Ozeti

| Kriter | Durum | Kanit |
|---|---|---|
| Tum P0 moduller netlesmis olacak | Tamamlandi | `MVP_SCOPE.md`, `PRD.md` |
| Tasarim ve backend tarafinda veri modeli cakismayacak | Tamamlandi | `DB_SCHEMA_DRAFT.md`, `API_CONTRACT_DRAFT.md`, `WIREFRAMES.md`, `DESIGN_SYSTEM_STARTER.md` |
| MVP disi ozellikler ayristirilmis olacak | Tamamlandi | `MVP_SCOPE.md`, `PRD.md` |

## 2. P0 Moduller

P0 moduller `MVP_SCOPE.md` icinde kapsam ve kabul kriterleriyle netlestirildi.

P0 kapsam:

- Auth
- Kullanici profili
- Arac tanimlama
- Gelir/sefer kaydi
- Vardiya
- Gider kaydi
- Yakit kaydi
- TAG paket/kullanim gideri
- Gunluk net kar
- Km basi kar
- Saatlik kar
- Break-even
- Haftalik/aylik rapor
- Mobil hizli kayit
- Web dashboard
- Export
- Backup
- Monitoring

Kapanis karari:

> P0 moduller production MVP icin karar tamam seviyededir.

## 3. Tasarim ve Backend Veri Modeli Uyumu

Uyum kontrolu:

| Urun/ekran ihtiyaci | Backend/API karsiligi | Durum |
|---|---|---|
| Ilk kurulumda arac tanimlama | `Vehicle`, `/vehicles` | Uyumlu |
| Ortalama yakit tuketimi | `average_consumption_l_per_100km`, `/vehicles` | Uyumlu |
| Hizli sefer ekleme | `Trip`, `/trips` | Uyumlu |
| Vardiya baslat/bitir | `Shift`, `/shifts/start`, `/shifts/:id/end` | Uyumlu |
| Hizli gider ekleme | `ExpenseEntry`, `/expense-entries` | Uyumlu |
| Yakit kaydi | `FuelEntry`, `/fuel-entries` | Uyumlu |
| Paket/kullanim gideri | `TagPackage`, `/tag-packages` | Uyumlu |
| Bakim/lastik km maliyeti | `MaintenanceEntry`, `/maintenance-entries` | Uyumlu |
| Sabit gider dagitimi | `RecurringExpense`, `/recurring-expenses` | Uyumlu |
| Amortisman | `Vehicle` depreciation alanlari | Uyumlu |
| Dashboard metrikleri | `/dashboard/today` | Uyumlu |
| Raporlar | `/reports/daily`, `/reports/weekly`, `/reports/monthly` | Uyumlu |
| Export | `ExportJob`, `/exports` | Uyumlu |
| Fis/screenshot arsivi | `Attachment`, `/attachments` | Uyumlu |
| Admin minimum panel | `/admin/*` endpointleri | Uyumlu |
| KVKK veri export/silme | `/privacy/export-account`, `/privacy/delete-account` | Uyumlu |

Kapanis karari:

> Wireframe, API contract ve DB sema taslagi ayni kavramlari kullaniyor. Tasarim ve backend tarafinda bilinen bir veri modeli cakismasi yoktur.

## 4. MVP Disi Ozelliklerin Ayrimi

MVP disinda birakilanlar:

- Marti hesabina otomatik baglanma
- Resmi olmayan scraping
- Tam otomatik banka entegrasyonu
- Coklu ulke destegi
- Muhasebe beyanname sistemi
- Karmasik filo yonetimi
- Sosyal ag/forum
- Genel amacli AI chatbot
- OCR ile fis okuma
- Screenshot'tan gelir/gider cikarma
- AI karlilik onerileri
- En karli saat/gun isi haritasi
- Coklu arac UI/abonelik paketi
- Coklu surucu
- Surucu karsilastirma
- Muhasebeci/ekip erisimi
- Topluluk benchmark verisi
- Tam offline sync

Kapanis karari:

> MVP disi ozellikler P2 ve kapsam disi olarak ayrilmistir. Sprint 1-6 uygulamasinda P0/P0.5 tamamlanmadan bu ozelliklere girilmemelidir.

## 5. Sprint 0 Ciktilari

Tamamlanan dokumanlar:

- `PRD.md`
- `MVP_SCOPE.md`
- `USER_FLOWS.md`
- `WIREFRAMES.md`
- `DB_SCHEMA_DRAFT.md`
- `API_CONTRACT_DRAFT.md`
- `DESIGN_SYSTEM_STARTER.md`
- `CI_CD_SKELETON.md`
- `SPRINT_0_ACCEPTANCE.md`

Repo kurulumu:

- Git repo baslatildi.
- Private GitHub repo olusturuldu: `https://github.com/SynOrq/TAG`
- `main` branch push edildi.
- PR/issue template'leri eklendi.
- CI/CD workflow iskeleti eklendi.
- Dependabot eklendi.

## 6. Acik Kararlar

Sprint 1 baslamadan once netlestirilmesi iyi olacak kararlar:

- Telefon ile login zorunlu mu, opsiyonel mi?
- Para birimi MVP'de sadece TRY mi?
- Abonelik altyapisi ilk MVP'de manuel mi, iyzico/Stripe benzeri bir saglayici ile mi?
- ReportSnapshot MVP'de aktif cache olarak mi, sadece export gecmisi icin mi kullanilacak?
- Dosya virus taramasi beta oncesi mi, beta sonrasi mi?

Bu maddeler P0 kapsam netligini bozmaz; uygulama detay kararlari olarak Sprint 1 teknik planinda kapatilabilir.

## 7. Kapanis Sonucu

Sprint 0 kabul kriterleri karsilanmistir:

1. Tum P0 moduller netlesmistir.
2. Tasarim ve backend veri modeli uyumludur.
3. MVP disi ozellikler ayrilmistir.
