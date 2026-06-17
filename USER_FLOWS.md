# TAG Surucu Finans Yonetim Platformu - Kullanici Akislari

**Dokuman tarihi:** 17 Haziran 2026  
**Urun hedefi:** TAG yapan surucunun gunluk, haftalik ve aylik gercek net karini hizli ve guvenilir sekilde hesaplamak.

## 1. Akis Ilkeleri

- Mobil uygulama hizli veri girisinin ana kanalidir.
- Web panel detayli analiz ve yonetim kanalidir.
- Ilk ekran her zaman kullaniciya finansal durum cevabi vermelidir.
- Sefer ve gider kaydi 10 saniye hedefiyle tasarlanmalidir.
- Her hesaplama aciklanabilir olmalidir.
- Tahmini ve kesin giderler kullaniciya ayrilmalidir.
- Uygulama Marti/TAG resmi entegrasyonu gibi davranmaz; tum veri kullanici girisi veya kullanici yukledigi dosyalardan gelir.

## 2. Akis 1 - Ilk Kurulum

### Amac

Kullanicinin hesaplama motorunu calistiracak temel verileri girerek kullanima hazir dashboard'a ulasmasi.

### Giris Noktasi

- Yeni kullanici register sonrasi
- Eksik kurulumlu kullanici login sonrasi

### Adimlar

1. Kullanici kayit olur.
2. E-posta/telefon dogrulamasi gerekiyorsa tamamlar.
3. Arac bilgilerini girer:
   - Marka/model
   - Plaka
   - Yakit tipi
   - Ortalama tuketim litre/100 km
   - Guncel km
4. Sabit giderleri girer veya "sonra tamamla" der:
   - Sigorta
   - MTV
   - Muayene
   - Telefon/internet
   - Otopark aboneligi
5. TAG paket/kullanim giderini girer:
   - Paket adi
   - Tutar
   - Baslangic tarihi
   - Bitis/gecerlilik suresi
   - Dagitim yontemi
6. Gunluk hedef belirler:
   - Net kar hedefi
   - Brut gelir hedefi
   - Km hedefi opsiyonel
7. Dashboard acilir.

### Sistem Davranisi

- Eksik sabit gider varsa dashboard'da "sabit gider tanimli degil" uyarisi gosterilir.
- Yakit tuketimi girilmeden sefer yakit maliyeti hesaplanamaz; kullaniciya kurulumda zorunlu tutulur.
- Paket tanimlanmazsa paket gideri `0` sayilir.
- Varsayilan sabit gider dagitimi takvim gunu bazlidir.

### Basarili Son Durum

Kullanici su bilgileri goren hazir dashboard'a gelir:

- Arac yakit maliyeti/km
- Aktif paket payi veya paket yok bilgisi
- Gunluk hedef
- Ilk sefer ekleme CTA'si

### Hata / Bos Durumlar

- Plaka girilmezse arac kaydi tamamlanmaz.
- Ortalama tuketim girilmezse hesap motoru sefer yakit maliyeti uretemez.
- Paket tarihi gecersizse paket kaydedilmez.

### Kabul Kriterleri

- Yeni kullanici 3 dakika icinde temel kurulumu tamamlayabilmelidir.
- Kurulum sonunda bos ekran yerine hesaplamaya hazir dashboard gorunmelidir.
- Kullanici sabit giderleri atlayabilmeli ama uyarilmalidir.

## 3. Akis 2 - Gunluk Calisma / Vardiya

### Amac

Surucunun calisma baslangicindan bitisine kadar seferlerini, giderlerini, toplam km ve aktif suresini takip etmesi.

### Giris Noktasi

- Mobil dashboard
- "Vardiyaya Basla" butonu

### Adimlar

1. Kullanici "Vardiyaya Basla" der.
2. Sistem baslangic saatini otomatik alir.
3. Kullanici baslangic km girer.
4. Vardiya aktif duruma gecer.
5. Kullanici vardiya boyunca sefer ekler.
6. Kullanici gerekirse yakit/gider ekler.
7. Kullanici "Vardiyayi Bitir" der.
8. Sistem bitis saatini otomatik alir.
9. Kullanici bitis km girer.
10. Sistem vardiya ozetini hesaplar.

### Sistem Davranisi

- Aktif vardiya varken dashboard'da vardiya karti sabit gorunur.
- Seferler otomatik aktif vardiyaya baglanir.
- Baska aktif vardiya baslatilamaz.
- Bitis km, baslangic km'den dusuk olamaz.
- Vardiya bitince toplam km, sure, sefer sayisi ve net kar hesaplanir.

### Basarili Son Durum

Vardiya ozeti:

- Brut gelir
- Nakit net kar
- Gercek net kar
- Toplam km
- Aktif sure
- Sefer sayisi
- Km basi net kar
- Saatlik net kar
- Paket cikti mi?
- Yakit maliyeti

### Hata / Bos Durumlar

- Baslangic km yoksa vardiya yine baslatilabilir ama bitiste toplam km hesaplanamaz.
- Sefer yoksa vardiya "gelirsiz vardiya" olarak kapanabilir.
- Bitis saati baslangictan once olamaz.

### Kabul Kriterleri

- Kullanici vardiyayi tek dokunusla baslatabilmelidir.
- Vardiya bitis ozeti gunluk dashboard metrikleriyle tutarli olmalidir.
- Aktif vardiya kapatilmasa bile kullanici sonraki giriste uyarilmalidir.

## 4. Akis 3 - Hizli Sefer Ekleme

### Amac

Surucunun mobilde tek elle, cok kisa surede sefer geliri kaydetmesi.

### Giris Noktasi

- Mobil dashboard `+ Sefer`
- Aktif vardiya karti
- Web gelirler ekrani

### Adimlar

1. Kullanici `+ Sefer` butonuna basar.
2. Sistem tarih ve saati otomatik doldurur.
3. Kullanici gelir tutarini girer.
4. Kullanici km bilgisini girer.
5. Kullanici sureyi girer veya baslangic/bitis saatinden hesaplatir.
6. Kullanici odeme tipini secer.
7. Kullanici kaydeder.
8. Sistem sefer net kar ozetini gosterir.

### Opsiyonel Alanlar

- Bos km
- Bahsis/ekstra
- Iptal geliri
- Not
- Screenshot
- Baslangic lokasyonu
- Bitis lokasyonu

### Sistem Davranisi

- Aktif vardiya varsa sefer vardiyaya baglanir.
- Yakit maliyeti arac profilindeki tuketime ve son yakit fiyatina gore hesaplanir.
- Paket payi aktif paket dagitim metoduna gore hesaplanir.
- Toplam km = sefer km + bos km.
- Kayit sonrasi dashboard aninda guncellenir.

### Basarili Son Durum

Kullanici sunu gorur:

- Bu sefer net kar
- Km basi net kar
- Saatlik net kar
- Tahmini yakit maliyeti
- Paket payi

### Hata / Bos Durumlar

- Gelir bos veya negatif olamaz.
- Km `0` ise km basi metrik hesaplanamaz ama sefer kaydedilebilir.
- Sure `0` ise saatlik metrik hesaplanamaz ama sefer kaydedilebilir.
- Yakit verisi eksikse yakit maliyeti `0` hesaplanir ve uyari gosterilir.

### Kabul Kriterleri

- Zorunlu alanlarla sefer kaydi 10 saniye hedefini karsilamalidir.
- Kayit sonrasi net kar aciklamasi gorunmelidir.
- Sefer kaydi gunluk/haftalik/aylik raporlara dahil edilmelidir.

## 5. Akis 4 - Hizli Gider Ekleme

### Amac

Surucunun gun icindeki degisken giderleri minimum alanla kaydetmesi.

### Giris Noktasi

- Mobil dashboard `+ Gider`
- Web giderler ekrani

### Adimlar

1. Kullanici `+ Gider` butonuna basar.
2. HGS, otopark, yikama, ceza, diger gibi hizli kategori secer.
3. Tutar girer.
4. Odeme tipini secer veya varsayilani kullanir.
5. Opsiyonel not/fis ekler.
6. Kaydeder.

### Sistem Davranisi

- Degisken gider varsayilan olarak kayit tarihinin gunluk karindan duser.
- Gider aktif vardiya varsa vardiya ile iliskilendirilebilir.
- Kayit sonrasi dashboard gider ve net kar degerleri guncellenir.

### Basarili Son Durum

Kullanici giderin net kara etkisini gorur:

- Eklenen gider
- Bugunku toplam gider
- Guncel net kar

### Hata / Bos Durumlar

- Tutar bos veya negatif olamaz.
- Kategori secilmezse `Diger` kullanilir.
- Fis yuklenemezse gider kaydi yine kaydedilebilir, dosya hatasi ayrica gosterilir.

### Kabul Kriterleri

- Gider kaydi 10 saniye hedefini karsilamalidir.
- Gider kaydi dashboard ve raporlara aninda yansimalidir.

## 6. Akis 5 - Yakit Kaydi

### Amac

Yakit maliyetini litre, tutar ve km sayaciyla takip ederek km basi yakit maliyetini hesaplamak.

### Giris Noktasi

- Hizli giderde `Yakit`
- Mobil yakit ekle
- Web yakit paneli

### Adimlar

1. Kullanici yakit tipini secer veya arac profilinden gelir.
2. Litre girer.
3. Tutar girer.
4. Sistem litre fiyatini hesaplar.
5. Kullanici km sayaci girer.
6. Depo doluluk tipini secer:
   - Full
   - Yarim
   - Manuel
7. Opsiyonel istasyon, sehir/ilce, fis ve odeme tipi ekler.
8. Kaydeder.

### Sistem Davranisi

- Litre fiyati = tutar / litre.
- Son yakit fiyati arac icin guncellenir.
- Full depo kayitlari arasinda gercek tuketim hesaplanabilir.
- Sefer tahmini yakit hesaplari yeni fiyati kullanir.

### Basarili Son Durum

Kullanici sunu gorur:

- Litre fiyati
- Km basi yakit maliyeti
- Son yakit kaydi
- Yakitin bugunku kara etkisi

### Hata / Bos Durumlar

- Litre `0` veya negatif olamaz.
- Tutar `0` veya negatif olamaz.
- Km sayaci onceki kayittan dusukse uyari gosterilir.

### Kabul Kriterleri

- Yakit kaydi sonrasi km basi yakit maliyeti guncellenmelidir.
- Full depo yontemi icin iki full kayit varsa gercek tuketim gosterilmelidir.

## 7. Akis 6 - Paket / Kullanim Gideri Tanimlama

### Amac

Kullanicinin TAG tarafindaki paket, uyelik veya operasyonel kullanim bedelini dinamik olarak tanimlamasi.

### Giris Noktasi

- Ilk kurulum
- Paketler ekrani
- Hizli giderde `Paket`

### Adimlar

1. Kullanici paket adi girer.
2. Paket tutari girer.
3. Baslangic tarihi secer.
4. Bitis tarihi veya gecerlilik suresi girer.
5. Dagitim metodunu secer:
   - Gun bazli
   - Sefer bazli
   - Km bazli
6. Kaydeder.

### Sistem Davranisi

- Varsayilan dagitim gun bazlidir.
- Aktif tarih araligindaki sefer ve gun raporlarina paket payi yansir.
- Ayni tarih araliginda birden fazla aktif paket varsa kullanici uyarilir.
- Break-even hesabina paket payi dahil edilir.

### Basarili Son Durum

Kullanici sunu gorur:

- Gunluk paket payi
- Paket bitis tarihi
- Break-even etkisi

### Hata / Bos Durumlar

- Paket tutari negatif olamaz.
- Bitis tarihi baslangictan once olamaz.
- Gecerlilik suresi `0` olamaz.

### Kabul Kriterleri

- Paket payi dashboard net kar hesabina dahil edilmelidir.
- Kullanici paket cikarildi/cikarilmadi durumunu gorebilmelidir.

## 8. Akis 7 - Bakim, Sabit Gider ve Amortisman

### Amac

Aracin gorunmeyen maliyetlerini gercek net kar hesabina dahil etmek.

### Giris Noktasi

- Ilk kurulum
- Web bakim/sabit gider ekranlari
- Mobil ayarlar veya hizli gider

### Adimlar

1. Kullanici gider turunu secer:
   - Bakim
   - Lastik
   - Sigorta
   - MTV
   - Muayene
   - Telefon/internet
   - Amortisman
2. Tutar girer.
3. Dagitim metodunu secer:
   - Gunluk
   - Aylik
   - Yillik
   - Km bazli
4. Bakim/lastik icin beklenen km araligi girer.
5. Amortisman icin ac/kapat ve model secer.
6. Kaydeder.

### Sistem Davranisi

- Bakim ve lastik varsayilan olarak km bazli dagitilir.
- Sabit giderler varsayilan olarak takvim gunu bazli dagitilir.
- Amortisman kapaliysa gercek net kar hesabina dahil edilmez.
- Raporlarda nakit net kar ve gercek net kar ayrimi gosterilir.

### Basarili Son Durum

Kullanici sunu gorur:

- Aracin gunluk sabit maliyeti
- Km basi bakim/lastik maliyeti
- Amortisman etkisi

### Hata / Bos Durumlar

- Bakim araligi girilmezse km bazli dagitim yapilamaz.
- Amortisman icin yillik deger kaybi veya yillik km eksikse ilgili model hesaplanamaz.

### Kabul Kriterleri

- Bakim, sabit gider ve amortisman raporda acik kalem olarak gorunmelidir.
- Kullanici bu kalemlerin net kara etkisini anlayabilmelidir.

## 9. Akis 8 - Gunluk Dashboard

### Amac

Kullanicinin bugunku finansal durumunu tek ekranda anlamasi.

### Giris Noktasi

- Login sonrasi
- Mobil ana tab
- Web dashboard

### Gosterilecek Metrikler

- Bugunku brut gelir
- Bugunku toplam gider
- Nakit net kar
- Gercek net kar
- Toplam km
- Aktif sure
- Km basi net kar
- Saatlik net kar
- Yakit maliyeti
- Paket break-even durumu
- Gunluk hedef ilerlemesi

### Sistem Davranisi

- Aktif vardiya varsa dashboard'da sabit vardiya karti gosterilir.
- Eksik hesaplama verileri uyari olarak gosterilir.
- Her hesaplama detayina tiklandiginda formul/aciklama gorulur.

### Bos Durum

Hic kayit yoksa:

- Ilk seferi ekle CTA
- Arac yakit maliyeti/km
- Aktif paket bilgisi
- Gunluk hedef

### Kabul Kriterleri

- Dashboard ilk acilista bugunku ana cevabi vermelidir.
- Metrikler rapor ekranlariyla tutarli olmalidir.
- Tahmini giderler ve kesin giderler ayrilmalidir.

## 10. Akis 9 - Raporlar

### Amac

Kullanicinin gunluk, haftalik ve aylik performansini gelir, gider, km ve saat bazinda analiz etmesi.

### Giris Noktasi

- Mobil raporlar
- Web raporlar
- Dashboard kartlari

### Adimlar

1. Kullanici rapor donemini secer:
   - Gunluk
   - Haftalik
   - Aylik
2. Sistem raporu hesaplar.
3. Kullanici gelir/gider kirilimini gorur.
4. Kullanici km basi ve saatlik metrikleri gorur.
5. Kullanici hesaplama detayini acabilir.
6. Kullanici export talebi olusturabilir.

### Rapor Kapsami

- Brut gelir
- Yakit gideri
- Paket gideri
- Degisken giderler
- Sabit gider payi
- Bakim/lastik payi
- Amortisman
- Nakit net kar
- Gercek net kar
- Km basi kar
- Saatlik kar

### Hata / Bos Durumlar

- Donemde kayit yoksa bos rapor ve kayit ekleme CTA'si gosterilir.
- Km yoksa km basi metrik hesaplanamaz.
- Sure yoksa saatlik metrik hesaplanamaz.

### Kabul Kriterleri

- Raporlar dashboard ile ayni hesap motorunu kullanmalidir.
- Her raporda kullanilan hesaplama metodu gosterilmelidir.

## 11. Akis 10 - Export

### Amac

Kullanicinin finansal raporunu Excel veya PDF olarak alabilmesi.

### Giris Noktasi

- Raporlar ekrani
- Web export ekrani
- Mobil export talebi

### Adimlar

1. Kullanici donem secer.
2. Format secer:
   - Excel
   - PDF
3. Export talebi olusturur.
4. Sistem export job baslatir.
5. Kullanici job durumunu gorur.
6. Hazir olunca dosyayi indirir.

### Sistem Davranisi

- Export job kaydi olusturulur.
- Basarili/basarisiz durum loglanir.
- Dosya private storage'a yazilir.
- Indirme signed URL ile yapilir.

### Kabul Kriterleri

- Kullanici export gecmisini gorebilmelidir.
- Basarisiz export tekrar denenebilmelidir.
- Export dosyasinda hesaplama ozeti ve formul notu bulunmalidir.

## 12. Akis 11 - Veri Export ve Hesap Silme

### Amac

KVKK kapsaminda kullanicinin verisini alabilmesi ve hesabini silebilmesi.

### Giris Noktasi

- Ayarlar
- Gizlilik / Hesap

### Veri Export Adimlari

1. Kullanici "Verilerimi disa aktar" der.
2. Sistem kullanicinin kimligini tekrar dogrular.
3. Export job olusturulur.
4. Kullanici dosya hazir olunca indirir.

### Hesap Silme Adimlari

1. Kullanici "Hesabimi sil" der.
2. Sistem riskleri aciklar.
3. Kullanici tekrar kimlik dogrular.
4. Kullanici onay verir.
5. Hesap silme talebi isleme alinir.
6. Kullanici oturumlari kapatilir.

### Sistem Davranisi

- Silme islemi audit log'a yazilir.
- Yasal saklama gerekiyorsa veri anonimlestirme/saklama politikasi uygulanir.
- Dosyalar ve attachment'lar silme politikasina gore temizlenir.

### Kabul Kriterleri

- Kullanici verisini indirebilmelidir.
- Kullanici hesap silme talebi olusturabilmelidir.
- Silme sonrasi refresh token'lar revoke edilmelidir.

## 13. Akis 12 - Admin Operasyonu

### Amac

Urun ekibinin sistem durumunu, kullanici sorunlarini ve export/feedback taleplerini takip etmesi.

### Giris Noktasi

- Admin login
- Admin route

### Admin Adimlari

1. Admin giris yapar.
2. Sistem admin rolunu dogrular.
3. Admin dashboard'u acar.
4. Kullanici sayilari, aktiflik ve hata loglarini gorur.
5. Feedback veya export taleplerini inceler.
6. Gerekirse duyuru gonderir.

### Sistem Davranisi

- Admin islemleri audit log'a yazilir.
- Hassas kullanici verileri maskelenir.
- Admin finansal veriyi varsayilan olarak detayli goremez.

### Kabul Kriterleri

- Admin panel minimum operasyonel metrikleri gostermelidir.
- Yetkisiz kullanici admin route'a erisememelidir.
- Duyuru gonderme onay adimi icermelidir.

