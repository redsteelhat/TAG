"use client";

import {
  ChevronLeft,
  ChevronRight,
  FileSearch,
  ListFilter,
  RefreshCw,
  Save,
  Search,
  Wrench,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { EmptyState } from "./empty-state";
import { getJson, postJson } from "../lib/api-client";
import { getAccessToken } from "../lib/auth-storage";

type AllocationType = "IMMEDIATE" | "DAILY" | "MONTHLY" | "YEARLY" | "PER_KM";
type MaintenanceSortBy =
  | "amount"
  | "costPerKm"
  | "createdAt"
  | "maintenanceDate"
  | "odometerKm";
type SortDirection = "asc" | "desc";

interface MaintenanceEntry {
  id: string;
  vehicleId: string;
  category: string;
  title: string;
  amount: string;
  maintenanceDate: string;
  odometerKm?: string | null;
  expectedIntervalKm?: string | null;
  nextMaintenanceKm?: string | null;
  remainingKm?: string | null;
  estimatedNextMaintenanceDate?: string | null;
  reminderEnabled: boolean;
  costPerKm?: string | null;
  serviceName?: string | null;
  allocationType: AllocationType;
  note?: string | null;
}

interface Vehicle {
  id: string;
  plateNumber: string;
  brand?: string | null;
  model?: string | null;
  isActive: boolean;
  odometerKm?: string | null;
  annualEstimatedKm?: string | null;
}

interface MaintenanceEntriesResponse {
  data: MaintenanceEntry[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

interface VehiclesResponse {
  data: Vehicle[];
}

interface MaintenanceEntryResponse {
  data: MaintenanceEntry;
}

interface MaintenanceFormState {
  allocationType: AllocationType;
  amount: string;
  category: string;
  expectedIntervalKm: string;
  maintenanceDate: string;
  note: string;
  odometerKm: string;
  reminderEnabled: boolean;
  serviceName: string;
  title: string;
  vehicleId: string;
}

interface MaintenanceFilterValues {
  allocationType: string;
  category: string;
  endDate: string;
  maxAmount: string;
  maxOdometerKm: string;
  minAmount: string;
  minOdometerKm: string;
  q: string;
  sortBy: MaintenanceSortBy;
  sortDirection: SortDirection;
  startDate: string;
  vehicleId: string;
}

const today = new Date().toISOString().slice(0, 10);

const emptyMaintenanceForm: MaintenanceFormState = {
  allocationType: "PER_KM",
  amount: "",
  category: "Periyodik bakım",
  expectedIntervalKm: "10000",
  maintenanceDate: today,
  note: "",
  odometerKm: "",
  reminderEnabled: true,
  serviceName: "",
  title: "Yağ, filtre ve işçilik",
  vehicleId: "",
};

const categoryPresets = [
  "Periyodik bakım",
  "Mekanik",
  "Elektrik",
  "Lastik",
  "Klima",
  "Kaporta",
  "Temizlik",
];

const allocationTypeLabels: Record<AllocationType, string> = {
  DAILY: "Günlük",
  IMMEDIATE: "Tek sefer",
  MONTHLY: "Aylık",
  PER_KM: "Km bazlı",
  YEARLY: "Yıllık",
};

const sortOptions: Array<{ label: string; value: MaintenanceSortBy }> = [
  { label: "Bakım tarihi", value: "maintenanceDate" },
  { label: "Tutar", value: "amount" },
  { label: "Km başı maliyet", value: "costPerKm" },
  { label: "Km sayacı", value: "odometerKm" },
  { label: "Oluşturma tarihi", value: "createdAt" },
];

export function MaintenancePanel() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [entries, setEntries] = useState<MaintenanceEntry[]>([]);
  const [meta, setMeta] = useState<MaintenanceEntriesResponse["meta"] | null>(
    null,
  );
  const [form, setForm] = useState<MaintenanceFormState>(emptyMaintenanceForm);
  const [vehicleId, setVehicleId] = useState("");
  const [category, setCategory] = useState("");
  const [allocationType, setAllocationType] = useState("");
  const [q, setQ] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [minOdometerKm, setMinOdometerKm] = useState("");
  const [maxOdometerKm, setMaxOdometerKm] = useState("");
  const [sortBy, setSortBy] = useState<MaintenanceSortBy>("maintenanceDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const pageMetrics = useMemo(() => {
    return entries.reduce(
      (totals, item) => ({
        averageCostPerKm:
          totals.averageCostPerKm + toNumber(item.costPerKm ?? "0"),
        reserveKm: totals.reserveKm + toNumber(item.expectedIntervalKm ?? "0"),
        totalAmount: totals.totalAmount + toNumber(item.amount),
      }),
      {
        averageCostPerKm: 0,
        reserveKm: 0,
        totalAmount: 0,
      },
    );
  }, [entries]);

  const averageCostPerKm =
    entries.length > 0 ? pageMetrics.averageCostPerKm / entries.length : 0;
  const formPlan = useMemo(
    () => calculateMaintenancePlanPreview(form, vehicles),
    [form, vehicles],
  );
  const hasActiveFilters = Boolean(
    vehicleId ||
    category ||
    allocationType ||
    q.trim() ||
    startDate ||
    endDate ||
    minAmount ||
    maxAmount ||
    minOdometerKm ||
    maxOdometerKm,
  );

  useEffect(() => {
    setAccessToken(getAccessToken());
  }, []);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    void fetchVehicles(accessToken);
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    void fetchEntries(accessToken);
  }, [accessToken, page, sortBy, sortDirection]);

  useEffect(() => {
    if (form.vehicleId || vehicles.length === 0) {
      return;
    }

    const activeVehicle = vehicles.find((vehicle) => vehicle.isActive);

    setForm((currentForm) => ({
      ...currentForm,
      vehicleId: activeVehicle?.id ?? vehicles[0].id,
    }));
  }, [form.vehicleId, vehicles]);

  async function fetchVehicles(token = accessToken) {
    if (!token) {
      return;
    }

    try {
      const response = await getJson<VehiclesResponse>("/vehicles", {
        accessToken: token,
      });

      setVehicles(response.data);
    } catch (error) {
      setFormMessage(
        error instanceof Error ? error.message : "Araçlar yüklenemedi.",
      );
    }
  }

  async function fetchEntries(
    token = accessToken,
    pageToLoad = page,
    filters: MaintenanceFilterValues = {
      allocationType,
      category,
      endDate,
      maxAmount,
      maxOdometerKm,
      minAmount,
      minOdometerKm,
      q,
      sortBy,
      sortDirection,
      startDate,
      vehicleId,
    },
  ) {
    if (!token) {
      setMessage("Bakım kayıtlarını görmek için önce giriş yapmalısın.");
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await getJson<MaintenanceEntriesResponse>(
        "/maintenance-entries",
        {
          accessToken: token,
          query: {
            allocationType: filters.allocationType || undefined,
            category: filters.category || undefined,
            endDate: filters.endDate,
            maxAmount: normalizeDecimal(filters.maxAmount),
            maxOdometerKm: normalizeDecimal(filters.maxOdometerKm),
            minAmount: normalizeDecimal(filters.minAmount),
            minOdometerKm: normalizeDecimal(filters.minOdometerKm),
            page: pageToLoad,
            pageSize: 10,
            q: filters.q.trim() || undefined,
            sortBy: filters.sortBy,
            sortDirection: filters.sortDirection,
            startDate: filters.startDate,
            vehicleId: filters.vehicleId || undefined,
          },
        },
      );

      setEntries(response.data);
      setMeta(response.meta);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Bakım kayıtları yüklenemedi.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setFormMessage("Bakım kaydı eklemek için önce giriş yapmalısın.");
      return;
    }

    const validationMessage = validateMaintenanceForm(form);

    if (validationMessage) {
      setFormMessage(validationMessage);
      return;
    }

    setIsSaving(true);
    setFormMessage(null);

    try {
      const response = await postJson<MaintenanceEntryResponse>(
        "/maintenance-entries",
        {
          allocationType: form.allocationType,
          amount: normalizeDecimal(form.amount),
          category: form.category.trim(),
          expectedIntervalKm: normalizeDecimal(form.expectedIntervalKm),
          maintenanceDate: form.maintenanceDate,
          note: form.note.trim() || undefined,
          odometerKm: normalizeDecimal(form.odometerKm),
          reminderEnabled: form.reminderEnabled,
          serviceName: form.serviceName.trim() || undefined,
          title: form.title.trim(),
          vehicleId: form.vehicleId,
        },
        {
          accessToken,
        },
      );

      setEntries((currentEntries) =>
        [response.data, ...currentEntries].slice(0, 10),
      );
      setForm((currentForm) => ({
        ...emptyMaintenanceForm,
        vehicleId: currentForm.vehicleId,
      }));
      setFormMessage("Bakım kaydı eklendi.");
      setPage(1);
      await fetchEntries(accessToken, 1);
    } catch (error) {
      setFormMessage(
        error instanceof Error ? error.message : "Bakım kaydı eklenemedi.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const filters = {
      allocationType,
      category,
      endDate,
      maxAmount,
      maxOdometerKm,
      minAmount,
      minOdometerKm,
      q,
      sortBy,
      sortDirection,
      startDate,
      vehicleId,
    };

    setPage(1);
    void fetchEntries(accessToken, 1, filters);
  }

  function resetFilters() {
    setVehicleId("");
    setCategory("");
    setAllocationType("");
    setQ("");
    setStartDate("");
    setEndDate("");
    setMinAmount("");
    setMaxAmount("");
    setMinOdometerKm("");
    setMaxOdometerKm("");
    setSortBy("maintenanceDate");
    setSortDirection("desc");
    setPage(1);
    void fetchEntries(accessToken, 1, {
      allocationType: "",
      category: "",
      endDate: "",
      maxAmount: "",
      maxOdometerKm: "",
      minAmount: "",
      minOdometerKm: "",
      q: "",
      sortBy: "maintenanceDate",
      sortDirection: "desc",
      startDate: "",
      vehicleId: "",
    });
  }

  return (
    <div className="maintenance-page">
      <section className="metric-grid maintenance-metrics">
        <article className="metric-card">
          <span>Sayfadaki toplam bakım</span>
          <strong>{formatMoney(pageMetrics.totalAmount)}</strong>
        </article>
        <article className="metric-card">
          <span>Ortalama km başı maliyet</span>
          <strong>{formatMoney(averageCostPerKm)}</strong>
        </article>
        <article className="metric-card">
          <span>Takip edilen bakım aralığı</span>
          <strong>{formatKm(pageMetrics.reserveKm)}</strong>
        </article>
        <article className="metric-card">
          <span>Kayıt sayısı</span>
          <strong>{meta?.total ?? entries.length}</strong>
        </article>
      </section>

      <section className="panel quick-expense-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Servis ve yıpranma</p>
            <h2>Bakım ekle</h2>
          </div>
          <span className="status-pill">Km bazlı rezerv</span>
        </div>

        <div className="quick-expense-presets" aria-label="Bakım kategorileri">
          {categoryPresets.map((preset) => (
            <button
              className="quick-expense-preset"
              key={preset}
              onClick={() =>
                setForm((currentForm) => ({
                  ...currentForm,
                  category: preset,
                  title:
                    preset === "Lastik"
                      ? "Lastik, balans ve rot"
                      : preset === "Temizlik"
                        ? "İç dış yıkama"
                        : currentForm.title,
                }))
              }
              type="button"
            >
              {preset}
            </button>
          ))}
        </div>

        <form className="quick-expense-form data-form" onSubmit={handleSubmit}>
          <div className="maintenance-entry-grid">
            <label>
              Araç
              <select
                required
                value={form.vehicleId}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    vehicleId: event.target.value,
                  }))
                }
              >
                <option value="">Araç seç</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.plateNumber} {vehicle.brand ?? ""}{" "}
                    {vehicle.model ?? ""}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Kategori
              <input
                required
                value={form.category}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    category: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              Başlık
              <input
                required
                value={form.title}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    title: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              Tutar
              <input
                inputMode="decimal"
                placeholder="8000.00"
                required
                value={form.amount}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    amount: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              Bakım tarihi
              <input
                required
                type="date"
                value={form.maintenanceDate}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    maintenanceDate: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              Km sayacı
              <input
                inputMode="decimal"
                placeholder="85120.5"
                value={form.odometerKm}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    odometerKm: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              Bakım aralığı km
              <input
                inputMode="decimal"
                placeholder="10000"
                value={form.expectedIntervalKm}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    expectedIntervalKm: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              Dağıtım
              <select
                value={form.allocationType}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    allocationType: event.target.value as AllocationType,
                  }))
                }
              >
                {Object.entries(allocationTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Servis
              <input
                placeholder="Yetkili servis"
                value={form.serviceName}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    serviceName: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <div className="maintenance-plan-preview">
            <div>
              <span>Km başı bakım rezervi</span>
              <strong>{formatMoney(formPlan.costPerKm)} / km</strong>
              <small>{formPlan.explanation}</small>
            </div>
            <div>
              <span>Sonraki bakım km</span>
              <strong>{formPlan.nextMaintenanceKmLabel}</strong>
              <small>{formPlan.remainingKmLabel}</small>
            </div>
            <div>
              <span>Tahmini sonraki bakım tarihi</span>
              <strong>{formPlan.estimatedNextDateLabel}</strong>
              <small>Araç yıllık km tahmini varsa hesaplanır.</small>
            </div>
          </div>

          <div className="quick-expense-bottom-row">
            <label>
              Not
              <textarea
                value={form.note}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    note: event.target.value,
                  }))
                }
              />
            </label>

            <label className="checkbox-row quick-expense-checkbox">
              <input
                checked={form.reminderEnabled}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    reminderEnabled: event.target.checked,
                  }))
                }
                type="checkbox"
              />
              Hatırlatma açık
            </label>

            <button
              className="primary-button"
              disabled={isSaving}
              type="submit"
            >
              <Save aria-hidden="true" className="inline-icon" />
              {isSaving ? "Kaydediliyor" : "Bakım kaydet"}
            </button>
          </div>

          {formMessage ? (
            <p
              className={
                formMessage.includes("eklendi") ||
                formMessage.includes("başarıyla") ||
                formMessage.includes("güncellendi")
                  ? "form-success"
                  : "form-alert"
              }
            >
              {formMessage}
            </p>
          ) : null}
        </form>
      </section>

      <section className="panel income-table-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Bakım geçmişi</p>
            <h2>Servis kayıtlari</h2>
          </div>
          <button
            className="secondary-button"
            disabled={isLoading}
            onClick={() => fetchEntries()}
            type="button"
          >
            <RefreshCw aria-hidden="true" className="inline-icon" />
            Yenile
          </button>
        </div>

        <form
          className="maintenance-list-toolbar"
          onSubmit={handleFilterSubmit}
        >
          <label className="toolbar-search">
            Ara
            <Search aria-hidden="true" />
            <input
              placeholder="filtre, lastik, servis..."
              value={q}
              onChange={(event) => setQ(event.target.value)}
            />
          </label>

          <label>
            Araç
            <select
              value={vehicleId}
              onChange={(event) => setVehicleId(event.target.value)}
            >
              <option value="">Tüm araçlar</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plateNumber}
                </option>
              ))}
            </select>
          </label>

          <label>
            Kategori
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />
          </label>

          <label>
            Dağıtım
            <select
              value={allocationType}
              onChange={(event) => setAllocationType(event.target.value)}
            >
              <option value="">Tümü</option>
              {Object.entries(allocationTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Başlangıç
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>

          <label>
            Bitiş
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>

          <label>
            Min tutar
            <input
              inputMode="decimal"
              value={minAmount}
              onChange={(event) => setMinAmount(event.target.value)}
            />
          </label>

          <label>
            Max tutar
            <input
              inputMode="decimal"
              value={maxAmount}
              onChange={(event) => setMaxAmount(event.target.value)}
            />
          </label>

          <label>
            Min km
            <input
              inputMode="decimal"
              value={minOdometerKm}
              onChange={(event) => setMinOdometerKm(event.target.value)}
            />
          </label>

          <label>
            Max km
            <input
              inputMode="decimal"
              value={maxOdometerKm}
              onChange={(event) => setMaxOdometerKm(event.target.value)}
            />
          </label>

          <label>
            Sırala
            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value as MaintenanceSortBy)
              }
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Yön
            <select
              value={sortDirection}
              onChange={(event) =>
                setSortDirection(event.target.value as SortDirection)
              }
            >
              <option value="desc">Azalan</option>
              <option value="asc">Artan</option>
            </select>
          </label>

          <div className="toolbar-actions">
            <button className="secondary-button" type="submit">
              <ListFilter aria-hidden="true" className="inline-icon" />
              Filtrele
            </button>
            <button
              className="secondary-button"
              onClick={resetFilters}
              type="button"
            >
              Temizle
            </button>
          </div>
        </form>

        {message ? (
          <div
            className={
              message.includes('kaydedildi') || message.includes('başarıyla')
                ? 'form-success'
                : 'form-alert'
            }
            style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span>{message}</span>
            <button
              className="secondary-button compact"
              onClick={() => fetchEntries()}
              type="button"
              style={{ marginLeft: '12px', padding: '4px 8px', fontSize: '12px' }}
            >
              <RefreshCw aria-hidden="true" className="inline-icon" style={{ marginRight: '4px', width: '12px', height: '12px' }} />
              Tekrar Dene
            </button>
          </div>
        ) : null}

        {isLoading ? (
          <div className="skeleton-list animate-pulse" style={{ padding: '20px 0' }}>
            <div className="skeleton-row" style={{ height: '40px', marginBottom: '8px' }} />
            <div className="skeleton-row" style={{ height: '48px', marginBottom: '8px' }} />
            <div className="skeleton-row" style={{ height: '48px', marginBottom: '8px' }} />
          </div>
        ) : entries.length === 0 ? (
          <div className="empty-state-panel compact">
            <EmptyState
              description={
                hasActiveFilters
                  ? "Bu filtrelerle eşleşen bakım kaydı bulunamadı. Km, tutar veya kategori filtresini genişletebilirsin."
                  : "Henüz bakım kaydınız bulunmamaktadır. Lastik değişimi, periyodik yağ bakımı, mekanik onarımlar ve temizlik giderlerini ekleyerek km başına yıpranma maliyetinin kârınıza etkisini anlık takip edin."
              }
              icon={hasActiveFilters ? FileSearch : Wrench}
              title={
                hasActiveFilters
                  ? "Filtreye uygun bakım kaydı yok."
                  : "Henüz bakım kaydı yok."
              }
              tips={
                hasActiveFilters
                  ? ["Kategori filtresini kaldır", "Km aralığını genişlet"]
                  : [
                      "Bakım tutarını gir",
                      "Aralık km ekle",
                      "Km başı maliyeti izle",
                    ]
              }
            />
          </div>
        ) : (
          <div className="data-table" role="table">
            <div
              className="data-table-row data-table-head maintenance-table-row"
              role="row"
            >
              <span>Tarih</span>
              <span>Kategori</span>
              <span>Araç</span>
              <span>Tutar</span>
              <span>Km sayacı</span>
              <span>Aralık</span>
              <span>Km başı</span>
              <span>Sonraki</span>
              <span>Kalan</span>
            </div>

            {entries.map((item) => (
              <div
                className="data-table-row maintenance-table-row"
                key={item.id}
                role="row"
              >
                <span>{formatDate(item.maintenanceDate)}</span>
                <span>
                  <strong>{item.category}</strong>
                  <small>
                    {item.title}
                    {item.serviceName ? ` - ${item.serviceName}` : ""}
                  </small>
                </span>
                <span>{vehicleLabel(vehicles, item.vehicleId)}</span>
                <span>{formatMoney(toNumber(item.amount))}</span>
                <span>
                  {item.odometerKm ? formatKm(toNumber(item.odometerKm)) : "-"}
                </span>
                <span>
                  {item.expectedIntervalKm
                    ? formatKm(toNumber(item.expectedIntervalKm))
                    : "-"}
                </span>
                <span>
                  {item.costPerKm ? formatMoney(toNumber(item.costPerKm)) : "-"}
                </span>
                <span>{nextMaintenanceKm(item)}</span>
                <span>{remainingMaintenanceKm(item)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="pagination-row">
          <button
            className="secondary-button"
            disabled={!meta?.hasPreviousPage}
            onClick={() =>
              setPage((currentPage) => Math.max(1, currentPage - 1))
            }
            type="button"
          >
            <ChevronLeft aria-hidden="true" className="inline-icon" />
            Önceki
          </button>
          <span>
            Sayfa {meta?.page ?? page} / {meta?.totalPages ?? 1}
          </span>
          <button
            className="secondary-button"
            disabled={!meta?.hasNextPage}
            onClick={() => setPage((currentPage) => currentPage + 1)}
            type="button"
          >
            Sonraki
            <ChevronRight aria-hidden="true" className="inline-icon" />
          </button>
        </div>
      </section>
    </div>
  );
}

function normalizeDecimal(value: string) {
  const trimmedValue = value.trim().replace(",", ".");

  return trimmedValue || undefined;
}

function toNumber(value: string) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    currency: "TRY",
    maximumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function formatKm(value: number) {
  return `${new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 1,
  }).format(value)} km`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function addDays(dateValue: string, days: number) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setUTCDate(date.getUTCDate() + days);

  return date;
}

function vehicleLabel(vehicles: Vehicle[], vehicleId: string) {
  const vehicle = vehicles.find((item) => item.id === vehicleId);

  return vehicle?.plateNumber ?? "Araç";
}

function validateMaintenanceForm(form: MaintenanceFormState) {
  const amount = Number(normalizeDecimal(form.amount));
  const intervalKm = Number(normalizeDecimal(form.expectedIntervalKm));
  const odometerKm = form.odometerKm
    ? Number(normalizeDecimal(form.odometerKm))
    : 0;

  if (!form.vehicleId) {
    return "Araç seçimi zorunlu.";
  }

  if (!form.maintenanceDate) {
    return "Bakım tarihi zorunlu.";
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return "Tutar 0’dan büyük olmalı.";
  }

  if (!Number.isFinite(intervalKm) || intervalKm <= 0) {
    return "Bakım aralığı km 0’dan büyük olmalı.";
  }

  if (form.odometerKm && (!Number.isFinite(odometerKm) || odometerKm < 0)) {
    return "Km sayacı negatif olamaz.";
  }

  return null;
}

function calculateMaintenancePlanPreview(
  form: MaintenanceFormState,
  vehicles: Vehicle[],
) {
  const amount = Number(normalizeDecimal(form.amount));
  const intervalKm = Number(normalizeDecimal(form.expectedIntervalKm));
  const odometerKm = Number(normalizeDecimal(form.odometerKm));
  const vehicle = vehicles.find((item) => item.id === form.vehicleId);
  const vehicleOdometerKm = vehicle?.odometerKm
    ? Number(vehicle.odometerKm)
    : null;
  const annualEstimatedKm = vehicle?.annualEstimatedKm
    ? Number(vehicle.annualEstimatedKm)
    : null;
  const costPerKm =
    Number.isFinite(amount) &&
    amount > 0 &&
    Number.isFinite(intervalKm) &&
    intervalKm > 0
      ? amount / intervalKm
      : 0;
  const nextMaintenanceKm =
    Number.isFinite(odometerKm) &&
    odometerKm >= 0 &&
    Number.isFinite(intervalKm) &&
    intervalKm > 0
      ? odometerKm + intervalKm
      : null;
  const remainingKm =
    nextMaintenanceKm !== null &&
    vehicleOdometerKm !== null &&
    Number.isFinite(vehicleOdometerKm)
      ? nextMaintenanceKm - vehicleOdometerKm
      : null;
  const estimatedNextDate =
    annualEstimatedKm &&
    annualEstimatedKm > 0 &&
    Number.isFinite(intervalKm) &&
    intervalKm > 0
      ? addDays(
          form.maintenanceDate,
          Math.round((intervalKm / annualEstimatedKm) * 365),
        )
      : null;

  return {
    costPerKm,
    estimatedNextDateLabel: estimatedNextDate
      ? formatDate(estimatedNextDate.toISOString())
      : "Veri yok",
    explanation:
      amount > 0 && intervalKm > 0
        ? `${formatMoney(amount)} bakım / ${formatKm(intervalKm)} = ${formatMoney(costPerKm)}/km bakım rezervi`
        : "Tutar ve bakım aralığı girildiğinde km başı bakım rezervi hesaplanır.",
    nextMaintenanceKmLabel:
      nextMaintenanceKm !== null ? formatKm(nextMaintenanceKm) : "Km gerekli",
    remainingKmLabel:
      remainingKm !== null
        ? remainingKm >= 0
          ? `${formatKm(remainingKm)} kaldı`
          : `${formatKm(Math.abs(remainingKm))} gecikti`
        : "Araç km eksik",
  };
}

function nextMaintenanceKm(item: MaintenanceEntry) {
  if (item.nextMaintenanceKm) {
    return formatKm(toNumber(item.nextMaintenanceKm));
  }

  if (!item.odometerKm || !item.expectedIntervalKm) {
    return "-";
  }

  return formatKm(
    toNumber(item.odometerKm) + toNumber(item.expectedIntervalKm),
  );
}

function remainingMaintenanceKm(item: MaintenanceEntry) {
  if (!item.remainingKm) {
    return "Araç km eksik";
  }

  const remainingKm = toNumber(item.remainingKm);

  return remainingKm >= 0
    ? `${formatKm(remainingKm)} kaldı`
    : `${formatKm(Math.abs(remainingKm))} gecikti`;
}
