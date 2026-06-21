'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { AuthResponse, postJson } from '../../lib/api-client';
import { persistAuthSession } from '../../lib/auth-storage';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    try {
      const response = await postJson<AuthResponse>('/auth/register', {
        fullName: fullName || undefined,
        email,
        phone: phone || undefined,
        password,
        deviceName: 'Web Panel'
      });

      persistAuthSession(response);
      router.push('/onboarding');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Kayıt oluşturulamadı.'
      );
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
          <h1>Sürücü hesabıni oluştur</h1>
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
              placeholder="Ali Yilmaz"
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
              placeholder="+905551112233"
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
          </label>

          {message ? <p className="form-alert">{message}</p> : null}

          <button className="primary-button full-width" disabled={isSubmitting}>
            {isSubmitting ? 'Hesap oluşturuluyor' : 'Kayıt Ol'}
          </button>
        </form>

        <p className="auth-switch">
          Zaten hesabın var mi? <Link href="/login">Giriş yap</Link>
        </p>
      </section>

      <aside className="auth-aside">
        <div>
          <p className="eyebrow">10 saniyelik kayıt akışı</p>
          <h2>Önce hesap, sonra araç profili.</h2>
          <p>
            MVP akışı kayıt, araç tanımi, yakıt varsayimi ve paket gideri ile
            başlayacak sekilde hazırlandi.
          </p>
        </div>
      </aside>
    </main>
  );
}
