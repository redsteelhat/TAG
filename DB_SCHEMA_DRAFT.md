# TAG Surucu Finans Yonetim Platformu - DB Sema Taslagi

**Dokuman tarihi:** 17 Haziran 2026  
**Hedef veritabani:** PostgreSQL  
**Hedef ORM:** Prisma  
**Kapsam:** Production MVP icin ana veri modeli taslagi

## 1. Modelleme Ilkeleri

- Ilk surum tek aktif arac odaklidir, ancak veri modeli kullanici basina birden fazla araci destekleyebilir.
- Finansal tutarlar `Decimal(12,2)` olarak saklanmalidir.
- Km, litre ve tuketim gibi olculer `Decimal` olarak saklanmalidir.
- Hesaplanan degerler yeniden hesaplanabilir olmalidir; ancak kayit anindaki hesaplama sonucu snapshot olarak saklanmalidir.
- Her hesaplanan kayitta `calculation_version` tutulmalidir.
- Soft delete gereken ana tablolarda `deleted_at` kullanilmalidir.
- Hassas veriler loglarda maskelenmeli; DB seviyesinde gerekli alanlar icin ileride encryption-at-rest veya column encryption degerlendirilmelidir.
- Attachment iliskileri polymorphic generic tablo yerine acik nullable foreign key'lerle kurulmalidir.

## 2. Enumlar

```prisma
enum UserRole {
  USER
  ADMIN
  SUPER_ADMIN
}

enum SubscriptionStatus {
  TRIAL
  ACTIVE
  PAST_DUE
  CANCELED
  EXPIRED
}

enum FuelType {
  DIESEL
  GASOLINE
  LPG
  HYBRID
  ELECTRIC
  OTHER
}

enum PaymentMethodType {
  CASH
  CARD
  DIGITAL
  MIXED
  OTHER
}

enum ShiftStatus {
  ACTIVE
  COMPLETED
  CANCELED
}

enum ExpenseType {
  VARIABLE
  FIXED
  SEMI_VARIABLE
  PLATFORM_PACKAGE
  FINANCING
  DEPRECIATION
  OPERATIONAL
}

enum AllocationType {
  IMMEDIATE
  DAILY
  MONTHLY
  YEARLY
  PER_KM
  PER_TRIP
  PACKAGE_PERIOD
}

enum PackageAllocationMethod {
  PER_DAY
  PER_TRIP
  PER_KM
}

enum FixedCostAllocationMethod {
  CALENDAR_DAY
  ACTIVE_DAY
  PER_KM
}

enum DepreciationModel {
  MONTHLY
  PER_KM
}

enum GoalPeriod {
  DAILY
  WEEKLY
  MONTHLY
}

enum AttachmentType {
  RECEIPT
  SCREENSHOT
  VEHICLE_DOCUMENT
  REPORT
  OTHER
}

enum ExportFormat {
  PDF
  XLSX
  CSV
}

enum ExportStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

enum NotificationType {
  MAINTENANCE_REMINDER
  INSURANCE_REMINDER
  TAX_REMINDER
  PACKAGE_ENDING
  SYSTEM_ANNOUNCEMENT
  EXPORT_READY
}

enum NotificationStatus {
  PENDING
  SENT
  READ
  FAILED
}
```

## 3. Prisma Sema Taslagi

```prisma
model User {
  id                  String              @id @default(cuid())
  email               String              @unique
  phone               String?             @unique
  password_hash       String
  full_name           String?
  role                UserRole            @default(USER)
  subscription_status SubscriptionStatus  @default(TRIAL)
  trial_ends_at       DateTime?
  locale              String              @default("tr-TR")
  timezone            String              @default("Europe/Istanbul")
  created_at          DateTime            @default(now())
  updated_at          DateTime            @updatedAt
  deleted_at          DateTime?

  driver_profile      DriverProfile?
  vehicles            Vehicle[]
  sessions            UserSession[]
  shifts              Shift[]
  trips               Trip[]
  income_entries      IncomeEntry[]
  expense_entries     ExpenseEntry[]
  fuel_entries        FuelEntry[]
  maintenance_entries MaintenanceEntry[]
  recurring_expenses  RecurringExpense[]
  tag_packages        TagPackage[]
  goals               Goal[]
  attachments         Attachment[]
  export_jobs         ExportJob[]
  notifications       Notification[]
  audit_logs          AuditLog[]
  feedback_items      Feedback[]

  @@index([subscription_status])
  @@index([created_at])
}

model UserSession {
  id                    String    @id @default(cuid())
  user_id               String
  refresh_token_hash    String
  device_name           String?
  device_id             String?
  ip_address            String?
  user_agent            String?
  last_used_at          DateTime?
  expires_at            DateTime
  revoked_at            DateTime?
  created_at            DateTime  @default(now())

  user                  User      @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id])
  @@index([expires_at])
}

model DriverProfile {
  id                              String                    @id @default(cuid())
  user_id                         String                    @unique
  default_vehicle_id              String?
  fixed_cost_allocation_method    FixedCostAllocationMethod @default(CALENDAR_DAY)
  show_depreciation_in_profit     Boolean                   @default(true)
  daily_target_net_profit         Decimal?                  @db.Decimal(12, 2)
  created_at                      DateTime                  @default(now())
  updated_at                      DateTime                  @updatedAt

  user                            User                      @relation(fields: [user_id], references: [id], onDelete: Cascade)
}

model Vehicle {
  id                                String              @id @default(cuid())
  user_id                           String
  plate_number                      String
  brand                             String?
  model                             String?
  model_year                        Int?
  fuel_type                         FuelType
  average_consumption_l_per_100km   Decimal             @db.Decimal(8, 3)
  odometer_km                       Decimal?            @db.Decimal(12, 1)
  is_active                         Boolean             @default(true)
  depreciation_enabled              Boolean             @default(false)
  depreciation_model                DepreciationModel?
  annual_depreciation_amount        Decimal?            @db.Decimal(12, 2)
  annual_estimated_km               Decimal?            @db.Decimal(12, 1)
  created_at                        DateTime            @default(now())
  updated_at                        DateTime            @updatedAt
  deleted_at                        DateTime?

  user                              User                @relation(fields: [user_id], references: [id], onDelete: Cascade)
  shifts                            Shift[]
  trips                             Trip[]
  expense_entries                   ExpenseEntry[]
  fuel_entries                      FuelEntry[]
  maintenance_entries               MaintenanceEntry[]
  recurring_expenses                RecurringExpense[]
  tag_packages                      TagPackage[]

  @@index([user_id])
  @@index([user_id, is_active])
}

model PaymentMethod {
  id          String            @id @default(cuid())
  user_id     String?
  type        PaymentMethodType
  name        String
  is_default  Boolean           @default(false)
  created_at  DateTime          @default(now())

  @@index([user_id])
}

model Category {
  id            String       @id @default(cuid())
  user_id       String?
  name          String
  expense_type  ExpenseType?
  is_system     Boolean      @default(false)
  is_active     Boolean      @default(true)
  created_at    DateTime     @default(now())
  updated_at    DateTime     @updatedAt

  expense_entries ExpenseEntry[]

  @@index([user_id])
  @@index([is_system])
}

model Shift {
  id                  String       @id @default(cuid())
  user_id             String
  vehicle_id          String
  started_at          DateTime
  ended_at            DateTime?
  start_odometer_km   Decimal?     @db.Decimal(12, 1)
  end_odometer_km     Decimal?     @db.Decimal(12, 1)
  total_km            Decimal?     @db.Decimal(12, 1)
  active_minutes      Int?
  status              ShiftStatus  @default(ACTIVE)
  gross_income        Decimal      @default(0) @db.Decimal(12, 2)
  cash_net_profit     Decimal      @default(0) @db.Decimal(12, 2)
  true_net_profit     Decimal      @default(0) @db.Decimal(12, 2)
  calculation_version String?
  note                String?
  created_at          DateTime     @default(now())
  updated_at          DateTime     @updatedAt

  user                User         @relation(fields: [user_id], references: [id], onDelete: Cascade)
  vehicle             Vehicle      @relation(fields: [vehicle_id], references: [id])
  trips               Trip[]

  @@index([user_id, started_at])
  @@index([vehicle_id, started_at])
  @@index([status])
}

model Trip {
  id                                String    @id @default(cuid())
  user_id                           String
  vehicle_id                        String
  shift_id                          String?
  trip_date                         DateTime
  started_at                        DateTime?
  ended_at                          DateTime?
  duration_minutes                  Int?
  gross_income                      Decimal   @db.Decimal(12, 2)
  tip_amount                        Decimal   @default(0) @db.Decimal(12, 2)
  cancellation_income               Decimal   @default(0) @db.Decimal(12, 2)
  total_income                      Decimal   @db.Decimal(12, 2)
  payment_method                    PaymentMethodType
  pickup_location                   String?
  dropoff_location                  String?
  trip_km                           Decimal   @default(0) @db.Decimal(10, 2)
  deadhead_km                       Decimal   @default(0) @db.Decimal(10, 2)
  total_km                          Decimal   @default(0) @db.Decimal(10, 2)
  estimated_fuel_cost               Decimal   @default(0) @db.Decimal(12, 2)
  allocated_package_cost            Decimal   @default(0) @db.Decimal(12, 2)
  allocated_fixed_cost              Decimal   @default(0) @db.Decimal(12, 2)
  allocated_maintenance_cost        Decimal   @default(0) @db.Decimal(12, 2)
  allocated_depreciation_cost       Decimal   @default(0) @db.Decimal(12, 2)
  allocated_other_variable_cost     Decimal   @default(0) @db.Decimal(12, 2)
  cash_net_profit                   Decimal   @default(0) @db.Decimal(12, 2)
  true_net_profit                   Decimal   @default(0) @db.Decimal(12, 2)
  profit_calculation_version        String
  note                              String?
  created_at                        DateTime  @default(now())
  updated_at                        DateTime  @updatedAt
  deleted_at                        DateTime?

  user                              User      @relation(fields: [user_id], references: [id], onDelete: Cascade)
  vehicle                           Vehicle   @relation(fields: [vehicle_id], references: [id])
  shift                             Shift?    @relation(fields: [shift_id], references: [id])
  attachments                       Attachment[]

  @@index([user_id, trip_date])
  @@index([vehicle_id, trip_date])
  @@index([shift_id])
}

model IncomeEntry {
  id              String            @id @default(cuid())
  user_id         String
  vehicle_id      String?
  income_date     DateTime
  title           String
  amount          Decimal           @db.Decimal(12, 2)
  payment_method  PaymentMethodType
  note            String?
  created_at      DateTime          @default(now())
  updated_at      DateTime          @updatedAt
  deleted_at      DateTime?

  user            User              @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id, income_date])
  @@index([vehicle_id, income_date])
}

model ExpenseEntry {
  id                       String            @id @default(cuid())
  user_id                  String
  vehicle_id               String
  category_id              String?
  expense_type             ExpenseType
  amount                   Decimal           @db.Decimal(12, 2)
  expense_date             DateTime
  allocation_type          AllocationType     @default(IMMEDIATE)
  allocation_period_start  DateTime?
  allocation_period_end    DateTime?
  odometer_km              Decimal?          @db.Decimal(12, 1)
  is_recurring             Boolean           @default(false)
  payment_method           PaymentMethodType?
  receipt_url              String?
  note                     String?
  created_at               DateTime          @default(now())
  updated_at               DateTime          @updatedAt
  deleted_at               DateTime?

  user                     User              @relation(fields: [user_id], references: [id], onDelete: Cascade)
  vehicle                  Vehicle           @relation(fields: [vehicle_id], references: [id])
  category                 Category?         @relation(fields: [category_id], references: [id])
  attachments              Attachment[]

  @@index([user_id, expense_date])
  @@index([vehicle_id, expense_date])
  @@index([expense_type])
  @@index([allocation_type])
}

model FuelEntry {
  id                    String            @id @default(cuid())
  user_id               String
  vehicle_id            String
  fuel_type             FuelType
  amount                Decimal           @db.Decimal(12, 2)
  liters                Decimal           @db.Decimal(10, 3)
  price_per_liter       Decimal           @db.Decimal(10, 3)
  odometer_km           Decimal?          @db.Decimal(12, 1)
  station_name          String?
  city                  String?
  district              String?
  full_tank             Boolean           @default(false)
  tank_fill_level       String?
  payment_method        PaymentMethodType?
  receipt_url           String?
  created_at            DateTime          @default(now())
  updated_at            DateTime          @updatedAt
  deleted_at            DateTime?

  user                  User              @relation(fields: [user_id], references: [id], onDelete: Cascade)
  vehicle               Vehicle           @relation(fields: [vehicle_id], references: [id])
  attachments           Attachment[]

  @@index([user_id, created_at])
  @@index([vehicle_id, created_at])
  @@index([vehicle_id, odometer_km])
}

model MaintenanceEntry {
  id                         String            @id @default(cuid())
  user_id                    String
  vehicle_id                 String
  category                   String
  title                      String
  amount                     Decimal           @db.Decimal(12, 2)
  maintenance_date           DateTime
  odometer_km                Decimal?          @db.Decimal(12, 1)
  expected_interval_km       Decimal?          @db.Decimal(12, 1)
  cost_per_km                Decimal?          @db.Decimal(10, 4)
  service_name               String?
  allocation_type            AllocationType     @default(PER_KM)
  note                       String?
  created_at                 DateTime          @default(now())
  updated_at                 DateTime          @updatedAt
  deleted_at                 DateTime?

  user                       User              @relation(fields: [user_id], references: [id], onDelete: Cascade)
  vehicle                    Vehicle           @relation(fields: [vehicle_id], references: [id])
  attachments                Attachment[]

  @@index([user_id, maintenance_date])
  @@index([vehicle_id, maintenance_date])
}

model RecurringExpense {
  id                       String                    @id @default(cuid())
  user_id                  String
  vehicle_id               String
  name                     String
  expense_type             ExpenseType               @default(FIXED)
  amount                   Decimal                   @db.Decimal(12, 2)
  period                   AllocationType
  allocation_method        FixedCostAllocationMethod  @default(CALENDAR_DAY)
  starts_at                DateTime
  ends_at                  DateTime?
  next_due_at              DateTime?
  is_active                Boolean                   @default(true)
  note                     String?
  created_at               DateTime                  @default(now())
  updated_at               DateTime                  @updatedAt
  deleted_at               DateTime?

  user                     User                      @relation(fields: [user_id], references: [id], onDelete: Cascade)
  vehicle                  Vehicle                   @relation(fields: [vehicle_id], references: [id])

  @@index([user_id, is_active])
  @@index([vehicle_id, is_active])
  @@index([next_due_at])
}

model TagPackage {
  id                    String                  @id @default(cuid())
  user_id               String
  vehicle_id            String
  name                  String
  amount                Decimal                 @db.Decimal(12, 2)
  starts_at             DateTime
  ends_at               DateTime
  duration_days         Int
  allocation_method     PackageAllocationMethod @default(PER_DAY)
  break_even_target     Decimal?                @db.Decimal(12, 2)
  is_active             Boolean                 @default(true)
  note                  String?
  created_at            DateTime                @default(now())
  updated_at            DateTime                @updatedAt
  deleted_at            DateTime?

  user                  User                    @relation(fields: [user_id], references: [id], onDelete: Cascade)
  vehicle               Vehicle                 @relation(fields: [vehicle_id], references: [id])

  @@index([user_id, starts_at, ends_at])
  @@index([vehicle_id, starts_at, ends_at])
  @@index([is_active])
}

model Goal {
  id                         String      @id @default(cuid())
  user_id                    String
  vehicle_id                 String?
  period                     GoalPeriod
  starts_at                  DateTime
  ends_at                    DateTime?
  target_gross_income        Decimal?    @db.Decimal(12, 2)
  target_net_profit          Decimal?    @db.Decimal(12, 2)
  target_km                  Decimal?    @db.Decimal(12, 1)
  target_hourly_profit       Decimal?    @db.Decimal(12, 2)
  target_km_profit           Decimal?    @db.Decimal(12, 2)
  is_active                  Boolean     @default(true)
  created_at                 DateTime    @default(now())
  updated_at                 DateTime    @updatedAt

  user                       User        @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id, period, is_active])
}

model Attachment {
  id                     String          @id @default(cuid())
  user_id                String
  trip_id                String?
  expense_entry_id       String?
  fuel_entry_id          String?
  maintenance_entry_id   String?
  type                   AttachmentType
  file_url               String
  storage_key            String
  mime_type              String
  file_size_bytes        Int
  original_name          String?
  created_at             DateTime        @default(now())
  deleted_at             DateTime?

  user                   User            @relation(fields: [user_id], references: [id], onDelete: Cascade)
  trip                   Trip?           @relation(fields: [trip_id], references: [id])
  expense_entry          ExpenseEntry?   @relation(fields: [expense_entry_id], references: [id])
  fuel_entry             FuelEntry?      @relation(fields: [fuel_entry_id], references: [id])
  maintenance_entry      MaintenanceEntry? @relation(fields: [maintenance_entry_id], references: [id])

  @@index([user_id, created_at])
  @@index([trip_id])
  @@index([expense_entry_id])
  @@index([fuel_entry_id])
}

model ReportSnapshot {
  id                    String      @id @default(cuid())
  user_id               String
  vehicle_id            String?
  period_type           GoalPeriod
  period_start          DateTime
  period_end            DateTime
  gross_income          Decimal     @db.Decimal(12, 2)
  total_expenses        Decimal     @db.Decimal(12, 2)
  cash_net_profit       Decimal     @db.Decimal(12, 2)
  true_net_profit       Decimal     @db.Decimal(12, 2)
  total_km              Decimal     @db.Decimal(12, 2)
  active_minutes        Int
  calculation_version   String
  payload_json          Json
  created_at            DateTime    @default(now())

  @@index([user_id, period_start, period_end])
}

model ExportJob {
  id              String        @id @default(cuid())
  user_id         String
  report_id       String?
  format          ExportFormat
  status          ExportStatus  @default(PENDING)
  period_start    DateTime
  period_end      DateTime
  file_url        String?
  storage_key     String?
  error_message   String?
  created_at      DateTime      @default(now())
  updated_at      DateTime      @updatedAt
  completed_at    DateTime?

  user            User          @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id, created_at])
  @@index([status])
}

model Notification {
  id              String              @id @default(cuid())
  user_id         String
  type            NotificationType
  status          NotificationStatus  @default(PENDING)
  title           String
  body            String
  scheduled_at    DateTime?
  sent_at         DateTime?
  read_at         DateTime?
  metadata        Json?
  created_at      DateTime            @default(now())

  user            User                @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id, created_at])
  @@index([status, scheduled_at])
}

model Feedback {
  id          String    @id @default(cuid())
  user_id     String
  message     String
  rating      Int?
  status      String    @default("OPEN")
  created_at  DateTime  @default(now())
  updated_at  DateTime  @updatedAt

  user        User      @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id, created_at])
  @@index([status])
}

model AuditLog {
  id          String    @id @default(cuid())
  user_id     String?
  actor_id    String?
  action      String
  entity_type String?
  entity_id   String?
  ip_address  String?
  user_agent  String?
  metadata    Json?
  created_at  DateTime  @default(now())

  user        User?     @relation(fields: [user_id], references: [id])

  @@index([user_id, created_at])
  @@index([action])
  @@index([entity_type, entity_id])
}
```

## 4. Finansal Snapshot Kurallari

`Trip`, `Shift` ve rapor snapshot'lari hesaplama anindaki maliyetleri saklar.

Trip snapshot alanlari:

- `estimated_fuel_cost`
- `allocated_package_cost`
- `allocated_fixed_cost`
- `allocated_maintenance_cost`
- `allocated_depreciation_cost`
- `allocated_other_variable_cost`
- `cash_net_profit`
- `true_net_profit`
- `profit_calculation_version`

Neden:

- Gecmis seferler, sonradan degisen yakit fiyati veya paket tutarindan etkilenmemelidir.
- Hesaplama motoru versiyonu degistiginde eski kayitlarin nasil hesaplandigi bilinebilmelidir.
- Raporlarda "yeniden hesapla" fonksiyonu ileride kontrollu sunulabilir.

## 5. Para, Km ve Sure Alanlari

Onerilen tipler:

| Veri | Tip | Not |
|---|---|---|
| TL tutar | Decimal(12,2) | Para icin float kullanilmaz |
| Litre | Decimal(10,3) | 32.457 litre gibi degerler icin |
| Litre fiyati | Decimal(10,3) | Kurus hassasiyeti icin |
| Km | Decimal(12,1) veya Decimal(10,2) | Odometer ve sefer km ayrilabilir |
| Sure | Int dakika | Saatlik hesap icin dakika bazli |
| Oran | Decimal(8,3) | Tuketim vb. |

## 6. MVP Seed Verileri

### 6.1 Varsayilan Kategoriler

Degisken gider:

- HGS
- Otopark
- Ceza
- Yikama
- Diger

Yakit:

- Dizel
- Benzin
- LPG

Bakim:

- Periyodik bakim
- Mekanik
- Elektrik
- Lastik
- Klima
- Kaporta
- Temizlik

Sabit gider:

- Trafik sigortasi
- Kasko
- MTV
- Muayene
- Egzoz muayene
- Arac kredisi
- Otopark aboneligi
- Telefon hatti
- Internet paketi

### 6.2 Varsayilan Odeme Yontemleri

- Nakit
- Kart
- Dijital
- Karma

## 7. Index ve Performans Notlari

Zorunlu index alanlari:

- `user_id + date` kombinasyonlari
- `vehicle_id + date` kombinasyonlari
- aktif/pasif durum alanlari
- export job status
- notification status + scheduled_at

Rapor API'leri ilk MVP'de canli hesaplanabilir. Kullanici sayisi arttiginda:

- Gunluk raporlar cache'lenebilir.
- `ReportSnapshot` periyodik veya kullanici istegiyle uretilebilir.
- Export job'lari queue ile arka planda calisir.

## 8. Veri Saklama ve Silme

Kullanici hesap silme talebinde:

- Refresh token'lar revoke edilir.
- Aktif session'lar kapanir.
- Kullanici verisi yasal saklama zorunlulugu yoksa silinir veya anonimlestirilir.
- Attachment dosyalari storage'dan silme politikasina gore temizlenir.
- Audit log'larda kisisel veri tutulmamasi esastir.

## 9. Acik Konular

Bu taslak implementation oncesi netlestirilmelidir:

- Telefon ile login zorunlu mu, opsiyonel mi?
- Para birimi sadece TRY mi olacak?
- Plaka benzersizligi kullanici bazinda mi, global mi olacak? Oneri: kullanici bazinda.
- ReportSnapshot MVP'de aktif kullanilacak mi, yoksa sadece export gecmisi icin mi tutulacak?
- Dosya virus taramasi MVP'de mi, beta sonrasi mi?
- Abonelik saglayicisi Stripe, iyzico veya manuel mi olacak?

