'use client';

import {
  ChevronLeft,
  ChevronRight,
  FileSearch,
  LockKeyhole,
  ListFilter,
  Plus,
  RefreshCw,
  Save,
  Search
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { EmptyState } from './empty-state';
import { getJson, postJson } from '../lib/api-client';
import { getAccessToken } from '../lib/auth-storage';

type AllocationType = 'IMMEDIATE' | 'DAILY' | 'MONTHLY' | 'PER_KM';
type ExpenseType =
  | 'VARIABLE'
  | 'FIXED'
  | 'SEMI_VARIABLE'
  | 'PLATFORM_PACKAGE'
  | 'FINANCING'
  | 'DEPRECIATION'
  | 'OPERATIONAL';
type PaymentMethod = 'CASH' | 'CARD' | 'DIGITAL' | 'MIXED' | 'OTHER';
type SortDirection = 'asc' | 'desc';
type ExpenseSortBy = 'amount' | 'createdAt' | 'expenseDate';

interface Expense {
  id: string;
  vehicleId: string;
  categöryId?: string | null;
  expenseType: ExpenseType;
  amount: string;
  expenseDate: string;
  allocationType: AllocationType;
  allocationPeriodStart?: string | null;
  allocationPeriodEnd?: string | null;
  odometerKm?: string | null;
  isRecurring: boolean;
  paymentMethod?: PaymentMethod | null;
  receiptUrl?: string | null;
  note?: string | null;
}

interface Vehicle {
  id: string;
  plateNumber: string;
  brand?: string | null;
  model?: string | null;
  isActive: boolean;
}

interface Categöry {
  id: string;
  name: string;
  expenseType?: ExpenseType | null;
  isActive: boolean;
}

interface ExpensesResponse {
  data: Expense[];
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

interface CategöriesResponse {
  data: Categöry[];
}

interface ExpenseFilterValues {
  allocationType: string;
  categöryId: string;
  endDate: string;
  expenseType: string;
  maxAmount: string;
  minAmount: string;
  paymentMethod: string;
  q: string;
  sortBy: ExpenseSortBy;
  sortDirection: SortDirection;
  startDate: string;
  vehicleId: string;
}

interface QuickExpenseFormState {
  allocationType: AllocationType;
  amount: string;
  categöryId: string;
  expenseDate: string;
  expenseType: ExpenseType;
  isRecurring: boolean;
  note: string;
  odometerKm: string;
  paymentMethod: PaymentMethod;
  vehicleId: string;
}

interface ExpenseResponse {
  data: Expense;
}

const allocationTypeLabels: Record<AllocationType, string> = {
  DAILY: 'Günlük',
  IMMEDIATE: 'Anlik',
  MONTHLY: 'Aylık',
  PER_KM: 'Km bazlı'
};

const expenseTypeLabels: Record<ExpenseType, string> = {
  DEPRECIATION: 'Amortisman',
  FINANCING: 'Finansman',
  FIXED: 'Sabit',
  OPERATIONAL: 'Operasyon',
  PLATFORM_PACKAGE: 'Paket',
  SEMI_VARIABLE: 'Yari değişken',
  VARIABLE: 'Değişken'
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CARD: 'Kart',
  CASH: 'Nakit',
  DIGITAL: 'Dijital',
  MIXED: 'Karma',
  OTHER: 'Diğer'
};

const sortOptions: Array<{ label: string; value: ExpenseSortBy }> = [
  { label: 'Gider tarihi', value: 'expenseDate' },
  { label: 'Tutar', value: 'amount' },
  { label: 'Oluşturma tarihi', value: 'createdAt' }
];

const quickExpensePresets: Array<{
  allocationType: AllocationType;
  categöryName?: string;
  expenseType: ExpenseType;
  label: string;
  note: string;
}> = [
  {
    allocationType: 'IMMEDIATE',
    categöryName: 'Otopark',
    expenseType: 'VARIABLE',
    label: 'Otopark',
    note: 'Otopark ücreti'
  },
  {
    allocationType: 'IMMEDIATE',
    categöryName: 'HGS',
    expenseType: 'VARIABLE',
    label: 'HGS',
    note: 'HGS gecisi'
  },
  {
    allocationType: 'IMMEDIATE',
    categöryName: 'Yikama',
    expenseType: 'OPERATIONAL',
    label: 'Yikama',
    note: 'Araç yikama'
  },
  {
    allocationType: 'PER_KM',
    categöryName: 'Periyodik Bakım',
    expenseType: 'SEMI_VARIABLE',
    label: 'Bakım',
    note: 'Bakım gideri'
  },
  {
    allocationType: 'IMMEDIATE',
    categöryName: 'Ceza',
    expenseType: 'VARIABLE',
    label: 'Ceza',
    note: 'Ceza gideri'
  },
  {
    allocationType: 'DAILY',
    categöryName: 'Paket / Kullanım Bedeli',
    expenseType: 'PLATFORM_PACKAGE',
    label: 'Paket',
    note: 'Paket / kullanım bedeli'
  },
  {
    allocationType: 'IMMEDIATE',
    expenseType: 'VARIABLE',
    label: 'Diğer',
    note: ''
  }
];

const emptyQuickExpenseForm: QuickExpenseFormState = {
  allocationType: 'IMMEDIATE',
  amount: '',
  categöryId: '',
  expenseDate: new Date().toISOString().slice(0, 10),
  expenseType: 'VARIABLE',
  isRecurring: false,
  note: '',
  odometerKm: '',
  paymentMethod: 'CARD',
  vehicleId: ''
};

export function ExpenseList() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [categöries, setCategöries] = useState<Categöry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [meta, setMeta] = useState<ExpensesResponse['meta'] | null>(null);
  const [vehicleId, setVehicleId] = useState('');
  const [categöryId, setCategöryId] = useState('');
  const [expenseType, setExpenseType] = useState('');
  const [allocationType, setAllocationType] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [q, setQ] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [sortBy, setSortBy] = useState<ExpenseSortBy>('expenseDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [quickExpenseForm, setQuickExpenseForm] =
    useState<QuickExpenseFormState>(emptyQuickExpenseForm);
  const [message, setMessage] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  const pageMetrics = useMemo(() => {
    return expenses.reduce(
      (totals, expense) => {
        const amount = toNumber(expense.amount);

        return {
          recurringTotal:
            totals.recurringTotal + (expense.isRecurring ? amount : 0),
          totalAmount: totals.totalAmount + amount,
          variableTotal:
            totals.variableTotal +
            (expense.expenseType === 'VARIABLE' ? amount : 0)
        };
      },
      {
        recurringTotal: 0,
        totalAmount: 0,
        variableTotal: 0
      }
    );
  }, [expenses]);
  const hasActiveFilters = Boolean(
    vehicleId ||
    categöryId ||
    expenseType ||
    allocationType ||
    paymentMethod ||
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

    void fetchReferenceData(accessToken);
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    void fetchExpenses(accessToken);
  }, [accessToken, page, sortBy, sortDirection]);

  useEffect(() => {
    if (quickExpenseForm.vehicleId || vehicles.length === 0) {
      return;
    }

    const activeVehicle = vehicles.find((vehicle) => vehicle.isActive);

    setQuickExpenseForm((currentForm) => ({
      ...currentForm,
      vehicleId: activeVehicle?.id ?? vehicles[0].id
    }));
  }, [quickExpenseForm.vehicleId, vehicles]);

  const quickExpenseCategöries = useMemo(
    () =>
      categöries.filter(
        (categöry) =>
          !categöry.expenseType ||
          categöry.expenseType === quickExpenseForm.expenseType
      ),
    [categöries, quickExpenseForm.expenseType]
  );

  async function fetchReferenceData(token = accessToken) {
    if (!token) {
      return;
    }

    try {
      const [vehiclesResponse, categöriesResponse] = await Promise.all([
        getJson<VehiclesResponse>('/vehicles', {
          accessToken: token
        }),
        getJson<CategöriesResponse>('/categöries', {
          accessToken: token,
          query: {
            pageSize: 100,
            sortBy: 'name',
            sortDirection: 'asc'
          }
        })
      ]);

      setVehicles(vehiclesResponse.data);
      setCategöries(categöriesResponse.data);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Filtre verileri yüklenemedi.'
      );
    }
  }

  async function fetchExpenses(
    token = accessToken,
    pageToLoad = page,
    filters: ExpenseFilterValues = {
      allocationType,
      categöryId,
      endDate,
      expenseType,
      maxAmount,
      minAmount,
      paymentMethod,
      q,
      sortBy,
      sortDirection,
      startDate,
      vehicleId
    }
  ) {
    if (!token) {
      setMessage('Gider listesini görmek için önce giriş yapmalısın.');
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await getJson<ExpensesResponse>('/expenses', {
        accessToken: token,
        query: {
          allocationType: filters.allocationType || undefined,
          categöryId: filters.categöryId || undefined,
          endDate: filters.endDate,
          expenseType: filters.expenseType || undefined,
          maxAmount: normalizeDecimal(filters.maxAmount),
          minAmount: normalizeDecimal(filters.minAmount),
          page: pageToLoad,
          pageSize: 10,
          paymentMethod: filters.paymentMethod || undefined,
          q: filters.q.trim() || undefined,
          sortBy: filters.sortBy,
          sortDirection: filters.sortDirection,
          startDate: filters.startDate,
          vehicleId: filters.vehicleId || undefined
        }
      });

      setExpenses(response.data);
      setMeta(response.meta);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Giderler yüklenemedi.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    void fetchExpenses(accessToken, 1);
  }

  function clearFilters() {
    const clearedFilters: ExpenseFilterValues = {
      allocationType: '',
      categöryId: '',
      endDate: '',
      expenseType: '',
      maxAmount: '',
      minAmount: '',
      paymentMethod: '',
      q: '',
      sortBy: 'expenseDate',
      sortDirection: 'desc',
      startDate: '',
      vehicleId: ''
    };

    setVehicleId('');
    setCategöryId('');
    setExpenseType('');
    setAllocationType('');
    setPaymentMethod('');
    setQ('');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setSortBy('expenseDate');
    setSortDirection('desc');
    setPage(1);
    void fetchExpenses(accessToken, 1, clearedFilters);
  }

  async function handleQuickExpenseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setFormMessage('Gider kaydetmek için önce giriş yapmalısın.');
      return;
    }

    if (!quickExpenseForm.vehicleId) {
      setFormMessage('Gider kaydetmek için önce araç seçmelisin.');
      return;
    }

    setIsSavingExpense(true);
    setFormMessage(null);

    try {
      await postJson<ExpenseResponse>(
        '/expenses',
        buildQuickExpensePayload(quickExpenseForm),
        {
          accessToken
        }
      );

      setFormMessage('Gider kaydı oluşturuldu.');
      resetQuickExpenseForm();
      setPage(1);
      await fetchExpenses(accessToken, 1);
    } catch (error) {
      setFormMessage(
        error instanceof Error ? error.message : 'Gider kaydedilemedi.'
      );
    } finally {
      setIsSavingExpense(false);
    }
  }

  function applyQuickPreset(preset: (typeof quickExpensePresets)[number]) {
    const categöryId = preset.categöryName
      ? findCategöryIdByName(categöries, preset.categöryName)
      : '';

    setQuickExpenseForm((currentForm) => ({
      ...currentForm,
      allocationType: preset.allocationType,
      categöryId,
      expenseType: preset.expenseType,
      note: preset.note
    }));
    setFormMessage(null);
  }

  function resetQuickExpenseForm() {
    const activeVehicle = vehicles.find((vehicle) => vehicle.isActive);

    setQuickExpenseForm({
      ...emptyQuickExpenseForm,
      expenseDate: new Date().toISOString().slice(0, 10),
      vehicleId: activeVehicle?.id ?? vehicles[0]?.id ?? ''
    });
  }

  function updateQuickExpenseForm<Key extends keyof QuickExpenseFormState>(
    key: Key,
    value: QuickExpenseFormState[Key]
  ) {
    setQuickExpenseForm((currentForm) => ({
      ...currentForm,
      [key]: value,
      ...(key === 'expenseType' ? { categöryId: '' } : {})
    }));
  }

  if (!accessToken) {
    return (
      <section className="panel empty-state-panel">
        <EmptyState
          actionHref="/login"
          actionLabel="Giriş ekranına git"
          description="Gider, yakıt disi maliyet ve sabit gider verilerini görebilmek için aktif oturum gerekiyor."
          eyebrow="Oturum gerekli"
          icon={LockKeyhole}
          title="Gider listesini görmek için giriş yap."
        />
      </section>
    );
  }

  return (
    <section className="income-list-page">
      <section className="metric-grid income-metrics" aria-label="Gider özeti">
        <MetricCard
          label="Görüntülenen gider"
          value={formatMoney(pageMetrics.totalAmount)}
        />
        <MetricCard
          label="Değişken gider"
          value={formatMoney(pageMetrics.variableTotal)}
        />
        <MetricCard
          label="Tekrarlayan gider"
          value={formatMoney(pageMetrics.recurringTotal)}
        />
        <MetricCard label="Kayıt sayisi" value={`${expenses.length}`} />
      </section>

      <section className="panel data-form quick-expense-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Hızlı gider</p>
            <h2>Gider ekle</h2>
          </div>
          <span className="status-pill">10 saniye kayıt</span>
        </div>

        <div className="quick-expense-presets" aria-label="Hızlı gider tipleri">
          {quickExpensePresets.map((preset) => (
            <button
              className="quick-expense-preset"
              key={preset.label}
              onClick={() => applyQuickPreset(preset)}
              type="button"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <form
          className="quick-expense-form"
          onSubmit={handleQuickExpenseSubmit}
        >
          <div className="quick-expense-grid">
            <label>
              Araç
              <select
                disabled={vehicles.length === 0}
                onChange={(event) =>
                  updateQuickExpenseForm('vehicleId', event.target.value)
                }
                required
                value={quickExpenseForm.vehicleId}
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
              Tutar
              <input
                inputMode="decimal"
                onChange={(event) =>
                  updateQuickExpenseForm('amount', event.target.value)
                }
                placeholder="250.00"
                required
                value={quickExpenseForm.amount}
              />
            </label>

            <label>
              Tarih
              <input
                onChange={(event) =>
                  updateQuickExpenseForm('expenseDate', event.target.value)
                }
                required
                type="date"
                value={quickExpenseForm.expenseDate}
              />
            </label>

            <label>
              Tip
              <select
                onChange={(event) =>
                  updateQuickExpenseForm(
                    'expenseType',
                    event.target.value as ExpenseType
                  )
                }
                value={quickExpenseForm.expenseType}
              >
                {Object.entries(expenseTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Kategöri
              <select
                onChange={(event) =>
                  updateQuickExpenseForm('categöryId', event.target.value)
                }
                value={quickExpenseForm.categöryId}
              >
                <option value="">Kategöri yok</option>
                {quickExpenseCategöries.map((categöry) => (
                  <option key={categöry.id} value={categöry.id}>
                    {categöry.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Dağıtım
              <select
                onChange={(event) =>
                  updateQuickExpenseForm(
                    'allocationType',
                    event.target.value as AllocationType
                  )
                }
                value={quickExpenseForm.allocationType}
              >
                {Object.entries(allocationTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Ödeme
              <select
                onChange={(event) =>
                  updateQuickExpenseForm(
                    'paymentMethod',
                    event.target.value as PaymentMethod
                  )
                }
                value={quickExpenseForm.paymentMethod}
              >
                {Object.entries(paymentMethodLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Km sayacı
              <input
                inputMode="decimal"
                onChange={(event) =>
                  updateQuickExpenseForm('odometerKm', event.target.value)
                }
                placeholder="85120.5"
                value={quickExpenseForm.odometerKm}
              />
            </label>
          </div>

          <div className="quick-expense-bottom-row">
            <label>
              Not
              <input
                onChange={(event) =>
                  updateQuickExpenseForm('note', event.target.value)
                }
                placeholder="Otopark, HGS, yikama"
                value={quickExpenseForm.note}
              />
            </label>

            <label className="checkbox-row quick-expense-checkbox">
              <input
                checked={quickExpenseForm.isRecurring}
                onChange={(event) =>
                  updateQuickExpenseForm('isRecurring', event.target.checked)
                }
                type="checkbox"
              />
              Tekrarlayan gider
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
              onClick={resetQuickExpenseForm}
              type="button"
            >
              Temizle
            </button>
            <button
              className="primary-button"
              disabled={isSavingExpense || vehicles.length === 0}
            >
              <Save aria-hidden="true" className="button-icon" />
              {isSavingExpense ? 'Kaydediliyor' : 'Gider Ekle'}
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <form className="expense-list-toolbar" onSubmit={handleFilterSubmit}>
          <label className="toolbar-search">
            <Search aria-hidden="true" />
            <input
              onChange={(event) => setQ(event.target.value)}
              placeholder="Not veya fiş ara"
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
            Kategöri
            <select
              onChange={(event) => setCategöryId(event.target.value)}
              value={categöryId}
            >
              <option value="">Tüm kategoriler</option>
              {categöries.map((categöry) => (
                <option key={categöry.id} value={categöry.id}>
                  {categöry.name}
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
              <option value="">Tüm tipler</option>
              {Object.entries(expenseTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Dağıtım
            <select
              onChange={(event) => setAllocationType(event.target.value)}
              value={allocationType}
            >
              <option value="">Tüm dağıtımlar</option>
              {Object.entries(allocationTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Ödeme
            <select
              onChange={(event) => setPaymentMethod(event.target.value)}
              value={paymentMethod}
            >
              <option value="">Tüm ödemeler</option>
              {Object.entries(paymentMethodLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
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
            Sirala
            <select
              onChange={(event) =>
                setSortBy(event.target.value as ExpenseSortBy)
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
            <p className="eyebrow">Gider kayıtları</p>
            <h2>Gider listesi</h2>
          </div>
          <span className="status-pill">
            {meta ? `${meta.total} kayıt` : 'Hazırlanıyor'}
          </span>
        </div>

        {message ? <p className="form-alert">{message}</p> : null}

        {expenses.length > 0 ? (
          <div className="data-table" role="table" aria-label="Giderler">
            <div
              className="data-table-row data-table-head expense-table-row"
              role="row"
            >
              <span>Tarih</span>
              <span>Kategöri</span>
              <span>Tip</span>
              <span>Dağıtım</span>
              <span>Ödeme</span>
              <span>Araç</span>
              <span>Durum</span>
              <span>Tutar</span>
            </div>

            {expenses.map((expense) => (
              <div
                className="data-table-row expense-table-row"
                role="row"
                key={expense.id}
              >
                <span>
                  <strong>{formatDate(expense.expenseDate)}</strong>
                  <small>{formatOdometer(expense.odometerKm)}</small>
                </span>
                <span>
                  <strong>
                    {categöryNameById(categöries, expense.categöryId)}
                  </strong>
                  <small>{expense.note || 'Not yok'}</small>
                </span>
                <span>{expenseTypeLabels[expense.expenseType]}</span>
                <span>{allocationTypeLabels[expense.allocationType]}</span>
                <span>
                  {expense.paymentMethod
                    ? paymentMethodLabels[expense.paymentMethod]
                    : 'Yok'}
                </span>
                <span>{vehicleNameById(vehicles, expense.vehicleId)}</span>
                <span>
                  <span
                    className={
                      expense.isRecurring
                        ? 'status-pill compact active'
                        : 'status-pill compact completed'
                    }
                  >
                    {expense.isRecurring ? 'Tekrarlayan' : 'Tekil'}
                  </span>
                </span>
                <b>{formatMoney(toNumber(expense.amount))}</b>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state-panel compact">
            <EmptyState
              description={
                hasActiveFilters
                  ? 'Bu filtrelerle eşleşen gider bulunamadı. Filtreleri temizleyerek tüm gider kayıtlarını kontrol edebilirsin.'
                  : 'Otopark, HGS, yikama, ceza ve diğer operasyon giderlerini eklediğinde maliyet dagilimi burada görünür.'
              }
              icon={hasActiveFilters ? FileSearch : Plus}
              title={
                hasActiveFilters
                  ? 'Filtreye uygun gider yok.'
                  : 'Henüz gider kaydı yok.'
              }
              tips={
                hasActiveFilters
                  ? ['Kategöri filtresini kaldır', 'Tutar aralığını genişlet']
                  : ['Hızlı preset seç', 'Tutar gir', 'Dağıtım tipini belirle']
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
      <span>Aktif filtre ve sayfa kapsaminda</span>
    </article>
  );
}

function categöryNameById(categöries: Categöry[], categöryId?: string | null) {
  if (!categöryId) {
    return 'Kategöri yok';
  }

  return (
    categöries.find((categöry) => categöry.id === categöryId)?.name ??
    'Kategöri'
  );
}

function findCategöryIdByName(categöries: Categöry[], name: string) {
  const normalizedName = normalizeSearchText(name);

  return (
    categöries.find(
      (categöry) => normalizeSearchText(categöry.name) === normalizedName
    )?.id ?? ''
  );
}

function vehicleNameById(vehicles: Vehicle[], vehicleId: string) {
  const vehicle = vehicles.find((item) => item.id === vehicleId);

  return vehicle ? formatVehicleLabel(vehicle) : 'Araç';
}

function formatVehicleLabel(vehicle: Vehicle) {
  const name = [vehicle.brand, vehicle.model].filter(Boolean).join(' ');

  return name ? `${vehicle.plateNumber} - ${name}` : vehicle.plateNumber;
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

function formatOdometer(value?: string | null) {
  if (!value) {
    return 'Km yok';
  }

  return `${formatNumber(toNumber(value))} km`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    maximumFractionDigits: 1
  }).format(value);
}

function toNumber(value: string) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function normalizeDecimal(value: string) {
  const normalizedValue = value.trim().replace(',', '.');

  return normalizedValue || undefined;
}

function buildQuickExpensePayload(form: QuickExpenseFormState) {
  return removeEmptyValues({
    allocationType: form.allocationType,
    amount: normalizeDecimal(form.amount),
    categöryId: form.categöryId,
    expenseDate: form.expenseDate,
    expenseType: form.expenseType,
    isRecurring: form.isRecurring,
    note: form.note.trim(),
    odometerKm: normalizeDecimal(form.odometerKm),
    paymentMethod: form.paymentMethod,
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

function normalizeSearchText(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
}
