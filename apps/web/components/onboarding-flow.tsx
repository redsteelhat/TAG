'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calculator,
  Car,
  CheckCircle2,
  Fuel,
  Package,
  Target
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getJson, patchJson, postJson } from '../lib/api-client';
import { getAccessToken } from '../lib/auth-storage';

type FuelType = 'DIESEL' | 'GASOLINE' | 'LPG' | 'HYBRID' | 'ELECTRIC' | 'OTHER';
type DepreciationModel = 'MONTHLY' | 'PER_KM';
type FixedCostAllocationMethod = 'ACTIVE_DAY' | 'CALENDAR_DAY' | 'PER_KM';
type PackageAllocationMethod = 'PER_DAY' | 'PER_TRIP' | 'PER_KM';

interface Vehicle {
  id: string;
  plateNumber: string;
  brand?: string | null;
  model?: string | null;
  fuelType: FuelType;
  averageConsumptionLPer100Km: string;
  isActive: boolean;
}

interface VehiclesResponse {
  data: Vehicle[];
}

interface VehicleResponse {
  data: Vehicle;
}

interface DriverProfileResponse {
  data: {
    id: string;
    defaultVehicleId?: string | null;
    fixedCostAllocationMethod: FixedCostAllocationMethod;
    showDepreciationInProfit: boolean;
    dailyTargetNetProfit?: string | null;
  };
}

interface TagPackageResponse {
  data: {
    id: string;
    name: string;
  };
}

interface VehicleFormState {
  annualDepreciationAmount: string;
  annualEstimatedKm: string;
  averageConsumption: string;
  brand: string;
  depreciationEnabled: boolean;
  depreciationModel: DepreciationModel;
  fuelType: FuelType;
  model: string;
  modelYear: string;
  odometerKm: string;
  plateNumber: string;
}

interface PreferenceFormState {
  dailyTargetNetProfit: string;
  fixedCostAllocationMethod: FixedCostAllocationMethod;
  showDepreciationInProfit: boolean;
}

interface PackageFormState {
  allocationMethod: PackageAllocationMethod;
  amount: string;
  breakEvenTarget: string;
  durationDays: string;
  endsAt: string;
  name: string;
  startsAt: string;
}

const today = new Date().toISOString().slice(0, 10);

const fuelOptions: Array<{ label: string; value: FuelType }> = [
  { label: 'Dizel', value: 'DIESEL' },
  { label: 'Benzin', value: 'GASOLINE' },
  { label: 'LPG', value: 'LPG' },
  { label: 'Hibrit', value: 'HYBRID' },
  { label: 'Elektrik', value: 'ELECTRIC' },
  { label: 'Diger', value: 'OTHER' }
];

const fixedAllocationOptions: Array<{
  label: string;
  value: FixedCostAllocationMethod;
}> = [
  { label: 'Aktif calisilan gunlere bol', value: 'ACTIVE_DAY' },
  { label: 'Takvim gunlerine bol', value: 'CALENDAR_DAY' },
  { label: 'Km’ye bol', value: 'PER_KM' }
];

const packageAllocationOptions: Array<{
  label: string;
  value: PackageAllocationMethod;
}> = [
  { label: 'Gune bol', value: 'PER_DAY' },
  { label: 'Sefere bol', value: 'PER_TRIP' },
  { label: 'Km’ye bol', value: 'PER_KM' }
];

const initialVehicleForm: VehicleFormState = {
  annualDepreciationAmount: '',
  annualEstimatedKm: '',
  averageConsumption: '',
  brand: '',
  depreciationEnabled: false,
  depreciationModel: 'PER_KM',
  fuelType: 'GASOLINE',
  model: '',
  modelYear: '',
  odometerKm: '',
  plateNumber: ''
};

const initialPreferenceForm: PreferenceFormState = {
  dailyTargetNetProfit: '1500',
  fixedCostAllocationMethod: 'ACTIVE_DAY',
  showDepreciationInProfit: true
};

const initialPackageForm: PackageFormState = {
  allocationMethod: 'PER_DAY',
  amount: '',
  breakEvenTarget: '',
  durationDays: '7',
  endsAt: addDays(today, 6),
  name: 'Haftalik TAG paketi',
  startsAt: today
};

export function OnboardingFlow() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [vehicleForm, setVehicleForm] =
    useState<VehicleFormState>(initialVehicleForm);
  const [preferenceForm, setPreferenceForm] = useState<PreferenceFormState>(
    initialPreferenceForm
  );
  const [packageForm, setPackageForm] =
    useState<PackageFormState>(initialPackageForm);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isSavingPackage, setIsSavingPackage] = useState(false);
  const [completedSteps, setCompletedSteps] = useState({
    package: false,
    preferences: false,
    vehicle: false
  });

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedVehicleId),
    [selectedVehicleId, vehicles]
  );
  const completionPercent =
    (Number(completedSteps.vehicle) +
      Number(completedSteps.preferences) +
      Number(completedSteps.package)) *
    33.33;

  useEffect(() => {
    const token = getAccessToken();

    setAccessToken(token);

    if (!token) {
      setIsLoading(false);
      return;
    }

    void loadInitialState(token);
  }, []);

  async function loadInitialState(token: string) {
    setIsLoading(true);
    setMessage(null);

    try {
      const [vehiclesResponse, profileResponse] = await Promise.all([
        getJson<VehiclesResponse>('/vehicles', { accessToken: token }),
        getJson<DriverProfileResponse>('/driver-profile', {
          accessToken: token
        })
      ]);
      const activeVehicle =
        vehiclesResponse.data.find((vehicle) => vehicle.isActive) ??
        vehiclesResponse.data[0];

      setVehicles(vehiclesResponse.data);
      setSelectedVehicleId(
        profileResponse.data.defaultVehicleId ?? activeVehicle?.id ?? ''
      );
      setCompletedSteps((current) => ({
        ...current,
        vehicle: vehiclesResponse.data.length > 0
      }));
      setPreferenceForm({
        dailyTargetNetProfit:
          profileResponse.data.dailyTargetNetProfit ??
          initialPreferenceForm.dailyTargetNetProfit,
        fixedCostAllocationMethod:
          profileResponse.data.fixedCostAllocationMethod ??
          initialPreferenceForm.fixedCostAllocationMethod,
        showDepreciationInProfit:
          profileResponse.data.showDepreciationInProfit ??
          initialPreferenceForm.showDepreciationInProfit
      });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Onboarding verileri yuklenemedi.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVehicleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setMessage('Arac olusturmak icin once giris yapmalisin.');
      return;
    }

    setIsSavingVehicle(true);
    setMessage(null);

    try {
      const response = await postJson<VehicleResponse>(
        '/vehicles',
        removeEmptyValues({
          annualDepreciationAmount: vehicleForm.depreciationEnabled
            ? normalizeDecimal(vehicleForm.annualDepreciationAmount)
            : undefined,
          annualEstimatedKm: vehicleForm.depreciationEnabled
            ? normalizeDecimal(vehicleForm.annualEstimatedKm)
            : undefined,
          averageConsumptionLPer100Km: normalizeDecimal(
            vehicleForm.averageConsumption
          ),
          brand: vehicleForm.brand.trim(),
          depreciationEnabled: vehicleForm.depreciationEnabled,
          depreciationModel: vehicleForm.depreciationEnabled
            ? vehicleForm.depreciationModel
            : undefined,
          fuelType: vehicleForm.fuelType,
          model: vehicleForm.model.trim(),
          modelYear: vehicleForm.modelYear
            ? Number(vehicleForm.modelYear)
            : undefined,
          odometerKm: normalizeDecimal(vehicleForm.odometerKm),
          plateNumber: vehicleForm.plateNumber.replace(/\s+/g, '').toUpperCase()
        }),
        { accessToken }
      );

      setVehicles((currentVehicles) => [response.data, ...currentVehicles]);
      setSelectedVehicleId(response.data.id);
      setVehicleForm(initialVehicleForm);
      setCompletedSteps((current) => ({ ...current, vehicle: true }));
      setMessage(`${response.data.plateNumber} plakali arac hazir.`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Arac kaydedilemedi.'
      );
    } finally {
      setIsSavingVehicle(false);
    }
  }

  async function handlePreferenceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setMessage('Tercihleri kaydetmek icin once giris yapmalisin.');
      return;
    }

    if (!selectedVehicleId) {
      setMessage('Once varsayilan arac sec veya yeni arac olustur.');
      return;
    }

    setIsSavingPreferences(true);
    setMessage(null);

    try {
      await patchJson<DriverProfileResponse>(
        '/driver-profile',
        removeEmptyValues({
          dailyTargetNetProfit: normalizeDecimal(
            preferenceForm.dailyTargetNetProfit
          ),
          defaultVehicleId: selectedVehicleId,
          fixedCostAllocationMethod: preferenceForm.fixedCostAllocationMethod,
          showDepreciationInProfit: preferenceForm.showDepreciationInProfit
        }),
        { accessToken }
      );

      setCompletedSteps((current) => ({ ...current, preferences: true }));
      setMessage('Finans tercihleri kaydedildi.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Finans tercihleri kaydedilemedi.'
      );
    } finally {
      setIsSavingPreferences(false);
    }
  }

  async function handlePackageSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!packageForm.amount.trim()) {
      setCompletedSteps((current) => ({ ...current, package: true }));
      setMessage(
        'Paket adimi atlandi. Daha sonra Paketler ekranindan eklenebilir.'
      );
      return;
    }

    if (!accessToken) {
      setMessage('Paket kaydetmek icin once giris yapmalisin.');
      return;
    }

    if (!selectedVehicleId) {
      setMessage('Paket kaydetmek icin once arac secmelisin.');
      return;
    }

    setIsSavingPackage(true);
    setMessage(null);

    try {
      await postJson<TagPackageResponse>(
        '/tag-packages',
        removeEmptyValues({
          allocationMethod: packageForm.allocationMethod,
          amount: normalizeDecimal(packageForm.amount),
          breakEvenTarget: normalizeDecimal(packageForm.breakEvenTarget),
          durationDays: packageForm.durationDays
            ? Number(packageForm.durationDays)
            : undefined,
          endsAt: packageForm.endsAt,
          isActive: true,
          name: packageForm.name.trim(),
          startsAt: packageForm.startsAt,
          vehicleId: selectedVehicleId
        }),
        { accessToken }
      );

      setCompletedSteps((current) => ({ ...current, package: true }));
      setMessage('Paket gideri kaydedildi.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Paket kaydedilemedi.'
      );
    } finally {
      setIsSavingPackage(false);
    }
  }

  function finishOnboarding() {
    localStorage.setItem('tag.onboardingCompleted', new Date().toISOString());
    router.push('/');
  }

  function updateVehicleForm<Key extends keyof VehicleFormState>(
    key: Key,
    value: VehicleFormState[Key]
  ) {
    setVehicleForm((currentForm) => ({ ...currentForm, [key]: value }));
  }

  function updatePreferenceForm<Key extends keyof PreferenceFormState>(
    key: Key,
    value: PreferenceFormState[Key]
  ) {
    setPreferenceForm((currentForm) => ({ ...currentForm, [key]: value }));
  }

  function updatePackageForm<Key extends keyof PackageFormState>(
    key: Key,
    value: PackageFormState[Key]
  ) {
    setPackageForm((currentForm) => ({ ...currentForm, [key]: value }));
  }

  if (!accessToken && !isLoading) {
    return (
      <section className="panel empty-state-panel">
        <p className="eyebrow">Oturum gerekli</p>
        <h2>Kurulum akisini baslatmak icin giris yap.</h2>
        <p>
          Hesap olusturduktan sonra arac ve finans ayarlarini burada
          tamamlarsin.
        </p>
        <Link className="primary-button" href="/login">
          Giris yap
        </Link>
      </section>
    );
  }

  return (
    <section className="onboarding-page">
      <section className="panel onboarding-hero">
        <div>
          <p className="eyebrow">Ilk kurulum</p>
          <h2>Net kar motorunu kullanmadan once 3 temel bilgiyi tamamla.</h2>
          <p>
            Arac, hedef ve paket bilgisi tamamlandiginda dashboard gunluk net
            kar, km basi kar ve break-even durumunu anlamli hesaplar.
          </p>
        </div>
        <div className="onboarding-progress">
          <strong>{Math.round(completionPercent)}%</strong>
          <span>Tamamlanma</span>
          <div className="progress-track">
            <span style={{ width: `${Math.min(100, completionPercent)}%` }} />
          </div>
        </div>
      </section>

      {message ? (
        <p className="form-message onboarding-message">{message}</p>
      ) : null}

      <section className="onboarding-steps" aria-label="Kurulum adimlari">
        <StepCard
          description="Yakit ve km hesaplari icin zorunlu."
          done={completedSteps.vehicle}
          icon={Car}
          label="Arac"
        />
        <StepCard
          description="Hedef, amortisman ve sabit gider dagitimi."
          done={completedSteps.preferences}
          icon={Target}
          label="Finans"
        />
        <StepCard
          description="Paket payi ve break-even icin opsiyonel."
          done={completedSteps.package}
          icon={Package}
          label="Paket"
        />
      </section>

      <section className="onboarding-grid">
        <form className="panel data-form" onSubmit={handleVehicleSubmit}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">1. Adim</p>
              <h2>Aracini tanimla</h2>
            </div>
            <Fuel aria-hidden="true" className="panel-icon" />
          </div>

          {vehicles.length > 0 ? (
            <label>
              Mevcut arac
              <select
                onChange={(event) => setSelectedVehicleId(event.target.value)}
                value={selectedVehicleId}
              >
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {formatVehicleLabel(vehicle)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="form-grid">
            <label>
              Plaka
              <input
                autoComplete="off"
                onChange={(event) =>
                  updateVehicleForm('plateNumber', event.target.value)
                }
                placeholder="34 ABC 123"
                required={vehicles.length === 0}
                value={vehicleForm.plateNumber}
              />
            </label>

            <label>
              Yakit tipi
              <select
                onChange={(event) =>
                  updateVehicleForm('fuelType', event.target.value as FuelType)
                }
                value={vehicleForm.fuelType}
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
                onChange={(event) =>
                  updateVehicleForm('averageConsumption', event.target.value)
                }
                placeholder="7.50"
                required={vehicles.length === 0}
                value={vehicleForm.averageConsumption}
              />
            </label>

            <label>
              Km sayaci
              <input
                inputMode="decimal"
                onChange={(event) =>
                  updateVehicleForm('odometerKm', event.target.value)
                }
                placeholder="85000"
                value={vehicleForm.odometerKm}
              />
            </label>

            <label>
              Marka
              <input
                onChange={(event) =>
                  updateVehicleForm('brand', event.target.value)
                }
                placeholder="Toyota"
                value={vehicleForm.brand}
              />
            </label>

            <label>
              Model
              <input
                onChange={(event) =>
                  updateVehicleForm('model', event.target.value)
                }
                placeholder="Corolla"
                value={vehicleForm.model}
              />
            </label>
          </div>

          <label className="checkbox-row">
            <input
              checked={vehicleForm.depreciationEnabled}
              onChange={(event) =>
                updateVehicleForm('depreciationEnabled', event.target.checked)
              }
              type="checkbox"
            />
            Arac amortismanini simdiden tanimla
          </label>

          {vehicleForm.depreciationEnabled ? (
            <div className="form-grid">
              <label>
                Amortisman modeli
                <select
                  onChange={(event) =>
                    updateVehicleForm(
                      'depreciationModel',
                      event.target.value as DepreciationModel
                    )
                  }
                  value={vehicleForm.depreciationModel}
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
                    updateVehicleForm(
                      'annualDepreciationAmount',
                      event.target.value
                    )
                  }
                  placeholder="60000"
                  value={vehicleForm.annualDepreciationAmount}
                />
              </label>

              <label>
                Yillik tahmini km
                <input
                  inputMode="decimal"
                  onChange={(event) =>
                    updateVehicleForm('annualEstimatedKm', event.target.value)
                  }
                  placeholder="30000"
                  value={vehicleForm.annualEstimatedKm}
                />
              </label>
            </div>
          ) : null}

          <button
            className="primary-button"
            disabled={isSavingVehicle || isLoading}
          >
            {isSavingVehicle ? 'Kaydediliyor' : 'Araci kaydet'}
          </button>
        </form>

        <form className="panel data-form" onSubmit={handlePreferenceSubmit}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">2. Adim</p>
              <h2>Finans tercihleri</h2>
            </div>
            <Calculator aria-hidden="true" className="panel-icon" />
          </div>

          <label>
            Varsayilan arac
            <select
              disabled={vehicles.length === 0}
              onChange={(event) => setSelectedVehicleId(event.target.value)}
              required
              value={selectedVehicleId}
            >
              <option value="">Arac sec</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {formatVehicleLabel(vehicle)}
                </option>
              ))}
            </select>
          </label>

          <div className="form-grid">
            <label>
              Gunluk net kar hedefi
              <input
                inputMode="decimal"
                onChange={(event) =>
                  updatePreferenceForm(
                    'dailyTargetNetProfit',
                    event.target.value
                  )
                }
                placeholder="1500"
                value={preferenceForm.dailyTargetNetProfit}
              />
            </label>

            <label>
              Sabit gider dagitimi
              <select
                onChange={(event) =>
                  updatePreferenceForm(
                    'fixedCostAllocationMethod',
                    event.target.value as FixedCostAllocationMethod
                  )
                }
                value={preferenceForm.fixedCostAllocationMethod}
              >
                {fixedAllocationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="checkbox-row">
            <input
              checked={preferenceForm.showDepreciationInProfit}
              onChange={(event) =>
                updatePreferenceForm(
                  'showDepreciationInProfit',
                  event.target.checked
                )
              }
              type="checkbox"
            />
            Amortisman gercek net kar hesabina dahil edilsin
          </label>

          <button
            className="primary-button"
            disabled={isSavingPreferences || vehicles.length === 0}
          >
            {isSavingPreferences ? 'Kaydediliyor' : 'Tercihleri kaydet'}
          </button>
        </form>

        <form className="panel data-form" onSubmit={handlePackageSubmit}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">3. Adim</p>
              <h2>Paket gideri</h2>
            </div>
            <Package aria-hidden="true" className="panel-icon" />
          </div>

          <p className="form-message">
            Paket kullanmiyorsan tutari bos birakip bu adimi atlayabilirsin.
          </p>

          <div className="form-grid">
            <label>
              Paket adi
              <input
                onChange={(event) =>
                  updatePackageForm('name', event.target.value)
                }
                value={packageForm.name}
              />
            </label>

            <label>
              Paket tutari
              <input
                inputMode="decimal"
                onChange={(event) =>
                  updatePackageForm('amount', event.target.value)
                }
                placeholder="700"
                value={packageForm.amount}
              />
            </label>

            <label>
              Baslangic
              <input
                onChange={(event) =>
                  updatePackageForm('startsAt', event.target.value)
                }
                type="date"
                value={packageForm.startsAt}
              />
            </label>

            <label>
              Bitis
              <input
                onChange={(event) =>
                  updatePackageForm('endsAt', event.target.value)
                }
                type="date"
                value={packageForm.endsAt}
              />
            </label>

            <label>
              Gun sayisi
              <input
                inputMode="numeric"
                onChange={(event) =>
                  updatePackageForm('durationDays', event.target.value)
                }
                value={packageForm.durationDays}
              />
            </label>

            <label>
              Dagitim
              <select
                onChange={(event) =>
                  updatePackageForm(
                    'allocationMethod',
                    event.target.value as PackageAllocationMethod
                  )
                }
                value={packageForm.allocationMethod}
              >
                {packageAllocationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Break-even hedefi
              <input
                inputMode="decimal"
                onChange={(event) =>
                  updatePackageForm('breakEvenTarget', event.target.value)
                }
                placeholder="1240"
                value={packageForm.breakEvenTarget}
              />
            </label>
          </div>

          <button
            className="primary-button"
            disabled={isSavingPackage || !selectedVehicleId}
          >
            {isSavingPackage ? 'Kaydediliyor' : 'Paketi kaydet veya atla'}
          </button>
        </form>
      </section>

      <section className="panel onboarding-finish">
        <div>
          <p className="eyebrow">Kurulum sonucu</p>
          <h2>
            {selectedVehicle
              ? `${selectedVehicle.plateNumber} icin hesaplama hazir.`
              : 'Arac secildiginde hesaplama hazir olacak.'}
          </h2>
          <p>
            Eksik kalan giderleri daha sonra sabit gider, yakit ve bakim
            ekranlarindan tamamlayabilirsin.
          </p>
        </div>
        <button
          className="primary-button"
          disabled={!completedSteps.vehicle || !completedSteps.preferences}
          onClick={finishOnboarding}
          type="button"
        >
          Dashboard’a gec
        </button>
      </section>
    </section>
  );
}

function StepCard({
  description,
  done,
  icon: Icon,
  label
}: {
  description: string;
  done: boolean;
  icon: typeof Car;
  label: string;
}) {
  return (
    <article className={done ? 'onboarding-step done' : 'onboarding-step'}>
      <Icon aria-hidden="true" />
      <div>
        <strong>{label}</strong>
        <span>{description}</span>
      </div>
      {done ? <CheckCircle2 aria-hidden="true" /> : null}
    </article>
  );
}

function formatVehicleLabel(vehicle: Vehicle) {
  const name = [vehicle.brand, vehicle.model].filter(Boolean).join(' ');

  return name ? `${vehicle.plateNumber} - ${name}` : vehicle.plateNumber;
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

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00.000Z`);

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}
