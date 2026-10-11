import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HeartPulse, Menu, X, UserRound, Stethoscope, ShieldCheck, LogOut, ChevronDown } from 'lucide-react';
import type { AuthUser } from '../types';
import { RoleSelectModal } from './RoleSelectModal';

interface NavbarProps {
  authUser: AuthUser | null;
  onSignOut: () => Promise<void>;
}

export function Navbar({ authUser, onSignOut }: NavbarProps) {
  const nav = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modalType, setModalType] = useState<'login' | 'signup' | null>(null);

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const getDashboardPath = () => {
    if (!authUser) return '/login';
    if (authUser.role === 'admin') return '/admin';
    if (authUser.role === 'provider') return '/doctor/dashboard';
    return '/dashboard';
  };

  const getDashboardLabel = () => {
    if (!authUser) return 'Dashboard';
    if (authUser.role === 'admin') return 'Admin Console';
    if (authUser.role === 'provider') return 'Doctor Portal';
    return 'My Dashboard';
  };

  const getRoleBadge = () => {
    if (!authUser) return null;
    if (authUser.role === 'admin') {
      return (
        <span className="nav-role-badge admin">
          <ShieldCheck size={12} /> Admin
        </span>
      );
    }
    if (authUser.role === 'provider') {
      return (
        <span className="nav-role-badge doctor">
          <Stethoscope size={12} /> Doctor
        </span>
      );
    }
    return (
      <span className="nav-role-badge patient">
        <UserRound size={12} /> Patient
      </span>
    );
  };

  return (
    <>
      <header className="nav">
        {/* Brand */}
        <button className="brand" onClick={() => nav('/')} aria-label="MedQueue Home">
          <span className="logo">
            <HeartPulse size={18} />
            <span className="path-line" />
          </span>
          <b>MEDQUEUE</b>
        </button>

        {/* Mobile Menu Button */}
        <button
          className="mobile-menu"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Desktop Left-Side Nav (Informational links only - NO duplicate login/signup links!) */}
        <nav className={`main-nav-links ${mobileMenuOpen ? 'open' : ''}`}>
          <button
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
            onClick={() => {
              nav('/');
              setMobileMenuOpen(false);
            }}
          >
            Home
          </button>
          <button
            className={`nav-link ${isActive('/find') || isActive('/doctors') ? 'active' : ''}`}
            onClick={() => {
              nav('/find');
              setMobileMenuOpen(false);
            }}
          >
            Find Doctors
          </button>
          <button
            className={`nav-link ${isActive('/hospitals') ? 'active' : ''}`}
            onClick={() => {
              nav('/hospitals');
              setMobileMenuOpen(false);
            }}
          >
            Hospitals & Clinics
          </button>
          <button
            className={`nav-link ${isActive('/how') ? 'active' : ''}`}
            onClick={() => {
              nav('/how');
              setMobileMenuOpen(false);
            }}
          >
            How It Works
          </button>

          {/* Mobile view authentication items (Rendered strictly ONCE on mobile) */}
          <div className="mobile-auth-section">
            {authUser ? (
              <>
                <div className="mobile-user-card">
                  <div className="avatar">
                    {(authUser.name || 'U').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <b>{authUser.name || authUser.email}</b>
                    {getRoleBadge()}
                  </div>
                </div>
                <button
                  className="small-primary"
                  onClick={() => {
                    nav(getDashboardPath());
                    setMobileMenuOpen(false);
                  }}
                >
                  {getDashboardLabel()}
                </button>
                <button
                  className="text-btn logout"
                  onClick={async () => {
                    await onSignOut();
                    setMobileMenuOpen(false);
                  }}
                >
                  <LogOut size={16} /> Sign out
                </button>
              </>
            ) : (
              <div className="mobile-auth-buttons">
                <button
                  className="text-btn"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setModalType('login');
                  }}
                >
                  Log in
                </button>
                <button
                  className="small-primary"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setModalType('signup');
                  }}
                >
                  Create account
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Desktop Right-Side Action Controls (Single Login & Single Create Account button) */}
        <div className="nav-actions desktop-only">
          {authUser ? (
            <div className="auth-profile-pill">
              <button
                className="user-badge-btn"
                onClick={() => nav(getDashboardPath())}
                title="Go to dashboard"
              >
                <span className="avatar-mini">
                  {(authUser.name || authUser.email || 'U').slice(0, 2).toUpperCase()}
                </span>
                <span className="user-name-label">{authUser.name || authUser.email}</span>
                {getRoleBadge()}
              </button>
              <button
                className="small-primary"
                onClick={() => nav(getDashboardPath())}
              >
                {getDashboardLabel()}
              </button>
              <button
                className="logout-icon-btn"
                onClick={onSignOut}
                title="Sign out of MedQueue"
                aria-label="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <>
              <button
                className="text-btn nav-login-btn"
                onClick={() => setModalType('login')}
              >
                <span>Log in</span>
                <ChevronDown size={14} />
              </button>
              <button
                className="small-primary nav-signup-btn"
                onClick={() => setModalType('signup')}
              >
                <span>Create account</span>
                <ChevronDown size={14} />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Role Selection Modal */}
      <RoleSelectModal
        isOpen={modalType !== null}
        type={modalType || 'login'}
        onClose={() => setModalType(null)}
        onSelect={path => nav(path)}
      />
    </>
  );
}
