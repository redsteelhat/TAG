"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  Clock,
  Download,
  Fuel,
  Gauge,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  Route,
  ShieldCheck,
  TrendingUp,
  WalletCards,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ExpenseDistributionChart } from "./expense-distribution-chart";
import { getJson } from "../lib/api-client";
import { getAccessToken } from "../lib/auth-storage";

type ReportType = "daily" | "weekly" | "monthly" | "custom";
type ReportTab =
  | "profit"
  | "fuel"
  | "package"
  | "fixed"
  | "maintenance"
  | "income"
  | "raw"
  | "confidence";

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

interface ProfitReport {
  activeMinutes: number;
  activePackageCount: number;
  actualFuelEntryCount: number;
  actualFuelLiters: string;
  actualFuelPurchaseCost: string;
  calculationVersion: string;
  calculationWarnings?: CalculationWarning[];
  cancellationIncome: string;
  date: string;
  depreciation: string;
  directExpenseCount: number;
  endDate: string;
  fixedExpenses: string;
  formula: {
    depreciation?: string;
    fuelCost: string;
    maintenanceReserve?: string;
    netProfit: string;
    tagPackageCost: string;
  };
  fuelCost: string;
  grossIncome: string;
  hourlyProfit: string;
  kmProfit: string;
  maintenanceReserve: string;
  netProfit: string;
  period: ReportType;
  recurringExpenseCount: number;
  shiftCount: number;
  sourceBreakdown: {
    calculatedTagPackageCost: string;
    calculatedVehicleDepreciationCost?: string;
    directDepreciationExpenseCost: string;
    directFixedExpenseCost: string;
    directMaintenanceExpenseCost: string;
    directPackageExpenseCost: string;
    directVariableExpenseCost: string;
    maintenanceEntryReserveCost?: string;
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

interface CalculationWarning {
  code: string;
  message?: string;
}

interface ProfitReportResponse {
  data: ProfitReport;
}

const reportTypeLabels: Record<ReportType, string> = {
  custom: "Özel aralık",
  daily: "Günlük",
  monthly: "Aylık",
  weekly: "Haftalık",
};

const reportTabs: Array<{ id: ReportTab; label: string; icon: LucideIcon }> = [
  { id: "profit", label: "Kâr-zarar kırılımı", icon: ReceiptText },
  { id: "fuel", label: "Yakıt etkisi", icon: Fuel },
  { id: "package", label: "Paket etkisi", icon: PackageCheck },
  { id: "fixed", label: "Sabit gider etkisi", icon: CalendarDays },
  { id: "maintenance", label: "Bakım ve amortisman", icon: Wrench },
  { id: "income", label: "Gelir detayları", icon: WalletCards },
  { id: "raw", label: "Ham kayıtlar", icon: Gauge },
  { id: "confidence", label: "Hesaplama güveni", icon: ShieldCheck },
];

export function ReportsDecisionPanel() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ReportTab>("profit");
  const [reportType, setReportType] = useState<ReportType>("daily");
  const [date, setDate] = useState(getLocalDateInputValue());
  const [weekStart, setWeekStart] = useState(getCurrentWeekStartInputValue());
  const [month, setMonth] = useState(getCurrentMonthInputValue());
  const [customStartDate, setCustomStartDate] = useState(
    getLocalDateInputValue(),
  );
  const [customEndDate, setCustomEndDate] = useState(getLocalDateInputValue());
  const [vehicleId, setVehicleId] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [report, setReport] = useState<ProfitReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();

    setAccessToken(token);

    if (!token) {
      setMessage("Raporları görmek için oturum açmalısın.");
      return;
    }

    void loadVehicles(token);
    void loadReport(token, reportType, vehicleId);
  }, []);

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === vehicleId),
    [vehicleId, vehicles],
  );
  const hasData = report ? hasReportData(report) : false;
  const costRows = useMemo(() => buildCostRows(report), [report]);
  const exportHref = useMemo(
    () =>
      `/exports?reportType=${reportType}&date=${date}&weekStart=${weekStart}&month=${month}&startDate=${customStartDate}&endDate=${customEndDate}&vehicleId=${vehicleId}`,
    [
      customEndDate,
      customStartDate,
      date,
      month,
      reportType,
      vehicleId,
      weekStart,
    ],
  );

  async function loadVehicles(token: string) {
    try {
      const response = await getJson<VehiclesResponse>("/vehicles", {
        accessToken: token,
        query: {
          page: 1,
          pageSize: 100,
        },
      });

      setVehicles(response.data.filter((vehicle) => vehicle.isActive));
    } catch {
      setVehicles([]);
    }
  }

  async function loadReport(
    token: string,
    nextReportType: ReportType,
    nextVehicleId: string,
  ) {
    if (nextReportType === "custom") {
      setReport(null);
      setMessage(
        "Özel aralık için backend endpoint’i henüz hazır değil. Günlük, haftalık veya aylık rapor seç.",
      );
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await getJson<ProfitReportResponse>(
        getReportEndpoint(nextReportType),
        {
          accessToken: token,
          query: buildReportQuery(nextReportType, nextVehicleId),
        },
      );

      setReport(response.data);
    } catch (error) {
      setReport(null);
      setMessage(error instanceof Error ? error.message : "Rapor alınamadı.");
    } finally {
      setIsLoading(false);
    }
  }

  function buildReportQuery(nextReportType: ReportType, nextVehicleId: string) {
    const baseQuery = {
      vehicleId: nextVehicleId || undefined,
    };

    if (nextReportType === "weekly") {
      return {
        ...baseQuery,
        weekStart,
      };
    }

    if (nextReportType === "monthly") {
      return {
        ...baseQuery,
        month,
      };
    }

    return {
      ...baseQuery,
      date,
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setMessage("Raporları görmek için oturum açmalısın.");
      return;
    }

    if (reportType === "custom") {
      if (new Date(customEndDate) < new Date(customStartDate)) {
        setMessage("Bitiş tarihi başlangıç tarihinden önce olamaz.");
        return;
      }
      setMessage(
        "Özel aralık için backend endpoint’i henüz hazır değil. Günlük, haftalık veya aylık rapor seç.",
      );
      return;
    }

    void loadReport(accessToken, reportType, vehicleId);
  }

  function handleReportTypeChange(nextReportType: ReportType) {
    setReportType(nextReportType);
    setActiveTab("profit");

    if (nextReportType === "custom") {
      setReport(null);
      setMessage(
        "Özel aralık seçildi. Bu rapor tipi için tarih aralığı API’si bağlandığında hesaplama yapılacak.",
      );
      return;
    }

    setMessage(null);
  }

  return (
    <div className="reports-decision-page">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Global filtre</p>
            <h2>Karar destek raporu</h2>
          </div>
          <span className="status-pill">
            {selectedVehicle
              ? formatVehicleLabel(selectedVehicle)
              : "Tüm araçlar"}
          </span>
        </div>

        <form className="reports-filter-grid data-form" onSubmit={handleSubmit}>
          <label>
            Rapor tipi
            <select
              value={reportType}
              onChange={(event) =>
                handleReportTypeChange(event.target.value as ReportType)
              }
            >
              {Object.entries(reportTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <PeriodInput
            customEndDate={customEndDate}
            customStartDate={customStartDate}
            date={date}
            month={month}
            reportType={reportType}
            setCustomEndDate={setCustomEndDate}
            setCustomStartDate={setCustomStartDate}
            setDate={setDate}
            setMonth={setMonth}
            setWeekStart={setWeekStart}
            weekStart={weekStart}
          />

          <label>
            Araç
            <select
              value={vehicleId}
              onChange={(event) => setVehicleId(event.target.value)}
            >
              <option value="">Tüm araçlar</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {formatVehicleLabel(vehicle)}
                </option>
              ))}
            </select>
          </label>

          <button
            className="primary-button"
            disabled={isLoading || reportType === "custom"}
            type="submit"
          >
            <RefreshCw aria-hidden="true" className="button-icon" />
            {isLoading ? "Hesaplanıyor" : "Raporu yenile"}
          </button>

          <Link className="secondary-button button-link" href={exportHref}>
            <Download aria-hidden="true" className="button-icon" />
            Dışa aktar
          </Link>
        </form>

        {message ? (
          <p
            className={
              message.includes("başarıyla") ||
              message.includes("yenilendi") ||
              message.includes("hazırlandı")
                ? "form-success"
                : "form-alert"
            }
          >
            {message}
          </p>
        ) : null}
      </section>

      {isLoading ? (
        <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="skeleton-card" style={{ height: '120px' }} />
            <div className="skeleton-card" style={{ height: '120px' }} />
            <div className="skeleton-card" style={{ height: '120px' }} />
            <div className="skeleton-card" style={{ height: '120px' }} />
          </div>
          <div className="panel" style={{ height: '350px' }}>
            <div className="skeleton-row" style={{ height: '32px', width: '200px', marginBottom: '24px' }} />
            <div className="skeleton-row" style={{ height: '200px', marginBottom: '16px' }} />
          </div>
        </div>
      ) : report ? (
        <>
          <section className="metric-grid income-metrics">
            {buildPrimaryMetrics(report).map((metric) => {
              const Icon = metric.icon;

              return (
                <article className="metric-card" key={metric.label}>
                  <div className="metric-card-header">
                    <p>{metric.label}</p>
                    <Icon aria-hidden="true" className="metric-icon" />
                  </div>
                  <strong>{metric.value}</strong>
                  <span>{metric.detail}</span>
                  <small>{reportTypeLabels[reportType]} Rapor</small>
                </article>
              );
            })}
          </section>

          {!hasData ? (
            <section className="empty-state-panel">
              <div>
                <p className="eyebrow">Veri Yok</p>
                <h2>Seçili dönem için kayıt bulunamadı.</h2>
                <p>
                  Rapor kartları aynı finans motorundan hesaplanır. Bu dönemde
                  sefer, gider, yakıt, paket veya bakım kaydı olmadığı için
                  karar destek kırılımı boş.
                </p>
              </div>
            </section>
          ) : null}

          <section className="report-tab-layout">
            <nav className="report-tabs" aria-label="Rapor detay sekmeleri">
              {reportTabs.map((tab) => {
                const Icon = tab.icon;

                return (
                  <button
                    className={activeTab === tab.id ? "active" : ""}
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    type="button"
                  >
                    <Icon aria-hidden="true" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            <section className="panel report-tab-panel">
              <ReportTabContent
                activeTab={activeTab}
                costRows={costRows}
                report={report}
              />
            </section>
          </section>
        </>
      ) : (
        <section className="empty-state-panel">
          <div>
            <p className="eyebrow">Rapor Bekleniyor</p>
            <h2>Filtre seçip raporu yenile.</h2>
            <p>
              Günlük, haftalık ve aylık raporlar aynı merkezi finans motorundan
              gelir; ana panelle aynı dönem seçildiğinde net kâr tutarlı kalır.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

function PeriodInput({
  customEndDate,
  customStartDate,
  date,
  month,
  reportType,
  setCustomEndDate,
  setCustomStartDate,
  setDate,
  setMonth,
  setWeekStart,
  weekStart,
}: {
  customEndDate: string;
  customStartDate: string;
  date: string;
  month: string;
  reportType: ReportType;
  setCustomEndDate: (value: string) => void;
  setCustomStartDate: (value: string) => void;
  setDate: (value: string) => void;
  setMonth: (value: string) => void;
  setWeekStart: (value: string) => void;
  weekStart: string;
}) {
  if (reportType === "monthly") {
    return (
      <label>
        Dönem
        <input
          onChange={(event) => setMonth(event.target.value)}
          type="month"
          value={month}
        />
      </label>
    );
  }

  if (reportType === "weekly") {
    return (
      <label>
        Hafta başlangıcı
        <input
          onChange={(event) => setWeekStart(event.target.value)}
          type="date"
          value={weekStart}
        />
      </label>
    );
  }

  if (reportType === "custom") {
    return (
      <div className="reports-custom-range">
        <label>
          Başlangıç
          <input
            onChange={(event) => setCustomStartDate(event.target.value)}
            type="date"
            value={customStartDate}
          />
        </label>
        <label>
          Bitiş
          <input
            onChange={(event) => setCustomEndDate(event.target.value)}
            type="date"
            value={customEndDate}
          />
        </label>
      </div>
    );
  }

  return (
    <label>
      Tarih
      <input
        onChange={(event) => setDate(event.target.value)}
        type="date"
        value={date}
      />
    </label>
  );
}

function ReportTabContent({
  activeTab,
  costRows,
  report,
}: {
  activeTab: ReportTab;
  costRows: Array<[string, string]>;
  report: ProfitReport;
}) {
  if (activeTab === "profit") {
    return (
      <>
        <PanelTitle eyebrow="Kâr-zarar motoru" title="Maliyet kırılımı" />
        <ExpenseDistributionChart rows={costRows} />
        <ReportBarList rows={costRows} />
      </>
    );
  }

  if (activeTab === "fuel") {
    return (
      <>
        <PanelTitle eyebrow="Yakıt etkisi" title="Tahmini ve fiili yakıt" />
        <div className="report-detail-grid">
          <ReportValue label="Sefer yakıt etkisi" value={report.fuelCost} />
          <ReportValue
            label="Fiili yakıt alımı"
            value={report.actualFuelPurchaseCost}
          />
          <ReportValue
            label="Yakıt kaydı"
            value={`${report.actualFuelEntryCount} kayıt`}
            raw
          />
          <ReportValue
            label="Toplam litre"
            value={`${formatNumber(toNumber(report.actualFuelLiters), 3)} L`}
            raw
          />
        </div>
        <FormulaNote text={report.formula.fuelCost} />
      </>
    );
  }

  if (activeTab === "package") {
    return (
      <>
        <PanelTitle eyebrow="Paket etkisi" title="Operasyon paketi dağıtımı" />
        <div className="report-detail-grid">
          <ReportValue
            label="Hesaplanan paket payı"
            value={report.sourceBreakdown.calculatedTagPackageCost}
          />
          <ReportValue
            label="Direkt paket gideri"
            value={report.sourceBreakdown.directPackageExpenseCost}
          />
          <ReportValue
            label="Sefer referans payı"
            value={report.sourceBreakdown.tripAllocatedPackageCostReference}
          />
          <ReportValue
            label="Aktif paket"
            value={`${report.activePackageCount} paket`}
            raw
          />
        </div>
        <FormulaNote text={report.formula.tagPackageCost} />
      </>
    );
  }

  if (activeTab === "fixed") {
    return (
      <>
        <PanelTitle eyebrow="Sabit gider" title="Dönemsel sabit gider etkisi" />
        <div className="report-detail-grid">
          <ReportValue label="Sabit gider payı" value={report.fixedExpenses} />
          <ReportValue
            label="Direkt sabit gider"
            value={report.sourceBreakdown.directFixedExpenseCost}
          />
          <ReportValue
            label="Tekrarlı gider dağıtımı"
            value={report.sourceBreakdown.recurringAllocatedCost}
          />
          <ReportValue
            label="Sabit gider kaydı"
            value={`${report.recurringExpenseCount} kayıt`}
            raw
          />
        </div>
      </>
    );
  }

  if (activeTab === "maintenance") {
    return (
      <>
        <PanelTitle eyebrow="Bakım ve amortisman" title="Yıpranma maliyeti" />
        <div className="report-detail-grid">
          <ReportValue
            label="Bakım rezervi"
            value={report.maintenanceReserve}
          />
          <ReportValue
            label="Bakım kaydı rezervi"
            value={report.sourceBreakdown.maintenanceEntryReserveCost ?? "0"}
          />
          <ReportValue label="Amortisman" value={report.depreciation} />
          <ReportValue
            label="Araç amortisman hesabı"
            value={
              report.sourceBreakdown.calculatedVehicleDepreciationCost ?? "0"
            }
          />
        </div>
        <FormulaNote
          text={`${report.formula.maintenanceReserve ?? "Bakım rezervi km başı bakım maliyetinden hesaplanır."} ${report.formula.depreciation ?? ""}`}
        />
      </>
    );
  }

  if (activeTab === "income") {
    return (
      <>
        <PanelTitle eyebrow="Gelir detayları" title="Brüt gelir bileşenleri" />
        <div className="report-detail-grid">
          <ReportValue label="Sefer geliri" value={report.tripGrossIncome} />
          <ReportValue label="Bahşiş / ekstra" value={report.tipAmount} />
          <ReportValue label="İptal geliri" value={report.cancellationIncome} />
          <ReportValue label="Toplam brüt gelir" value={report.grossIncome} />
        </div>
      </>
    );
  }

  if (activeTab === "raw") {
    return (
      <>
        <PanelTitle eyebrow="Ham kayıtlar" title="Rapor veri kaynakları" />
        <div className="report-detail-grid">
          <ReportValue label="Sefer" value={`${report.tripCount} kayıt`} raw />
          <ReportValue
            label="Vardiya"
            value={`${report.shiftCount} kayıt`}
            raw
          />
          <ReportValue
            label="Direkt gider"
            value={`${report.directExpenseCount} kayıt`}
            raw
          />
          <ReportValue
            label="Yakıt"
            value={`${report.actualFuelEntryCount} kayıt`}
            raw
          />
        </div>
        <p className="form-hint">
          Ham kayıt sayıları rapor API’sinin kullandığı aynı dönem ve araç
          filtresinden gelir.
        </p>
      </>
    );
  }

  return (
    <>
      <PanelTitle eyebrow="Hesaplama güveni" title="Formül ve uyarılar" />
      <div className="report-formula-grid">
        <div>
          <span>Basit formül</span>
          <strong>
            Net kâr = Brüt gelir - yakıt - paket - giderler - bakım - amortisman
          </strong>
        </div>
        <div>
          <span>Teknik formül</span>
          <strong>
            netProfit = grossIncome - fuelCost - packageCost - variableExpenses
            - fixedExpenseShare - maintenanceReserve - depreciation
          </strong>
        </div>
        <div>
          <span>Motor formülü</span>
          <strong>{report.formula.netProfit}</strong>
        </div>
        <div>
          <span>Kapsam</span>
          <strong>
            {report.startDate} / {report.endDate}
          </strong>
        </div>
        <div>
          <span>Versiyon</span>
          <strong>{report.calculationVersion}</strong>
        </div>
      </div>
      <WarningsList report={report} />
    </>
  );
}

function PanelTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="panel-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
    </div>
  );
}

function ReportBarList({ rows }: { rows: Array<[string, string]> }) {
  const maxValue = Math.max(...rows.map(([, value]) => toNumber(value)), 1);

  return (
    <div className="cost-stack">
      {rows.map(([name, amount]) => (
        <div className="cost-row" key={name}>
          <div>
            <span>{name}</span>
            <strong>{formatMoneyValue(amount)}</strong>
          </div>
          <div className="mini-bar">
            <span
              style={{
                width: `${Math.min((toNumber(amount) / maxValue) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportValue({
  label,
  raw,
  value,
}: {
  label: string;
  raw?: boolean;
  value: string;
}) {
  return (
    <div className="report-value-card">
      <span>{label}</span>
      <strong>{raw ? value : formatMoneyValue(value)}</strong>
    </div>
  );
}

function FormulaNote({ text }: { text: string }) {
  return <p className="form-hint">{text}</p>;
}

function WarningsList({ report }: { report: ProfitReport }) {
  const warnings = buildWarnings(report);

  if (warnings.length === 0) {
    return (
      <div className="report-warning-list clean">
        <ShieldCheck aria-hidden="true" />
        <span>Bu rapor için hesaplama uyarısı yok.</span>
      </div>
    );
  }

  return (
    <div className="report-warning-list">
      {warnings.map((warning) => (
        <div className="form-hint warning" key={warning}>
          <AlertTriangle aria-hidden="true" className="button-icon" />
          {warning}
        </div>
      ))}
    </div>
  );
}

function buildPrimaryMetrics(report: ProfitReport) {
  return [
    {
      detail: `${report.tripCount} sefer`,
      icon: WalletCards,
      label: "Brüt gelir",
      value: formatMoneyValue(report.grossIncome),
    },
    {
      detail: toNumber(report.netProfit) < 0 ? "Zarar" : "Kâr",
      icon: TrendingUp,
      label: "Gerçek net kâr",
      value: formatMoneyValue(report.netProfit),
    },
    {
      detail:
        toNumber(report.totalKm) > 0
          ? `${formatNumber(toNumber(report.totalKm), 1)} km`
          : "Km gerekli",
      icon: Route,
      label: "Km başı kâr",
      value: formatMoneyValue(report.kmProfit),
    },
    {
      detail:
        report.activeMinutes > 0
          ? formatDuration(report.activeMinutes)
          : "Süre gerekli",
      icon: Clock,
      label: "Saatlik kâr",
      value: formatMoneyValue(report.hourlyProfit),
    },
    {
      detail: `${report.tripCount} sefer / ${report.shiftCount} vardiya`,
      icon: Gauge,
      label: "Toplam km",
      value: `${formatNumber(toNumber(report.totalKm), 1)} km`,
    },
    {
      detail: report.activeMinutes > 0 ? "Aktif çalışma" : "Vardiya yok",
      icon: CalendarDays,
      label: "Aktif süre",
      value: formatDuration(report.activeMinutes),
    },
  ];
}

function buildCostRows(report: ProfitReport | null): Array<[string, string]> {
  if (!report) {
    return [];
  }

  return [
    ["Yakıt maliyeti", report.fuelCost],
    ["Paket / kullanım payı", report.tagPackageCost],
    ["Değişken giderler", report.variableExpenses],
    ["Sabit gider payı", report.fixedExpenses],
    ["Bakım rezervi", report.maintenanceReserve],
    ["Amortisman", report.depreciation],
  ];
}

function buildWarnings(report: ProfitReport) {
  const warnings = new Set<string>();

  for (const warning of report.calculationWarnings ?? []) {
    warnings.add(mapWarning(warning));
  }

  if (toNumber(report.totalKm) > 0 && toNumber(report.fuelCost) <= 0) {
    warnings.add("Yakıt varsayımı eksik");
  }

  if (report.activePackageCount <= 0 && toNumber(report.tagPackageCost) <= 0) {
    warnings.add("Paket tanımlı değil");
  }

  if (
    report.recurringExpenseCount <= 0 &&
    toNumber(report.fixedExpenses) <= 0
  ) {
    warnings.add("Sabit gider tanımlı değil");
  }

  if (toNumber(report.maintenanceReserve) <= 0) {
    warnings.add("Bakım verisi yok");
  }

  if (toNumber(report.depreciation) <= 0) {
    warnings.add("Amortisman kapalı");
  }

  return Array.from(warnings);
}

function mapWarning(warning: CalculationWarning) {
  const messageByCode: Record<string, string> = {
    DEPRECIATION_DISABLED: "Amortisman kapalı",
    FIXED_COST_NOT_DEFINED: "Sabit gider tanımlı değil",
    FUEL_PRICE_MISSING: "Yakıt varsayımı eksik",
    MAINTENANCE_NOT_DEFINED: "Bakım verisi yok",
    PACKAGE_NOT_DEFINED: "Paket tanımlı değil",
    VEHICLE_CONSUMPTION_MISSING: "Yakıt varsayımı eksik",
  };

  return messageByCode[warning.code] ?? warning.message ?? warning.code;
}

function hasReportData(report: ProfitReport) {
  return (
    report.tripCount > 0 ||
    report.shiftCount > 0 ||
    report.directExpenseCount > 0 ||
    report.recurringExpenseCount > 0 ||
    report.actualFuelEntryCount > 0 ||
    report.activePackageCount > 0 ||
    toNumber(report.maintenanceReserve) > 0 ||
    toNumber(report.depreciation) > 0
  );
}

function getReportEndpoint(reportType: ReportType) {
  if (reportType === "weekly") {
    return "/reports/weekly-profit";
  }

  if (reportType === "monthly") {
    return "/reports/monthly-profit";
  }

  return "/reports/daily-profit";
}

function formatVehicleLabel(vehicle: Vehicle) {
  const name = [vehicle.brand, vehicle.model].filter(Boolean).join(" ");

  return name ? `${vehicle.plateNumber} - ${name}` : vehicle.plateNumber;
}

function getLocalDateInputValue() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;

  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function getCurrentWeekStartInputValue() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);

  monday.setDate(now.getDate() + diff);

  return toLocalDateInputValue(monday);
}

function getCurrentMonthInputValue() {
  return getLocalDateInputValue().slice(0, 7);
}

function toLocalDateInputValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;

  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

function formatMoneyValue(value: string | number | null | undefined) {
  return formatMoney(toNumber(value));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    currency: "TRY",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatNumber(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}

function formatDuration(minutes: number) {
  if (!minutes) {
    return "0 sa";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours <= 0) {
    return `${remainingMinutes} dk`;
  }

  return `${hours} sa ${remainingMinutes} dk`;
}

function toNumber(value: string | number | null | undefined) {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}
