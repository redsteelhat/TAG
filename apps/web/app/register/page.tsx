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
      router.push('/');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kayit olusturulamadi.');
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
          <p className="eyebrow">Ilk kurulum</p>
          <h1>Surucu hesabini olustur</h1>
          <p>
            Aracini, yakit tuketimini ve paket giderini tanimlayarak gercek net
            kar takibine basla.
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
              placeholder="surucu@example.com"
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
            Sifre
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
            {isSubmitting ? 'Hesap olusturuluyor' : 'Kayit Ol'}
          </button>
        </form>

        <p className="auth-switch">
          Zaten hesabin var mi? <Link href="/login">Giris yap</Link>
        </p>
      </section>

      <aside className="auth-aside">
        <div>
          <p className="eyebrow">10 saniyelik kayit akisi</p>
          <h2>Once hesap, sonra arac profili.</h2>
          <p>
            MVP akisi kayit, arac tanimi, yakit varsayimi ve paket gideri ile
            baslayacak sekilde hazirlandi.
          </p>
        </div>
      </aside>
    </main>
  );
}
