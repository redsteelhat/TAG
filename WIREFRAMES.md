# TAG Surucu Finans Yonetim Platformu - Wireframe Taslaklari

**Dokuman tarihi:** 17 Haziran 2026  
**Seviye:** Low-fidelity wireframe  
**Amaç:** Mobil ve web ekran hiyerarsisini, ana metrikleri ve kullanici aksiyonlarini netlestirmek.

## 1. Tasarim Ilkeleri

- Mobil, hizli kayit ve gunluk karar ekrani olarak tasarlanir.
- Web, detayli analiz ve yonetim paneli olarak tasarlanir.
- Ilk ekran her zaman "bugun gercekten kac TL kar ettim?" sorusunu cevaplar.
- Ana aksiyonlar mobilde alt barda veya tek elle ulasilabilir alanda yer alir.
- Formlarda zorunlu alanlar ustte, detay alanlari acilir bolumde olur.
- Tahmini giderler ile kesin giderler ayni tabloda karistirilmaz.
- Her finans kartinda detay/aciklama acilabilir olmalidir.

## 2. Mobil Bilgi Mimarisi

Alt navigasyon:

```text
 [Bugun] [Kayit] [Rapor] [Arac] [Ayar]
```

Ana hizli aksiyonlar:

```text
 + Sefer
 + Gider
 Vardiyaya Basla / Bitir
```

## 3. Mobil - Onboarding / Ilk Kurulum

### 3.1 Kayit / Giris

```text
┌──────────────────────────────┐
│ Gercek Kar Takibi            │
│ Brut degil, net kazancini gor│
│                              │
│ [ E-posta / Telefon        ] │
│ [ Sifre                    ] │
│                              │
│ [ Giris Yap                ] │
│                              │
│ Hesabin yok mu? Kayit ol     │
│                              │
│ Bu uygulama bagimsiz bir     │
│ finans takip aracidir.       │
└──────────────────────────────┘
```

### 3.2 Arac Kurulumu

```text
┌──────────────────────────────┐
│ Aracini Tanimla              │
│ 1/4                          │
├──────────────────────────────┤
│ Plaka                        │
│ [ 34 ABC 123              ]  │
│                              │
│ Yakit tipi                   │
│ [ Dizel v ]                  │
│                              │
│ Ortalama tuketim             │
│ [ 7.5 ] litre / 100 km       │
│                              │
│ Guncel km                    │
│ [ 84250                  ]   │
│                              │
│ [ Devam Et                ]  │
└──────────────────────────────┘
```

### 3.3 Paket ve Hedef Kurulumu

```text
┌──────────────────────────────┐
│ Paket ve Hedef               │
│ 3/4                          │
├──────────────────────────────┤
│ Aktif paket var mi?          │
│ ( ) Yok   (x) Var            │
│                              │
│ Paket tutari                 │
│ [ 700 TL                  ]  │
│                              │
│ Gecerlilik                   │
│ [ 1 gun v ]                  │
│                              │
│ Gunluk net kar hedefi        │
│ [ 1500 TL                 ]  │
│                              │
│ [ Dashboard'u Hazirla     ]  │
└──────────────────────────────┘
```

## 4. Mobil - Bugun Dashboard

```text
┌──────────────────────────────┐
│ Bugun                        │
│ 17 Haziran 2026              │
├──────────────────────────────┤
│ Gercek Net Kar               │
│ 1.240 TL                     │
│ Nakit net: 1.920 TL          │
│ [ Hesabi goster ]            │
├──────────────────────────────┤
│ Brut Gelir     Toplam Gider  │
│ 3.850 TL       2.610 TL      │
│                              │
│ Toplam Km      Aktif Sure    │
│ 142 km         6s 20dk       │
│                              │
│ Km Basi Net    Saatlik Net   │
│ 8,73 TL        195 TL        │
├──────────────────────────────┤
│ Paket Durumu                 │
│ Cikti: +320 TL               │
│ Break-even: 1.240 TL         │
├──────────────────────────────┤
│ Yakit Maliyeti               │
│ 920 TL                       │
│ Bos km yakit: 138 TL         │
├──────────────────────────────┤
│ [ + Sefer ] [ + Gider ]      │
│ [ Vardiyayi Bitir ]          │
└──────────────────────────────┘
Alt nav: [Bugun] [Kayit] [Rapor] [Arac] [Ayar]
```

Bos durum:

```text
┌──────────────────────────────┐
│ Bugun henuz kayit yok        │
│                              │
│ Arac yakit maliyeti:         │
│ 3,48 TL / km                 │
│                              │
│ Aktif paket payi:            │
│ 700 TL / gun                 │
│                              │
│ Hedef: 1.500 TL net kar      │
│                              │
│ [ Ilk Seferi Ekle ]          │
│ [ Gider Ekle ]               │
└──────────────────────────────┘
```

## 5. Mobil - Hizli Sefer Ekle

Varsayilan hizli form:

```text
┌──────────────────────────────┐
│ Hizli Sefer                  │
├──────────────────────────────┤
│ Gelir                        │
│ [ 450 TL                  ]  │
│                              │
│ Km                           │
│ [ 18                     ]   │
│                              │
│ Sure                         │
│ [ 32 dk                  ]   │
│                              │
│ Odeme                        │
│ [ Nakit ] [ Dijital ]        │
│                              │
│ Yakiti otomatik hesapla      │
│ [x]                          │
│                              │
│ + Detay ekle                 │
│                              │
│ [ Kaydet                  ]  │
└──────────────────────────────┘
```

Kayit sonrasi sonuc:

```text
┌──────────────────────────────┐
│ Sefer Kaydedildi             │
├──────────────────────────────┤
│ Bu sefer net                 │
│ +286 TL                      │
│                              │
│ Km basi net: 15,88 TL        │
│ Saatlik net: 536 TL          │
│ Yakit: -63 TL                │
│ Paket payi: -70 TL           │
│                              │
│ [ Yeni Sefer ] [ Bugune Don ]│
└──────────────────────────────┘
```

Detay bolumu:

```text
┌──────────────────────────────┐
│ Detaylar                     │
├──────────────────────────────┤
│ Bos km                       │
│ [ 4                      ]   │
│                              │
│ Bahsis / ekstra              │
│ [ 0 TL                   ]   │
│                              │
│ Not                          │
│ [                         ]  │
│                              │
│ Screenshot                   │
│ [ Dosya ekle              ]  │
└──────────────────────────────┘
```

## 6. Mobil - Hizli Gider Ekle

```text
┌──────────────────────────────┐
│ Hizli Gider                  │
├──────────────────────────────┤
│ [ Yakit  ] [ Paket  ]        │
│ [ HGS    ] [ Otopark]        │
│ [ Yikama ] [ Bakim  ]        │
│ [ Ceza   ] [ Diger  ]        │
├──────────────────────────────┤
│ Tutar                        │
│ [ 120 TL                  ]  │
│                              │
│ Odeme                        │
│ [ Nakit ] [ Kart ]           │
│                              │
│ + Fis / not ekle             │
│                              │
│ [ Kaydet                  ]  │
└──────────────────────────────┘
```

## 7. Mobil - Yakit Ekle

```text
┌──────────────────────────────┐
│ Yakit Ekle                   │
├──────────────────────────────┤
│ Yakit tipi                   │
│ [ Dizel v ]                  │
│                              │
│ Litre                        │
│ [ 32,4                   ]   │
│                              │
│ Tutar                        │
│ [ 1.620 TL               ]   │
│                              │
│ Litre fiyati                 │
│ 50,00 TL                     │
│                              │
│ Km sayaci                    │
│ [ 84392                  ]   │
│                              │
│ Depo                         │
│ [ Full ] [ Yarım ] [ Manuel ]│
│                              │
│ [ Fis ekle ]                 │
│ [ Kaydet  ]                  │
└──────────────────────────────┘
```

## 8. Mobil - Vardiya

Aktif degil:

```text
┌──────────────────────────────┐
│ Vardiya                      │
├──────────────────────────────┤
│ Baslangic km                 │
│ [ 84250                  ]   │
│                              │
│ [ Vardiyaya Basla         ]  │
└──────────────────────────────┘
```

Aktif:

```text
┌──────────────────────────────┐
│ Vardiya Aktif                │
│ Baslangic: 09:12             │
├──────────────────────────────┤
│ Sefer: 6                     │
│ Brut: 2.740 TL               │
│ Net: 860 TL                  │
│ Km: 96                       │
│ Sure: 4s 45dk                │
│                              │
│ [ + Sefer ] [ + Gider ]      │
│ [ Vardiyayi Bitir ]          │
└──────────────────────────────┘
```

Bitis:

```text
┌──────────────────────────────┐
│ Vardiyayi Bitir              │
├──────────────────────────────┤
│ Bitis km                     │
│ [ 84392                  ]   │
│                              │
│ Toplam km: 142               │
│ Aktif sure: 6s 20dk          │
│                              │
│ [ Ozetle ve Bitir         ]  │
└──────────────────────────────┘
```

## 9. Mobil - Raporlar

```text
┌──────────────────────────────┐
│ Raporlar                     │
├──────────────────────────────┤
│ [ Gunluk ] [ Haftalik ] [ Ay ]│
├──────────────────────────────┤
│ Gercek Net Kar               │
│ 8.420 TL                     │
│ Nakit net: 11.300 TL         │
├──────────────────────────────┤
│ Gelir                        │
│ 24.850 TL                    │
│                              │
│ Giderler                     │
│ Yakit: 6.120 TL              │
│ Paket: 3.500 TL              │
│ Sabit: 1.240 TL              │
│ Bakim/lastik: 910 TL         │
│ Amortisman: 1.660 TL         │
├──────────────────────────────┤
│ Km basi net: 7,80 TL         │
│ Saatlik net: 182 TL          │
│                              │
│ [ PDF Al ] [ Excel Al ]      │
└──────────────────────────────┘
```

## 10. Web Bilgi Mimarisi

Sol navigasyon:

```text
 Dashboard
 Gelirler
 Giderler
 Yakit
 Paketler
 Bakim
 Raporlar
 Hedefler
 Export
 Ayarlar
 Admin
```

Web layout:

```text
┌──────────────┬─────────────────────────────────────────────┐
│ Sidebar      │ Topbar: Tarih, Arac, Profil                 │
│              ├─────────────────────────────────────────────┤
│ Navigasyon   │ Sayfa icerigi                               │
│              │                                             │
└──────────────┴─────────────────────────────────────────────┘
```

## 11. Web - Dashboard

```text
┌──────────────┬─────────────────────────────────────────────┐
│ Dashboard    │ Bugun                         [Arac v]      │
│ Gelirler     ├─────────────────────────────────────────────┤
│ Giderler     │ [Gercek Net Kar] [Brut Gelir] [Toplam Gider]│
│ Yakit        │  1.240 TL        3.850 TL      2.610 TL     │
│ Paketler     │                                             │
│ Bakim        │ [Km Basi Net] [Saatlik Net] [Paket Durumu]  │
│ Raporlar     │  8,73 TL      195 TL        Cikti +320 TL   │
│ Hedefler     ├───────────────────────┬─────────────────────┤
│ Export       │ Gelir/Gider Trend     │ Gider Dagilimi      │
│ Ayarlar      │ [line chart]          │ [donut chart]       │
│ Admin        ├───────────────────────┴─────────────────────┤
│              │ Son Kayitlar                                │
│              │ Sefer 450 TL | Yakit 1620 TL | HGS 80 TL    │
└──────────────┴─────────────────────────────────────────────┘
```

## 12. Web - Gelirler / Seferler

```text
┌──────────────┬─────────────────────────────────────────────┐
│ Sidebar      │ Gelirler                         [+ Sefer]  │
│              ├─────────────────────────────────────────────┤
│              │ Filtre: [Tarih] [Odeme] [Vardiya] [Ara]    │
│              ├─────────────────────────────────────────────┤
│              │ Tarih | Gelir | Km | Sure | Net | Odeme    │
│              │ 17.06 | 450   | 18 | 32dk | 286 | Dijital  │
│              │ 17.06 | 380   | 14 | 28dk | 241 | Nakit    │
│              │ 16.06 | 620   | 22 | 41dk | 398 | Dijital  │
│              ├─────────────────────────────────────────────┤
│              │ Secili sefer detayi                        │
│              │ Yakit: -63 | Paket: -70 | Sabit: -22       │
└──────────────┴─────────────────────────────────────────────┘
```

## 13. Web - Giderler

```text
┌──────────────┬─────────────────────────────────────────────┐
│ Sidebar      │ Giderler                        [+ Gider]   │
│              ├─────────────────────────────────────────────┤
│              │ Ozet Kartlari                              │
│              │ [Yakit] [Paket] [Sabit] [Degisken]         │
│              ├─────────────────────────────────────────────┤
│              │ Filtre: [Tip] [Kategori] [Tarih] [Arac]    │
│              ├─────────────────────────────────────────────┤
│              │ Tarih | Tip | Kategori | Tutar | Dagitim   │
│              │ 17.06 | Degisken | HGS | 80 | Aninda       │
│              │ 17.06 | Operasyon | Yikama | 120 | Aninda  │
│              │ 01.06 | Sabit | Sigorta | 9000 | Yillik    │
└──────────────┴─────────────────────────────────────────────┘
```

## 14. Web - Yakit Paneli

```text
┌──────────────┬─────────────────────────────────────────────┐
│ Sidebar      │ Yakit                           [+ Yakit]   │
│              ├─────────────────────────────────────────────┤
│              │ [Km Basi Yakit] [100 km Tuketim] [Son Fiyat]│
│              │ 3,48 TL         7,2 L             50,00 TL  │
│              ├───────────────────────┬─────────────────────┤
│              │ Yakit Fiyat Trendi    │ Tuketim Trendi      │
│              │ [line chart]          │ [line chart]        │
│              ├───────────────────────┴─────────────────────┤
│              │ Kayitlar                                    │
│              │ Tarih | Litre | Tutar | Fiyat | Km | Full   │
└──────────────┴─────────────────────────────────────────────┘
```

## 15. Web - Paketler

```text
┌──────────────┬─────────────────────────────────────────────┐
│ Sidebar      │ Paketler                        [+ Paket]   │
│              ├─────────────────────────────────────────────┤
│              │ Aktif Paket                                │
│              │ Gunluk Paket | 700 TL | 17.06-17.06        │
│              │ Dagitim: Gun bazli                         │
│              │ Break-even etkisi: 700 TL                  │
│              ├─────────────────────────────────────────────┤
│              │ Gecmis Paketler                            │
│              │ Ad | Tutar | Sure | Dagitim | Durum        │
└──────────────┴─────────────────────────────────────────────┘
```

## 16. Web - Bakim / Sabit Gider / Amortisman

```text
┌──────────────┬─────────────────────────────────────────────┐
│ Sidebar      │ Arac Maliyetleri                           │
│              ├─────────────────────────────────────────────┤
│              │ [Bakim] [Sabit Gider] [Amortisman]         │
│              ├─────────────────────────────────────────────┤
│              │ Aracin Gunluk Sabit Maliyeti               │
│              │ 312 TL                                     │
│              │                                             │
│              │ Km Basi Bakim/Lastik                       │
│              │ 0,92 TL/km                                 │
│              │                                             │
│              │ Amortisman                                 │
│              │ Acik | 2,00 TL/km                          │
│              ├─────────────────────────────────────────────┤
│              │ Kayitlar                         [+ Kayit] │
└──────────────┴─────────────────────────────────────────────┘
```

## 17. Web - Raporlar

```text
┌──────────────┬─────────────────────────────────────────────┐
│ Sidebar      │ Raporlar                       [PDF] [Excel]│
│              ├─────────────────────────────────────────────┤
│              │ Donem: [Gunluk] [Haftalik] [Aylik] [Tarih] │
│              ├─────────────────────────────────────────────┤
│              │ Kar-Zarar Ozeti                            │
│              │ Brut gelir                 24.850 TL       │
│              │ Yakit                      -6.120 TL       │
│              │ Paket                      -3.500 TL       │
│              │ Degisken gider             -1.000 TL       │
│              │ Sabit gider payi           -1.240 TL       │
│              │ Bakim/lastik               -910 TL         │
│              │ Amortisman                 -1.660 TL       │
│              │ Gercek net kar              10.420 TL      │
│              ├───────────────────────┬─────────────────────┤
│              │ Km Basi Kar           │ Saatlik Kar         │
│              │ [bar/line]            │ [bar/line]          │
└──────────────┴─────────────────────────────────────────────┘
```

## 18. Web - Export

```text
┌──────────────┬─────────────────────────────────────────────┐
│ Sidebar      │ Export                                      │
│              ├─────────────────────────────────────────────┤
│              │ Donem                                       │
│              │ [ 01.06.2026 - 30.06.2026 ]                 │
│              │                                             │
│              │ Format                                      │
│              │ [ PDF ] [ Excel ]                           │
│              │                                             │
│              │ [ Export Olustur ]                          │
│              ├─────────────────────────────────────────────┤
│              │ Export Gecmisi                              │
│              │ Tarih | Donem | Format | Durum | Indir     │
└──────────────┴─────────────────────────────────────────────┘
```

## 19. Web - Admin Panel

```text
┌──────────────┬─────────────────────────────────────────────┐
│ Admin        │ Admin Dashboard                             │
│ Kullanicilar ├─────────────────────────────────────────────┤
│ Feedback     │ [Toplam Kullanici] [Aktif] [Kayit Sayisi]  │
│ Export Jobs  │  120               38      4.820           │
│ Loglar       │                                             │
│ Duyurular    │ [Hatalar] [Bekleyen Export] [Feedback]     │
│              ├─────────────────────────────────────────────┤
│              │ Son Hatalar                                │
│              │ time | route | status | masked user        │
│              ├─────────────────────────────────────────────┤
│              │ Son Feedback                               │
└──────────────┴─────────────────────────────────────────────┘
```

## 20. Kritik UI Durumlari

### 20.1 Hesap Detayi Drawer

```text
┌──────────────────────────────┐
│ Net Kar Hesabi               │
├──────────────────────────────┤
│ Brut gelir          3.850 TL │
│ Yakit                -920 TL │
│ Paket                -700 TL │
│ Degisken gider       -180 TL │
│ Sabit gider          -310 TL │
│ Bakim/lastik         -180 TL │
│ Amortisman           -320 TL │
├──────────────────────────────┤
│ Gercek net kar      1.240 TL │
│                              │
│ Yontem: takvim gunu sabit    │
│ gider + km bazli amortisman  │
└──────────────────────────────┘
```

### 20.2 Eksik Veri Uyarisi

```text
┌──────────────────────────────┐
│ Hesaplama Eksik              │
├──────────────────────────────┤
│ Bakim maliyeti tanimli degil.│
│ Gercek net kar daha yuksek   │
│ gorunuyor olabilir.          │
│                              │
│ [ Bakim Maliyeti Ekle ]      │
│ [ Sonra ]                    │
└──────────────────────────────┘
```

### 20.3 Break-even Kart Detayi

```text
┌──────────────────────────────┐
│ Paket Break-even             │
├──────────────────────────────┤
│ Bugun kara gecmek icin       │
│ gereken gelir: 1.240 TL      │
│                              │
│ Su anki gelir: 920 TL        │
│ Kalan: 320 TL                │
│                              │
│ Ortalama sefer gelirine gore │
│ yaklasik 1 sefer gerekiyor.  │
└──────────────────────────────┘
```

## 21. Responsive Davranis

### Mobil

- Tek kolon.
- Alt navigasyon.
- Kartlar dikey siralanir.
- Hizli aksiyonlar alt bolgeye yakin olur.
- Grafikler sade tutulur; detay web'e yonlendirilir.

### Tablet

- Dashboard kartlari 2 kolon olabilir.
- Raporlar ve listeler daha genis tablo kullanabilir.

### Desktop

- Sol sidebar sabit.
- Ana dashboard 3 kolon kart + 2 kolon grafik duzeni kullanir.
- Listelerde filtre ve detay paneli ayni ekranda yer alir.

## 22. Tasarim Sistemi Baslangic Notlari

Renk rolleri:

- Pozitif kar: yesil
- Zarar/negatif: kirmizi
- Tahmini/paylastirilmis gider: amber
- Bilgi/note: mavi
- Nakit net kar ve gercek net kar farki: ayri etiket

Tipografi:

- Finansal ana metrikler buyuk ve okunakli.
- Kart icinde hero boyutlu baslik kullanilmaz.
- Rapor tablolari yogun ama taranabilir olur.

Bilesenler:

- MetricCard
- ProfitBreakdownDrawer
- QuickTripForm
- QuickExpenseForm
- FuelEntryForm
- ShiftStatusCard
- ReportPeriodTabs
- ExportJobList
- EmptyState
- MissingDataWarning

