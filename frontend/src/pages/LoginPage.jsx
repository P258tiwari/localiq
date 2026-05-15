import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail]       = useState('admin@ampwake.com');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState({});
  const { login } = useAuthStore();
  const navigate  = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!email.trim())    errs.email    = 'Email is required';
    if (!password.trim()) errs.password = 'Password is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.error || 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-app)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(108,62,244,0.12) 0%, transparent 60%)',
      }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 0 32px rgba(108,62,244,0.4)',
          }}>
            <LayoutDashboard size={24} color="#fff" />
          </div>
          <h1 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 32, color: 'var(--text-primary)', marginBottom: 6 }}>
            LocalIQ
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            GMB Client Management — Ampwake Agency
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 32,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            Sign in to your account
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 28 }}>
            Use your Ampwake credentials
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="field">
              <label className="label">Email address</label>
              <input
                type="email"
                className={`input ${errors.email ? 'input-error' : ''}`}
                value={email}
                onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })); }}
                placeholder="admin@ampwake.com"
                autoComplete="email"
              />
              {errors.email && <div className="field-error" style={{ fontSize: 11 }}>⚠ {errors.email}</div>}
            </div>

            <div className="field">
              <label className="label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  className={`input ${errors.password ? 'input-error' : ''}`}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })); }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)',
                  }}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <div className="field-error" style={{ fontSize: 11 }}>⚠ {errors.password}</div>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', height: 44, fontSize: 15, marginTop: 4 }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          <div style={{
            marginTop: 24, padding: 14,
            background: 'var(--accent-light)',
            border: '1px solid rgba(108,62,244,0.2)',
            borderRadius: 8,
          }}>
            <div style={{ fontSize: 12, color: 'var(--accent-text)', fontWeight: 500, marginBottom: 4 }}>
              Demo credentials
            </div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text-secondary)' }}>
              admin@ampwake.com / Ampwake@2525
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--text-muted)' }}>
          © 2025 Ampwake · All rights reserved
        </p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
