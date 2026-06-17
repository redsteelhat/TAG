# TAG Surucu Finans Yonetim Platformu - MVP Kapsam Listesi

**Dokuman tarihi:** 17 Haziran 2026  
**Production MVP hedefi:** 13 Eylul 2026  
**Beta yayin hedefi:** 14-20 Eylul 2026  
**Ana hedef:** Surucunun gercek net karini hatasiz, hizli ve aciklanabilir sekilde hesaplamak.

## 1. MVP Tanimi

MVP, TAG yapan bireysel surucunun sefer, vardiya, yakit, paket/kullanim bedeli, gider, sabit maliyet ve arac yipranmasi bilgilerini girerek gunluk, haftalik ve aylik gercek net karini gorebildigi web + mobil urundur.

MVP'nin ana sorusu:

> Bugun brut gelir degil, gercek net kac TL kazandim?

MVP, Marti/TAG resmi entegrasyonu, scraping, otomatik banka entegrasyonu, AI, OCR veya filo yonetimi icermez.

## 2. P0 - Olmazsa Olmaz

P0 maddeleri tamamlanmadan production MVP cikilmaz.

| Modül | Kapsam | Kabul kriteri |
|---|---|---|
| Auth | Register, login, logout, refresh token | Kullanici guvenli sekilde hesap acip giris yapabilir. |
| Kullanici profili | Temel profil, oturum bilgisi | Kullanici kendi profilini ve aktif oturumunu gorebilir. |
| Arac tanimlama | Tek aktif arac, plaka, yakit tipi, tuketim, km | Kullanici hesaplama icin gerekli arac bilgilerini girer. |
| Gelir/sefer kaydi | Sefer geliri, sure, km, bos km, odeme tipi, not | Sefer kaydi net kar hesabina dahil edilir. |
| Vardiya | Basla/bitir, baslangic-bitis km, sure, sefer sayisi | Gunluk calisma toplam sure ve km ile izlenir. |
| Gider kaydi | HGS, otopark, ceza, yikama, diger giderler | Degisken giderler gunluk kara dahil edilir. |
| Yakit kaydi | Litre, tutar, litre fiyati, km, full depo, fis | Km basi yakit maliyeti ve yakit trendi hesaplanir. |
| TAG paket/kullanim gideri | Paket adi, tutar, tarih araligi, dagitim yontemi | Paket payi gunluk kara ve break-even hesabina girer. |
| Gunluk net kar | Brut gelirden tum P0 giderleri dusulur | Dashboard bugunku net kari gosterir. |
| Km basi kar | Net kar / toplam km | Km varsa hesaplanir, yoksa "hesaplanamadi" gosterilir. |
| Saatlik kar | Net kar / aktif saat | Sure varsa hesaplanir, yoksa "hesaplanamadi" gosterilir. |
| Break-even | Paket + yakit + sabit gider hedefi | Kullanici kara gecmek icin gereken kalan geliri gorur. |
| Haftalik/aylik rapor | Gelir, gider, net kar, km ve saat metrikleri | Kullanici haftalik ve aylik performansi gorebilir. |
| Mobil hizli kayit | 10 saniyede gelir/gider girisi | Mobilde sefer ve gider minimum alanlarla kaydedilir. |
| Web dashboard | Finans ozeti ve ana metrikler | Web panel genel durumu tek ekranda verir. |
| Export | Excel/PDF rapor alma | Kullanici donemsel raporu disa aktarabilir. |
| Backup | Gunluk DB backup | Veri kaybi riskine karsi otomatik backup calisir. |
| Monitoring | Sentry/log/health check | Kritik API ve uygulama hatalari izlenir. |

## 3. P0.5 - Gercek Net Kar Icin Kritik

Bu maddeler P1 gibi gorunse de urun vaadi icin kritik oldugundan mumkunse MVP'ye dahil edilmelidir. Sure riski olursa basit versiyonla cikilir.

| Modül | Kapsam | Basit MVP versiyonu |
|---|---|---|
| Bakim takibi | Bakim, lastik, servis giderleri | Tutar / beklenen km ile km basi maliyet |
| Sabit gider dagitimi | Sigorta, MTV, muayene, telefon, internet | Takvim gunu bazli dagitim |
| Amortisman | Aylik veya km bazli deger kaybi | Ac/kapat + km bazli basit model |
| Fis/screenshot arsivi | Sefer/gider/yakit ekleri | Private storage + attachment listesi |

## 4. P1 - Guclu Urun Algisi

P1 maddeleri ilk production MVP'ye yetisirse eklenir; yetismezse beta sonrasi ilk iterasyona kalir.

| Modül | Kapsam |
|---|---|
| Hedef belirleme | Gunluk brut gelir, net kar, km ve saatlik kar hedefleri |
| Hatirlatmalar | Bakim, sigorta, MTV, muayene, paket bitis uyarilari |
| Kategori ozellestirme | Kullanici gider kategorilerini duzenleyebilir |
| Gelismis grafikler | Yakit trendi, gider dagilimi, km basi kar trendi |
| Senaryo analizi v1 | Yakit fiyati, paket tutari, gunluk km degisimi |

## 5. P2 - Sonraki Surum

P2 maddeleri MVP kapsaminda yapilmaz.

- OCR ile fis okuma
- Screenshot'tan gelir/gider cikarma
- AI karlilik onerileri
- En karli saat/gun isi haritasi
- Coklu arac
- Coklu surucu
- Surucu karsilastirma
- Muhasebeci/ekip erisimi
- Topluluk benchmark verisi
- Tam offline sync
- Resmi platform/API entegrasyonlari

## 6. Kapsam Disi

Ilk MVP'ye kesinlikle alinmayacaklar:

- Marti hesabina otomatik baglanma
- Resmi olmayan scraping
- Tam otomatik banka entegrasyonu
- Coklu ulke destegi
- Muhasebe beyanname sistemi
- Karmasik filo yonetimi
- Sosyal ag/forum
- Genel amacli AI chatbot

## 7. MVP Ekran Kapsami

### Mobil

- Login/register
- Ilk kurulum
- Arac profili
- Dashboard
- Hizli sefer ekle
- Hizli gider ekle
- Yakit ekle
- Paket ekle
- Vardiya baslat/bitir
- Gunluk ozet
- Haftalik/aylik rapor
- Export talebi
- Ayarlar

### Web

- Login/register
- Dashboard
- Gelirler/seferler
- Giderler
- Yakit
- Paketler
- Arac profili
- Bakim/sabit giderler
- Raporlar
- Export
- Ayarlar
- Minimum admin panel

## 8. Admin MVP Kapsami

Minimum admin panel:

- Kullanici listesi
- Aktif kullanici sayisi
- Kayit sayilari
- Hata loglari
- Abonelik/trial durumu
- Feedback listesi
- Export talepleri
- Sistem metrikleri
- Kategori sablonlari
- Duyuru gonderme

Admin panelde kullanici finansal verileri varsayilan olarak maskeli veya sinirli gorunmelidir.

## 9. KVKK ve Guvenlik MVP Kapsami

Production MVP icin zorunlu:

- Argon2 veya bcrypt sifre hash
- JWT access + refresh token
- Refresh token rotation
- Rate limiting
- Device/session management
- Loglarda kisisel veri maskeleme
- Private S3/R2 bucket
- Signed URL ile dosya erisimi
- Gunluk DB backup
- Kullanici veri export
- Hesap silme
- KVKK aydinlatma metni
- Acik riza metni
- Kullanim sartlari
- Gizlilik politikasi

Hassas veri kabul edilenler:

- Plaka
- Telefon/e-posta
- Lokasyon
- Gelir/gider bilgisi
- Arac ruhsat/fis gorselleri
- Sefer saatleri
- Finansal performans

## 10. Hesaplama MVP Kapsami

Hesap motoru asagidaki hesaplari desteklemelidir:

- Sefer net kari
- Gunluk nakit net kar
- Gunluk gercek net kar
- Haftalik net kar
- Aylik net kar
- Km basi brut gelir
- Km basi gider
- Km basi net kar
- Saatlik brut gelir
- Saatlik net kar
- Yakit maliyeti/km
- Sefer yakit maliyeti
- Paket gunluk payi
- Paket break-even
- Sabit gider gunluk payi
- Bakim/lastik km basi payi
- Amortisman payi

Koruma kurallari:

- Sifir km varsa km basi metrik hesaplanamaz.
- Sifir sure varsa saatlik metrik hesaplanamaz.
- Eksik yakit/paket/bakim verileri icin varsayilan `0` kullanilir ve uyari gosterilir.
- Hesaplamalarda kullanilan metod rapor ekraninda gosterilir.

## 11. MVP Kabul Kriterleri

MVP tamamlanmis sayilmasi icin:

- Kullanici kayit olup giris yapabilir.
- Kullanici tek aktif aracini tanimlayabilir.
- Kullanici sefer, gider, yakit ve paket kaydi ekleyebilir.
- Mobil hizli sefer ve gider girisi 10 saniye hedefini karsilar.
- Dashboard bugunku brut gelir, net kar, gider, km, saatlik kar ve paket durumunu gosterir.
- Haftalik ve aylik raporlar dogru hesaplanir.
- Nakit net kar ve gercek net kar ayrimi vardir.
- Break-even analizi kullanilabilir.
- Export calisir.
- Backup ve monitoring aktiftir.
- KVKK temel akislar tamamdir.
- Hesaplama motoru unit testleri gecmektedir.
- Uygulama Marti/TAG resmi entegrasyonu gibi konumlanmaz.

## 12. Basari Metrikleri

MVP sonrasi izlenecek metrikler:

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

North Star:

> Haftalik gercek net kar raporu goruntuleyen aktif surucu sayisi.

