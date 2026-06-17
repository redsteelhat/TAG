'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { postJson } from '../lib/api-client';
import { getAccessToken } from '../lib/auth-storage';

type FuelType = 'DIESEL' | 'GASOLINE' | 'LPG' | 'HYBRID' | 'ELECTRIC' | 'OTHER';
type DepreciationModel = 'MONTHLY' | 'PER_KM';

interface VehicleResponse {
  data: {
    id: string;
    plateNumber: string;
    brand?: string | null;
    model?: string | null;
    fuelType: FuelType;
    averageConsumptionLPer100Km: string;
    isActive: boolean;
  };
}

const fuelOptions: Array<{ label: string; value: FuelType }> = [
  { label: 'Dizel', value: 'DIESEL' },
  { label: 'Benzin', value: 'GASOLINE' },
  { label: 'LPG', value: 'LPG' },
  { label: 'Hibrit', value: 'HYBRID' },
  { label: 'Elektrik', value: 'ELECTRIC' },
  { label: 'Diger', value: 'OTHER' }
];

export function VehicleCreateForm() {
  const [plateNumber, setPlateNumber] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [modelYear, setModelYear] = useState('');
  const [fuelType, setFuelType] = useState<FuelType>('GASOLINE');
  const [averageConsumption, setAverageConsumption] = useState('');
  const [odometerKm, setOdometerKm] = useState('');
  const [depreciationEnabled, setDepreciationEnabled] = useState(false);
  const [depreciationModel, setDepreciationModel] =
    useState<DepreciationModel>('PER_KM');
  const [annualDepreciationAmount, setAnnualDepreciationAmount] = useState('');
  const [annualEstimatedKm, setAnnualEstimatedKm] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [createdVehicle, setCreatedVehicle] =
    useState<VehicleResponse['data'] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedPlate = useMemo(
    () => plateNumber.replace(/\s+/g, '').toUpperCase(),
    [plateNumber]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setCreatedVehicle(null);

    const accessToken = getAccessToken();

    if (!accessToken) {
      setMessage('Arac olusturmak icin once giris yapmalisin.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await postJson<VehicleResponse>(
        '/vehicles',
        removeEmptyValues({
          plateNumber: normalizedPlate,
          brand,
          model,
          modelYear: modelYear ? Number(modelYear) : undefined,
          fuelType,
          averageConsumptionLPer100Km: normalizeDecimal(averageConsumption),
          odometerKm: normalizeDecimal(odometerKm),
          depreciationEnabled,
          depreciationModel: depreciationEnabled ? depreciationModel : undefined,
          annualDepreciationAmount: depreciationEnabled
            ? normalizeDecimal(annualDepreciationAmount)
            : undefined,
          annualEstimatedKm: depreciationEnabled
            ? normalizeDecimal(annualEstimatedKm)
            : undefined
        }),
        { accessToken }
      );

      setCreatedVehicle(response.data);
      resetForm();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Arac olusturulamadi.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetForm() {
    setPlateNumber('');
    setBrand('');
    setModel('');
    setModelYear('');
    setFuelType('GASOLINE');
    setAverageConsumption('');
    setOdometerKm('');
    setDepreciationEnabled(false);
    setDepreciationModel('PER_KM');
    setAnnualDepreciationAmount('');
    setAnnualEstimatedKm('');
  }

  return (
    <section className="form-layout">
      <form className="panel data-form" onSubmit={handleSubmit}>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Zorunlu bilgiler</p>
            <h2>Arac profili</h2>
          </div>
          <span className="status-pill">Ilk arac aktif olur</span>
        </div>

        <div className="form-grid">
          <label>
            Plaka
            <input
              autoComplete="off"
              name="plateNumber"
              onChange={(event) => setPlateNumber(event.target.value)}
              placeholder="34 ABC 123"
              required
              value={plateNumber}
            />
          </label>

          <label>
            Yakit tipi
            <select
              name="fuelType"
              onChange={(event) => setFuelType(event.target.value as FuelType)}
              value={fuelType}
            >
              {fuelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Ortalama tuketim
            <input
              inputMode="decimal"
              name="averageConsumption"
              onChange={(event) => setAverageConsumption(event.target.value)}
              placeholder="7.50"
              required
              value={averageConsumption}
            />
          </label>

          <label>
            Km sayaci
            <input
              inputMode="decimal"
              name="odometerKm"
              onChange={(event) => setOdometerKm(event.target.value)}
              placeholder="85000"
              value={odometerKm}
            />
          </label>

          <label>
            Marka
            <input
              name="brand"
              onChange={(event) => setBrand(event.target.value)}
              placeholder="Toyota"
              value={brand}
            />
          </label>

          <label>
            Model
            <input
              name="model"
              onChange={(event) => setModel(event.target.value)}
              placeholder="Corolla"
              value={model}
            />
          </label>

          <label>
            Model yili
            <input
              inputMode="numeric"
              max={2100}
              min={1950}
              name="modelYear"
              onChange={(event) => setModelYear(event.target.value)}
              placeholder="2020"
              type="number"
              value={modelYear}
            />
          </label>
        </div>

        <label className="checkbox-row">
          <input
            checked={depreciationEnabled}
            onChange={(event) => setDepreciationEnabled(event.target.checked)}
            type="checkbox"
          />
          Amortisman maliyetini kar hesabina dahil et
        </label>

        {depreciationEnabled ? (
          <div className="form-grid">
            <label>
              Amortisman modeli
              <select
                name="depreciationModel"
                onChange={(event) =>
                  setDepreciationModel(event.target.value as DepreciationModel)
                }
                value={depreciationModel}
              >
                <option value="PER_KM">Km bazli</option>
                <option value="MONTHLY">Aylik</option>
              </select>
            </label>

            <label>
              Yillik deger kaybi
              <input
                inputMode="decimal"
                onChange={(event) =>
                  setAnnualDepreciationAmount(event.target.value)
                }
                placeholder="60000"
                value={annualDepreciationAmount}
              />
            </label>

            <label>
              Yillik tahmini km
              <input
                inputMode="decimal"
                onChange={(event) => setAnnualEstimatedKm(event.target.value)}
                placeholder="30000"
                value={annualEstimatedKm}
              />
            </label>
          </div>
        ) : null}

        {message ? <p className="form-alert">{message}</p> : null}

        {createdVehicle ? (
          <p className="form-success">
            {createdVehicle.plateNumber} plakali arac olusturuldu.
          </p>
        ) : null}

        <div className="form-actions">
          <Link className="secondary-button button-link" href="/">
            Dashboard
          </Link>
          <button className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? 'Kaydediliyor' : 'Arac Olustur'}
          </button>
        </div>
      </form>

      <aside className="panel form-summary">
        <p className="eyebrow">Hesaplama etkisi</p>
        <h2>Arac verisi kar motorunun temelidir.</h2>
        <ul>
          <li>Yakit tipi ve ortalama tuketim sefer yakit maliyetini hesaplar.</li>
          <li>Km sayaci bakim ve amortisman dagitimlarina zemin hazirlar.</li>
          <li>Aktif arac, yeni sefer ve gider kayitlarinda varsayilan olur.</li>
        </ul>
      </aside>
    </section>
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
