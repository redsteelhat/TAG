# TAG Surucu Finans Yonetim Platformu

TAG yapan suruculer icin gercek net kar takip ve finans operasyon platformu.

Bu urun, klasik gelir-gider takibi yerine sefer, vardiya, kilometre, yakit, paket/kullanim bedeli, bakim, lastik, sigorta, MTV, amortisman, telefon, HGS, otopark ve diger arac maliyetlerini birlikte hesaplayarak surucuye gercek net karini gosterir.

> Ana soru: Bugun brut gelir degil, gercek net kac TL kazandim?

## Dokumanlar

| Dokuman | Aciklama |
|---|---|
| [PRD.md](./PRD.md) | Urun gereksinimleri ve genel kapsam |
| [MVP_SCOPE.md](./MVP_SCOPE.md) | MVP kapsam listesi, P0/P1/P2 ayrimi |
| [USER_FLOWS.md](./USER_FLOWS.md) | Kritik kullanici akislari |
| [WIREFRAMES.md](./WIREFRAMES.md) | Low-fidelity mobil ve web wireframe taslaklari |
| [DB_SCHEMA_DRAFT.md](./DB_SCHEMA_DRAFT.md) | PostgreSQL + Prisma DB sema taslagi |
| [API_CONTRACT_DRAFT.md](./API_CONTRACT_DRAFT.md) | REST API contract taslagi |
| [DESIGN_SYSTEM_STARTER.md](./DESIGN_SYSTEM_STARTER.md) | MVP tasarim sistemi baslangici |

## MVP Odagi

Production MVP'nin temel hedefi:

- Kullanici kayit/giris
- Arac tanimlama
- Sefer, vardiya, gider, yakit ve paket kaydi
- Gunluk, haftalik ve aylik gercek net kar
- Km basi ve saatlik kar
- Paket break-even analizi
- Mobil hizli kayit
- Web dashboard
- Excel/PDF export
- Backup, monitoring ve KVKK temel akislar

## Onerilen Teknik Yigin

```text
apps/
  web/      Next.js + Tailwind CSS + shadcn/ui
  mobile/   Expo + React Native
  api/      NestJS + Prisma
packages/
  shared/   Hesaplama motoru, tipler, Zod semalari
  config/   Ortak tsconfig/eslint/prettier ayarlari
```

Backend hedefi:

- PostgreSQL
- Prisma
- JWT + refresh token rotation
- BullMQ + Redis
- S3/R2 private storage
- Swagger
- Sentry + OpenTelemetry

## Local API ve DB Kurulumu

Gereksinimler:

- Node.js `22.12.0` veya `24.x`
- pnpm `9.14.2`
- Docker Desktop

Kurulum:

```bash
pnpm install
docker compose up -d postgres
cp .env.example .env
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Health check:

```bash
curl http://localhost:3001/api/v1/health
```

Prisma komutlari:

```bash
pnpm db:validate
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

## Marka ve Hukuki Not

Bu uygulama bagimsiz bir finans takip aracidir. Marti veya TAG markalarinin resmi urunu, is ortagi ya da entegrasyonu degildir.

Resmi izin olmadan Marti/TAG hesabina otomatik baglanma, scraping veya resmi olmayan entegrasyon yapilmayacaktir.

## Termin

- Production MVP hedefi: 13 Eylul 2026
- Beta yayin hedefi: 14-20 Eylul 2026
- Gercek kullanici validasyonu: Eylul 2026 sonu
