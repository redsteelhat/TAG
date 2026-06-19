'use client';

import {
  CalendarDays,
  Clock,
  Fuel,
  Gauge,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  Route,
  TrendingUp,
  WalletCards
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getJson } from '../lib/api-client';
import { getAccessToken } from '../lib/auth-storage';

interface Vehicle {
  id: string;
  brand?: string | null;
  isActive: boolean;
  model?: string | null;
  plateNumber: string;
}

interface VehiclesResponse {
  data: Vehicle[];
}

interface MonthlyProfitReport {
  activeMinutes: number;
  activePackageCount: number;
  actualFuelEntryCount: number;
  actualFuelLiters: string;
  actualFuelPurchaseCost: string;
  calculationVersion: string;
  cancellationIncome: string;
  date: string;
  depreciation: string;
  directExpenseCount: number;
  endDate: string;
  fixedExpenses: string;
  formula: {
    fuelCost: string;
    netProfit: string;
    tagPackageCost: string;
  };
  fuelCost: string;
  grossIncome: string;
  hourlyProfit: string;
  kmProfit: string;
  maintenanceReserve: string;
  netProfit: string;
  period: string;
  recurringExpenseCount: number;
  shiftCount: number;
  sourceBreakdown: {
    calculatedTagPackageCost: string;
    directDepreciationExpenseCost: string;
    directFixedExpenseCost: string;
    directMaintenanceExpenseCost: string;
    directPackageExpenseCost: string;
    directVariableExpenseCost: string;
    recurringAllocatedCost: string;
    tripAllocatedPackageCostReference: string;
    tripEstimatedFuelCost: string;
  };
  startDate: string;
  tagPackageCost: string;
  tipAmount: string;
  totalCost: string;
  totalKm: string;
  tripCount: number;
  tripGrossIncome: string;
  variableExpenses: string;
  vehicleId?: string | null;
}

interface MonthlyProfitResponse {
  data: MonthlyProfitReport;
}

export function MonthlyReport() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [month, setMonth] = useState(getCurrentMonthInputValue());
  const [vehicleId, setVehicleId] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [report, setReport] = useState<MonthlyProfitReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    setAccessToken(token);

    if (!token) {
      setMessage('Aylik raporu gormek icin oturum acmalisin.');
      return;
    }

    void loadVehicles(token);
    void loadReport(token, month, vehicleId);
  }, []);

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === vehicleId),
    [vehicleId, vehicles]
  );

  const primaryMetrics = useMemo(() => {
    if (!report) {
      return [];
    }

    return [
      {
        detail: `${report.tripCount} sefer`,
        icon: WalletCards,
        label: 'Aylik brut gelir',
        value: formatMoneyValue(report.grossIncome)
      },
      {
        detail: report.netProfit.startsWith('-') ? 'Zarar' : 'Kar',
        icon: TrendingUp,
        label: 'Aylik net kar',
        value: formatMoneyValue(report.netProfit)
      },
      {
        detail: `${formatNumber(toNumber(report.totalKm))} km`,
        icon: Route,
        label: 'Km basi kar',
        value: formatMoneyValue(report.kmProfit)
      },
      {
        detail: formatDuration(report.activeMinutes),
        icon: Clock,
        label: 'Saatlik kar',
        value: formatMoneyValue(report.hourlyProfit)
      }
    ];
  }, [report]);

  const costRows = useMemo(() => {
    if (!report) {
      return [];
    }

    return [
      ['Yakit maliyeti', report.fuelCost],
      ['Paket / kullanim payi', report.tagPackageCost],
      ['Degisken giderler', report.variableExpenses],
      ['Sabit gider payi', report.fixedExpenses],
      ['Bakim rezervi', report.maintenanceReserve],
      ['Amortisman', report.depreciation]
    ];
  }, [report]);

  const maxCost = Math.max(...costRows.map(([, amount]) => toNumber(amount)), 1);

  async function loadVehicles(token: string) {
    try {
      const response = await getJson<VehiclesResponse>('/vehicles', {
        accessToken: token,
        query: {
          page: 1,
          pageSize: 100
        }
      });

      setVehicles(response.data.filter((vehicle) => vehicle.isActive));
    } catch {
      setVehicles([]);
    }
  }

  async function loadReport(token: string, nextMonth: string, nextVehicleId: string) {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await getJson<MonthlyProfitResponse>('/reports/monthly-profit', {
        accessToken: token,
        query: {
          month: nextMonth,
          vehicleId: nextVehicleId || undefined
        }
      });

      setReport(response.data);
    } catch (error) {
      setReport(null);
      setMessage(error instanceof Error ? error.message : 'Aylik rapor alinamadi.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setMessage('Aylik raporu gormek icin oturum acmalisin.');
      return;
    }

    void loadReport(accessToken, month, vehicleId);
  }

  return (
    <div className="daily-report-page">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Aylik rapor</p>
            <h2>Aylik net kar raporu</h2>
          </div>
          <span className="status-pill">
            {selectedVehicle ? selectedVehicle.plateNumber : 'Tum araclar'}
          </span>
        </div>

        <form className="report-filter-grid data-form" onSubmit={handleSubmit}>
          <label>
            Rapor ayi
            <input
              onChange={(event) => setMonth(event.target.value)}
              type="month"
              value={month}
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
                  {vehicle.plateNumber}
                  {vehicle.brand || vehicle.model
                    ? ` - ${[vehicle.brand, vehicle.model].filter(Boolean).join(' ')}`
                    : ''}
                </option>
              ))}
            </select>
          </label>
          <button className="primary-button" disabled={isLoading} type="submit">
            <RefreshCw aria-hidden="true" className="button-icon" />
            {isLoading ? 'Hesaplaniyor' : 'Raporu Yenile'}
          </button>
        </form>

        {message ? <p className="form-message">{message}</p> : null}
      </section>

      {report ? (
        <>
          <section className="metric-grid income-metrics">
            {primaryMetrics.map((metric) => {
              const Icon = metric.icon;

              return (
                <article className="metric-card" key={metric.label}>
                  <div className="metric-card-header">
                    <p>{metric.label}</p>
                    <Icon aria-hidden="true" className="metric-icon" />
                  </div>
                  <strong>{metric.value}</strong>
                  <span>{metric.detail}</span>
                  <small>
                    {report.startDate} / {report.endDate}
                  </small>
                </article>
              );
            })}
          </section>

          <section className="content-grid">
            <div className="dashboard-main">
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Aylik kar-zarar</p>
                    <h2>Gider kirilimi</h2>
                  </div>
                  <ReceiptText aria-hidden="true" className="panel-icon" />
                </div>
                <div className="cost-stack">
                  {costRows.map(([name, amount]) => (
                    <div className="cost-row" key={name}>
                      <div>
                        <span>{name}</span>
                        <strong>{formatMoneyValue(amount)}</strong>
                      </div>
                      <div className="mini-bar">
                        <span
                          style={{
                            width: `${Math.min((toNumber(amount) / maxCost) * 100, 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Gelir kaynaklari</p>
                    <h2>Aylik brut gelir detayi</h2>
                  </div>
                  <WalletCards aria-hidden="true" className="panel-icon" />
                </div>
                <div className="break-even-list">
                  <ReportRow label="Sefer geliri" value={report.tripGrossIncome} />
                  <ReportRow label="Bahsis / ekstra" value={report.tipAmount} />
                  <ReportRow label="Iptal geliri" value={report.cancellationIncome} />
                  <ReportRow label="Toplam brut gelir" value={report.grossIncome} strong />
                </div>
              </section>
            </div>

            <aside className="dashboard-side">
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Operasyon</p>
                    <h2>Aylik aktivite</h2>
                  </div>
                  <Gauge aria-hidden="true" className="panel-icon" />
                </div>
                <div className="shift-summary">
                  <div>
                    <span>Sefer</span>
                    <strong>{report.tripCount}</strong>
                  </div>
                  <div>
                    <span>Vardiya</span>
                    <strong>{report.shiftCount}</strong>
                  </div>
                  <div>
                    <span>Sure</span>
                    <strong>{formatDuration(report.activeMinutes)}</strong>
                  </div>
                </div>
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Yakit</p>
                    <h2>Aylik yakit etkisi</h2>
                  </div>
                  <Fuel aria-hidden="true" className="panel-icon" />
                </div>
                <div className="break-even-list">
                  <ReportRow label="Tahmini sefer yakiti" value={report.fuelCost} />
                  <ReportRow
                    label="Fiili yakit alimi"
                    value={report.actualFuelPurchaseCost}
                  />
                  <div className="expense-row">
                    <span>Fis / kayit</span>
                    <strong>{report.actualFuelEntryCount}</strong>
                  </div>
                  <div className="expense-row">
                    <span>Litre</span>
                    <strong>{formatNumber(toNumber(report.actualFuelLiters), 3)} L</strong>
                  </div>
                </div>
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Paket</p>
                    <h2>Aylik paket payi</h2>
                  </div>
                  <PackageCheck aria-hidden="true" className="panel-icon" />
                </div>
                <div className="break-even-list">
                  <ReportRow
                    label="Paket hesaplanan pay"
                    value={report.sourceBreakdown.calculatedTagPackageCost}
                  />
                  <ReportRow
                    label="Direkt paket gideri"
                    value={report.sourceBreakdown.directPackageExpenseCost}
                  />
                  <ReportRow
                    label="Toplam paket etkisi"
                    value={report.tagPackageCost}
                    strong
                  />
                </div>
              </section>
            </aside>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Hesaplama guveni</p>
                <h2>Aylik formul ve veri kapsami</h2>
              </div>
              <CalendarDays aria-hidden="true" className="panel-icon" />
            </div>
            <div className="report-formula-grid">
              <div>
                <span>Net kar formulu</span>
                <strong>{report.formula.netProfit}</strong>
              </div>
              <div>
                <span>Kapsam</span>
                <strong>
                  {report.startDate} / {report.endDate}
                </strong>
              </div>
              <div>
                <span>Gider kaydi</span>
                <strong>
                  {report.directExpenseCount} direkt, {report.recurringExpenseCount} sabit
                </strong>
              </div>
              <div>
                <span>Versiyon</span>
                <strong>{report.calculationVersion}</strong>
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="empty-state-panel">
          <div>
            <p className="eyebrow">Aylik rapor</p>
            <h2>{isLoading ? 'Rapor hesaplaniyor' : 'Rapor bekleniyor'}</h2>
            <p>
              Ay ve arac filtresini secip aylik net kar, maliyet ve verimlilik
              metriklerini tek ekranda gorebilirsin.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

function ReportRow({
  label,
  strong,
  value
}: {
  label: string;
  strong?: boolean;
  value: string;
}) {
  return (
    <div className="expense-row">
      <span>{label}</span>
      {strong ? <strong>{formatMoneyValue(value)}</strong> : <b>{formatMoneyValue(value)}</b>}
    </div>
  );
}

function getCurrentMonthInputValue() {
  return toLocalDateInputValue(new Date()).slice(0, 7);
}

function toLocalDateInputValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;

  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

function formatMoneyValue(value: string | number | null | undefined) {
  return formatMoney(toNumber(value));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    currency: 'TRY',
    maximumFractionDigits: 0,
    style: 'currency'
  }).format(value);
}

function formatNumber(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat('tr-TR', {
    maximumFractionDigits,
    minimumFractionDigits: 0
  }).format(value);
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);

  return `${hours}s ${remainingMinutes}d`;
}

function toNumber(value: string | number | null | undefined) {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}
