"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calculator,
  Car,
  CheckCircle2,
  Fuel,
  Package,
  Target,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getJson, patchJson, postJson } from "../lib/api-client";
import { getAccessToken } from "../lib/auth-storage";

type FuelType = "DIESEL" | "GASOLINE" | "LPG" | "HYBRID" | "ELECTRIC" | "OTHER";
type DepreciationModel = "MONTHLY" | "PER_KM";
type FixedCostAllocationMethod = "ACTIVE_DAY" | "CALENDAR_DAY" | "PER_KM";
type PackageAllocationMethod = "PER_DAY" | "PER_TRIP" | "PER_KM";

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
  { label: "Dizel", value: "DIESEL" },
  { label: "Benzin", value: "GASOLINE" },
  { label: "LPG", value: "LPG" },
  { label: "Hibrit", value: "HYBRID" },
  { label: "Elektrik", value: "ELECTRIC" },
  { label: "Diğer", value: "OTHER" },
];

const fixedAllocationOptions: Array<{
  label: string;
  value: FixedCostAllocationMethod;
}> = [
  { label: "Aktif calisilan günlere bol", value: "ACTIVE_DAY" },
  { label: "Takvim günlerine bol", value: "CALENDAR_DAY" },
  { label: "Km’ye bol", value: "PER_KM" },
];

const packageAllocationOptions: Array<{
  label: string;
  value: PackageAllocationMethod;
}> = [
  { label: "Gune bol", value: "PER_DAY" },
  { label: "Sefere bol", value: "PER_TRIP" },
  { label: "Km’ye bol", value: "PER_KM" },
];

const initialVehicleForm: VehicleFormState = {
  annualDepreciationAmount: "",
  annualEstimatedKm: "",
  averageConsumption: "",
  brand: "",
  depreciationEnabled: false,
  depreciationModel: "PER_KM",
  fuelType: "GASOLINE",
  model: "",
  modelYear: "",
  odometerKm: "",
  plateNumber: "",
};

const initialPreferenceForm: PreferenceFormState = {
  dailyTargetNetProfit: "1500",
  fixedCostAllocationMethod: "ACTIVE_DAY",
  showDepreciationInProfit: true,
};

const initialPackageForm: PackageFormState = {
  allocationMethod: "PER_DAY",
  amount: "",
  breakEvenTarget: "",
  durationDays: "7",
  endsAt: addDays(today, 6),
  name: "Haftalık operasyon paketi",
  startsAt: today,
};

export function OnboardingFlow() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [vehicleForm, setVehicleForm] =
    useState<VehicleFormState>(initialVehicleForm);
  const [preferenceForm, setPreferenceForm] = useState<PreferenceFormState>(
    initialPreferenceForm,
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
    vehicle: false,
  });

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedVehicleId),
    [selectedVehicleId, vehicles],
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
        getJson<VehiclesResponse>("/vehicles", { accessToken: token }),
        getJson<DriverProfileResponse>("/driver-profile", {
          accessToken: token,
        }),
      ]);
      const activeVehicle =
        vehiclesResponse.data.find((vehicle) => vehicle.isActive) ??
        vehiclesResponse.data[0];

      setVehicles(vehiclesResponse.data);
      setSelectedVehicleId(
        profileResponse.data.defaultVehicleId ?? activeVehicle?.id ?? "",
      );
      setCompletedSteps((current) => ({
        ...current,
        vehicle: vehiclesResponse.data.length > 0,
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
          initialPreferenceForm.showDepreciationInProfit,
      });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Onboarding verileri yüklenemedi.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVehicleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setMessage("Araç oluşturmak için önce giriş yapmalısın.");
      return;
    }

    // Client-side validations
    if (!vehicleForm.plateNumber.trim()) {
      setMessage("Plaka alanı zorunludur.");
      return;
    }
    if (!vehicleForm.brand.trim() || !vehicleForm.model.trim()) {
      setMessage("Araç marka ve modeli zorunludur.");
      return;
    }
    const consumption = toNumber(vehicleForm.averageConsumption);
    if (isNaN(consumption) || consumption <= 0) {
      setMessage("Ortalama yakıt tüketimi 0'dan büyük olmalıdır.");
      return;
    }
    const odometer = toNumber(vehicleForm.odometerKm);
    if (isNaN(odometer) || odometer < 0) {
      setMessage("Km sayacı negatif olamaz.");
      return;
    }
    const modelYear = vehicleForm.modelYear ? Number(vehicleForm.modelYear) : undefined;
    const currentYear = new Date().getFullYear();
    if (modelYear && (modelYear < 1950 || modelYear > currentYear + 1)) {
      setMessage(`Model yılı 1950 ile ${currentYear + 1} arasında olmalıdır.`);
      return;
    }

    if (vehicleForm.depreciationEnabled) {
      const depAmt = toNumber(vehicleForm.annualDepreciationAmount);
      const estKm = toNumber(vehicleForm.annualEstimatedKm);
      if (isNaN(depAmt) || depAmt <= 0) {
        setMessage("Amortisman açıkken yıllık değer kaybı 0'dan büyük olmalıdır.");
        return;
      }
      if (vehicleForm.depreciationModel === 'PER_KM' && (isNaN(estKm) || estKm <= 0)) {
        setMessage("Km bazlı amortisman için yıllık tahmini km 0'dan büyük olmalıdır.");
        return;
      }
    }

    setIsSavingVehicle(true);
    setMessage(null);

    try {
      const response = await postJson<VehicleResponse>(
        "/vehicles",
        removeEmptyValues({
          annualDepreciationAmount: vehicleForm.depreciationEnabled
            ? normalizeDecimal(vehicleForm.annualDepreciationAmount)
            : undefined,
          annualEstimatedKm: vehicleForm.depreciationEnabled
            ? normalizeDecimal(vehicleForm.annualEstimatedKm)
            : undefined,
          averageConsumptionLPer100Km: normalizeDecimal(
            vehicleForm.averageConsumption,
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
          plateNumber: vehicleForm.plateNumber
            .replace(/\s+/g, "")
            .toUpperCase(),
        }),
        { accessToken },
      );

      setVehicles((currentVehicles) => [response.data, ...currentVehicles]);
      setSelectedVehicleId(response.data.id);
      setVehicleForm(initialVehicleForm);
      setCompletedSteps((current) => ({ ...current, vehicle: true }));
      setMessage(`${response.data.plateNumber} plakalı araç başarıyla kaydedildi.`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "İşlem tamamlanamadı. Lütfen tekrar deneyin.",
      );
    } finally {
      setIsSavingVehicle(false);
    }
  }

  async function handlePreferenceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setMessage("Tercihleri kaydetmek için önce giriş yapmalısın.");
      return;
    }

    if (!selectedVehicleId) {
      setMessage("Önce varsayılan araç seç veya yeni araç oluştur.");
      return;
    }

    const targetProfit = toNumber(preferenceForm.dailyTargetNetProfit);
    if (isNaN(targetProfit) || targetProfit < 0) {
      setMessage("Günlük hedef net kâr negatif olamaz.");
      return;
    }

    setIsSavingPreferences(true);
    setMessage(null);

    try {
      await patchJson<DriverProfileResponse>(
        "/driver-profile",
        removeEmptyValues({
          dailyTargetNetProfit: normalizeDecimal(
            preferenceForm.dailyTargetNetProfit,
          ),
          defaultVehicleId: selectedVehicleId,
          fixedCostAllocationMethod: preferenceForm.fixedCostAllocationMethod,
        }),
        { accessToken },
      );

      setCompletedSteps((current) => ({ ...current, preferences: true }));
      setMessage("Finans tercihleri başarıyla kaydedildi.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "İşlem tamamlanamadı. Lütfen tekrar deneyin.",
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
        "Paket adımı atlandı. Daha sonra Paketler ekranından eklenebilir.",
      );
      return;
    }

    if (!accessToken) {
      setMessage("Paket kaydetmek için önce giriş yapmalısın.");
      return;
    }

    if (!selectedVehicleId) {
      setMessage("Paket kaydetmek için önce araç seçmelisin.");
      return;
    }

    const amount = toNumber(packageForm.amount);
    if (isNaN(amount) || amount <= 0) {
      setMessage("Paket tutarı 0'dan büyük olmalıdır.");
      return;
    }

    const breakEven = toNumber(packageForm.breakEvenTarget);
    if (packageForm.breakEvenTarget.trim() && (isNaN(breakEven) || breakEven < 0)) {
      setMessage("Başabaş hedefi negatif olamaz.");
      return;
    }

    if (!packageForm.startsAt || !packageForm.endsAt) {
      setMessage("Başlangıç ve bitiş tarihleri zorunludur.");
      return;
    }

    if (new Date(packageForm.endsAt) < new Date(packageForm.startsAt)) {
      setMessage("Bitiş tarihi başlangıç tarihinden önce olamaz.");
      return;
    }

    setIsSavingPackage(true);
    setMessage(null);

    try {
      await postJson<TagPackageResponse>(
        "/tag-packages",
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
          vehicleId: selectedVehicleId,
        }),
        { accessToken },
      );

      setCompletedSteps((current) => ({ ...current, package: true }));
      setMessage("Paket gideri başarıyla kaydedildi.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "İşlem tamamlanamadı. Lütfen tekrar deneyin.",
      );
    } finally {
      setIsSavingPackage(false);
    }
  }

  function finishOnboarding() {
    localStorage.setItem("tag.onboardingCompleted", new Date().toISOString());
    router.push("/");
  }

  function updateVehicleForm<Key extends keyof VehicleFormState>(
    key: Key,
    value: VehicleFormState[Key],
  ) {
    setVehicleForm((currentForm) => ({ ...currentForm, [key]: value }));
  }

  function updatePreferenceForm<Key extends keyof PreferenceFormState>(
    key: Key,
    value: PreferenceFormState[Key],
  ) {
    setPreferenceForm((currentForm) => ({ ...currentForm, [key]: value }));
  }

  function updatePackageForm<Key extends keyof PackageFormState>(
    key: Key,
    value: PackageFormState[Key],
  ) {
    setPackageForm((currentForm) => ({ ...currentForm, [key]: value }));
  }

  if (!accessToken && !isLoading) {
    return (
      <section className="panel empty-state-panel">
        <p className="eyebrow">Oturum gerekli</p>
        <h2>Kurulum akışıni başlatmak için giriş yap.</h2>
        <p>
          Hesap oluşturduktan sonra araç ve finans ayarlarini burada
          tamamlayabilirsin.
        </p>
        <Link className="primary-button" href="/login">
          Giriş yap
        </Link>
      </section>
    );
  }

  return (
    <section className="onboarding-page">
      <section className="panel onboarding-hero">
        <div>
          <p className="eyebrow">İlk kurulum</p>
          <h2>Net kâr motorunu kullanmadan önce 3 temel bilgiyi tamamla.</h2>
          <p>
            Araç, hedef ve paket bilgisi tamamlandığında ana panel günlük net
            kâr, km başı kâr ve başabaş durumunu anlamlı hesaplar.
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

      <section className="onboarding-steps" aria-label="Kurulum adımları">
        <StepCard
          description="Yakıt ve km hesapları için zorunlu."
          done={completedSteps.vehicle}
          icon={Car}
          label="Araç"
        />
        <StepCard
          description="Hedef, amortisman ve sabit gider dağıtımı."
          done={completedSteps.preferences}
          icon={Target}
          label="Finans"
        />
        <StepCard
          description="Paket payı ve başabaş için opsiyonel."
          done={completedSteps.package}
          icon={Package}
          label="Paket"
        />
      </section>

      <section className="onboarding-grid">
        <form className="panel data-form" onSubmit={handleVehicleSubmit}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">1. Adım</p>
              <h2>Aracını tanımla</h2>
            </div>
            <Fuel aria-hidden="true" className="panel-icon" />
          </div>

          {vehicles.length > 0 ? (
            <label>
              Mevcut araç
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
                  updateVehicleForm("plateNumber", event.target.value)
                }
                placeholder="34 ABC 123"
                required={vehicles.length === 0}
                value={vehicleForm.plateNumber}
              />
            </label>

            <label>
              Yakıt tipi
              <select
                onChange={(event) =>
                  updateVehicleForm("fuelType", event.target.value as FuelType)
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
              Ortalama tüketim
              <input
                inputMode="decimal"
                onChange={(event) =>
                  updateVehicleForm("averageConsumption", event.target.value)
                }
                placeholder="7.50"
                required={vehicles.length === 0}
                value={vehicleForm.averageConsumption}
              />
            </label>

            <label>
              Km sayacı
              <input
                inputMode="decimal"
                onChange={(event) =>
                  updateVehicleForm("odometerKm", event.target.value)
                }
                placeholder="85000"
                value={vehicleForm.odometerKm}
              />
            </label>

            <label>
              Marka
              <input
                onChange={(event) =>
                  updateVehicleForm("brand", event.target.value)
                }
                placeholder="Toyota"
                value={vehicleForm.brand}
              />
            </label>

            <label>
              Model
              <input
                onChange={(event) =>
                  updateVehicleForm("model", event.target.value)
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
                updateVehicleForm("depreciationEnabled", event.target.checked)
              }
              type="checkbox"
            />
            Araç amortismanını şimdiden tanımla
          </label>

          {vehicleForm.depreciationEnabled ? (
            <div className="form-grid">
              <label>
                Amortisman modeli
                <select
                  onChange={(event) =>
                    updateVehicleForm(
                      "depreciationModel",
                      event.target.value as DepreciationModel,
                    )
                  }
                  value={vehicleForm.depreciationModel}
                >
                  <option value="PER_KM">Km bazlı</option>
                  <option value="MONTHLY">Aylık</option>
                </select>
              </label>

              <label>
                Yıllık değer kaybı
                <input
                  inputMode="decimal"
                  onChange={(event) =>
                    updateVehicleForm(
                      "annualDepreciationAmount",
                      event.target.value,
                    )
                  }
                  placeholder="60000"
                  value={vehicleForm.annualDepreciationAmount}
                />
              </label>

              <label>
                Yıllık tahmini km
                <input
                  inputMode="decimal"
                  onChange={(event) =>
                    updateVehicleForm("annualEstimatedKm", event.target.value)
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
            {isSavingVehicle ? "Kaydediliyor" : "Aracı kaydet"}
          </button>
        </form>

        <form className="panel data-form" onSubmit={handlePreferenceSubmit}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">2. Adım</p>
              <h2>Finans tercihleri</h2>
            </div>
            <Calculator aria-hidden="true" className="panel-icon" />
          </div>

          <label>
            Varsayılan araç
            <select
              disabled={vehicles.length === 0}
              onChange={(event) => setSelectedVehicleId(event.target.value)}
              required
              value={selectedVehicleId}
            >
              <option value="">Araç seç</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {formatVehicleLabel(vehicle)}
                </option>
              ))}
            </select>
          </label>

          <div className="form-grid">
            <label>
              Günlük net kâr hedefi
              <input
                inputMode="decimal"
                onChange={(event) =>
                  updatePreferenceForm(
                    "dailyTargetNetProfit",
                    event.target.value,
                  )
                }
                placeholder="1500"
                value={preferenceForm.dailyTargetNetProfit}
              />
            </label>

            <label>
              Sabit gider dağıtımı
              <select
                onChange={(event) =>
                  updatePreferenceForm(
                    "fixedCostAllocationMethod",
                    event.target.value as FixedCostAllocationMethod,
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

          <button
            className="primary-button"
            disabled={isSavingPreferences || vehicles.length === 0}
          >
            {isSavingPreferences ? "Kaydediliyor" : "Tercihleri kaydet"}
          </button>
        </form>

        <form className="panel data-form" onSubmit={handlePackageSubmit}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">3. Adım</p>
              <h2>Paket gideri</h2>
            </div>
            <Package aria-hidden="true" className="panel-icon" />
          </div>

          <p className="form-message">
            Paket kullanmıyorsan tutarı boş bırakıp bu adımı atlayabilirsin.
          </p>

          <div className="form-grid">
            <label>
              Paket adı
              <input
                onChange={(event) =>
                  updatePackageForm("name", event.target.value)
                }
                value={packageForm.name}
              />
            </label>

            <label>
              Paket tutarı
              <input
                inputMode="decimal"
                onChange={(event) =>
                  updatePackageForm("amount", event.target.value)
                }
                placeholder="700"
                value={packageForm.amount}
              />
            </label>

            <label>
              Başlangıç
              <input
                onChange={(event) =>
                  updatePackageForm("startsAt", event.target.value)
                }
                type="date"
                value={packageForm.startsAt}
              />
            </label>

            <label>
              Bitiş
              <input
                onChange={(event) =>
                  updatePackageForm("endsAt", event.target.value)
                }
                type="date"
                value={packageForm.endsAt}
              />
            </label>

            <label>
              Gün sayısı
              <input
                inputMode="numeric"
                onChange={(event) =>
                  updatePackageForm("durationDays", event.target.value)
                }
                value={packageForm.durationDays}
              />
            </label>

            <label>
              Dağıtım
              <select
                onChange={(event) =>
                  updatePackageForm(
                    "allocationMethod",
                    event.target.value as PackageAllocationMethod,
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
              Başabaş hedefi
              <input
                inputMode="decimal"
                onChange={(event) =>
                  updatePackageForm("breakEvenTarget", event.target.value)
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
            {isSavingPackage ? "Kaydediliyor" : "Paketi kaydet veya atla"}
          </button>
        </form>
      </section>

      <section className="panel onboarding-finish">
        <div>
          <p className="eyebrow">Kurulum sonucu</p>
          <h2>
            {selectedVehicle
              ? `${selectedVehicle.plateNumber} için hesaplama hazır.`
              : "Araç seçildiğinde hesaplama hazır olacak."}
          </h2>
          <p>
            Eksik kalan giderleri daha sonra sabit gider, yakıt ve bakım
            ekranlarından tamamlayabilirsin.
          </p>
        </div>
        <button
          className="primary-button"
          disabled={!completedSteps.vehicle || !completedSteps.preferences}
          onClick={finishOnboarding}
          type="button"
        >
          Ana panele geç
        </button>
      </section>
    </section>
  );
}

function StepCard({
  description,
  done,
  icon: Icon,
  label,
}: {
  description: string;
  done: boolean;
  icon: typeof Car;
  label: string;
}) {
  return (
    <article className={done ? "onboarding-step done" : "onboarding-step"}>
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
  const name = [vehicle.brand, vehicle.model].filter(Boolean).join(" ");

  return name ? `${vehicle.plateNumber} - ${name}` : vehicle.plateNumber;
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

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00.000Z`);

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === "number") {
    return value;
  }
  const parsed = parseFloat(String(value).replace(",", "."));
  return isNaN(parsed) ? 0 : parsed;
}
