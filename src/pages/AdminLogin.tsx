import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, LockKeyhole, Mail, ArrowRight, ArrowLeft, Eye, EyeOff, AlertCircle, HelpCircle } from 'lucide-react';
import { signInAsAdmin } from '../lib/auth';
import type { AuthUser } from '../types';

interface AdminLoginProps {
  onAdminAuth: (user: AuthUser) => void;
}

export function AdminLogin({ onAdminAuth }: AdminLoginProps) {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showSetupHelp, setShowSetupHelp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter a valid administrator email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    setBusy(true);
    try {
      const { user, profile } = await signInAsAdmin(email.trim(), password);
      const authObj: AuthUser = {
        id: user.id,
        name: profile?.full_name || user.user_metadata?.full_name || 'System Administrator',
        email: user.email || email.trim(),
        role: 'admin',
        isSuspended: false,
      };
      onAdminAuth(authObj);
      nav('/admin');
    } catch (err: any) {
      console.error('Admin authentication failure:', err);
      setError(err?.message || 'Administrator authentication failed. Verify credentials and permissions.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-container">
        <div className="admin-login-card">
          <div className="admin-badge-head">
            <span className="admin-shield-icon">
              <ShieldCheck size={26} />
            </span>
            <span className="admin-security-tag">RESTRICTED CONSOLE</span>
          </div>

          <p className="eyebrow plain">MEDQUEUE SYSTEM ADMINISTRATION</p>
          <h1>Administrator Sign In</h1>
          <p className="admin-login-sub">
            Authorized personnel only. Access to credentialing, platform records, and system audit logs.
          </p>

          <form onSubmit={handleSubmit} className="admin-login-form">
            <label className="auth-field">
              <span>Administrator Email</span>
              <div>
                <Mail size={17} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@medqueue.example"
                  autoComplete="email"
                  required
                />
              </div>
            </label>

            <label className="auth-field">
              <span>Security Password</span>
              <div>
                <LockKeyhole size={17} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  autoComplete="current-password"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>

            {error && (
              <div className="auth-error admin-error-box" role="alert">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button className="primary auth-submit admin-btn" type="submit" disabled={busy}>
              {busy ? 'Authenticating Privileges…' : 'Authenticate as Administrator'}{' '}
              <ArrowRight size={17} />
            </button>
          </form>

          <div className="admin-setup-toggle">
            <button
              type="button"
              className="text-link-help"
              onClick={() => setShowSetupHelp(!showSetupHelp)}
            >
              <HelpCircle size={14} />
              <span>How are administrator accounts created?</span>
            </button>
          </div>

          {showSetupHelp && (
            <div className="admin-setup-instructions">
              <h4>First Administrator Provisioning</h4>
              <p>
                In compliance with security standards, public administrator registration is disabled. To provision the initial administrator:
              </p>
              <ol>
                <li>Register a user account through standard signup.</li>
                <li>Open the <strong>Supabase SQL Editor</strong> for this project.</li>
                <li>
                  Execute:
                  <code>select public.promote_to_admin('your-email@example.com');</code>
                </li>
                <li>Return here to sign in with that administrator account.</li>
              </ol>
            </div>
          )}

          <div className="admin-card-footer">
            <button className="back-link" onClick={() => nav('/')}>
              <ArrowLeft size={14} /> Return to MedQueue Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
