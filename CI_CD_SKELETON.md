# TAG Surucu Finans Yonetim Platformu - CI/CD Iskeleti

**Dokuman tarihi:** 17 Haziran 2026  
**Hedef:** Monorepo kurulumu tamamlandiginda web, API ve mobil uygulamalar icin minimum production-grade CI/CD hattini hazir tutmak.

## 1. GitHub Actions Yapisi

Mevcut workflow'lar:

| Dosya | Amac | Tetikleyici |
|---|---|---|
| `.github/workflows/repo-check.yml` | Zorunlu dokumanlarin varligini kontrol eder | push / pull_request |
| `.github/workflows/ci.yml` | Monorepo lint, test, build ve Prisma kontrolleri | push / pull_request |
| `.github/workflows/deploy-web.yml` | Web uygulamasi deploy iskeleti | manual dispatch |
| `.github/workflows/deploy-api.yml` | API deploy iskeleti | manual dispatch |
| `.github/workflows/mobile-build.yml` | Expo/EAS mobil build iskeleti | manual dispatch |

Not: Uygulama kodu henuz olusmadigi icin workflow'lar ilgili `package.json` veya proje dosyasi yoksa no-op calisir.

## 2. Branch Stratejisi

```text
main       production-ready branch
develop    opsiyonel entegrasyon branch'i
feature/*  ozellik branchleri
fix/*      hata duzeltmeleri
docs/*     dokuman degisiklikleri
```

Ilk asamada `main` + feature branch yeterlidir. Ekip buyuyunce `develop` eklenebilir.

## 3. PR Kontrolleri

Her PR icin:

- Zorunlu dokuman kontrolu
- TypeScript lint
- Unit test
- Build
- Prisma schema validate
- API/hesap motoru testleri

Hesaplama motoru degisikliklerinde ek zorunluluk:

- Yakit maliyeti testleri
- Paket dagitim testleri
- Sabit gider dagitim testleri
- Bakim/amortisman testleri
- Sifir km/sifir sure edge case testleri

## 4. Ortamlar

Onerilen GitHub Environments:

```text
preview
staging
production
```

Koruma kurallari:

- `production` deploy manual approval ister.
- Production secrets sadece production environment altinda tutulur.
- Preview deploy PR bazli olabilir.

## 5. Gerekli Secrets

Web/Vercel kullanilirsa:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

API/VPS veya PaaS kullanilirsa:

```text
API_DEPLOY_HOST
API_DEPLOY_USER
API_DEPLOY_KEY
API_DEPLOY_PATH
DATABASE_URL
REDIS_URL
S3_ENDPOINT
S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY
SENTRY_DSN
```

Expo/EAS icin:

```text
EXPO_TOKEN
```

## 6. Deployment Akisi

### Web

1. CI gecer.
2. Manuel `Deploy Web` workflow calistirilir.
3. `apps/web` build edilir.
4. Vercel secrets varsa deploy edilir.
5. URL workflow summary'de yayinlanir.

### API

1. CI gecer.
2. Manuel `Deploy API` workflow calistirilir.
3. `apps/api` test/build calisir.
4. Prisma migration deploy calisir.
5. API servis deploy edilir.
6. Health check yapilir.

### Mobil

1. Manuel `Mobile Build` workflow calistirilir.
2. Expo dependencies kurulur.
3. Android veya iOS EAS build tetiklenir.
4. Store submission MVP sonrasi ayrica otomatiklestirilir.

## 7. Release Checklist

Production MVP release oncesi:

- CI main branch'te yesil.
- Hesaplama motoru testleri yesil.
- DB migration dry-run kontrol edildi.
- Backup calisiyor.
- Monitoring/Sentry aktif.
- Log masking aktif.
- KVKK metinleri yayinda.
- Veri export ve hesap silme akislari test edildi.
- Admin panel role guard test edildi.
- Mobil hizli sefer/gider akisi 10 saniye hedefini karsiliyor.

## 8. Sonraki Iyilestirmeler

- CodeQL security scan
- Container image build/push
- Preview deploy per PR
- Playwright E2E testleri
- Lighthouse smoke test
- DB migration approval gate
- Sentry release tracking
- Slack/Discord deploy bildirimleri

