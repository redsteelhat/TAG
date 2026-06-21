# TAG Surucu Finans Yonetim Platformu

TAG yapan suruculer icin gercek net kar takip ve finans operasyon platformu.

Bu urun, klasik gelir-gider takibi yerine sefer, vardiya, kilometre, yakit, paket/kullanim bedeli, bakim, lastik, sigorta, MTV, amortisman, telefon, HGS, otopark ve diger arac maliyetlerini birlikte hesaplayarak surucuye gercek net karini gosterir.

> Ana soru: Bugun brut gelir degil, gercek net kac TL kazandim?

## Dokumanlar

| Dokuman                                                | Aciklama                                       |
| ------------------------------------------------------ | ---------------------------------------------- |
| [PRD.md](./PRD.md)                                     | Urun gereksinimleri ve genel kapsam            |
| [MVP_SCOPE.md](./MVP_SCOPE.md)                         | MVP kapsam listesi, P0/P1/P2 ayrimi            |
| [USER_FLOWS.md](./USER_FLOWS.md)                       | Kritik kullanici akislari                      |
| [WIREFRAMES.md](./WIREFRAMES.md)                       | Low-fidelity mobil ve web wireframe taslaklari |
| [DB_SCHEMA_DRAFT.md](./DB_SCHEMA_DRAFT.md)             | PostgreSQL + Prisma DB sema taslagi            |
| [API_CONTRACT_DRAFT.md](./API_CONTRACT_DRAFT.md)       | REST API contract taslagi                      |
| [DESIGN_SYSTEM_STARTER.md](./DESIGN_SYSTEM_STARTER.md) | MVP tasarim sistemi baslangici                 |

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
cp apps/api/.env.example apps/api/.env
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Health check:

```bash
curl http://localhost:3001/api/v1/health
```

Monitoring endpointleri:

```bash
curl http://localhost:3001/api/v1/health/live
curl http://localhost:3001/api/v1/health/ready
curl -H "x-monitoring-token: $MONITORING_TOKEN" http://localhost:3001/api/v1/monitoring/metrics
```

`/health/live` process liveness, `/health/ready` PostgreSQL ve queue readiness durumunu doner. `/monitoring/metrics` runtime bellek/CPU, dependency check ve queue metriklerini doner; `MONITORING_TOKEN` veya admin JWT gerektirir.

Mobil uygulama:

```bash
pnpm dev:mobile
```

`pnpm dev:mobile` Expo LAN modu ve temiz Metro cache ile baslar. Telefon ve bilgisayar ayni Wi-Fi aginda olmali. QR LAN'da acilmazsa tunnel modu icin:

```bash
pnpm --filter @tag/mobile dev:tunnel
```

Tunnel modu Expo tarafinda `@expo/ngrok` kurulumu isteyebilir. Fiziksel cihazda API'ye baglanmak icin `apps/mobile/.env` icinde `EXPO_PUBLIC_API_URL` degerini bilgisayarin LAN IP adresiyle verin veya bos birakin; uygulama Metro dev server host'undan `http://<bilgisayar-ip>:3001/api/v1` adresini turetir.

Prisma komutlari:

```bash
pnpm db:validate
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

## Backup Sistemi

PostgreSQL backup script'i `DATABASE_URL` degerini kullanir ve varsayilan olarak `backups/postgres` altina `*.sql.gz` dosyasi yazar. Bu klasor git'e dahil edilmez.

Manuel backup:

```bash
pnpm db:backup
```

Gunluk backup worker:

```bash
pnpm db:backup:watch
```

Varsayilan ayarlar:

```bash
BACKUP_DIR=backups/postgres
BACKUP_FILE_PREFIX=tag-finance
BACKUP_RETENTION_DAYS=14
BACKUP_INTERVAL_HOURS=24
BACKUP_DOCKER_CONTAINER=tag-postgres
BACKUP_PG_SCHEMA=public
```

Local Docker kurulumunda `BACKUP_DOCKER_CONTAINER=tag-postgres` kullanilabilir. Managed PostgreSQL veya VPS ortaminda host uzerinde `pg_dump` kuruluysa `BACKUP_DOCKER_CONTAINER` bos birakilip `BACKUP_PG_DUMP_BIN` ile binary yolu verilebilir.

Restore ornegi:

```bash
gzip -dc backups/postgres/tag-finance-YYYY-MM-DDTHH-MM-SS-000Z.sql.gz | psql "$DATABASE_URL"
```

Production icin `pnpm db:backup:watch` ayri bir process/systemd service olarak calistirilmali veya `pnpm db:backup` cron ile gunluk tetiklenmelidir. Backup dosyalari hassas veri icerir; disk sifreleme, erisim kisiti ve offsite kopyalama politikasi production ortaminda zorunludur.

## Marka ve Hukuki Not

Bu uygulama bagimsiz bir finans takip aracidir. Marti veya TAG markalarinin resmi urunu, is ortagi ya da entegrasyonu degildir.

Resmi izin olmadan Marti/TAG hesabina otomatik baglanma, scraping veya resmi olmayan entegrasyon yapilmayacaktir.

## Termin

- Production MVP hedefi: 13 Eylul 2026
- Beta yayin hedefi: 14-20 Eylul 2026
- Gercek kullanici validasyonu: Eylul 2026 sonu
