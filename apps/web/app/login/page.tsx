'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { AuthResponse, postJson } from '../../lib/api-client';
import { persistAuthSession } from '../../lib/auth-storage';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    try {
      const response = await postJson<AuthResponse>('/auth/login', {
        email,
        password,
        deviceName: 'Web Panel'
      });

      persistAuthSession(response);
      router.push('/');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Giris yapilamadi.');
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
          <h1>Hesabina giris yap</h1>
          <p>
            Gunluk net karini, paket kirilimini ve arac maliyetini tek panelden
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
              placeholder="surucu@example.com"
              required
              type="email"
              value={email}
            />
          </label>

          <label>
            Sifre
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
          </label>

          {message ? <p className="form-alert">{message}</p> : null}

          <button className="primary-button full-width" disabled={isSubmitting}>
            {isSubmitting ? 'Giris yapiliyor' : 'Giris Yap'}
          </button>
        </form>

        <p className="auth-switch">
          Hesabin yok mu? <Link href="/register">Kayit ol</Link>
        </p>
      </section>

      <aside className="auth-aside">
        <div>
          <p className="eyebrow">Gercek kar motoru</p>
          <h2>Brut geliri kar sanma.</h2>
          <p>
            Yakit, paket, sabit gider, bakim ve amortisman payini duserek sefer
            bazli net sonucu gor.
          </p>
        </div>
      </aside>
    </main>
  );
}
