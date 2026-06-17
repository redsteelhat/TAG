# TAG Surucu Finans Yonetim Platformu - API Contract Taslagi

**Dokuman tarihi:** 17 Haziran 2026  
**API tipi:** REST  
**Backend hedefi:** NestJS  
**Auth:** JWT access token + refresh token rotation  
**Base path:** `/api/v1`

## 1. Genel Kurallar

### 1.1 Content Type

```http
Content-Type: application/json
```

Dosya yukleme:

```http
Content-Type: multipart/form-data
```

### 1.2 Auth Header

```http
Authorization: Bearer <access_token>
```

### 1.3 Tarih ve Saat

- API datetime alanlarini ISO 8601 olarak alir ve doner.
- Kullanici timezone'u `Europe/Istanbul` varsayilir.
- Rapor tarihleri kullanici timezone'una gore hesaplanir.

### 1.4 Para ve Decimal Alanlar

Para, km ve litre gibi hassas alanlar JSON'da string olarak donmelidir.

Ornek:

```json
{
  "amount": "1250.50",
  "totalKm": "142.3",
  "liters": "32.450"
}
```

### 1.5 Standart Basarili Response

Tek kaynak:

```json
{
  "data": {}
}
```

Liste:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 125,
    "totalPages": 7
  }
}
```

### 1.6 Standart Hata Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": [
      {
        "field": "grossIncome",
        "message": "grossIncome must be greater than 0"
      }
    ],
    "requestId": "req_abc123"
  }
}
```

Yaygin hata kodlari:

- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `RATE_LIMITED`
- `FILE_UPLOAD_ERROR`
- `EXPORT_FAILED`
- `INTERNAL_ERROR`

### 1.7 Pagination ve Filtering

Liste endpointleri:

```http
GET /api/v1/trips?page=1&pageSize=20&startDate=2026-06-01&endDate=2026-06-30
```

Varsayilan:

- `page`: 1
- `pageSize`: 20
- maksimum `pageSize`: 100

## 2. Auth

### POST `/auth/register`

Request:

```json
{
  "email": "driver@example.com",
  "phone": "+905551234567",
  "password": "StrongPassword123",
  "fullName": "Tarik Surucu"
}
```

Response:

```json
{
  "data": {
    "user": {
      "id": "usr_123",
      "email": "driver@example.com",
      "phone": "+905551234567",
      "fullName": "Tarik Surucu",
      "role": "USER",
      "subscriptionStatus": "TRIAL"
    },
    "accessToken": "jwt_access",
    "refreshToken": "jwt_refresh"
  }
}
```

### POST `/auth/login`

Request:

```json
{
  "email": "driver@example.com",
  "password": "StrongPassword123",
  "deviceName": "iPhone 15"
}
```

Response: register response ile ayni token yapisi.

### POST `/auth/refresh`

Request:

```json
{
  "refreshToken": "jwt_refresh"
}
```

Response:

```json
{
  "data": {
    "accessToken": "new_access",
    "refreshToken": "new_refresh"
  }
}
```

Not: refresh token rotation zorunludur; eski refresh token revoke edilir.

### POST `/auth/logout`

Request:

```json
{
  "refreshToken": "jwt_refresh"
}
```

Response:

```json
{
  "data": {
    "success": true
  }
}
```

### GET `/auth/sessions`

Response:

```json
{
  "data": [
    {
      "id": "ses_123",
      "deviceName": "iPhone 15",
      "lastUsedAt": "2026-06-17T12:10:00+03:00",
      "expiresAt": "2026-07-17T12:10:00+03:00"
    }
  ]
}
```

### DELETE `/auth/sessions/:id`

Belirli oturumu kapatir.

### POST `/auth/logout-all`

Tum refresh token'lari revoke eder.

## 3. Kullanici ve Profil

### GET `/me`

Response:

```json
{
  "data": {
    "id": "usr_123",
    "email": "driver@example.com",
    "phone": "+905551234567",
    "fullName": "Tarik Surucu",
    "role": "USER",
    "subscriptionStatus": "TRIAL",
    "trialEndsAt": "2026-06-24T23:59:59+03:00",
    "timezone": "Europe/Istanbul"
  }
}
```

### PATCH `/me`

Request:

```json
{
  "fullName": "Tarik Surucu",
  "timezone": "Europe/Istanbul"
}
```

### GET `/driver-profile`

Surucu ayarlarini doner.

### PATCH `/driver-profile`

Request:

```json
{
  "defaultVehicleId": "veh_123",
  "fixedCostAllocationMethod": "CALENDAR_DAY",
  "showDepreciationInProfit": true,
  "dailyTargetNetProfit": "1500.00"
}
```

## 4. Araclar

### POST `/vehicles`

Request:

```json
{
  "plateNumber": "34ABC123",
  "brand": "Renault",
  "model": "Megane",
  "modelYear": 2020,
  "fuelType": "DIESEL",
  "averageConsumptionLPer100Km": "7.5",
  "odometerKm": "84250.0",
  "depreciationEnabled": true,
  "depreciationModel": "PER_KM",
  "annualDepreciationAmount": "60000.00",
  "annualEstimatedKm": "30000.0"
}
```

Response:

```json
{
  "data": {
    "id": "veh_123",
    "plateNumber": "34ABC123",
    "fuelType": "DIESEL",
    "averageConsumptionLPer100Km": "7.5",
    "odometerKm": "84250.0",
    "isActive": true
  }
}
```

### GET `/vehicles`

### GET `/vehicles/:id`

### PATCH `/vehicles/:id`

### DELETE `/vehicles/:id`

Soft delete yapar. Aktif kayitlari etkileyen arac silinirse conflict donebilir.

### POST `/vehicles/:id/set-active`

Ilk surumde tek aktif arac kuralini uygular.

## 5. Vardiyalar

### POST `/shifts/start`

Request:

```json
{
  "vehicleId": "veh_123",
  "startOdometerKm": "84250.0",
  "startedAt": "2026-06-17T09:12:00+03:00"
}
```

Response:

```json
{
  "data": {
    "id": "shf_123",
    "status": "ACTIVE",
    "startedAt": "2026-06-17T09:12:00+03:00",
    "startOdometerKm": "84250.0"
  }
}
```

### POST `/shifts/:id/end`

Request:

```json
{
  "endOdometerKm": "84392.0",
  "endedAt": "2026-06-17T15:32:00+03:00"
}
```

Response:

```json
{
  "data": {
    "id": "shf_123",
    "status": "COMPLETED",
    "totalKm": "142.0",
    "activeMinutes": 380,
    "grossIncome": "3850.00",
    "cashNetProfit": "1920.00",
    "trueNetProfit": "1240.00"
  }
}
```

### GET `/shifts/active`

### GET `/shifts`

Query:

- `vehicleId`
- `startDate`
- `endDate`
- `status`

### GET `/shifts/:id`

### PATCH `/shifts/:id`

### DELETE `/shifts/:id`

## 6. Seferler

### POST `/trips`

Request:

```json
{
  "vehicleId": "veh_123",
  "shiftId": "shf_123",
  "tripDate": "2026-06-17",
  "startedAt": "2026-06-17T10:15:00+03:00",
  "endedAt": "2026-06-17T10:47:00+03:00",
  "grossIncome": "450.00",
  "tipAmount": "0.00",
  "cancellationIncome": "0.00",
  "paymentMethod": "DIGITAL",
  "pickupLocation": "Kadikoy",
  "dropoffLocation": "Besiktas",
  "tripKm": "18.0",
  "deadheadKm": "4.0",
  "note": "Yogun trafik"
}
```

Response:

```json
{
  "data": {
    "id": "trp_123",
    "totalIncome": "450.00",
    "totalKm": "22.0",
    "durationMinutes": 32,
    "estimatedFuelCost": "76.56",
    "allocatedPackageCost": "70.00",
    "allocatedFixedCost": "22.00",
    "allocatedMaintenanceCost": "20.24",
    "allocatedDepreciationCost": "44.00",
    "cashNetProfit": "303.44",
    "trueNetProfit": "217.20",
    "profitCalculationVersion": "v1"
  }
}
```

### GET `/trips`

Query:

- `vehicleId`
- `shiftId`
- `startDate`
- `endDate`
- `paymentMethod`
- `page`
- `pageSize`

### GET `/trips/:id`

### PATCH `/trips/:id`

Request create ile ayni alanlarin partial halidir. Degisen sefer yeniden hesaplanir.

### DELETE `/trips/:id`

Soft delete yapar ve ilgili raporlar yeniden hesaplanabilir hale gelir.

### GET `/trips/:id/profit-breakdown`

Response:

```json
{
  "data": {
    "grossIncome": "450.00",
    "fuelCost": "76.56",
    "packageCost": "70.00",
    "fixedCost": "22.00",
    "maintenanceCost": "20.24",
    "depreciationCost": "44.00",
    "cashNetProfit": "303.44",
    "trueNetProfit": "217.20",
    "method": {
      "fuel": "vehicle_average_consumption",
      "package": "PER_DAY",
      "fixedCost": "CALENDAR_DAY",
      "depreciation": "PER_KM"
    }
  }
}
```

## 7. Gelirler

Sefer disi gelirler icin kullanilir.

### POST `/income-entries`

Request:

```json
{
  "vehicleId": "veh_123",
  "incomeDate": "2026-06-17",
  "title": "Bonus",
  "amount": "250.00",
  "paymentMethod": "DIGITAL",
  "note": "Haftalik bonus"
}
```

### GET `/income-entries`

### GET `/income-entries/:id`

### PATCH `/income-entries/:id`

### DELETE `/income-entries/:id`

## 8. Giderler

### POST `/expense-entries`

Request:

```json
{
  "vehicleId": "veh_123",
  "categoryId": "cat_hgs",
  "expenseType": "VARIABLE",
  "amount": "80.00",
  "expenseDate": "2026-06-17",
  "allocationType": "IMMEDIATE",
  "odometerKm": "84310.0",
  "paymentMethod": "CARD",
  "note": "Kopru gecisi"
}
```

Response:

```json
{
  "data": {
    "id": "exp_123",
    "amount": "80.00",
    "expenseType": "VARIABLE",
    "allocationType": "IMMEDIATE",
    "expenseDate": "2026-06-17"
  }
}
```

### GET `/expense-entries`

Query:

- `vehicleId`
- `expenseType`
- `categoryId`
- `allocationType`
- `startDate`
- `endDate`
- `page`
- `pageSize`

### GET `/expense-entries/:id`

### PATCH `/expense-entries/:id`

### DELETE `/expense-entries/:id`

## 9. Yakit

### POST `/fuel-entries`

Request:

```json
{
  "vehicleId": "veh_123",
  "fuelType": "DIESEL",
  "amount": "1620.00",
  "liters": "32.400",
  "odometerKm": "84392.0",
  "stationName": "Opet",
  "city": "Istanbul",
  "district": "Kadikoy",
  "fullTank": true,
  "tankFillLevel": "FULL",
  "paymentMethod": "CARD"
}
```

Response:

```json
{
  "data": {
    "id": "fuel_123",
    "amount": "1620.00",
    "liters": "32.400",
    "pricePerLiter": "50.000",
    "fuelCostPerKm": "3.750",
    "createdAt": "2026-06-17T12:20:00+03:00"
  }
}
```

### GET `/fuel-entries`

### GET `/fuel-entries/:id`

### PATCH `/fuel-entries/:id`

### DELETE `/fuel-entries/:id`

### GET `/fuel-entries/analytics`

Query:

- `vehicleId`
- `startDate`
- `endDate`

Response:

```json
{
  "data": {
    "lastPricePerLiter": "50.000",
    "fuelCostPerKm": "3.750",
    "averageConsumptionLPer100Km": "7.5",
    "actualConsumptionLPer100Km": "7.2",
    "totalFuelAmount": "6120.00",
    "totalLiters": "122.400",
    "deadheadFuelCost": "138.00"
  }
}
```

## 10. TAG Paket / Kullanim Giderleri

### POST `/tag-packages`

Request:

```json
{
  "vehicleId": "veh_123",
  "name": "Gunluk Paket",
  "amount": "700.00",
  "startsAt": "2026-06-17T00:00:00+03:00",
  "endsAt": "2026-06-17T23:59:59+03:00",
  "durationDays": 1,
  "allocationMethod": "PER_DAY",
  "breakEvenTarget": "1240.00",
  "note": "Gunluk kullanim bedeli"
}
```

### GET `/tag-packages`

### GET `/tag-packages/active`

Query:

- `vehicleId`
- `date`

### GET `/tag-packages/:id`

### PATCH `/tag-packages/:id`

### DELETE `/tag-packages/:id`

### GET `/tag-packages/:id/break-even`

Response:

```json
{
  "data": {
    "packageAmount": "700.00",
    "allocatedToday": "700.00",
    "breakEvenIncome": "1240.00",
    "currentIncome": "920.00",
    "remainingIncome": "320.00",
    "estimatedTripsNeeded": 1
  }
}
```

## 11. Bakim ve Servis

### POST `/maintenance-entries`

Request:

```json
{
  "vehicleId": "veh_123",
  "category": "PERIODIC_MAINTENANCE",
  "title": "Yag ve filtre bakimi",
  "amount": "8000.00",
  "maintenanceDate": "2026-06-17",
  "odometerKm": "84000.0",
  "expectedIntervalKm": "10000.0",
  "serviceName": "Ozel Servis",
  "allocationType": "PER_KM",
  "note": "Periyodik bakim"
}
```

Response:

```json
{
  "data": {
    "id": "mnt_123",
    "amount": "8000.00",
    "expectedIntervalKm": "10000.0",
    "costPerKm": "0.8000"
  }
}
```

### GET `/maintenance-entries`

### GET `/maintenance-entries/:id`

### PATCH `/maintenance-entries/:id`

### DELETE `/maintenance-entries/:id`

## 12. Tekrarlayan / Sabit Giderler

### POST `/recurring-expenses`

Request:

```json
{
  "vehicleId": "veh_123",
  "name": "Trafik sigortasi",
  "expenseType": "FIXED",
  "amount": "9000.00",
  "period": "YEARLY",
  "allocationMethod": "CALENDAR_DAY",
  "startsAt": "2026-01-01",
  "endsAt": "2026-12-31",
  "nextDueAt": "2027-01-01"
}
```

### GET `/recurring-expenses`

### GET `/recurring-expenses/:id`

### PATCH `/recurring-expenses/:id`

### DELETE `/recurring-expenses/:id`

## 13. Hedefler

### POST `/goals`

Request:

```json
{
  "vehicleId": "veh_123",
  "period": "DAILY",
  "startsAt": "2026-06-17",
  "targetGrossIncome": "3500.00",
  "targetNetProfit": "1500.00",
  "targetKm": "150.0",
  "targetHourlyProfit": "200.00",
  "targetKmProfit": "10.00"
}
```

### GET `/goals`

### GET `/goals/active`

### PATCH `/goals/:id`

### DELETE `/goals/:id`

## 14. Dashboard

### GET `/dashboard/today`

Query:

- `vehicleId`
- `date` optional, default today

Response:

```json
{
  "data": {
    "date": "2026-06-17",
    "grossIncome": "3850.00",
    "totalExpenses": "2610.00",
    "cashNetProfit": "1920.00",
    "trueNetProfit": "1240.00",
    "totalKm": "142.0",
    "activeMinutes": 380,
    "netProfitPerKm": "8.73",
    "netProfitPerHour": "195.79",
    "fuelCost": "920.00",
    "packageCost": "700.00",
    "fixedCost": "310.00",
    "maintenanceReserve": "180.00",
    "depreciation": "320.00",
    "breakEven": {
      "requiredIncome": "1240.00",
      "currentIncome": "920.00",
      "remainingIncome": "320.00",
      "isReached": false,
      "estimatedTripsNeeded": 1
    },
    "warnings": [
      {
        "code": "MISSING_MAINTENANCE_COST",
        "message": "Bakim maliyeti tanimli degilse gercek net kar yuksek gorunebilir."
      }
    ]
  }
}
```

### GET `/dashboard/active-shift`

Aktif vardiya kartini doner.

## 15. Raporlar

### GET `/reports/daily`

Query:

- `vehicleId`
- `date`

### GET `/reports/weekly`

Query:

- `vehicleId`
- `weekStart`

### GET `/reports/monthly`

Query:

- `vehicleId`
- `year`
- `month`

Response ortak:

```json
{
  "data": {
    "period": {
      "type": "MONTHLY",
      "start": "2026-06-01",
      "end": "2026-06-30"
    },
    "summary": {
      "grossIncome": "24850.00",
      "fuelCost": "6120.00",
      "packageCost": "3500.00",
      "variableExpenses": "1000.00",
      "fixedCost": "1240.00",
      "maintenanceReserve": "910.00",
      "depreciation": "1660.00",
      "cashNetProfit": "14230.00",
      "trueNetProfit": "10420.00",
      "totalKm": "1335.0",
      "activeMinutes": 3432,
      "netProfitPerKm": "7.80",
      "netProfitPerHour": "182.17"
    },
    "method": {
      "fixedCostAllocation": "CALENDAR_DAY",
      "packageAllocation": "PER_DAY",
      "depreciation": "PER_KM",
      "calculationVersion": "v1"
    },
    "breakdown": []
  }
}
```

### GET `/reports/profit-breakdown`

Donemsel kar-zarar kalemlerini detayli doner.

### GET `/reports/scenario`

Query or body yerine MVP'de POST tercih edilir.

### POST `/reports/scenario`

Request:

```json
{
  "vehicleId": "veh_123",
  "basePeriod": {
    "start": "2026-06-01",
    "end": "2026-06-30"
  },
  "fuelPricePerLiter": "52.00",
  "packageAmount": "900.00",
  "dailyKm": "150.0",
  "deadheadRatio": "0.20",
  "weeklyActiveDays": 5
}
```

Response:

```json
{
  "data": {
    "estimatedDailyNetProfit": "1320.00",
    "estimatedMonthlyNetProfit": "26400.00",
    "insights": [
      "Yakit 2 TL artarsa gunluk net karin yaklasik 74 TL duser.",
      "Paket 700 TL'den 900 TL'ye cikarsa ayni kar icin yaklasik 1 ek sefer gerekir."
    ]
  }
}
```

## 16. Attachments

### POST `/attachments`

Multipart form fields:

- `file`
- `type`
- `tripId` optional
- `expenseEntryId` optional
- `fuelEntryId` optional
- `maintenanceEntryId` optional

Response:

```json
{
  "data": {
    "id": "att_123",
    "type": "RECEIPT",
    "fileUrl": "signed-or-internal-url",
    "mimeType": "image/jpeg",
    "fileSizeBytes": 242300
  }
}
```

### GET `/attachments/:id/signed-url`

Private dosya icin kisa sureli signed URL doner.

### DELETE `/attachments/:id`

Soft delete + storage cleanup job.

## 17. Export

### POST `/exports`

Request:

```json
{
  "format": "PDF",
  "periodStart": "2026-06-01",
  "periodEnd": "2026-06-30",
  "vehicleId": "veh_123"
}
```

Response:

```json
{
  "data": {
    "id": "expjob_123",
    "status": "PENDING",
    "format": "PDF",
    "periodStart": "2026-06-01",
    "periodEnd": "2026-06-30"
  }
}
```

### GET `/exports`

### GET `/exports/:id`

### GET `/exports/:id/download`

Hazir export icin signed URL veya redirect doner.

### POST `/exports/:id/retry`

Failed job icin tekrar dener.

## 18. Kategoriler ve Odeme Yontemleri

### GET `/categories`

Sistem ve kullanici kategorilerini doner.

### POST `/categories`

Request:

```json
{
  "name": "Kopru",
  "expenseType": "VARIABLE"
}
```

### PATCH `/categories/:id`

### DELETE `/categories/:id`

### GET `/payment-methods`

### POST `/payment-methods`

### PATCH `/payment-methods/:id`

### DELETE `/payment-methods/:id`

## 19. Bildirimler

### GET `/notifications`

### PATCH `/notifications/:id/read`

### POST `/notifications/register-device`

Mobil push token kaydi.

Request:

```json
{
  "deviceToken": "expo_push_token",
  "platform": "ios"
}
```

## 20. KVKK / Hesap Verileri

### POST `/privacy/export-account`

Kullanicinin tum verileri icin export job olusturur.

### POST `/privacy/delete-account`

Request:

```json
{
  "password": "StrongPassword123",
  "confirmation": "DELETE_MY_ACCOUNT"
}
```

Response:

```json
{
  "data": {
    "requestId": "del_123",
    "status": "PROCESSING"
  }
}
```

### GET `/privacy/consents`

### PATCH `/privacy/consents`

Request:

```json
{
  "marketingConsent": false,
  "analyticsConsent": true
}
```

## 21. Admin

Admin endpointleri `/admin` prefix'i altindadir ve `ADMIN` rolu ister.

### GET `/admin/dashboard`

Response:

```json
{
  "data": {
    "totalUsers": 120,
    "activeUsers7d": 38,
    "tripCountToday": 420,
    "expenseCountToday": 210,
    "pendingExports": 4,
    "errorCount24h": 3
  }
}
```

### GET `/admin/users`

### GET `/admin/users/:id`

Finansal detaylar varsayilan olarak maskeli doner.

### GET `/admin/export-jobs`

### GET `/admin/feedback`

### PATCH `/admin/feedback/:id`

### GET `/admin/logs`

### POST `/admin/announcements`

Request:

```json
{
  "title": "Bakim duyurusu",
  "body": "Sistem bu gece 02:00-02:30 arasinda bakimda olacak.",
  "sendAt": "2026-06-18T02:00:00+03:00"
}
```

## 22. Health ve Observability

### GET `/health`

Public veya internal olabilir.

Response:

```json
{
  "status": "ok",
  "timestamp": "2026-06-17T12:00:00Z"
}
```

### GET `/health/deep`

Internal/admin:

- DB
- Redis
- Storage
- Queue

## 23. Rate Limit Onerileri

| Endpoint grubu | Limit |
|---|---:|
| `/auth/login` | IP basina 5/dk |
| `/auth/register` | IP basina 3/dk |
| CRUD endpointleri | Kullanici basina 120/dk |
| File upload | Kullanici basina 20/saat |
| Export create | Kullanici basina 10/gun |
| Scenario analysis | Kullanici basina 60/saat |

## 24. MVP Contract Kabul Kriterleri

- Swagger/OpenAPI dokumani otomatik uretilmelidir.
- Tum request body'ler DTO + validation ile korunmalidir.
- Tum para/km/litre alanlari string decimal olarak sozlesmede tanimlanmalidir.
- Tum liste endpointlerinde pagination standardi ayni olmalidir.
- Auth, refresh rotation ve session revoke akislari test edilmelidir.
- Dashboard ve rapor endpointleri ayni hesap motorunu kullanmalidir.
- Export ve attachment dosyalari private storage + signed URL ile sunulmalidir.
- Admin endpointleri role guard ile korunmalidir.

