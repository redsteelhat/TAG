'use client';

import { Calculator, RefreshCw, Save } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getJson, patchJson } from '../lib/api-client';
import { getAccessToken } from '../lib/auth-storage';

type DepreciationModel = 'MONTHLY' | 'PER_KM';

interface Vehicle {
  id: string;
  plateNumber: string;
  brand?: string | null;
  model?: string | null;
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

interface DepreciationFormState {
  annualDepreciationAmount: string;
  annualEstimatedKm: string;
  depreciationEnabled: boolean;
  depreciationModel: DepreciationModel;
  vehicleId: string;
}

const emptyForm: DepreciationFormState = {
  annualDepreciationAmount: '',
  annualEstimatedKm: '',
  depreciationEnabled: false,
  depreciationModel: 'PER_KM',
  vehicleId: ''
};

export function DepreciationSettingsPanel() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState<DepreciationFormState>(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === form.vehicleId) ?? null,
    [form.vehicleId, vehicles]
  );

  const annualDepreciation = toNumber(form.annualDepreciationAmount);
  const annualKm = toNumber(form.annualEstimatedKm);
  const monthlyDepreciation = annualDepreciation / 12;
  const perKmDepreciation =
    annualKm > 0 ? annualDepreciation / annualKm : 0;
  const sampleDailyKm = 120;
  const sampleDailyCost =
    form.depreciationModel === 'PER_KM'
      ? perKmDepreciation * sampleDailyKm
      : monthlyDepreciation / 22;

  useEffect(() => {
    setAccessToken(getAccessToken());
  }, []);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    void fetchVehicles(accessToken);
  }, [accessToken]);

  async function fetchVehicles(token = accessToken) {
    if (!token) {
      setMessage('Amortisman ayarlarini görmek için önce giriş yapmalısın.');
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await getJson<VehiclesResponse>('/vehicles', {
        accessToken: token
      });

      setVehicles(response.data);
      hydrateFormFromVehicle(
        response.data.find((vehicle) => vehicle.isActive) ?? response.data[0]
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Araçlar yüklenemedi.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  function hydrateFormFromVehicle(vehicle?: Vehicle) {
    if (!vehicle) {
      setForm(emptyForm);
      return;
    }

    setForm({
      annualDepreciationAmount: vehicle.annualDepreciationAmount ?? '',
      annualEstimatedKm: vehicle.annualEstimatedKm ?? '',
      depreciationEnabled: vehicle.depreciationEnabled,
      depreciationModel: vehicle.depreciationModel ?? 'PER_KM',
      vehicleId: vehicle.id
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setMessage('Amortisman ayari için önce giriş yapmalısın.');
      return;
    }

    if (!form.vehicleId) {
      setMessage('Önce araç seçmelisin.');
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await patchJson<VehicleResponse>(
        `/vehicles/${form.vehicleId}/depreciation-settings`,
        removeEmptyValues({
          annualDepreciationAmount: form.depreciationEnabled
            ? normalizeDecimal(form.annualDepreciationAmount)
            : undefined,
          annualEstimatedKm: form.depreciationEnabled
            ? normalizeDecimal(form.annualEstimatedKm)
            : undefined,
          depreciationEnabled: form.depreciationEnabled,
          depreciationModel: form.depreciationEnabled
            ? form.depreciationModel
            : undefined
        }),
        {
          accessToken
        }
      );

      setVehicles((currentVehicles) =>
        currentVehicles.map((vehicle) =>
          vehicle.id === response.data.id ? response.data : vehicle
        )
      );
      hydrateFormFromVehicle(response.data);
      setMessage('Amortisman ayari kaydedildi.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Amortisman ayari kaydedilemedi.'
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="depreciation-settings-page">
      <section className="metric-grid depreciation-metrics">
        <article className="metric-card">
          <span>Aylık amortisman</span>
          <strong>{formatMoney(monthlyDepreciation)}</strong>
        </article>
        <article className="metric-card">
          <span>Km başı amortisman</span>
          <strong>{formatMoney(perKmDepreciation)}</strong>
        </article>
        <article className="metric-card">
          <span>120 km ornek gün maliyeti</span>
          <strong>{formatMoney(sampleDailyCost)}</strong>
        </article>
        <article className="metric-card">
          <span>Durum</span>
          <strong>{form.depreciationEnabled ? 'Aktif' : 'Kapali'}</strong>
        </article>
      </section>

      <section className="form-layout">
        <form className="panel data-form" onSubmit={handleSubmit}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Araç yıpranma maliyeti</p>
              <h2>Amortisman ayari</h2>
            </div>
            <span className="status-pill">
              {selectedVehicle?.plateNumber ?? 'Araç seç'}
            </span>
          </div>

          <div className="depreciation-settings-grid">
            <label>
              Araç
              <select
                disabled={isLoading}
                value={form.vehicleId}
                onChange={(event) => {
                  const vehicle = vehicles.find(
                    (item) => item.id === event.target.value
                  );

                  hydrateFormFromVehicle(vehicle);
                }}
              >
                <option value="">Araç seç</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.plateNumber} {vehicle.brand ?? ''} {vehicle.model ?? ''}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Model
              <select
                disabled={!form.depreciationEnabled}
                value={form.depreciationModel}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    depreciationModel: event.target.value as DepreciationModel
                  }))
                }
              >
                <option value="PER_KM">Km bazlı</option>
                <option value="MONTHLY">Aylık</option>
              </select>
            </label>

            <label>
              Yıllık değer kaybı
              <input
                disabled={!form.depreciationEnabled}
                inputMode="decimal"
                placeholder="60000"
                value={form.annualDepreciationAmount}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    annualDepreciationAmount: event.target.value
                  }))
                }
              />
            </label>

            <label>
              Yıllık tahmini km
              <input
                disabled={!form.depreciationEnabled}
                inputMode="decimal"
                placeholder="30000"
                value={form.annualEstimatedKm}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    annualEstimatedKm: event.target.value
                  }))
                }
              />
            </label>
          </div>

          <label className="checkbox-row">
            <input
              checked={form.depreciationEnabled}
              onChange={(event) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  depreciationEnabled: event.target.checked
                }))
              }
              type="checkbox"
            />
            Bu araçin amortismanini net kâr hesabına dahil et
          </label>

          {message ? <p className="form-message">{message}</p> : null}

          <div className="form-actions">
            <button
              className="secondary-button"
              disabled={isLoading}
              onClick={() => fetchVehicles()}
              type="button"
            >
              <RefreshCw aria-hidden="true" className="inline-icon" />
              Yenile
            </button>
            <button className="primary-button" disabled={isSaving} type="submit">
              <Save aria-hidden="true" className="inline-icon" />
              {isSaving ? 'Kaydediliyor' : 'Ayari kaydet'}
            </button>
          </div>
        </form>

        <aside className="panel form-summary">
          <p className="eyebrow">Hesaplama etkisi</p>
          <h2>Amortisman nakit çıkışı değil, gerçek kâr maliyetidir.</h2>
          <ul>
            <li>Km bazlı modelde her seferin toplam km’si kadar pay ayrilir.</li>
            <li>Aylık modelde aylık değer kaybı seferlere dağıtılır.</li>
            <li>Ayar kapaliyken sefer ve rapor net kârında amortisman sıfırlanir.</li>
          </ul>
          <div className="depreciation-preview">
            <Calculator aria-hidden="true" />
            <div>
              <span>Ornek gün</span>
              <strong>{formatMoney(sampleDailyCost)}</strong>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function normalizeDecimal(value: string) {
  const normalizedValue = value.trim().replace(',', '.');

  return normalizedValue || undefined;
}

function removeEmptyValues(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).filter(
      ([, value]) => value !== undefined && value !== ''
    )
  );
}

function toNumber(value: string) {
  const parsed = Number(value.replace(',', '.'));

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    currency: 'TRY',
    maximumFractionDigits: 2,
    style: 'currency'
  }).format(value);
}
