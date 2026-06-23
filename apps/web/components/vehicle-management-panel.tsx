"use client";

import {
  Archive,
  Car,
  CheckCircle2,
  Edit3,
  Eye,
  EyeOff,
  Fuel,
  Gauge,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { deleteJson, getJson, patchJson, postJson } from "../lib/api-client";
import { getAccessToken } from "../lib/auth-storage";

type FuelType = "DIESEL" | "GASOLINE" | "LPG" | "HYBRID" | "ELECTRIC" | "OTHER";
type DepreciationModel = "MONTHLY" | "PER_KM";

interface Vehicle {
  id: string;
  plateNumber: string;
  brand?: string | null;
  model?: string | null;
  modelYear?: number | null;
  fuelType: FuelType;
  averageConsumptionLPer100Km: string;
  odometerKm?: string | null;
  isActive: boolean;
  depreciationEnabled: boolean;
  depreciationModel?: DepreciationModel | null;
  annualDepreciationAmount?: string | null;
  annualEstimatedKm?: string | null;
}

interface VehiclesResponse {
  data: Vehicle[];
}

interface VehicleResponse {
  data: Vehicle;
}

interface VehicleForm {
  annualDepreciationAmount: string;
  annualEstimatedKm: string;
  averageConsumptionLPer100Km: string;
  brand: string;
  depreciationEnabled: boolean;
  depreciationModel: DepreciationModel;
  fuelType: FuelType;
  model: string;
  modelYear: string;
  odometerKm: string;
  plateNumber: string;
}

const emptyVehicleForm: VehicleForm = {
  annualDepreciationAmount: "",
  annualEstimatedKm: "",
  averageConsumptionLPer100Km: "",
  brand: "",
  depreciationEnabled: false,
  depreciationModel: "PER_KM",
  fuelType: "GASOLINE",
  model: "",
  modelYear: "",
  odometerKm: "",
  plateNumber: "",
};

const fuelLabels: Record<FuelType, string> = {
  DIESEL: "Dizel",
  ELECTRIC: "Elektrik",
  GASOLINE: "Benzin",
  HYBRID: "Hibrit",
  LPG: "LPG",
  OTHER: "Diğer",
};

const fuelOptions: Array<{ label: string; value: FuelType }> = [
  { label: "Dizel", value: "DIESEL" },
  { label: "Benzin", value: "GASOLINE" },
  { label: "LPG", value: "LPG" },
  { label: "Hibrit", value: "HYBRID" },
  { label: "Elektrik", value: "ELECTRIC" },
  { label: "Diğer", value: "OTHER" },
];

export function VehicleManagementPanel() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState<VehicleForm>(emptyVehicleForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [maskPlates, setMaskPlates] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const metrics = useMemo(() => {
    const averageConsumption =
      vehicles.length > 0
        ? vehicles.reduce(
            (total, vehicle) =>
              total + toNumber(vehicle.averageConsumptionLPer100Km),
            0,
          ) / vehicles.length
        : 0;
    const totalKm = vehicles.reduce(
      (total, vehicle) => total + toNumber(vehicle.odometerKm),
      0,
    );

    return {
      activeVehicle: vehicles.find((vehicle) => vehicle.isActive),
      averageConsumption,
      totalKm,
      totalVehicles: vehicles.length,
    };
  }, [vehicles]);

  useEffect(() => {
    const token = getAccessToken();

    setAccessToken(token);

    if (!token) {
      setMessage("Araçları yönetmek için önce giriş yapmalısın.");
      setIsLoading(false);
      return;
    }

    void fetchVehicles(token);
  }, []);

  async function fetchVehicles(token = accessToken) {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await getJson<VehiclesResponse>("/vehicles", {
        accessToken: token,
      });

      setVehicles(response.data);

      if (response.data.length === 0) {
        setIsFormOpen(true);
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Araçlar yüklenemedi.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setMessage("Araç kaydetmek için önce giriş yapmalısın.");
      return;
    }

    const validationError = validateVehicleForm(form);

    if (validationError) {
      setMessage(validationError);
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const body = toVehiclePayload(form);
      const response = editingId
        ? await patchJson<VehicleResponse>(`/vehicles/${editingId}`, body, {
            accessToken,
          })
        : await postJson<VehicleResponse>("/vehicles", body, { accessToken });

      setVehicles((currentVehicles) =>
        editingId
          ? currentVehicles.map((vehicle) =>
              vehicle.id === response.data.id ? response.data : vehicle,
            )
          : [response.data, ...currentVehicles],
      );
      setMessage(
        editingId
          ? "Araç bilgileri güncellendi."
          : "Araç oluşturuldu. İlk araç otomatik aktif olur.",
      );
      closeForm();
      await fetchVehicles(accessToken);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Araç kaydedilemedi.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function setActiveVehicle(vehicle: Vehicle) {
    if (!accessToken || vehicle.isActive) {
      return;
    }

    setUpdatingId(vehicle.id);
    setMessage(null);

    try {
      const response = await postJson<VehicleResponse>(
        `/vehicles/${vehicle.id}/set-active`,
        {},
        { accessToken },
      );

      setVehicles((currentVehicles) =>
        currentVehicles.map((item) => ({
          ...item,
          isActive: item.id === response.data.id,
        })),
      );
      setMessage(
        "Aktif araç güncellendi. Yeni gelir, gider, yakıt ve bakım kayıtlarında bu araç varsayılan seçilir.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Aktif araç güncellenemedi.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function archiveVehicle(vehicle: Vehicle) {
    if (!accessToken) {
      return;
    }

    setUpdatingId(vehicle.id);
    setMessage(null);

    try {
      await deleteJson<{ data: { success: boolean } }>(
        `/vehicles/${vehicle.id}`,
        {
          accessToken,
        },
      );
      setVehicles((currentVehicles) =>
        currentVehicles.filter((item) => item.id !== vehicle.id),
      );
      setMessage(
        "Araç arşivlendi. Finansal kayıtlar korunur ve eski raporlarda görünmeye devam eder.",
      );
      await fetchVehicles(accessToken);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Araç arşivlenemedi.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  function beginCreate() {
    setEditingId(null);
    setForm(emptyVehicleForm);
    setIsFormOpen(true);
    setMessage(null);
  }

  function beginEdit(vehicle: Vehicle) {
    setEditingId(vehicle.id);
    setForm({
      annualDepreciationAmount: vehicle.annualDepreciationAmount ?? "",
      annualEstimatedKm: vehicle.annualEstimatedKm ?? "",
      averageConsumptionLPer100Km: vehicle.averageConsumptionLPer100Km,
      brand: vehicle.brand ?? "",
      depreciationEnabled: vehicle.depreciationEnabled,
      depreciationModel: vehicle.depreciationModel ?? "PER_KM",
      fuelType: vehicle.fuelType,
      model: vehicle.model ?? "",
      modelYear: vehicle.modelYear ? String(vehicle.modelYear) : "",
      odometerKm: vehicle.odometerKm ?? "",
      plateNumber: vehicle.plateNumber,
    });
    setIsFormOpen(true);
    setMessage(null);
  }

  function closeForm() {
    setEditingId(null);
    setForm(emptyVehicleForm);
    setIsFormOpen(false);
  }

  return (
    <div className="vehicle-management-page">
      <section className="metric-grid vehicle-metrics">
        <article className="metric-card">
          <div className="metric-card-header">
            <p>Toplam araç</p>
            <Car aria-hidden="true" className="metric-icon" />
          </div>
          <strong>{metrics.totalVehicles}</strong>
          <span>Arşivlenmemiş araç</span>
        </article>
        <article className="metric-card">
          <div className="metric-card-header">
            <p>Aktif araç</p>
            <CheckCircle2 aria-hidden="true" className="metric-icon" />
          </div>
          <strong>
            {metrics.activeVehicle
              ? formatPlate(metrics.activeVehicle.plateNumber, maskPlates)
              : "-"}
          </strong>
          <span>Varsayılan kayıt aracı</span>
        </article>
        <article className="metric-card">
          <div className="metric-card-header">
            <p>Ortalama tüketim</p>
            <Fuel aria-hidden="true" className="metric-icon" />
          </div>
          <strong>{formatNumber(metrics.averageConsumption, 1)} L</strong>
          <span>100 km araç ortalaması</span>
        </article>
        <article className="metric-card">
          <div className="metric-card-header">
            <p>Toplam km</p>
            <Gauge aria-hidden="true" className="metric-icon" />
          </div>
          <strong>{formatNumber(metrics.totalKm, 0)} km</strong>
          <span>Km sayacı toplamı</span>
        </article>
      </section>

      <section className="vehicle-management-grid">
        <section className="panel income-table-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Araç listesi</p>
              <h2>Filo ve aktif araç yönetimi</h2>
            </div>
            <div className="panel-actions">
              <button
                className="secondary-button"
                onClick={() => setMaskPlates((current) => !current)}
                type="button"
              >
                {maskPlates ? (
                  <Eye aria-hidden="true" className="inline-icon" />
                ) : (
                  <EyeOff aria-hidden="true" className="inline-icon" />
                )}
                {maskPlates ? "Plakayı göster" : "Plakayı maskele"}
              </button>
              <button
                className="secondary-button"
                disabled={isLoading}
                onClick={() => fetchVehicles()}
                type="button"
              >
                <RefreshCw aria-hidden="true" className="inline-icon" />
                Yenile
              </button>
              <button
                className="primary-button"
                onClick={beginCreate}
                type="button"
              >
                <Plus aria-hidden="true" className="inline-icon" />
                Yeni araç ekle
              </button>
            </div>
          </div>

          {message ? (
            <div className="form-alert-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", margin: "8px 0" }}>
              <p className="form-message">{message}</p>
              <button
                className="secondary-button compact"
                onClick={() => {
                  setMessage(null);
                  void fetchVehicles();
                }}
                type="button"
              >
                <RefreshCw aria-hidden="true" className="inline-icon" />
                Yenile
              </button>
            </div>
          ) : null}

          {isLoading ? (
            <div className="data-table-empty">Araçlar yükleniyor.</div>
          ) : vehicles.length === 0 ? (
            <div className="empty-state-panel compact">
              <div>
                <p className="eyebrow">Araç yok</p>
                <h2>İlk aracını ekle.</h2>
                <p>
                  Yakıt tipi, ortalama tüketim ve km sayacı kâr motorunun temel
                  varsayımlarını oluşturur.
                </p>
              </div>
            </div>
          ) : (
            <div className="data-table" role="table" aria-label="Araçlar">
              <div
                className="data-table-row data-table-head vehicle-table-row"
                role="row"
              >
                <span>Plaka</span>
                <span>Marka / model / yıl</span>
                <span>Yakıt tipi</span>
                <span>Ortalama tüketim</span>
                <span>Km sayacı</span>
                <span>Amortisman</span>
                <span>Aktif</span>
                <span>İşlemler</span>
              </div>

              {vehicles.map((vehicle) => (
                <div
                  className="data-table-row vehicle-table-row"
                  key={vehicle.id}
                  role="row"
                >
                  <span>
                    <strong>
                      {formatPlate(vehicle.plateNumber, maskPlates)}
                    </strong>
                    <small>Hassas veri</small>
                  </span>
                  <span>
                    <strong>
                      {[vehicle.brand, vehicle.model]
                        .filter(Boolean)
                        .join(" ") || "Marka/model yok"}
                    </strong>
                    <small>{vehicle.modelYear ?? "Yıl yok"}</small>
                  </span>
                  <span>{fuelLabels[vehicle.fuelType]}</span>
                  <span>
                    {formatNumber(
                      toNumber(vehicle.averageConsumptionLPer100Km),
                      1,
                    )}{" "}
                    L / 100 km
                  </span>
                  <span>
                    {formatNumber(toNumber(vehicle.odometerKm), 0)} km
                  </span>
                  <span>
                    <span
                      className={
                        vehicle.depreciationEnabled
                          ? "status-pill compact active"
                          : "status-pill compact completed"
                      }
                    >
                      {vehicle.depreciationEnabled ? "Açık" : "Kapalı"}
                    </span>
                  </span>
                  <span>
                    {vehicle.isActive ? (
                      <span className="status-pill compact active">
                        Aktif araç
                      </span>
                    ) : (
                      <button
                        className="secondary-button"
                        disabled={updatingId === vehicle.id}
                        onClick={() => setActiveVehicle(vehicle)}
                        type="button"
                      >
                        Aktif yap
                      </button>
                    )}
                  </span>
                  <span className="table-actions">
                    <button
                      aria-label={`${vehicle.plateNumber} aracını düzenle`}
                      className="icon-button"
                      onClick={() => beginEdit(vehicle)}
                      type="button"
                    >
                      <Edit3 aria-hidden="true" />
                    </button>
                    <button
                      aria-label={`${vehicle.plateNumber} aracını arşivle`}
                      className="icon-button danger"
                      disabled={updatingId === vehicle.id}
                      onClick={() => archiveVehicle(vehicle)}
                      type="button"
                    >
                      <Archive aria-hidden="true" />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {isFormOpen ? (
          <VehicleFormPanel
            editingId={editingId}
            form={form}
            isSaving={isSaving}
            setForm={setForm}
            onCancel={closeForm}
            onSubmit={handleSubmit}
          />
        ) : (
          <aside className="panel vehicle-management-summary">
            <p className="eyebrow">Varsayılan araç</p>
            <h2>Aktif araç diğer ekranlara yansır.</h2>
            <ul>
              <li>
                Yeni gelir, gider, yakıt ve bakım formları aktif aracı seçer.
              </li>
              <li>
                Yakıt ekranı araç yakıt tipini varsayılan yakıt tipi yapar.
              </li>
              <li>Arşivlenen araç finansal geçmişte korunur.</li>
            </ul>
          </aside>
        )}
      </section>
    </div>
  );
}

function VehicleFormPanel({
  editingId,
  form,
  isSaving,
  setForm,
  onCancel,
  onSubmit,
}: {
  editingId: string | null;
  form: VehicleForm;
  isSaving: boolean;
  setForm: (form: VehicleForm) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="panel data-form vehicle-form-panel" onSubmit={onSubmit}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{editingId ? "Araç düzenle" : "Yeni araç"}</p>
          <h2>Araç bilgileri</h2>
        </div>
        <span className="status-pill">Silme yerine arşiv</span>
      </div>

      <div className="vehicle-form-grid">
        <label>
          Plaka
          <input
            autoComplete="off"
            required
            value={form.plateNumber}
            onChange={(event) =>
              setForm({ ...form, plateNumber: event.target.value })
            }
            placeholder="34 ABC 123"
          />
        </label>
        <label>
          Yakıt tipi
          <select
            required
            value={form.fuelType}
            onChange={(event) =>
              setForm({ ...form, fuelType: event.target.value as FuelType })
            }
          >
            {fuelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ortalama tüketim
          <input
            inputMode="decimal"
            required
            value={form.averageConsumptionLPer100Km}
            onChange={(event) =>
              setForm({
                ...form,
                averageConsumptionLPer100Km: event.target.value,
              })
            }
            placeholder="7,5"
          />
        </label>
        <label>
          Km sayacı
          <input
            inputMode="decimal"
            min="0"
            value={form.odometerKm}
            onChange={(event) =>
              setForm({ ...form, odometerKm: event.target.value })
            }
            placeholder="85000"
          />
        </label>
        <label>
          Marka
          <input
            value={form.brand}
            onChange={(event) =>
              setForm({ ...form, brand: event.target.value })
            }
            placeholder="Toyota"
          />
        </label>
        <label>
          Model
          <input
            value={form.model}
            onChange={(event) =>
              setForm({ ...form, model: event.target.value })
            }
            placeholder="Corolla"
          />
        </label>
        <label>
          Model yılı
          <input
            inputMode="numeric"
            max={new Date().getFullYear() + 1}
            min={1950}
            type="number"
            value={form.modelYear}
            onChange={(event) =>
              setForm({ ...form, modelYear: event.target.value })
            }
            placeholder="2020"
          />
        </label>
        <label className="checkbox-row quick-expense-checkbox">
          <input
            checked={form.depreciationEnabled}
            onChange={(event) =>
              setForm({ ...form, depreciationEnabled: event.target.checked })
            }
            type="checkbox"
          />
          Amortisman net kâra dahil
        </label>
      </div>

      {form.depreciationEnabled ? (
        <div className="vehicle-form-grid depreciation-vehicle-grid">
          <label>
            Amortisman modeli
            <select
              value={form.depreciationModel}
              onChange={(event) =>
                setForm({
                  ...form,
                  depreciationModel: event.target.value as DepreciationModel,
                })
              }
            >
              <option value="PER_KM">Km bazlı</option>
              <option value="MONTHLY">Aylık</option>
            </select>
          </label>
          <label>
            Yıllık değer kaybı
            <input
              inputMode="decimal"
              value={form.annualDepreciationAmount}
              onChange={(event) =>
                setForm({
                  ...form,
                  annualDepreciationAmount: event.target.value,
                })
              }
              placeholder="60000"
            />
          </label>
          <label>
            Yıllık tahmini km
            <input
              inputMode="decimal"
              value={form.annualEstimatedKm}
              onChange={(event) =>
                setForm({ ...form, annualEstimatedKm: event.target.value })
              }
              placeholder="30000"
            />
          </label>
          <div className="vehicle-form-note">
            <ShieldCheck aria-hidden="true" />
            <span>Amortisman nakit çıkışı değil, gerçek kâr maliyetidir.</span>
          </div>
        </div>
      ) : null}

      <div className="form-actions">
        <button className="secondary-button" onClick={onCancel} type="button">
          Vazgeç
        </button>
        <button className="primary-button" disabled={isSaving} type="submit">
          <Save aria-hidden="true" className="inline-icon" />
          {isSaving ? "Kaydediliyor" : editingId ? "Güncelle" : "Araç ekle"}
        </button>
      </div>
    </form>
  );
}

function toVehiclePayload(form: VehicleForm) {
  return removeEmptyValues({
    annualDepreciationAmount: form.depreciationEnabled
      ? normalizeDecimal(form.annualDepreciationAmount)
      : undefined,
    annualEstimatedKm: form.depreciationEnabled
      ? normalizeDecimal(form.annualEstimatedKm)
      : undefined,
    averageConsumptionLPer100Km: normalizeDecimal(
      form.averageConsumptionLPer100Km,
    ),
    brand: form.brand.trim() || undefined,
    depreciationEnabled: form.depreciationEnabled,
    depreciationModel: form.depreciationEnabled
      ? form.depreciationModel
      : undefined,
    fuelType: form.fuelType,
    model: form.model.trim() || undefined,
    modelYear: form.modelYear ? Number(form.modelYear) : undefined,
    odometerKm: normalizeDecimal(form.odometerKm),
    plateNumber: normalizePlate(form.plateNumber),
  });
}

function validateVehicleForm(form: VehicleForm) {
  const modelYear = form.modelYear ? Number(form.modelYear) : undefined;
  const currentYear = new Date().getFullYear();

  if (!normalizePlate(form.plateNumber)) {
    return "Plaka zorunlu.";
  }

  if (!form.fuelType) {
    return "Yakıt tipi zorunlu.";
  }

  if (toNumber(form.averageConsumptionLPer100Km) <= 0) {
    return "Ortalama tüketim 0’dan büyük olmalı.";
  }

  if (form.odometerKm && toNumber(form.odometerKm) < 0) {
    return "Km sayacı negatif olamaz.";
  }

  if (modelYear && (modelYear < 1950 || modelYear > currentYear + 1)) {
    return `Model yılı 1950 ile ${currentYear + 1} arasında olmalı.`;
  }

  if (form.depreciationEnabled) {
    if (
      !form.annualDepreciationAmount ||
      toNumber(form.annualDepreciationAmount) <= 0
    ) {
      return "Amortisman açıkken yıllık değer kaybı 0’dan büyük olmalı.";
    }

    if (
      form.depreciationModel === "PER_KM" &&
      (!form.annualEstimatedKm || toNumber(form.annualEstimatedKm) <= 0)
    ) {
      return "Km bazlı amortisman için yıllık tahmini km 0’dan büyük olmalı.";
    }
  }

  return null;
}

function formatPlate(plateNumber: string, masked: boolean) {
  const normalizedPlate = normalizePlate(plateNumber);

  if (!masked) {
    return normalizedPlate;
  }

  if (normalizedPlate.length <= 5) {
    return normalizedPlate;
  }

  return `${normalizedPlate.slice(0, 2)} *** ${normalizedPlate.slice(-3)}`;
}

function normalizePlate(plateNumber: string) {
  return plateNumber.replace(/\s+/g, "").toUpperCase();
}

function normalizeDecimal(value: string) {
  const normalizedValue = value.trim().replace(",", ".");

  return normalizedValue || undefined;
}

function removeEmptyValues(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).filter(
      ([, value]) => value !== undefined && value !== "",
    ),
  );
}

function formatNumber(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}

function toNumber(value: string | number | null | undefined) {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}
