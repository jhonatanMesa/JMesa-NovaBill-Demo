'use client';
import { useState } from 'react';
import { ArrowRight, Boxes, ShieldCheck, ChartNoAxesCombined } from 'lucide-react';
import { api, User } from '../lib/api';
import { Field } from './ui';
export function Auth({ onLogin }: { onLogin: (u: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register' | 'recovery'>('login');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const result = await api<User & { message: string }>(`auth/${mode}`, 'POST', data);
      if (mode === 'recovery') setMessage(result.message);
      else onLogin(result);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-shell">
      <section className="auth-story">
        <a className="brand" href="/">
          <span className="brand-icon">N</span>NovaBill<span className="demo-tag">DEMO</span>
        </a>
        <div>
          <span className="eyebrow">TU OPERACIÓN, EN PERSPECTIVA</span>
          <h1>
            Menos hojas de cálculo.
            <br />
            <em>Más claridad.</em>
          </h1>
          <p>
            Clientes, inventario y ventas en un espacio conectado. Explora una experiencia de
            gestión empresarial con datos completamente ficticios.
          </p>
          <div className="story-features">
            <span>
              <Boxes /> Inventario conectado
            </span>
            <span>
              <ChartNoAxesCombined /> Decisiones con datos
            </span>
            <span>
              <ShieldCheck /> Espacios por empresa
            </span>
          </div>
        </div>
        <small>Proyecto de portafolio · Next.js + NestJS + PostgreSQL</small>
      </section>
      <section className="auth-form">
        <div className="auth-card">
          <span className="eyebrow">BIENVENIDO A NOVABILL</span>
          <h2>
            {mode === 'login'
              ? 'Tu negocio, en un vistazo'
              : mode === 'register'
                ? 'Crea tu espacio demo'
                : 'Recuperación simulada'}
          </h2>
          <p className="muted">
            {mode === 'login'
              ? 'Ingresa para explorar la empresa de demostración.'
              : mode === 'register'
                ? 'Utiliza únicamente nombres y datos ficticios.'
                : 'Esta demo no envía correos ni cambia contraseñas.'}
          </p>
          <form onSubmit={submit}>
            {mode === 'register' && (
              <>
                <Field label="Nombre ficticio">
                  <input name="name" required minLength={2} maxLength={100} />
                </Field>
                <Field label="Empresa ficticia">
                  <input name="organizationName" required minLength={2} maxLength={120} />
                </Field>
              </>
            )}
            <Field label="Correo electrónico">
              <input
                name="email"
                type="email"
                autoComplete="username"
                defaultValue={mode === 'login' ? 'admin@novabill.demo' : ''}
                required
              />
            </Field>
            {mode !== 'recovery' && (
              <Field label="Contraseña">
                <input
                  name="password"
                  type="password"
                  minLength={8}
                  maxLength={128}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  defaultValue={mode === 'login' ? 'Demo1234!' : ''}
                  required
                />
              </Field>
            )}
            {message && (
              <div role="alert" className="notice">
                {message}
              </div>
            )}
            <button className="primary full" disabled={busy}>
              {busy
                ? 'Procesando…'
                : mode === 'login'
                  ? 'Entrar a la demo'
                  : mode === 'register'
                    ? 'Crear empresa demo'
                    : 'Simular recuperación'}
              <ArrowRight size={18} />
            </button>
          </form>
          <div className="auth-links">
            <button
              onClick={() => {
                setMode(mode === 'register' ? 'login' : 'register');
                setMessage('');
              }}
            >
              {mode === 'register' ? 'Volver al ingreso' : 'Crear una empresa demo'}
            </button>
            <button
              onClick={() => {
                setMode(mode === 'recovery' ? 'login' : 'recovery');
                setMessage('');
              }}
            >
              {mode === 'recovery' ? 'Volver al ingreso' : 'Olvidé mi contraseña'}
            </button>
          </div>
          <div className="demo-note">
            <strong>Un entorno para explorar</strong>
            <p>
              Las credenciales precargadas son públicas. No ingreses información real ni
              confidencial.
            </p>
          </div>
          <p className="legal">
            Demo comercial. No constituye facturación electrónica válida ante la DIAN.
          </p>
        </div>
      </section>
    </main>
  );
}
