'use client';

import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  RefreshCw,
  Save,
  Search
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getJson, postJson } from '../lib/api-client';
import { getAccessToken } from '../lib/auth-storage';

type AllocationMethod = 'ACTIVE_DAY' | 'CALENDAR_DAY' | 'PER_KM';
type ExpenseType =
  | 'VARIABLE'
  | 'FIXED'
  | 'SEMI_VARIABLE'
  | 'PLATFORM_PACKAGE'
  | 'FINANCING'
  | 'DEPRECIATION'
  | 'OPERATIONAL';
type PeriodType =
  | 'IMMEDIATE'
  | 'DAILY'
  | 'MONTHLY'
  | 'YEARLY'
  | 'PER_KM'
  | 'PER_TRIP'
  | 'PACKAGE_PERIOD';
type SortDirection = 'asc' | 'desc';
type FixedCostSortBy = 'amount' | 'createdAt' | 'nextDueAt' | 'startsAt';

interface RecurringExpense {
  id: string;
  vehicleId: string;
  name: string;
  expenseType: ExpenseType;
  amount: string;
  period: PeriodType;
  allocationMethod: AllocationMethod;
  startsAt: string;
  endsAt?: string | null;
  nextDueAt?: string | null;
  isActive: boolean;
  note?: string | null;
}

interface Vehicle {
  id: string;
  plateNumber: string;
  brand?: string | null;
  model?: string | null;
  isActive: boolean;
}

interface RecurringExpensesResponse {
  data: RecurringExpense[];
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

interface RecurringExpenseResponse {
  data: RecurringExpense;
}

interface FixedCostFilterValues {
  allocationMethod: string;
  endDate: string;
  expenseType: string;
  isActive: string;
  maxAmount: string;
  minAmount: string;
  period: string;
  q: string;
  sortBy: FixedCostSortBy;
  sortDirection: SortDirection;
  startDate: string;
  vehicleId: string;
}

interface FixedCostFormState {
  allocationMethod: AllocationMethod;
  amount: string;
  endsAt: string;
  expenseType: ExpenseType;
  isActive: boolean;
  name: string;
  nextDueAt: string;
  note: string;
  period: PeriodType;
  startsAt: string;
  vehicleId: string;
}

const allocationMethodLabels: Record<AllocationMethod, string> = {
  ACTIVE_DAY: 'Aktif gune bol',
  CALENDAR_DAY: 'Takvim gunune bol',
  PER_KM: 'Km’ye bol'
};

const expenseTypeLabels: Record<ExpenseType, string> = {
  DEPRECIATION: 'Amortisman',
  FINANCING: 'Finansman',
  FIXED: 'Sabit',
  OPERATIONAL: 'Operasyon',
  PLATFORM_PACKAGE: 'Paket',
  SEMI_VARIABLE: 'Yari degisken',
  VARIABLE: 'Degisken'
};

const periodLabels: Partial<Record<PeriodType, string>> = {
  DAILY: 'Gunluk',
  MONTHLY: 'Aylik',
  PER_KM: 'Km bazli',
  YEARLY: 'Yillik'
};

const sortOptions: Array<{ label: string; value: FixedCostSortBy }> = [
  { label: 'Sonraki odeme', value: 'nextDueAt' },
  { label: 'Baslangic tarihi', value: 'startsAt' },
  { label: 'Tutar', value: 'amount' },
  { label: 'Olusturma tarihi', value: 'createdAt' }
];

const quickFixedCostPresets: Array<{
  allocationMethod: AllocationMethod;
  expenseType: ExpenseType;
  label: string;
  name: string;
  period: PeriodType;
}> = [
  {
    allocationMethod: 'CALENDAR_DAY',
    expenseType: 'FIXED',
    label: 'Sigorta',
    name: 'Trafik sigortasi',
    period: 'YEARLY'
  },
  {
    allocationMethod: 'CALENDAR_DAY',
    expenseType: 'FIXED',
    label: 'Kasko',
    name: 'Kasko',
    period: 'YEARLY'
  },
  {
    allocationMethod: 'CALENDAR_DAY',
    expenseType: 'FIXED',
    label: 'MTV',
    name: 'MTV',
    period: 'YEARLY'
  },
  {
    allocationMethod: 'CALENDAR_DAY',
    expenseType: 'FIXED',
    label: 'Muayene',
    name: 'Muayene',
    period: 'YEARLY'
  },
  {
    allocationMethod: 'CALENDAR_DAY',
    expenseType: 'FINANCING',
    label: 'Kredi',
    name: 'Arac kredisi',
    period: 'MONTHLY'
  },
  {
    allocationMethod: 'ACTIVE_DAY',
    expenseType: 'OPERATIONAL',
    label: 'Telefon',
    name: 'Telefon hatti',
    period: 'MONTHLY'
  },
  {
    allocationMethod: 'ACTIVE_DAY',
    expenseType: 'OPERATIONAL',
    label: 'Internet',
    name: 'Internet paketi',
    period: 'MONTHLY'
  },
  {
    allocationMethod: 'CALENDAR_DAY',
    expenseType: 'FIXED',
    label: 'Otopark',
    name: 'Otopark aboneligi',
    period: 'MONTHLY'
  }
];

const today = new Date().toISOString().slice(0, 10);

const emptyFixedCostForm: FixedCostFormState = {
  allocationMethod: 'CALENDAR_DAY',
  amount: '',
  endsAt: '',
  expenseType: 'FIXED',
  isActive: true,
  name: '',
  nextDueAt: today,
  note: '',
  period: 'MONTHLY',
  startsAt: today,
  vehicleId: ''
};

export function FixedCostPanel() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fixedCosts, setFixedCosts] = useState<RecurringExpense[]>([]);
  const [meta, setMeta] = useState<RecurringExpensesResponse['meta'] | null>(
    null
  );
  const [fixedCostForm, setFixedCostForm] =
    useState<FixedCostFormState>(emptyFixedCostForm);
  const [vehicleId, setVehicleId] = useState('');
  const [expenseType, setExpenseType] = useState('');
  const [period, setPeriod] = useState('');
  const [allocationMethod, setAllocationMethod] = useState('');
  const [isActive, setIsActive] = useState('');
  const [q, setQ] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [sortBy, setSortBy] = useState<FixedCostSortBy>('nextDueAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingFixedCost, setIsSavingFixedCost] = useState(false);

  const pageMetrics = useMemo(() => {
    return fixedCosts.reduce(
      (totals, item) => ({
        activeCount: totals.activeCount + (item.isActive ? 1 : 0),
        dailyEquivalent: totals.dailyEquivalent + toDailyEquivalent(item),
        monthlyEquivalent: totals.monthlyEquivalent + toMonthlyEquivalent(item),
        totalAmount: totals.totalAmount + toNumber(item.amount)
      }),
      {
        activeCount: 0,
        dailyEquivalent: 0,
        monthlyEquivalent: 0,
        totalAmount: 0
      }
    );
  }, [fixedCosts]);

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

    void fetchFixedCosts(accessToken);
  }, [accessToken, page, sortBy, sortDirection]);

  useEffect(() => {
    if (fixedCostForm.vehicleId || vehicles.length === 0) {
      return;
    }

    const activeVehicle = vehicles.find((vehicle) => vehicle.isActive);

    setFixedCostForm((currentForm) => ({
      ...currentForm,
      vehicleId: activeVehicle?.id ?? vehicles[0].id
    }));
  }, [fixedCostForm.vehicleId, vehicles]);

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
        error instanceof Error ? error.message : 'Araclar yuklenemedi.'
      );
    }
  }

  async function fetchFixedCosts(
    token = accessToken,
    pageToLoad = page,
    filters: FixedCostFilterValues = {
      allocationMethod,
      endDate,
      expenseType,
      isActive,
      maxAmount,
      minAmount,
      period,
      q,
      sortBy,
      sortDirection,
      startDate,
      vehicleId
    }
  ) {
    if (!token) {
      setMessage('Sabit giderleri gormek icin once giris yapmalisin.');
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await getJson<RecurringExpensesResponse>(
        '/recurring-expenses',
        {
          accessToken: token,
          query: {
            allocationMethod: filters.allocationMethod || undefined,
            endDate: filters.endDate,
            expenseType: filters.expenseType || undefined,
            isActive: filters.isActive || undefined,
            maxAmount: normalizeDecimal(filters.maxAmount),
            minAmount: normalizeDecimal(filters.minAmount),
            page: pageToLoad,
            pageSize: 10,
            period: filters.period || undefined,
            q: filters.q.trim() || undefined,
            sortBy: filters.sortBy,
            sortDirection: filters.sortDirection,
            startDate: filters.startDate,
            vehicleId: filters.vehicleId || undefined
          }
        }
      );

      setFixedCosts(response.data);
      setMeta(response.meta);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Sabit giderler yuklenemedi.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFixedCostSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setFormMessage('Sabit gider kaydetmek icin once giris yapmalisin.');
      return;
    }

    if (!fixedCostForm.vehicleId) {
      setFormMessage('Sabit gider kaydetmek icin once arac secmelisin.');
      return;
    }

    setIsSavingFixedCost(true);
    setFormMessage(null);

    try {
      await postJson<RecurringExpenseResponse>(
        '/recurring-expenses',
        buildFixedCostPayload(fixedCostForm),
        { accessToken }
      );

      setFormMessage('Sabit gider kaydi olusturuldu.');
      resetFixedCostForm();
      setPage(1);
      await fetchFixedCosts(accessToken, 1);
    } catch (error) {
      setFormMessage(
        error instanceof Error ? error.message : 'Sabit gider kaydedilemedi.'
      );
    } finally {
      setIsSavingFixedCost(false);
    }
  }

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    void fetchFixedCosts(accessToken, 1);
  }

  function clearFilters() {
    const clearedFilters: FixedCostFilterValues = {
      allocationMethod: '',
      endDate: '',
      expenseType: '',
      isActive: '',
      maxAmount: '',
      minAmount: '',
      period: '',
      q: '',
      sortBy: 'nextDueAt',
      sortDirection: 'asc',
      startDate: '',
      vehicleId: ''
    };

    setVehicleId('');
    setExpenseType('');
    setPeriod('');
    setAllocationMethod('');
    setIsActive('');
    setQ('');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setSortBy('nextDueAt');
    setSortDirection('asc');
    setPage(1);
    void fetchFixedCosts(accessToken, 1, clearedFilters);
  }

  function applyPreset(preset: (typeof quickFixedCostPresets)[number]) {
    setFixedCostForm((currentForm) => ({
      ...currentForm,
      allocationMethod: preset.allocationMethod,
      expenseType: preset.expenseType,
      name: preset.name,
      period: preset.period
    }));
    setFormMessage(null);
  }

  function resetFixedCostForm() {
    const activeVehicle = vehicles.find((vehicle) => vehicle.isActive);

    setFixedCostForm({
      ...emptyFixedCostForm,
      nextDueAt: today,
      startsAt: today,
      vehicleId: activeVehicle?.id ?? vehicles[0]?.id ?? ''
    });
  }

  function updateFixedCostForm<Key extends keyof FixedCostFormState>(
    key: Key,
    value: FixedCostFormState[Key]
  ) {
    setFixedCostForm((currentForm) => ({
      ...currentForm,
      [key]: value
    }));
  }

  if (!accessToken) {
    return (
      <section className="panel empty-state-panel">
        <p className="eyebrow">Oturum gerekli</p>
        <h2>Sabit giderleri gormek icin giris yap.</h2>
        <p>Token bulunamadigi icin API’den sabit gider verisi cekilmedi.</p>
      </section>
    );
  }

  return (
    <section className="income-list-page">
      <section className="metric-grid income-metrics" aria-label="Sabit gider ozeti">
        <MetricCard
          label="Goruntulenen sabit gider"
          value={formatMoney(pageMetrics.totalAmount)}
        />
        <MetricCard
          label="Aylik karsilik"
          value={formatMoney(pageMetrics.monthlyEquivalent)}
        />
        <MetricCard
          label="Gunluk karsilik"
          value={formatMoney(pageMetrics.dailyEquivalent)}
        />
        <MetricCard label="Aktif gider" value={`${pageMetrics.activeCount}`} />
      </section>

      <section className="panel data-form quick-expense-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Sabit gider girisi</p>
            <h2>Sabit gider ekle</h2>
          </div>
          <span className="status-pill">
            {formatMoney(toDailyEquivalentFromForm(fixedCostForm))} / gun
          </span>
        </div>

        <div className="quick-expense-presets" aria-label="Sabit gider tipleri">
          {quickFixedCostPresets.map((preset) => (
            <button
              className="quick-expense-preset"
              key={preset.label}
              onClick={() => applyPreset(preset)}
              type="button"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <form className="quick-expense-form" onSubmit={handleFixedCostSubmit}>
          <div className="fixed-cost-entry-grid">
            <label>
              Arac
              <select
                disabled={vehicles.length === 0}
                onChange={(event) =>
                  updateFixedCostForm('vehicleId', event.target.value)
                }
                required
                value={fixedCostForm.vehicleId}
              >
                <option value="">Arac sec</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {formatVehicleLabel(vehicle)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Gider adi
              <input
                onChange={(event) =>
                  updateFixedCostForm('name', event.target.value)
                }
                placeholder="Trafik sigortasi"
                required
                value={fixedCostForm.name}
              />
            </label>

            <label>
              Tutar
              <input
                inputMode="decimal"
                onChange={(event) =>
                  updateFixedCostForm('amount', event.target.value)
                }
                placeholder="1200.00"
                required
                value={fixedCostForm.amount}
              />
            </label>

            <label>
              Donem
              <select
                onChange={(event) =>
                  updateFixedCostForm('period', event.target.value as PeriodType)
                }
                value={fixedCostForm.period}
              >
                {Object.entries(periodLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Gider tipi
              <select
                onChange={(event) =>
                  updateFixedCostForm(
                    'expenseType',
                    event.target.value as ExpenseType
                  )
                }
                value={fixedCostForm.expenseType}
              >
                {Object.entries(expenseTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Dagitim
              <select
                onChange={(event) =>
                  updateFixedCostForm(
                    'allocationMethod',
                    event.target.value as AllocationMethod
                  )
                }
                value={fixedCostForm.allocationMethod}
              >
                {Object.entries(allocationMethodLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Baslangic
              <input
                onChange={(event) =>
                  updateFixedCostForm('startsAt', event.target.value)
                }
                required
                type="date"
                value={fixedCostForm.startsAt}
              />
            </label>

            <label>
              Sonraki odeme
              <input
                onChange={(event) =>
                  updateFixedCostForm('nextDueAt', event.target.value)
                }
                type="date"
                value={fixedCostForm.nextDueAt}
              />
            </label>

            <label>
              Bitis
              <input
                onChange={(event) =>
                  updateFixedCostForm('endsAt', event.target.value)
                }
                type="date"
                value={fixedCostForm.endsAt}
              />
            </label>
          </div>

          <div className="quick-expense-bottom-row">
            <label>
              Not
              <input
                onChange={(event) =>
                  updateFixedCostForm('note', event.target.value)
                }
                placeholder="Yillik sigorta, aylik kredi, telefon hatti"
                value={fixedCostForm.note}
              />
            </label>

            <label className="checkbox-row quick-expense-checkbox">
              <input
                checked={fixedCostForm.isActive}
                onChange={(event) =>
                  updateFixedCostForm('isActive', event.target.checked)
                }
                type="checkbox"
              />
              Aktif gider
            </label>
          </div>

          {formMessage ? (
            <p
              className={
                formMessage.includes('olusturuldu')
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
              onClick={resetFixedCostForm}
              type="button"
            >
              Temizle
            </button>
            <button
              className="primary-button"
              disabled={isSavingFixedCost || vehicles.length === 0}
            >
              <Save aria-hidden="true" className="button-icon" />
              {isSavingFixedCost ? 'Kaydediliyor' : 'Sabit Gider Ekle'}
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <form className="fixed-cost-list-toolbar" onSubmit={handleFilterSubmit}>
          <label className="toolbar-search">
            <Search aria-hidden="true" />
            <input
              onChange={(event) => setQ(event.target.value)}
              placeholder="Gider adi veya not ara"
              value={q}
            />
          </label>

          <label>
            Arac
            <select
              onChange={(event) => setVehicleId(event.target.value)}
              value={vehicleId}
            >
              <option value="">Tum araclar</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {formatVehicleLabel(vehicle)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Tip
            <select
              onChange={(event) => setExpenseType(event.target.value)}
              value={expenseType}
            >
              <option value="">Tum tipler</option>
              {Object.entries(expenseTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Donem
            <select
              onChange={(event) => setPeriod(event.target.value)}
              value={period}
            >
              <option value="">Tum donemler</option>
              {Object.entries(periodLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Dagitim
            <select
              onChange={(event) => setAllocationMethod(event.target.value)}
              value={allocationMethod}
            >
              <option value="">Tum dagitimlar</option>
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
              <option value="">Tum durumlar</option>
              <option value="true">Aktif</option>
              <option value="false">Pasif</option>
            </select>
          </label>

          <label>
            Baslangic
            <input
              onChange={(event) => setStartDate(event.target.value)}
              type="date"
              value={startDate}
            />
          </label>

          <label>
            Bitis
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
            Sirala
            <select
              onChange={(event) =>
                setSortBy(event.target.value as FixedCostSortBy)
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
            Yon
            <select
              onChange={(event) =>
                setSortDirection(event.target.value as SortDirection)
              }
              value={sortDirection}
            >
              <option value="asc">Artan</option>
              <option value="desc">Azalan</option>
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
              {isLoading ? 'Yukleniyor' : 'Filtrele'}
            </button>
          </div>
        </form>
      </section>

      <section className="panel income-table-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Sabit gider kayitlari</p>
            <h2>Sabit giderler</h2>
          </div>
          <span className="status-pill">
            {meta ? `${meta.total} kayit` : 'Hazirlaniyor'}
          </span>
        </div>

        {message ? <p className="form-alert">{message}</p> : null}

        {fixedCosts.length > 0 ? (
          <div className="data-table" role="table" aria-label="Sabit giderler">
            <div
              className="data-table-row data-table-head fixed-cost-table-row"
              role="row"
            >
              <span>Gider</span>
              <span>Arac</span>
              <span>Donem</span>
              <span>Dagitim</span>
              <span>Sonraki</span>
              <span>Aylik</span>
              <span>Durum</span>
              <span>Tutar</span>
            </div>

            {fixedCosts.map((item) => (
              <div className="data-table-row fixed-cost-table-row" role="row" key={item.id}>
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.note || expenseTypeLabels[item.expenseType]}</small>
                </span>
                <span>{vehicleNameById(vehicles, item.vehicleId)}</span>
                <span>
                  <strong>{periodLabels[item.period] ?? item.period}</strong>
                  <small>{formatDate(item.startsAt)}</small>
                </span>
                <span>{allocationMethodLabels[item.allocationMethod]}</span>
                <span>{item.nextDueAt ? formatDate(item.nextDueAt) : 'Yok'}</span>
                <span>{formatMoney(toMonthlyEquivalent(item))}</span>
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
            <CalendarClock aria-hidden="true" className="panel-icon" />
            <h2>Henuz sabit gider kaydi yok.</h2>
            <p>
              Sigorta, MTV, muayene, kredi, telefon ve abonelik giderleri
              burada takip edilecek.
            </p>
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
            Onceki
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
      <span>Aktif filtre ve sayfa kapsaminda</span>
    </article>
  );
}

function buildFixedCostPayload(form: FixedCostFormState) {
  return removeEmptyValues({
    allocationMethod: form.allocationMethod,
    amount: normalizeDecimal(form.amount),
    endsAt: form.endsAt,
    expenseType: form.expenseType,
    isActive: form.isActive,
    name: form.name.trim(),
    nextDueAt: form.nextDueAt,
    note: form.note.trim(),
    period: form.period,
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

function toMonthlyEquivalent(item: RecurringExpense) {
  const amount = toNumber(item.amount);

  if (item.period === 'YEARLY') {
    return amount / 12;
  }

  if (item.period === 'DAILY') {
    return amount * 30;
  }

  return amount;
}

function toDailyEquivalent(item: RecurringExpense) {
  const amount = toNumber(item.amount);

  if (item.period === 'YEARLY') {
    return amount / 365;
  }

  if (item.period === 'MONTHLY') {
    return amount / 30;
  }

  return amount;
}

function toDailyEquivalentFromForm(form: FixedCostFormState) {
  const amount = toNumber(form.amount);

  if (form.period === 'YEARLY') {
    return amount / 365;
  }

  if (form.period === 'MONTHLY') {
    return amount / 30;
  }

  return amount;
}

function formatVehicleLabel(vehicle: Vehicle) {
  const name = [vehicle.brand, vehicle.model].filter(Boolean).join(' ');

  return name ? `${vehicle.plateNumber} - ${name}` : vehicle.plateNumber;
}

function vehicleNameById(vehicles: Vehicle[], vehicleId: string) {
  const vehicle = vehicles.find((item) => item.id === vehicleId);

  return vehicle ? formatVehicleLabel(vehicle) : 'Arac';
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
