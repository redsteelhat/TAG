"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthResponse, postJson } from "../../lib/api-client";
import { persistAuthSession } from "../../lib/auth-storage";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [failedAttemptCount, setFailedAttemptCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!isEmailValid(email)) {
      setMessage("Geçerli bir e-posta adresi gir.");
      return;
    }

    if (password.length < 8) {
      setMessage("Şifre en az 8 karakter olmalı.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await postJson<AuthResponse>("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
        deviceName: "Web Panel",
      });

      persistAuthSession(response);
      setFailedAttemptCount(0);
      router.push("/");
    } catch (error) {
      setFailedAttemptCount((currentCount) => currentCount + 1);
      setMessage(toLoginErrorMessage(error));
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
          <p className="eyebrow">Web panel</p>
          <h1>Hesabına giriş yap</h1>
          <p>
            Günlük net kârını, paket kırılımını ve araç maliyetini tek panelden
            takip et.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
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
            Şifre
            <input
              autoComplete="current-password"
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

          <div className="auth-form-meta">
            <Link href="mailto:destek@tagfinans.app?subject=Şifre sıfırlama talebi">
              Şifremi unuttum
            </Link>
          </div>

          {failedAttemptCount >= 3 ? (
            <p className="form-hint warning">
              Çok fazla hatalı deneme hesabını geçici olarak kısıtlayabilir.
              Birkaç dakika bekleyip tekrar dene.
            </p>
          ) : null}

          {message ? <p className="form-alert">{message}</p> : null}

          <button className="primary-button full-width" disabled={isSubmitting}>
            {isSubmitting ? "Giriş yapılıyor" : "Giriş Yap"}
          </button>
        </form>

        <p className="auth-switch">
          Hesabın yok mu? <Link href="/register">Kayıt ol</Link>
        </p>
      </section>

      <aside className="auth-aside">
        <div>
          <p className="eyebrow">Gerçek kâr motoru</p>
          <h2>Brüt geliri kâr sanma.</h2>
          <p>
            Yakıt, paket, sabit gider, bakım ve amortisman payını düşerek sefer
            bazlı net sonucu gör.
          </p>
        </div>
      </aside>
    </main>
  );
}

function isEmailValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function toLoginErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (/too many|rate|throttle/i.test(message)) {
    return "Çok fazla giriş denemesi yapıldı. Lütfen kısa bir süre sonra tekrar dene.";
  }

  if (/invalid|unauthorized|password|email/i.test(message)) {
    return "E-posta veya şifre hatalı.";
  }

  return "Giriş yapılamadı. Bilgilerini kontrol edip tekrar dene.";
}
