'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        router.push('/admin/dashboard');
      } else {
        const data = await res.json();
        setError(data.error ?? 'Login gagal');
      }
    } catch {
      setError('Tidak dapat terhubung ke server');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0A3D2E; }

        .login-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0A3D2E;
          background-image:
            radial-gradient(ellipse at 20% 50%, rgba(201,168,76,0.08) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 20%, rgba(201,168,76,0.06) 0%, transparent 50%);
          padding: 24px;
        }

        .login-card {
          background: #FFFDF7;
          border-radius: 16px;
          padding: 48px 40px;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.35), 0 0 0 1px rgba(201,168,76,0.2);
        }

        .login-logo {
          text-align: center;
          margin-bottom: 8px;
          font-family: 'Cinzel', serif;
          font-size: 22px;
          font-weight: 700;
          color: #0A3D2E;
          letter-spacing: 2px;
        }

        .login-subtitle {
          text-align: center;
          margin-bottom: 36px;
          font-family: 'Lora', Georgia, serif;
          font-size: 13px;
          color: #7A8C7E;
          font-style: italic;
        }

        .divider {
          width: 60px;
          height: 2px;
          background: linear-gradient(90deg, transparent, #C9A84C, transparent);
          margin: 0 auto 32px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          margin-bottom: 7px;
          font-family: 'Cinzel', serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1.5px;
          color: #3A5A47;
          text-transform: uppercase;
        }

        .form-input {
          width: 100%;
          padding: 12px 16px;
          border: 1.5px solid #D4C5A5;
          border-radius: 8px;
          font-family: 'Lora', Georgia, serif;
          font-size: 15px;
          color: #1A2E22;
          background: #FAFAF5;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .form-input:focus {
          border-color: #C9A84C;
          box-shadow: 0 0 0 3px rgba(201,168,76,0.15);
          background: #FFFFFF;
        }

        .form-input::placeholder {
          color: #B0B8B2;
        }

        .error-msg {
          background: #FFF0F0;
          border: 1px solid #FFCDD2;
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 20px;
          font-family: 'Lora', Georgia, serif;
          font-size: 13px;
          color: #C62828;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-login {
          width: 100%;
          padding: 14px;
          background: #C9A84C;
          color: #0A3D2E;
          border: none;
          border-radius: 8px;
          font-family: 'Cinzel', serif;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 2px;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
          box-shadow: 0 4px 12px rgba(201,168,76,0.35);
          margin-top: 4px;
        }

        .btn-login:hover:not(:disabled) {
          background: #D4B45A;
          box-shadow: 0 6px 16px rgba(201,168,76,0.45);
        }

        .btn-login:active:not(:disabled) {
          transform: translateY(1px);
        }

        .btn-login:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(10,61,46,0.3);
          border-top-color: #0A3D2E;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          vertical-align: middle;
          margin-right: 8px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .login-footer {
          text-align: center;
          margin-top: 28px;
          font-family: 'Lora', Georgia, serif;
          font-size: 12px;
          color: #9A9E9B;
          font-style: italic;
        }
      `}</style>

      <div className="login-wrapper">
        <div className="login-card">
          <div className="login-logo">✦ Admin Panel ✦</div>
          <p className="login-subtitle">Pendidikan Timur Tengah</p>
          <div className="divider" />

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="error-msg">
                <span>⚠</span>
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <input
                id="username"
                className="form-input"
                type="text"
                placeholder="Masukkan username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                className="form-input"
                type="password"
                placeholder="Masukkan password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button className="btn-login" type="submit" disabled={loading}>
              {loading && <span className="spinner" />}
              {loading ? 'Memverifikasi...' : 'MASUK'}
            </button>
          </form>

          <p className="login-footer">Akses terbatas untuk admin yang berwenang</p>
        </div>
      </div>
    </>
  );
}
