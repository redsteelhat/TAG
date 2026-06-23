"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { AuthResponse, postJson } from "../../lib/api-client";
import { persistAuthSession } from "../../lib/auth-storage";

const phonePattern = /^\+90 5\d{2} \d{3} \d{2} \d{2}$/;

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [kvkkAccepted, setKvkkAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [commercialConsentAccepted, setCommercialConsentAccepted] =
    useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(
    () =>
      kvkkAccepted &&
      termsAccepted &&
      fullName.trim().length >= 2 &&
      isEmailValid(email) &&
      phonePattern.test(phone.trim()) &&
      password.length >= 8,
    [email, fullName, kvkkAccepted, password, phone, termsAccepted],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const validationError = validateRegisterForm({
      email,
      fullName,
      kvkkAccepted,
      password,
      phone,
      termsAccepted,
    });

    if (validationError) {
      setMessage(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await postJson<AuthResponse>("/auth/register", {
        deviceName: "Web Panel",
        email: email.trim().toLowerCase(),
        explicitConsentAccepted: commercialConsentAccepted,
        explicitConsentVersion: commercialConsentAccepted
          ? "commercial-communication-2026-06"
          : undefined,
        fullName: fullName.trim(),
        kvkkAccepted,
        kvkkVersion: "kvkk-2026-06",
        password,
        phone: normalizePhone(phone),
        privacyNoticeVersion: "privacy-notice-2026-06",
      });

      persistAuthSession(response);
      router.push("/onboarding");
    } catch (error) {
      setMessage(toRegisterErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <Link className="auth-brand" href="/">
          <span className="brand-mark">TF</span>
          <span>TAG Finans</span>
        </Link>

        <div className="auth-heading">
          <p className="eyebrow">İlk kurulum</p>
          <h1>Sürücü hesabını oluştur</h1>
          <p>
            Aracını, yakıt tüketimini ve paket giderini tanımlayarak gerçek net
            kâr takibine başla.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Ad soyad
            <input
              autoComplete="name"
              name="fullName"
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Ali Yılmaz"
              required
              type="text"
              value={fullName}
            />
          </label>

          <label>
            E-posta
            <input
              autoComplete="email"
              inputMode="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="sürücü@example.com"
              required
              type="email"
              value={email}
            />
          </label>

          <label>
            Telefon
            <input
              autoComplete="tel"
              inputMode="tel"
              name="phone"
              onChange={(event) => setPhone(event.target.value)}
              pattern="\+90 5[0-9]{2} [0-9]{3} [0-9]{2} [0-9]{2}"
              placeholder="+90 5XX XXX XX XX"
              required
              type="tel"
              value={phone}
            />
          </label>

          <label>
            Şifre
            <input
              autoComplete="new-password"
              minLength={8}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="En az 8 karakter"
              required
              type="password"
              value={password}
            />
            <small>Şifre en az 8 karakter olmalı.</small>
          </label>

          <div className="auth-checkbox-list">
            <label className="auth-checkbox">
              <input
                checked={kvkkAccepted}
                onChange={(event) => setKvkkAccepted(event.target.checked)}
                required
                type="checkbox"
              />
              <span>KVKK aydınlatma metnini okudum ve anladım.</span>
            </label>
            <label className="auth-checkbox">
              <input
                checked={termsAccepted}
                onChange={(event) => setTermsAccepted(event.target.checked)}
                required
                type="checkbox"
              />
              <span>Kullanım şartlarını kabul ediyorum.</span>
            </label>
            <label className="auth-checkbox">
              <input
                checked={commercialConsentAccepted}
                onChange={(event) =>
                  setCommercialConsentAccepted(event.target.checked)
                }
                type="checkbox"
              />
              <span>
                Ürün güncellemeleri ve kampanyalar için ileti almak istiyorum.
              </span>
            </label>
          </div>

          {message ? <p className="form-alert">{message}</p> : null}

          <button
            className="primary-button full-width"
            disabled={isSubmitting || !canSubmit}
          >
            {isSubmitting ? "Hesap oluşturuluyor" : "Kayıt Ol"}
          </button>
        </form>

        <p className="auth-switch">
          Zaten hesabın var mı? <Link href="/login">Giriş yap</Link>
        </p>
      </section>

      <aside className="auth-aside">
        <div>
          <p className="eyebrow">10 saniyelik kayıt akışı</p>
          <h2>Önce hesap, sonra araç profili.</h2>
          <p>
            Kayıt sonrası araç tanımı, yakıt varsayımı ve çalışma paketi
            adımlarıyla net kâr takibine geçersin.
          </p>
        </div>
      </aside>
    </main>
  );
}

function validateRegisterForm(input: {
  email: string;
  fullName: string;
  kvkkAccepted: boolean;
  password: string;
  phone: string;
  termsAccepted: boolean;
}) {
  if (input.fullName.trim().length < 2) {
    return "Ad soyad zorunlu.";
  }

  if (!isEmailValid(input.email)) {
    return "Geçerli bir e-posta adresi gir.";
  }

  if (!phonePattern.test(input.phone.trim())) {
    return "Telefon formatı +90 5XX XXX XX XX olmalı.";
  }

  if (input.password.length < 8) {
    return "Şifre en az 8 karakter olmalı.";
  }

  if (!input.kvkkAccepted) {
    return "KVKK aydınlatma metni onayı zorunlu.";
  }

  if (!input.termsAccepted) {
    return "Kullanım şartları onayı zorunlu.";
  }

  return null;
}

function isEmailValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function normalizePhone(value: string) {
  return value.replace(/\s+/g, "");
}

function toRegisterErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (/already|registered|exists|unique/i.test(message)) {
    return "Bu e-posta veya telefon ile kayıtlı bir hesap var.";
  }

  if (/kvkk|privacy|consent/i.test(message)) {
    return "KVKK ve aydınlatma metni onayı olmadan kayıt oluşturulamaz.";
  }

  if (/phone/i.test(message)) {
    return "Telefon numarası geçerli Türkiye formatında olmalı.";
  }

  if (/too many|rate|throttle/i.test(message)) {
    return "Çok fazla deneme yapıldı. Lütfen kısa bir süre sonra tekrar dene.";
  }

  return "Kayıt oluşturulamadı. Bilgilerini kontrol edip tekrar dene.";
}
