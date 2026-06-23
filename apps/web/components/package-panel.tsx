'use client';

import {
  ChevronLeft,
  ChevronRight,
  FileSearch,
  LockKeyhole,
  ListFilter,
  Package,
  RefreshCw,
  Save,
  Search
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { EmptyState } from './empty-state';
import { getJson, postJson } from '../lib/api-client';
import { getAccessToken } from '../lib/auth-storage';

type AllocationMethod =
  | 'DIRECT_EXPENSE'
  | 'PER_ACTIVE_DAY'
  | 'PER_DAY'
  | 'PER_KM'
  | 'PER_TRIP';
type SortDirection = 'asc' | 'desc';
type PackageSortBy = 'amount' | 'createdAt' | 'endsAt' | 'startsAt';

interface TagPackage {
  id: string;
  vehicleId: string;
  name: string;
  amount: string;
  startsAt: string;
  endsAt: string;
  durationDays: number;
  dailyCost: string;
  allocationMethod: AllocationMethod;
  breakEvenTarget?: string | null;
  isActive: boolean;
  note?: string | null;
}

interface DashboardAggregation {
  depreciationCost: string;
  fixedCostShare: string;
  fuelCost: string;
  maintenanceReserve: string;
  packageShare: string;
}

interface ReportOverviewResponse {
  data: {
    dashboard: DashboardAggregation;
  };
}

interface Vehicle {
  id: string;
  plateNumber: string;
  brand?: string | null;
  model?: string | null;
  isActive: boolean;
}

interface TagPackagesResponse {
  data: TagPackage[];
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

interface TagPackageResponse {
  data: TagPackage;
}

interface PackageFilterValues {
  allocationMethod: string;
  endDate: string;
  isActive: string;
  maxAmount: string;
  minAmount: string;
  q: string;
  sortBy: PackageSortBy;
  sortDirection: SortDirection;
  startDate: string;
  vehicleId: string;
}

interface PackageFormState {
  allocationMethod: AllocationMethod;
  amount: string;
  breakEvenTarget: string;
  durationDays: string;
  endsAt: string;
  isActive: boolean;
  name: string;
  note: string;
  startsAt: string;
  vehicleId: string;
}

const allocationMethodLabels: Record<AllocationMethod, string> = {
  DIRECT_EXPENSE: 'Direkt gider yaz',
  PER_ACTIVE_DAY: 'Çalışılan güne böl',
  PER_DAY: 'Güne böl',
  PER_KM: 'Km’ye böl',
  PER_TRIP: 'Sefere böl'
};

const sortOptions: Array<{ label: string; value: PackageSortBy }> = [
  { label: 'Başlangıç tarihi', value: 'startsAt' },
  { label: 'Bitiş tarihi', value: 'endsAt' },
  { label: 'Tutar', value: 'amount' },
  { label: 'Oluşturma tarihi', value: 'createdAt' }
];

const today = new Date().toISOString().slice(0, 10);
const defaultEndDate = addDays(today, 6);

const emptyPackageForm: PackageFormState = {
  allocationMethod: 'PER_DAY',
  amount: '',
  breakEvenTarget: '',
  durationDays: '',
  endsAt: defaultEndDate,
  isActive: true,
  name: 'Haftalık operasyon paketi',
  note: '',
  startsAt: today,
  vehicleId: ''
};

export function PackagePanel() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [packages, setPackages] = useState<TagPackage[]>([]);
  const [meta, setMeta] = useState<TagPackagesResponse['meta'] | null>(null);
  const [packageForm, setPackageForm] =
    useState<PackageFormState>(emptyPackageForm);
  const [breakEvenContext, setBreakEvenContext] =
    useState<DashboardAggregation | null>(null);
  const [vehicleId, setVehicleId] = useState('');
  const [allocationMethod, setAllocationMethod] = useState('');
  const [isActive, setIsActive] = useState('');
  const [q, setQ] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [sortBy, setSortBy] = useState<PackageSortBy>('startsAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBreakEven, setIsLoadingBreakEven] = useState(false);
  const [isSavingPackage, setIsSavingPackage] = useState(false);
  const overlappingPackages = useMemo(
    () => findOverlappingActivePackages(packages, packageForm),
    [packageForm, packages]
  );
  const packageDailyShare = calculatePackagePeriodShare(packageForm);
  const overlappingPackageShare = overlappingPackages.reduce(
    (total, item) => total + calculatePackageDailyShare(item),
    0
  );
  const suggestedBreakEvenTarget = calculateSuggestedBreakEvenTarget(
    packageDailyShare + overlappingPackageShare,
    breakEvenContext
  );
  const selectedBreakEvenTarget =
    normalizeDecimal(packageForm.breakEvenTarget) ??
    suggestedBreakEvenTarget.toFixed(2);

  const pageMetrics = useMemo(() => {
    return packages.reduce(
      (totals, item) => ({
        activeCount: totals.activeCount + (item.isActive ? 1 : 0),
        breakEvenTarget:
          totals.breakEvenTarget + toNumber(item.breakEvenTarget ?? '0'),
        dailyCost: totals.dailyCost + toNumber(item.dailyCost),
        totalAmount: totals.totalAmount + toNumber(item.amount)
      }),
      {
        activeCount: 0,
        breakEvenTarget: 0,
        dailyCost: 0,
        totalAmount: 0
      }
    );
  }, [packages]);
  const hasActiveFilters = Boolean(
    vehicleId ||
    allocationMethod ||
    isActive ||
    q.trim() ||
    startDate ||
    endDate ||
    minAmount ||
    maxAmount
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

    void fetchPackages(accessToken);
  }, [accessToken, page, sortBy, sortDirection]);

  useEffect(() => {
    if (!accessToken || !packageForm.vehicleId || !packageForm.startsAt) {
      setBreakEvenContext(null);
      return;
    }

    void fetchBreakEvenContext(
      accessToken,
      packageForm.vehicleId,
      packageForm.startsAt
    );
  }, [accessToken, packageForm.startsAt, packageForm.vehicleId]);

  useEffect(() => {
    if (packageForm.vehicleId || vehicles.length === 0) {
      return;
    }

    const activeVehicle = vehicles.find((vehicle) => vehicle.isActive);

    setPackageForm((currentForm) => ({
      ...currentForm,
      vehicleId: activeVehicle?.id ?? vehicles[0].id
    }));
  }, [packageForm.vehicleId, vehicles]);

  async function fetchVehicles(token = accessToken) {
    if (!token) {
      return;
    }

    try {
      const response = await getJson<VehiclesResponse>('/vehicles', {
        accessToken: token
      });

      setVehicles(response.data);
    } catch (error) {
      setFormMessage(
        error instanceof Error ? error.message : 'Araçlar yüklenemedi.'
      );
    }
  }

  async function fetchPackages(
    token = accessToken,
    pageToLoad = page,
    filters: PackageFilterValues = {
      allocationMethod,
      endDate,
      isActive,
      maxAmount,
      minAmount,
      q,
      sortBy,
      sortDirection,
      startDate,
      vehicleId
    }
  ) {
    if (!token) {
      setMessage('Paket giderlerini görmek için önce giriş yapmalısın.');
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await getJson<TagPackagesResponse>('/tag-packages', {
        accessToken: token,
        query: {
          allocationMethod: filters.allocationMethod || undefined,
          endDate: filters.endDate,
          isActive: filters.isActive || undefined,
          maxAmount: normalizeDecimal(filters.maxAmount),
          minAmount: normalizeDecimal(filters.minAmount),
          page: pageToLoad,
          pageSize: 10,
          q: filters.q.trim() || undefined,
          sortBy: filters.sortBy,
          sortDirection: filters.sortDirection,
          startDate: filters.startDate,
          vehicleId: filters.vehicleId || undefined
        }
      });

      setPackages(response.data);
      setMeta(response.meta);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Paketler yüklenemedi.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchBreakEvenContext(
    token: string,
    selectedVehicleId: string,
    date: string
  ) {
    setIsLoadingBreakEven(true);

    try {
      const response = await getJson<ReportOverviewResponse>(
        '/reports/overview',
        {
          accessToken: token,
          query: {
            date,
            month: date.slice(0, 7),
            vehicleId: selectedVehicleId
          }
        }
      );

      setBreakEvenContext(response.data.dashboard);
    } catch {
      setBreakEvenContext(null);
    } finally {
      setIsLoadingBreakEven(false);
    }
  }

  async function handlePackageSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setFormMessage('Paket kaydetmek için önce giriş yapmalısın.');
      return;
    }

    if (!packageForm.vehicleId) {
      setFormMessage('Paket kaydetmek için önce araç seçmelisin.');
      return;
    }

    const validationMessage = validatePackageForm(packageForm);

    if (validationMessage) {
      setFormMessage(validationMessage);
      return;
    }

    setIsSavingPackage(true);
    setFormMessage(null);

    try {
      await postJson<TagPackageResponse>(
        '/tag-packages',
        buildPackagePayload(packageForm, selectedBreakEvenTarget),
        { accessToken }
      );

      setFormMessage('Paket kaydı oluşturuldu.');
      resetPackageForm();
      setPage(1);
      await fetchPackages(accessToken, 1);
      await fetchBreakEvenContext(
        accessToken,
        packageForm.vehicleId,
        packageForm.startsAt
      );
    } catch (error) {
      setFormMessage(
        error instanceof Error ? error.message : 'Paket kaydedilemedi.'
      );
    } finally {
      setIsSavingPackage(false);
    }
  }

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    void fetchPackages(accessToken, 1);
  }

  function clearFilters() {
    const clearedFilters: PackageFilterValues = {
      allocationMethod: '',
      endDate: '',
      isActive: '',
      maxAmount: '',
      minAmount: '',
      q: '',
      sortBy: 'startsAt',
      sortDirection: 'desc',
      startDate: '',
      vehicleId: ''
    };

    setVehicleId('');
    setAllocationMethod('');
    setIsActive('');
    setQ('');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setSortBy('startsAt');
    setSortDirection('desc');
    setPage(1);
    void fetchPackages(accessToken, 1, clearedFilters);
  }

  function resetPackageForm() {
    const activeVehicle = vehicles.find((vehicle) => vehicle.isActive);

    setPackageForm({
      ...emptyPackageForm,
      endsAt: addDays(today, 6),
      startsAt: today,
      vehicleId: activeVehicle?.id ?? vehicles[0]?.id ?? ''
    });
  }

  function updatePackageForm<Key extends keyof PackageFormState>(
    key: Key,
    value: PackageFormState[Key]
  ) {
    setPackageForm((currentForm) => ({
      ...currentForm,
      [key]: value
    }));
  }

  if (!accessToken) {
    return (
      <section className="panel empty-state-panel">
        <EmptyState
          actionHref="/login"
          actionLabel="Giriş ekranına git"
          description="Paket payı, günlük dağıtım ve başabaş hesaplarını görebilmek için aktif oturum gerekiyor."
          eyebrow="Oturum gerekli"
          icon={LockKeyhole}
          title="Paket giderlerini görmek için giriş yap."
        />
      </section>
    );
  }

  return (
    <section className="income-list-page">
      <section className="metric-grid income-metrics" aria-label="Paket özeti">
        <MetricCard
          label="Görüntülenen paket"
          value={formatMoney(pageMetrics.totalAmount)}
        />
        <MetricCard
          label="Günlük paket payı"
          value={formatMoney(pageMetrics.dailyCost)}
        />
        <MetricCard
          label="Başabaş önerisi"
          value={formatMoney(pageMetrics.breakEvenTarget)}
        />
        <MetricCard label="Aktif paket" value={`${pageMetrics.activeCount}`} />
      </section>

      <section className="panel data-form quick-expense-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Paket girişi</p>
            <h2>Paket gideri ekle</h2>
          </div>
          <span className="status-pill">
            {packageForm.amount && packageForm.startsAt && packageForm.endsAt
              ? `${formatMoney(packageDailyShare)} paket payı`
              : 'Dağıtım bekliyor'}
          </span>
        </div>

        <form className="quick-expense-form" onSubmit={handlePackageSubmit}>
          <div className="package-entry-grid">
            <label>
              Araç
              <select
                disabled={vehicles.length === 0}
                onChange={(event) =>
                  updatePackageForm('vehicleId', event.target.value)
                }
                required
                value={packageForm.vehicleId}
              >
                <option value="">Araç seç</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {formatVehicleLabel(vehicle)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Paket adı
              <input
                onChange={(event) =>
                  updatePackageForm('name', event.target.value)
                }
                placeholder="Haftalık operasyon paketi"
                required
                value={packageForm.name}
              />
            </label>

            <label>
              Paket tutarı
              <input
                inputMode="decimal"
                onChange={(event) =>
                  updatePackageForm('amount', event.target.value)
                }
                placeholder="700.00"
                required
                value={packageForm.amount}
              />
            </label>

            <label>
              Başlangıç
              <input
                onChange={(event) =>
                  updatePackageForm('startsAt', event.target.value)
                }
                required
                type="date"
                value={packageForm.startsAt}
              />
            </label>

            <label>
              Bitiş
              <input
                onChange={(event) =>
                  updatePackageForm('endsAt', event.target.value)
                }
                required
                type="date"
                value={packageForm.endsAt}
              />
            </label>

            <label>
              Geçerlilik günü
              <input
                inputMode="numeric"
                readOnly
                value={String(calculateDurationDays(packageForm))}
              />
            </label>

            <label>
              Dağıtım
              <select
                onChange={(event) =>
                  updatePackageForm(
                    'allocationMethod',
                    event.target.value as AllocationMethod
                  )
                }
                value={packageForm.allocationMethod}
              >
                {Object.entries(allocationMethodLabels).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              Başabaş override
              <input
                inputMode="decimal"
                onChange={(event) =>
                  updatePackageForm('breakEvenTarget', event.target.value)
                }
                placeholder={formatDecimalInput(suggestedBreakEvenTarget)}
                value={packageForm.breakEvenTarget}
              />
            </label>
          </div>

          <div className="form-hint">
            Sistem önerisi: {formatMoney(suggestedBreakEvenTarget)}
            {isLoadingBreakEven ? ' (hesaplanıyor)' : ''}. Formül: paket payı +
            tahmini günlük yakıt + sabit gider + bakım rezervi + amortisman.
          </div>

          {overlappingPackages.length > 0 ? (
            <p className="form-hint warning">
              Seçili araç ve tarih aralığında {overlappingPackages.length} aktif
              paket daha var. Toplam paket payı{' '}
              {formatMoney(packageDailyShare + overlappingPackageShare)} olarak
              öneriye dahil edildi.
            </p>
          ) : null}

          <div className="quick-expense-bottom-row">
            <label>
              Not
              <input
                onChange={(event) =>
                  updatePackageForm('note', event.target.value)
                }
                placeholder="Platform paketi / çalışma paketi notu"
                value={packageForm.note}
              />
            </label>

            <label className="checkbox-row quick-expense-checkbox">
              <input
                checked={packageForm.isActive}
                onChange={(event) =>
                  updatePackageForm('isActive', event.target.checked)
                }
                type="checkbox"
              />
              Aktif paket
            </label>
          </div>

          {formMessage ? (
            <p
              className={
                formMessage.includes('oluşturuldu')
                  ? 'form-success'
                  : 'form-alert'
              }
            >
              {formMessage}
            </p>
          ) : null}

          <div className="form-actions">
            <button
              className="secondary-button"
              onClick={resetPackageForm}
              type="button"
            >
              Temizle
            </button>
            <button
              className="primary-button"
              disabled={isSavingPackage || vehicles.length === 0}
            >
              <Save aria-hidden="true" className="button-icon" />
              {isSavingPackage ? 'Kaydediliyor' : 'Paket ekle'}
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <form className="package-list-toolbar" onSubmit={handleFilterSubmit}>
          <label className="toolbar-search">
            <Search aria-hidden="true" />
            <input
              onChange={(event) => setQ(event.target.value)}
              placeholder="Paket adı veya not ara"
              value={q}
            />
          </label>

          <label>
            Araç
            <select
              onChange={(event) => setVehicleId(event.target.value)}
              value={vehicleId}
            >
              <option value="">Tüm araçlar</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {formatVehicleLabel(vehicle)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Dağıtım
            <select
              onChange={(event) => setAllocationMethod(event.target.value)}
              value={allocationMethod}
            >
              <option value="">Tüm dağıtımlar</option>
              {Object.entries(allocationMethodLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Durum
            <select
              onChange={(event) => setIsActive(event.target.value)}
              value={isActive}
            >
              <option value="">Tüm durumlar</option>
              <option value="true">Aktif</option>
              <option value="false">Pasif</option>
            </select>
          </label>

          <label>
            Başlangıç
            <input
              onChange={(event) => setStartDate(event.target.value)}
              type="date"
              value={startDate}
            />
          </label>

          <label>
            Bitiş
            <input
              onChange={(event) => setEndDate(event.target.value)}
              type="date"
              value={endDate}
            />
          </label>

          <label>
            Min tutar
            <input
              inputMode="decimal"
              onChange={(event) => setMinAmount(event.target.value)}
              placeholder="100.00"
              value={minAmount}
            />
          </label>

          <label>
            Max tutar
            <input
              inputMode="decimal"
              onChange={(event) => setMaxAmount(event.target.value)}
              placeholder="5000.00"
              value={maxAmount}
            />
          </label>

          <label>
            Sırala
            <select
              onChange={(event) =>
                setSortBy(event.target.value as PackageSortBy)
              }
              value={sortBy}
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
              onChange={(event) =>
                setSortDirection(event.target.value as SortDirection)
              }
              value={sortDirection}
            >
              <option value="desc">Azalan</option>
              <option value="asc">Artan</option>
            </select>
          </label>

          <div className="toolbar-actions">
            <button
              className="secondary-button"
              onClick={clearFilters}
              type="button"
            >
              <ListFilter aria-hidden="true" className="button-icon" />
              Temizle
            </button>
            <button className="primary-button" disabled={isLoading}>
              <RefreshCw aria-hidden="true" className="button-icon" />
              {isLoading ? 'Yükleniyor' : 'Filtrele'}
            </button>
          </div>
        </form>
      </section>

      <section className="panel income-table-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Paket kayıtları</p>
            <h2>Paket giderleri</h2>
          </div>
          <span className="status-pill">
            {meta ? `${meta.total} kayıt` : 'Hazırlanıyor'}
          </span>
        </div>

        {message ? (
          <div className="form-alert-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", margin: "8px 0" }}>
            <p className="form-message">{message}</p>
            <button
              className="secondary-button compact"
              onClick={() => {
                setMessage(null);
                void fetchPackages(accessToken);
              }}
              type="button"
            >
              <RefreshCw aria-hidden="true" className="inline-icon" />
              Yenile
            </button>
          </div>
        ) : null}

        {isLoading ? (
          <div className="data-table-empty">Paketler yükleniyor...</div>
        ) : packages.length > 0 ? (
          <div className="data-table" role="table" aria-label="Paket giderleri">
            <div
              className="data-table-row data-table-head package-table-row"
              role="row"
            >
              <span>Paket</span>
              <span>Araç</span>
              <span>Dönem</span>
              <span>Dağıtım</span>
              <span>Günlük</span>
              <span>Başabaş</span>
              <span>Durum</span>
              <span>Tutar</span>
            </div>

            {packages.map((item) => (
              <div
                className="data-table-row package-table-row"
                role="row"
                key={item.id}
              >
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.note || 'Not yok'}</small>
                </span>
                <span>{vehicleNameById(vehicles, item.vehicleId)}</span>
                <span>
                  <strong>{formatDate(item.startsAt)}</strong>
                  <small>
                    {formatDate(item.endsAt)} - {item.durationDays} gün
                  </small>
                </span>
                <span>{allocationMethodLabels[item.allocationMethod]}</span>
                <span>{formatMoney(toNumber(item.dailyCost))}</span>
                <span>
                  {item.breakEvenTarget
                    ? formatMoney(toNumber(item.breakEvenTarget))
                    : 'Yok'}
                </span>
                <span>
                  <span
                    className={
                      item.isActive
                        ? 'status-pill compact active'
                        : 'status-pill compact completed'
                    }
                  >
                    {item.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </span>
                <b>{formatMoney(toNumber(item.amount))}</b>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state-panel compact">
            <EmptyState
              description={
                hasActiveFilters
                  ? 'Bu filtrelerle eşleşen paket bulunamadı. Dönem veya durum filtresini temizleyerek tekrar deneyebilirsin.'
                  : 'Operasyon paketi, üyelik veya kullanım bedellerini eklediğinde günlük pay ve başabaş etkisi burada görünür.'
              }
              icon={hasActiveFilters ? FileSearch : Package}
              title={
                hasActiveFilters
                  ? 'Filtreye uygun paket yok.'
                  : 'Henüz paket kaydı yok.'
              }
              tips={
                hasActiveFilters
                  ? [
                      'Aktif/pasif filtresini kaldır',
                      'Dönem aralığını genişlet'
                    ]
                  : [
                      'Paket tutarını gir',
                      'Başlangıç ve bitiş seç',
                      'Dağıtım metodunu belirle'
                    ]
              }
            />
          </div>
        )}

        <div className="pagination-bar">
          <button
            className="secondary-button"
            disabled={!meta?.hasPreviousPage || isLoading}
            onClick={() =>
              setPage((currentPage) => Math.max(1, currentPage - 1))
            }
            type="button"
          >
            <ChevronLeft aria-hidden="true" className="button-icon" />
            Önceki
          </button>
          <span>
            Sayfa {meta?.page ?? page} / {meta?.totalPages || 1}
          </span>
          <button
            className="secondary-button"
            disabled={!meta?.hasNextPage || isLoading}
            onClick={() => setPage((currentPage) => currentPage + 1)}
            type="button"
          >
            Sonraki
            <ChevronRight aria-hidden="true" className="button-icon trailing" />
          </button>
        </div>
      </section>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric-card">
      <div className="metric-card-header">
        <p>{label}</p>
      </div>
      <strong>{value}</strong>
      <span>Kaydedilmiş paket kayıtları</span>
    </article>
  );
}

function buildPackagePayload(
  form: PackageFormState,
  suggestedBreakEvenTarget: string
) {
  return removeEmptyValues({
    allocationMethod: form.allocationMethod,
    amount: normalizeDecimal(form.amount),
    breakEvenTarget:
      normalizeDecimal(form.breakEvenTarget) ?? suggestedBreakEvenTarget,
    durationDays: calculateDurationDays(form),
    endsAt: form.endsAt,
    isActive: form.isActive,
    name: form.name.trim(),
    note: form.note.trim(),
    startsAt: form.startsAt,
    vehicleId: form.vehicleId
  });
}

function removeEmptyValues(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).filter(
      ([, value]) => value !== undefined && value !== ''
    )
  );
}

function calculateDailyCost(form: PackageFormState) {
  return calculatePackagePeriodShare(form);
}

function calculatePackagePeriodShare(form: PackageFormState) {
  const amount = toNumber(form.amount);

  if (form.allocationMethod === 'DIRECT_EXPENSE') {
    return amount;
  }

  const durationDays = calculateDurationDays(form);

  return durationDays > 0 ? amount / durationDays : 0;
}

function calculatePackageDailyShare(item: TagPackage) {
  if (item.allocationMethod === 'DIRECT_EXPENSE') {
    return toNumber(item.amount);
  }

  return toNumber(item.dailyCost);
}

function calculateSuggestedBreakEvenTarget(
  packageShare: number,
  dashboard: DashboardAggregation | null
) {
  return (
    packageShare +
    toNumber(dashboard?.fuelCost ?? '0') +
    toNumber(dashboard?.fixedCostShare ?? '0') +
    toNumber(dashboard?.maintenanceReserve ?? '0') +
    toNumber(dashboard?.depreciationCost ?? '0')
  );
}

function findOverlappingActivePackages(
  packages: TagPackage[],
  form: PackageFormState
) {
  if (!form.vehicleId || !form.startsAt || !form.endsAt) {
    return [];
  }

  const startsAt = new Date(form.startsAt);
  const endsAt = new Date(form.endsAt);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return [];
  }

  return packages.filter((item) => {
    if (!item.isActive || item.vehicleId !== form.vehicleId) {
      return false;
    }

    const itemStartsAt = new Date(item.startsAt);
    const itemEndsAt = new Date(item.endsAt);

    return itemStartsAt <= endsAt && itemEndsAt >= startsAt;
  });
}

function validatePackageForm(form: PackageFormState) {
  if (!form.vehicleId) {
    return 'Araç zorunlu.';
  }

  if (!form.allocationMethod) {
    return 'Dağıtım yöntemi zorunlu.';
  }

  if (toNumber(normalizeDecimal(form.amount) ?? '') <= 0) {
    return 'Paket tutarı 0’dan büyük olmalı.';
  }

  if (!form.startsAt || !form.endsAt) {
    return 'Başlangıç ve bitiş tarihi zorunlu.';
  }

  if (new Date(form.endsAt) < new Date(form.startsAt)) {
    return 'Bitiş tarihi başlangıçtan önce olamaz.';
  }

  return null;
}

function formatDecimalInput(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : '0.00';
}

function calculateDurationDays(
  form: Pick<PackageFormState, 'endsAt' | 'startsAt'>
) {
  if (!form.startsAt || !form.endsAt) {
    return 1;
  }

  const start = new Date(form.startsAt);
  const end = new Date(form.endsAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 1;
  }

  const dayMs = 24 * 60 * 60 * 1000;

  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / dayMs) + 1);
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function formatVehicleLabel(vehicle: Vehicle) {
  const name = [vehicle.brand, vehicle.model].filter(Boolean).join(' ');

  return name ? `${vehicle.plateNumber} - ${name}` : vehicle.plateNumber;
}

function vehicleNameById(vehicles: Vehicle[], vehicleId: string) {
  const vehicle = vehicles.find((item) => item.id === vehicleId);

  return vehicle ? formatVehicleLabel(vehicle) : 'Araç';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short'
  }).format(new Date(value));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    currency: 'TRY',
    maximumFractionDigits: 0,
    style: 'currency'
  }).format(value);
}

function normalizeDecimal(value: string) {
  const normalizedValue = value.trim().replace(',', '.');

  return normalizedValue || undefined;
}

function toNumber(value: string) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}
