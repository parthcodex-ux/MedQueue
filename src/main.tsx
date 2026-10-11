import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  MapPin,
  HeartPulse,
  ArrowRight,
  Clock,
  Star,
  Check,
  ChevronRight,
  Hospital,
  UserRound,
  CalendarDays,
  SlidersHorizontal,
  Phone,
  Home,
  Stethoscope,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import { doctors, hospitals, Doctor } from './data/data';
import './styles.css';
import { signUpWithEmail, signInWithEmail, getSession, signOut, requestPasswordReset, updatePassword } from './lib/auth';
import { requireSupabase } from './lib/supabase';
import type { AuthUser } from './types';
import { Navbar } from './components/Navbar';
import { ToastProvider } from './components/Toast';
import { AdminLogin } from './pages/AdminLogin';
import { AdminDashboard } from './pages/AdminDashboard';

type Booking = {
  id: string;
  doctorId: string;
  patientName: string;
  age: number;
  phone: string;
  email: string;
  reason: string;
  slot: string;
  date: string;
  status: 'Pending' | 'Confirmed' | 'Cancelled';
  createdAt: string;
  doctorName?: string;
  specialty?: string;
  hospitalName?: string;
  location?: string;
  patientId?: string;
};

const ACTIVE_USER_KEY = 'carepath.demoUser.v1';
const SELECTED_KEY = 'carepath.selectedDoctor.v1';

function mapBooking(row: any): Booking {
  return {
    id: row.id,
    doctorId: row.doctor_id,
    patientName: row.patient_name,
    age: row.patient_age,
    phone: row.patient_phone,
    email: row.patient_email,
    reason: row.reason || '',
    slot: row.slot,
    date: row.appointment_date,
    status: row.status,
    createdAt: row.created_at,
    doctorName: row.doctor_name,
    specialty: row.specialty,
    hospitalName: row.hospital_name,
    location: row.location,
    patientId: row.patient_id,
  };
}

function App() {
  const nav = useNavigate();
  const loc = useLocation();
  const [query, setQuery] = useState(new URLSearchParams(loc.search).get('specialty') || '');
  const [place, setPlace] = useState(new URLSearchParams(loc.search).get('location') || 'Noida, Uttar Pradesh');
  const [selected, setSelected] = useState<Doctor | null>(
    () => doctors.find(d => d.id === localStorage.getItem(SELECTED_KEY)) || null
  );
  const [slot, setSlot] = useState('');
  const [filter, setFilter] = useState('All');
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(ACTIVE_USER_KEY) || 'null');
    } catch {
      return null;
    }
  });
  const [bookings, setBookings] = useState<Booking[]>([]);

  const refreshBookings = async () => {
    try {
      const client = requireSupabase();
      const { data, error } = await client
        .from('appointments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setBookings((data || []).map(mapBooking));
    } catch (e) {
      console.error('Could not load appointments from Supabase', e);
      setBookings([]);
    }
  };

  const updateBooking = async (id: string, status: Booking['status']) => {
    try {
      const { error } = await requireSupabase().from('appointments').update({ status }).eq('id', id);
      if (error) throw error;
      await refreshBookings();
    } catch (e: any) {
      window.alert(e?.message || 'Could not update this appointment. Check your permissions.');
    }
  };

  const search = (q = query, p = place) => {
    setQuery(q);
    setPlace(p);
    nav(`/results?specialty=${encodeURIComponent(q)}&location=${encodeURIComponent(p)}`);
  };

  const chooseDoctor = (d: Doctor) => {
    setSelected(d);
    localStorage.setItem(SELECTED_KEY, d.id);
  };

  const openDoctor = (d: Doctor) => {
    chooseDoctor(d);
    setSlot('');
    nav('/doctor/' + d.id);
  };

  const startBooking = (d: Doctor) => {
    chooseDoctor(d);
    setSlot(d.slots.find(s => !bookings.some(b => b.doctorId === d.id && b.slot === s && b.status !== 'Cancelled')) || '');
    nav(authUser ? '/booking' : '/login');
  };

  const createBooking = async (details: any) => {
    try {
      const client = requireSupabase();
      const {
        data: { user },
        error: userError,
      } = await client.auth.getUser();
      if (userError) throw userError;
      if (!user) return { ok: false as const, error: 'Please log in before booking an appointment.' };
      const d = doctors.find(x => x.id === details.doctorId);
      if (!d) return { ok: false as const, error: 'Please choose a valid doctor.' };
      const payload = {
        patient_id: user.id,
        doctor_id: d.id,
        doctor_name: d.name,
        specialty: d.specialty,
        hospital_name: d.hospital,
        location: d.location,
        patient_name: details.patientName,
        patient_age: details.age,
        patient_phone: details.phone,
        patient_email: details.email,
        reason: details.reason,
        appointment_date: details.date,
        slot: details.slot,
        status: 'Pending',
      };
      const { data, error } = await client.from('appointments').insert(payload).select('*').single();
      if (error) {
        if (error.code === '23505')
          return { ok: false as const, error: 'That appointment slot has just been taken. Please choose another time.' };
        throw error;
      }
      const record = mapBooking(data);
      setBookings(prev => [record, ...prev]);
      return { ok: true as const, booking: record };
    } catch (e: any) {
      return { ok: false as const, error: e?.message || 'Could not save the appointment. Please try again.' };
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (e) {
      console.error(e);
    }
    setAuthUser(null);
    localStorage.removeItem(ACTIVE_USER_KEY);
    nav('/');
  };

  const page = loc.pathname;
  const doctorId = page.startsWith('/doctor/') ? page.split('/')[2] : null;
  const current = (doctorId ? doctors.find(d => d.id === doctorId) : null) || selected || doctors[0];

  // Session restoration
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await getSession();
        if (!active) return;
        if (!session?.user) {
          setAuthUser(null);
          localStorage.removeItem(ACTIVE_USER_KEY);
          return;
        }
        const user = session.user;
        let profile: any = null;
        try {
          const { data } = await requireSupabase()
            .from('profiles')
            .select('full_name, role, is_suspended')
            .eq('id', user.id)
            .maybeSingle();
          profile = data;
        } catch {}
        if (!active) return;

        if (profile?.is_suspended) {
          try {
            await signOut();
          } catch {}
          setAuthUser(null);
          localStorage.removeItem(ACTIVE_USER_KEY);
          window.alert('Your account is currently suspended. Please contact platform administration.');
          return;
        }

        const u: AuthUser = {
          id: user.id,
          name: profile?.full_name || user.user_metadata?.full_name || '',
          email: user.email || '',
          role: profile?.role || 'patient',
          isSuspended: Boolean(profile?.is_suspended),
        };
        setAuthUser(u);
        localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(u));
      } catch (e) {
        console.error('Unable to restore Supabase session', e);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (doctorId) {
      const d = doctors.find(x => x.id === doctorId);
      if (d) {
        setSelected(d);
        localStorage.setItem(SELECTED_KEY, d.id);
      }
    }
  }, [doctorId]);

  useEffect(() => {
    if (authUser?.id) void refreshBookings();
    else setBookings([]);
  }, [authUser?.id]);

  // Handle Standalone Admin Dashboard View
  if (page.startsWith('/admin') && page !== '/admin/login') {
    if (!authUser) {
      return (
        <div className="app">
          <Navbar authUser={authUser} onSignOut={handleSignOut} />
          <AuthRequired nav={nav} admin />
        </div>
      );
    }
    if (authUser.role !== 'admin') {
      return (
        <div className="app">
          <Navbar authUser={authUser} onSignOut={handleSignOut} />
          <AdminAccessDenied nav={nav} role={authUser.role} />
        </div>
      );
    }
    return <AdminDashboard authUser={authUser} onSignOut={handleSignOut} />;
  }

  const doctorSubroutes = [
    'login',
    'register',
    'signup',
    'forgot-password',
    'onboarding',
    'dashboard',
    'profile',
    'appointments',
    'calendar',
    'notifications',
    'settings',
  ];
  const currentDoctorSubroute = page.startsWith('/doctor/') ? page.split('/')[2] : null;

  return (
    <div className="app">
      {/* Upgraded Clean Navbar */}
      <Navbar authUser={authUser} onSignOut={handleSignOut} />

      <main>
        {/* Patient Authentication */}
        {page === '/login' && (
          <AuthPage
            mode="login"
            nav={nav}
            onAuth={(u: any) => {
              setAuthUser(u);
              localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(u));
              nav(u.role === 'admin' ? '/admin' : u.role === 'provider' ? '/doctor/dashboard' : '/dashboard');
            }}
          />
        )}
        {page === '/signup' && (
          <AuthPage
            mode="signup"
            nav={nav}
            onAuth={(u: any) => {
              setAuthUser(u);
              localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(u));
              nav(u.role === 'admin' ? '/admin' : u.role === 'provider' ? '/doctor/dashboard' : '/dashboard');
            }}
          />
        )}
        {page === '/forgot-password' && <ForgotPasswordPage nav={nav} />}
        {page === '/reset-password' && <ResetPasswordPage nav={nav} />}

        {/* Admin Login */}
        {page === '/admin/login' && (
          <AdminLogin
            onAdminAuth={(u: AuthUser) => {
              setAuthUser(u);
              localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(u));
              nav('/admin');
            }}
          />
        )}

        {/* Doctor Portal Routes (including signup alias) */}
        {page.startsWith('/doctor/') && currentDoctorSubroute && doctorSubroutes.includes(currentDoctorSubroute) && (
          <DoctorPortalPage
            route={currentDoctorSubroute === 'signup' ? 'register' : currentDoctorSubroute}
            nav={nav}
            authUser={authUser}
            setAuthUser={setAuthUser}
            bookings={bookings}
            updateBooking={updateBooking}
          />
        )}

        {/* Dashboards */}
        {page === '/dashboard' &&
          (authUser ? (
            <AuthPatientDashboard nav={nav} bookings={bookings} updateBooking={updateBooking} />
          ) : (
            <AuthRequired nav={nav} />
          ))}
        {page === '/provider' &&
          (authUser?.role === 'provider' ? (
            <AuthProviderDashboard nav={nav} bookings={bookings} updateBooking={updateBooking} />
          ) : (
            <AuthRequired nav={nav} provider />
          ))}

        {/* Public Pages */}
        {page === '/' && (
          <HomePage
            query={query}
            setQuery={setQuery}
            place={place}
            setPlace={setPlace}
            search={search}
            nav={nav}
          />
        )}
        {(page === '/find' || page.startsWith('/results')) && (
          <SearchResults
            query={new URLSearchParams(loc.search).get('specialty') ?? query}
            place={new URLSearchParams(loc.search).get('location') ?? place}
            setQuery={setQuery}
            setPlace={setPlace}
            search={search}
            filter={filter}
            setFilter={setFilter}
            openDoctor={openDoctor}
            startBooking={startBooking}
          />
        )}
        {page.startsWith('/doctor/') && doctors.some(d => d.id === doctorId) && (
          <DoctorPage
            doctor={current}
            slot={slot}
            setSlot={setSlot}
            onBook={() => {
              if (slot) nav(authUser ? '/booking' : '/login');
            }}
            nav={nav}
            bookings={bookings}
          />
        )}
        {page === '/booking' &&
          (authUser ? (
            <BookingPage
              doctor={current}
              slot={slot}
              setSlot={setSlot}
              nav={nav}
              createBooking={createBooking}
              bookings={bookings}
            />
          ) : (
            <AuthRequired nav={nav} />
          ))}
        {page === '/confirmation' && <Confirmation nav={nav} bookings={bookings} doctor={current} />}
        {page === '/hospitals' && <HospitalsPage nav={nav} />}
        {page === '/doctors' && <DoctorsPage openDoctor={openDoctor} startBooking={startBooking} />}
        {page === '/how' && <HowPage />}
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-intro">
            <div className="footer-brand">
              <span className="logo">
                <HeartPulse size={16} />
              </span>
              <b>MEDQUEUE</b>
            </div>
            <p>
              Find healthcare options, compare providers, and book a convenient appointment. Built as a student
              prototype for the India Mobile Congress.
            </p>
          </div>
          <div className="footer-col">
            <h3>Explore</h3>
            <div className="footer-links">
              <a href="/">Home</a>
              <a href="/find">Find Care</a>
              <a href="/hospitals">Hospitals</a>
              <a href="/doctors">Doctors</a>
            </div>
          </div>
          <div className="footer-col">
            <h3>Portals</h3>
            <div className="footer-links">
              <a href="/login">Patient Login</a>
              <a href="/doctor/login">Doctor Portal</a>
              <a href="/admin/login">Admin Console</a>
              <a href="/how">How It Works</a>
            </div>
          </div>
        </div>
        <div className="footer-disclaimer">
          <span>
            <strong>Healthcare disclaimer:</strong> MedQueue is a discovery and appointment prototype. It does not
            provide medical diagnosis or emergency medical services.
          </span>
          <span>For medical emergencies, contact local emergency services.</span>
        </div>
        <div className="footer-bottom">
          <span>© 2026 MedQueue · Healthcare Discovery & Operations</span>
          <span>
            Provider information is demonstration data. Appointments and credentials are authenticated via Supabase.
          </span>
        </div>
      </footer>
    </div>
  );
}

function AuthPage({
  mode,
  nav,
  onAuth,
}: {
  mode: 'login' | 'signup';
  nav: any;
  onAuth: (u: any) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const signup = mode === 'signup';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }
    if (signup && !name.trim()) {
      setError('Enter your full name.');
      return;
    }
    setBusy(true);
    try {
      if (signup) {
        const result = await signUpWithEmail({
          fullName: name.trim(),
          email: email.trim(),
          password,
          role: 'patient',
        });
        if (!result.session || !result.user) {
          setInfo('Account created. Check your email for the confirmation link, then return here to log in.');
          return;
        }
        const user = result.user;
        let profile: any = null;
        try {
          const { data } = await requireSupabase()
            .from('profiles')
            .select('full_name, role, is_suspended')
            .eq('id', user.id)
            .maybeSingle();
          profile = data;
        } catch {}
        onAuth({
          id: user.id,
          name: profile?.full_name || name.trim(),
          email: user.email || email.trim(),
          role: profile?.role || 'patient',
        });
      } else {
        const result = await signInWithEmail(email.trim(), password);
        const user = result.user;
        let profile: any = null;
        const { data, error: profileError } = await requireSupabase()
          .from('profiles')
          .select('full_name, role, is_suspended')
          .eq('id', user.id)
          .maybeSingle();
        if (profileError) throw profileError;
        profile = data;
        if (profile?.is_suspended) {
          try {
            await signOut();
          } catch {}
          throw new Error('Your account is currently suspended. Please contact platform administration.');
        }
        onAuth({
          id: user.id,
          name: profile?.full_name || user.user_metadata?.full_name || '',
          email: user.email || email.trim(),
          role: profile?.role || 'patient',
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Check your connection and Supabase settings.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />
      <div className="auth-layout">
        <div className="auth-story">
          <button className="auth-brand" onClick={() => nav('/')}>
            <span className="logo">
              <HeartPulse size={18} />
            </span>{' '}
            MEDQUEUE
          </button>
          <div className="auth-kicker">
            <span className="dot" /> YOUR HEALTHCARE, IN ONE PLACE
          </div>
          <h1>{signup ? 'A better way to manage your care.' : 'Welcome back to better care.'}</h1>
          <p>Find care options, compare providers, and keep your appointments organised—all in one place.</p>
          <div className="auth-benefits">
            <div>
              <span>
                <Check size={16} />
              </span>
              <div>
                <b>Find care with confidence</b>
                <small>Explore specialties and provider details.</small>
              </div>
            </div>
            <div>
              <span>
                <Check size={16} />
              </span>
              <div>
                <b>Appointments in one place</b>
                <small>Keep track of your booking journey.</small>
              </div>
            </div>
            <div>
              <span>
                <Check size={16} />
              </span>
              <div>
                <b>Designed around you</b>
                <small>A simpler path from search to appointment.</small>
              </div>
            </div>
          </div>
          <div className="auth-art">
            <div className="art-orbit orbit-a" />
            <div className="art-orbit orbit-b" />
            <div className="art-heart">
              <HeartPulse size={48} />
            </div>
            <span className="art-dot dot-a" />
            <span className="art-dot dot-b" />
          </div>
        </div>
        <div className="auth-form-wrap">
          <form className="auth-card" onSubmit={submit}>
            <div className="auth-card-top">
              <span className="auth-mini-logo">
                <HeartPulse size={19} />
              </span>
              <span className="auth-secure">
                <LockKeyhole size={13} /> Secure patient access
              </span>
            </div>
            <p className="eyebrow plain">{signup ? 'GET STARTED' : 'PATIENT ACCOUNT'}</p>
            <h2>{signup ? 'Create your account' : 'Sign in'}</h2>
            <p className="auth-subtitle">
              {signup
                ? 'Create a patient account to keep your appointments organised.'
                : 'Enter your details to continue to MedQueue.'}
            </p>
            {signup && (
              <label className="auth-field">
                <span>Full name</span>
                <div>
                  <UserRound size={17} />
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your full name"
                    autoComplete="name"
                    required
                  />
                </div>
              </label>
            )}
            <label className="auth-field">
              <span>Email address</span>
              <div>
                <Mail size={17} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>
            </label>
            <label className="auth-field">
              <span>Password</span>
              <div>
                <LockKeyhole size={17} />
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={signup ? 'At least 8 characters' : 'Enter your password'}
                  autoComplete={signup ? 'new-password' : 'current-password'}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShow(!show)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                >
                  {show ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>
            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}
            {info && (
              <div className="auth-success" role="status">
                {info}
              </div>
            )}
            <button className="primary auth-submit" type="submit" disabled={busy}>
              {busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'} <ArrowRight size={17} />
            </button>
            {!signup && (
              <button type="button" className="auth-text-link" onClick={() => nav('/forgot-password')}>
                Forgot password?
              </button>
            )}
            <p className="auth-switch">
              {signup ? 'Already have an account?' : 'New to MedQueue?'}{' '}
              <button type="button" onClick={() => nav(signup ? '/login' : '/signup')}>
                {signup ? 'Log in' : 'Create an account'}
              </button>
            </p>
            <div className="auth-footnote">
              Looking for doctor registration? <button type="button" className="inline-link" onClick={() => nav('/doctor/signup')}>Register as a Doctor</button>
            </div>
          </form>
          <button className="auth-back" onClick={() => nav('/')}>
            <ArrowLeft size={15} /> Back to MedQueue
          </button>
        </div>
      </div>
    </section>
  );
}

function ForgotPasswordPage({ nav }: { nav: any }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  return (
    <section className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow plain">ACCOUNT RECOVERY</p>
        <h1>Forgot your password?</h1>
        <p className="auth-copy">Enter your email and we'll send a password recovery link.</p>
        {sent ? (
          <div className="auth-success">
            <Check size={18} /> If an account exists for that address, a recovery email has been requested. Check your
            inbox.
          </div>
        ) : (
          <form
            onSubmit={async e => {
              e.preventDefault();
              setError('');
              setBusy(true);
              try {
                await requestPasswordReset(email);
                setSent(true);
              } catch (err: any) {
                setError(err?.message || 'Could not request password reset.');
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Email address
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            {error && <p className="auth-error">{error}</p>}
            <button className="primary" type="submit" disabled={busy}>
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
        <button className="auth-text-link" onClick={() => nav('/login')}>
          Back to login
        </button>
      </div>
    </section>
  );
}

function ResetPasswordPage({ nav }: { nav: any }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <section className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow plain">SECURE YOUR ACCOUNT</p>
        <h1>Set a new password</h1>
        <p className="auth-copy">Choose a new password for your MedQueue account.</p>
        {saved ? (
          <div className="auth-success">
            <Check size={18} /> Password updated. You can now log in with your new password.
          </div>
        ) : (
          <form
            onSubmit={async e => {
              e.preventDefault();
              setError('');
              if (password !== confirm) {
                setError('Passwords do not match.');
                return;
              }
              setBusy(true);
              try {
                await updatePassword(password);
                setSaved(true);
              } catch (err: any) {
                setError(err?.message || 'Could not update password. Open the recovery link from your email first.');
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              New password
              <input
                type="password"
                minLength={8}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </label>
            <label>
              Confirm new password
              <input
                type="password"
                minLength={8}
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter password"
              />
            </label>
            {confirm && password !== confirm && <p className="auth-error">Passwords do not match.</p>}
            {error && <p className="auth-error">{error}</p>}
            <button className="primary" type="submit" disabled={busy || password.length < 8 || password !== confirm}>
              {busy ? 'Updating…' : 'Reset password'}
            </button>
          </form>
        )}
        <button className="auth-text-link" onClick={() => nav('/login')}>
          Back to login
        </button>
      </div>
    </section>
  );
}

function AuthRequired({
  nav,
  provider = false,
  admin = false,
}: {
  nav: any;
  provider?: boolean;
  admin?: boolean;
}) {
  if (admin) {
    return (
      <section className="auth-shell">
        <div className="auth-card">
          <div className="admin-badge-head">
            <span className="admin-shield-icon">
              <ShieldCheck size={26} />
            </span>
            <span className="admin-security-tag">RESTRICTED CONSOLE</span>
          </div>
          <p className="eyebrow plain">ADMINISTRATIVE ACCESS REQUIRED</p>
          <h1>Administrator Sign In Required</h1>
          <p className="auth-copy">
            Please authenticate with an authorized administrator account to view the system management console.
          </p>
          <button className="primary" onClick={() => nav('/admin/login')}>
            Admin Sign In
          </button>
          <button className="auth-text-link" onClick={() => nav('/')}>
            Back to MedQueue Home
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow plain">ACCOUNT REQUIRED</p>
        <h1>{provider ? 'Provider access required' : 'Log in to continue'}</h1>
        <p className="auth-copy">
          {provider
            ? 'This provider workspace is available only to verified doctor accounts.'
            : 'Please log in before booking or viewing your appointments.'}
        </p>
        <button className="primary" onClick={() => nav(provider ? '/doctor/login' : '/login')}>
          Log in
        </button>
        {!provider && (
          <button className="auth-text-link" onClick={() => nav('/signup')}>
            Create an account
          </button>
        )}
      </div>
    </section>
  );
}

function AdminAccessDenied({ nav, role }: { nav: any; role: string }) {
  return (
    <section className="auth-shell">
      <div className="auth-card">
        <div className="admin-badge-head">
          <span className="admin-shield-icon">
            <ShieldCheck size={26} />
          </span>
          <span className="admin-security-tag">UNAUTHORIZED</span>
        </div>
        <p className="eyebrow plain">RESTRICTED PLATFORM AREA</p>
        <h1>Access Denied</h1>
        <p className="auth-copy">
          You are currently signed in as a <strong>{role}</strong>. The Administrator Console is strictly restricted to
          provisioned platform administrators.
        </p>
        <button className="primary" onClick={() => nav(role === 'provider' ? '/doctor/dashboard' : '/dashboard')}>
          Go to {role === 'provider' ? 'Doctor Workspace' : 'Patient Dashboard'}
        </button>
        <button className="auth-text-link" onClick={() => nav('/admin/login')}>
          Sign In with Administrator Credentials
        </button>
      </div>
    </section>
  );
}

function AuthPatientDashboard({
  nav,
  bookings,
  updateBooking,
}: {
  nav: any;
  bookings: Booking[];
  updateBooking: (id: string, status: Booking['status']) => Promise<void>;
}) {
  return (
    <section className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow plain">YOUR CARE</p>
          <h1>Patient dashboard</h1>
          <p className="auth-copy">Appointments saved to your MedQueue account.</p>
        </div>
        <button className="primary" onClick={() => nav('/find')}>
          Find a doctor
        </button>
      </div>
      <div className="dashboard-stats">
        <div>
          <span>Appointments</span>
          <strong>{bookings.length}</strong>
        </div>
        <div>
          <span>Upcoming</span>
          <strong>{bookings.filter(a => !['Cancelled', 'cancelled'].includes(a.status)).length}</strong>
        </div>
        <div>
          <span>Account</span>
          <strong>Patient</strong>
        </div>
      </div>
      <div className="dashboard-panel">
        <h2>Your appointments</h2>
        {bookings.length === 0 ? (
          <div className="auth-empty">
            <CalendarDays size={26} />
            <h3>No appointments yet</h3>
            <p>Bookings you create will be saved to your account.</p>
            <button className="link-btn" onClick={() => nav('/find')}>
              Explore doctors <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          bookings.map(a => (
            <div className="appointment-row" key={a.id}>
              <div className="appointment-icon">
                <CalendarDays />
              </div>
              <div className="appointment-info">
                <strong>{a.doctorName || a.doctorId}</strong>
                <span>
                  {a.hospitalName || 'Demo hospital'} · {a.date} · {a.slot}
                </span>
                <span>Status: {a.status}</span>
                <span>Reference: {a.id}</span>
              </div>
              <span className="status-pill">{a.status}</span>
              {a.status !== 'Cancelled' && (
                <button className="outline" onClick={() => void updateBooking(a.id, 'Cancelled')}>
                  Cancel
                </button>
              )}
            </div>
          ))
        )}
      </div>
      <p className="panel-note">
        Prototype note: these records are stored in Supabase. Provider and availability details are fictional
        demonstration data.
      </p>
    </section>
  );
}

function AuthProviderDashboard({
  nav,
  bookings,
  updateBooking,
}: {
  nav: any;
  bookings: Booking[];
  updateBooking: (id: string, status: Booking['status']) => Promise<void>;
}) {
  return (
    <section className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow plain">PROVIDER WORKSPACE</p>
          <h1>Hospital dashboard</h1>
          <p className="auth-copy">Appointment requests stored in Supabase.</p>
        </div>
        <button className="link-btn" onClick={() => nav('/dashboard')}>
          Patient dashboard <ArrowRight size={16} />
        </button>
      </div>
      <div className="dashboard-stats">
        <div>
          <span>Total requests</span>
          <strong>{bookings.length}</strong>
        </div>
        <div>
          <span>Pending</span>
          <strong>{bookings.filter(a => a.status === 'Pending').length}</strong>
        </div>
        <div>
          <span>Confirmed</span>
          <strong>{bookings.filter(a => a.status === 'Confirmed').length}</strong>
        </div>
      </div>
      <div className="dashboard-panel">
        <h2>Appointment requests</h2>
        {bookings.length === 0 ? (
          <div className="auth-empty">
            <Hospital size={26} />
            <h3>No appointment requests</h3>
            <p>New appointment requests will appear here.</p>
          </div>
        ) : (
          bookings.map(a => (
            <div className="appointment-row provider-row" key={a.id}>
              <div className="appointment-icon">
                <UserRound />
              </div>
              <div className="appointment-info">
                <strong>{a.patientName}</strong>
                <span>
                  {a.doctorName || a.doctorId} · {a.date} · {a.slot}
                </span>
                <span>
                  {a.email} · {a.phone}
                </span>
                <span>Reason: {a.reason}</span>
                <span>Reference: {a.id}</span>
              </div>
              <span className="status-pill">{a.status}</span>
              <div className="appointment-actions">
                <button
                  disabled={a.status === 'Confirmed' || a.status === 'Cancelled'}
                  onClick={() => void updateBooking(a.id, 'Confirmed')}
                >
                  Confirm
                </button>
                <button
                  disabled={a.status === 'Cancelled'}
                  onClick={() => void updateBooking(a.id, 'Cancelled')}
                >
                  Cancel
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <p className="panel-note">
        Provider access must be granted by an administrator in Supabase. This dashboard does not represent a real
        hospital.
      </p>
    </section>
  );
}

function HomePage({
  query,
  setQuery,
  place,
  setPlace,
  search,
  nav,
}: {
  query: string;
  setQuery: (x: string) => void;
  place: string;
  setPlace: (x: string) => void;
  search: (q?: string, p?: string) => void;
  nav: any;
}) {
  const specs = [
    'Cardiology',
    'Dermatology',
    'Orthopedics',
    'Neurology',
    'ENT',
    'Pediatrics',
    'General Medicine',
    'Gynecology',
  ];
  return (
    <>
      <section className="hero">
        <div className="eyebrow">
          <span className="dot" /> Healthcare discovery prototype · IMC 2026
        </div>
        <h1>
          Find the right care,
          <br />
          <span>closer to you.</span>
        </h1>
        <p className="hero-copy">
          Tell us what you need help with and where you are. MedQueue helps you find nearby doctors and hospitals.
        </p>
        <SearchBox query={query} setQuery={setQuery} place={place} setPlace={setPlace} search={search} />
        <div className="trust-line">
          <span>
            <Check size={15} /> Compare options
          </span>
          <span>
            <Check size={15} /> See availability
          </span>
          <span>
            <Check size={15} /> Book a slot
          </span>
        </div>
      </section>
      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow plain">Start here</p>
            <h2>Find care by specialty</h2>
          </div>
          <button className="link-btn" onClick={() => nav('/find')}>
            See all <ArrowRight size={16} />
          </button>
        </div>
        <div className="specialties">
          {specs.map((s, i) => (
            <button key={s} onClick={() => search(s, place)}>
              <span className="spec-icon">{['♥', '◌', '＋', '◉', '◍', '✦', '＋', '○'][i]}</span>
              {s}
              <ChevronRight size={15} />
            </button>
          ))}
        </div>
      </section>
      <section className="how section">
        <div className="section-head">
          <div>
            <p className="eyebrow plain">How it works</p>
            <h2>A simple path to your next appointment.</h2>
          </div>
        </div>
        <div className="steps">
          <Step n="01" title="Tell us what you need" text="Enter a healthcare specialty and your location." />
          <Step n="02" title="Compare nearby options" text="Review doctors, facilities, fees and availability." />
          <Step n="03" title="Book an appointment" text="Choose a convenient slot and confirm." />
        </div>
      </section>
      <section className="disclaimer">
        <div>
          <b>Prototype note</b>
          <p>
            MedQueue is a healthcare discovery and appointment prototype. It does not provide medical diagnosis or
            emergency medical services.
          </p>
        </div>
        <span>For medical emergencies, contact local emergency services.</span>
      </section>
    </>
  );
}

function SearchBox({
  query,
  setQuery,
  place,
  setPlace,
  search,
}: {
  query: string;
  setQuery: (x: string) => void;
  place: string;
  setPlace: (x: string) => void;
  search: (q?: string, p?: string) => void;
}) {
  return (
    <div className="search-box">
      <label>
        <span>WHAT DO YOU NEED HELP WITH?</span>
        <div>
          <Stethoscope size={18} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cardiologist"
            onKeyDown={e => e.key === 'Enter' && search()}
          />
        </div>
      </label>
      <label>
        <span>WHERE ARE YOU?</span>
        <div>
          <MapPin size={18} />
          <input
            value={place}
            onChange={e => setPlace(e.target.value)}
            placeholder="Noida, Uttar Pradesh"
          />
        </div>
      </label>
      <button className="primary" onClick={() => search()}>
        <Search size={18} /> Find Care
      </button>
    </div>
  );
}

function Step({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <div className="step">
      <span>{n}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function SearchResults(p: any) {
  const q = (p.query || '').trim().toLowerCase(),
    location = (p.place || '').trim().toLowerCase();
  let list = doctors.filter(
    d =>
      (!q ||
        d.specialty.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        d.about.toLowerCase().includes(q)) &&
      (!location ||
        d.location.toLowerCase().includes(location) ||
        d.hospital.toLowerCase().includes(location) ||
        (location.includes('noida') && d.location.toLowerCase().includes('noida')) ||
        (location.includes('ghaziabad') && d.location.toLowerCase().includes('ghaziabad')))
  );
  if (p.filter === 'Under ₹700') list = list.filter(d => d.fee < 700);
  if (p.filter === 'Under 5 km') list = list.filter(d => d.distance <= 5);
  if (p.filter === 'Available today') list = list.filter(d => d.slots.length > 0);
  return (
    <section className="results-page">
      <div className="results-top">
        <div>
          <p className="eyebrow plain">Find care</p>
          <h1>
            Doctors and hospitals near <span>{(p.place || 'your location').split(',')[0]}</span>
          </h1>
          <p>{list.length} matching providers · fictional demonstration data</p>
        </div>
        <button className="outline" onClick={() => p.search()}>
          Edit search
        </button>
      </div>
      <div className="results-layout">
        <aside className="filters">
          <div className="filter-title">
            <b>Filters</b>
            <SlidersHorizontal size={17} />
          </div>
          {['All', 'Under ₹700', 'Under 5 km', 'Available today'].map(x => (
            <button className={p.filter === x ? 'active' : ''} key={x} onClick={() => p.setFilter(x)}>
              {x}
            </button>
          ))}
          <hr />
          <p className="filter-label">Note</p>
          <small>Distances and availability are sample data for this prototype.</small>
        </aside>
        <div className="provider-list">
          {list.length ? (
            list
              .slice(0, 12)
              .map((d: Doctor) => (
                <ProviderCard key={d.id} d={d} openDoctor={p.openDoctor} startBooking={p.startBooking} />
              ))
          ) : (
            <div className="empty-state">
              <Search size={28} />
              <h2>No matching providers</h2>
              <p>Try another specialty or a location such as Noida or Ghaziabad.</p>
              <button
                className="outline"
                onClick={() => {
                  p.setQuery('');
                  p.setPlace('Noida, Uttar Pradesh');
                  p.search('', 'Noida, Uttar Pradesh');
                }}
              >
                Reset search
              </button>
            </div>
          )}
        </div>
        <MockMap list={list} />
      </div>
    </section>
  );
}

function ProviderCard({
  d,
  openDoctor,
  startBooking,
}: {
  d: Doctor;
  openDoctor: (d: Doctor) => void;
  startBooking: (d: Doctor) => void;
}) {
  return (
    <article className="provider-card">
      <div className="provider-main">
        <div className="avatar">{d.name.split(' ').slice(1, 2)[0]?.[0] || 'D'}</div>
        <div>
          <div className="provider-name">{d.name}</div>
          <div className="specialty">{d.specialty}</div>
        </div>
        <div className="rating">
          <Star size={14} fill="currentColor" /> {d.rating}
          <small>({d.reviews})</small>
        </div>
      </div>
      <div className="provider-meta">
        <span>{d.experience} years experience</span>
        <span>
          <MapPin size={14} />
          {d.distance} km away
        </span>
        <span>
          <Hospital size={14} />
          {d.hospital}
        </span>
      </div>
      <div className="provider-details">
        <div>
          <b>₹{d.fee}</b>
          <small>approx. consultation</small>
        </div>
        <div>
          <b>Next available</b>
          <small>{d.slots[0]} · Today</small>
        </div>
      </div>
      <div className="facilities">
        {d.facilities.map(x => (
          <span key={x}>{x}</span>
        ))}
      </div>
      <div className="card-actions">
        <button className="outline" onClick={() => openDoctor(d)}>
          View Profile
        </button>
        <button className="primary compact" onClick={() => startBooking(d)}>
          Book Appointment
        </button>
      </div>
    </article>
  );
}

function MockMap({ list }: { list: Doctor[] }) {
  return (
    <div className="map">
      <div className="map-label">
        <MapPin size={14} /> Noida area
      </div>
      <div className="road r1" />
      <div className="road r2" />
      <div className="road r3" />
      <div className="road r4" />
      <div className="user-pin">
        <span>●</span>
      </div>
      {list.slice(0, 6).map((d, i) => (
        <button
          className="map-pin"
          style={{ left: 16 + ((i * 13) % 72) + '%', top: 22 + ((i * 19) % 62) + '%' }}
          title={d.hospital}
          key={d.id}
        >
          +
        </button>
      ))}
      <div className="map-key">
        <span>
          <i className="user-dot" />
          You
        </span>
        <span>
          <i className="hospital-dot" />
          Provider
        </span>
      </div>
    </div>
  );
}

function DoctorPage({
  doctor,
  slot,
  setSlot,
  onBook,
  nav,
  bookings,
}: {
  doctor: Doctor;
  slot: string;
  setSlot: (s: string) => void;
  onBook: () => void;
  nav: any;
  bookings: Booking[];
}) {
  const available = doctor.slots.filter(
    s => !bookings.some(b => b.doctorId === doctor.id && b.slot === s && b.status !== 'Cancelled')
  );
  return (
    <section className="detail-page">
      <button className="back" onClick={() => nav(-1)}>
        ← Back to results
      </button>
      <div className="profile-grid">
        <div>
          <div className="profile-head">
            <div className="big-avatar">{doctor.name.split(' ').slice(1, 2)[0]?.[0]}</div>
            <div>
              <p className="eyebrow plain">Doctor profile · Demo provider</p>
              <h1>{doctor.name}</h1>
              <p className="specialty big">{doctor.specialty}</p>
              <div className="rating large">
                <Star size={16} fill="currentColor" /> {doctor.rating}{' '}
                <small>· {doctor.reviews} sample reviews</small>
              </div>
            </div>
          </div>
          <div className="info-block">
            <h3>About</h3>
            <p>{doctor.about}</p>
          </div>
          <div className="info-block">
            <h3>Facilities</h3>
            <div className="tag-list">
              {doctor.facilities.map(x => (
                <span key={x}>{x}</span>
              ))}
            </div>
          </div>
        </div>
        <aside className="booking-panel">
          <div className="hospital-mini">
            <Hospital size={19} />
            <div>
              <b>{doctor.hospital}</b>
              <span>{doctor.location}</span>
            </div>
          </div>
          <div className="fee">
            <span>Consultation fee</span>
            <b>₹{doctor.fee}</b>
            <small>Approximate · demo only</small>
          </div>
          <h3>Available appointment slots</h3>
          <p className="date-line">
            <CalendarDays size={16} /> Sample schedule · Today
          </p>
          <div className="slots">
            {available.map(s => (
              <button className={slot === s ? 'selected' : ''} key={s} onClick={() => setSlot(s)}>
                {s}
              </button>
            ))}
          </div>
          {!available.length && <p>All listed slots are booked. Cancel a booking to release a slot.</p>}
          <button
            className="primary full"
            disabled={!slot || !available.includes(slot)}
            onClick={onBook}
          >
            Continue to booking <ArrowRight size={17} />
          </button>
          <small className="panel-note">No payment is taken. Provider details are fictional.</small>
        </aside>
      </div>
    </section>
  );
}

function BookingPage({
  doctor,
  slot,
  setSlot,
  nav,
  createBooking,
  bookings,
}: {
  doctor: Doctor;
  slot: string;
  setSlot: (s: string) => void;
  nav: any;
  createBooking: (details: any) => any;
  bookings: Booking[];
}) {
  const [form, setForm] = useState({ name: '', age: '', phone: '', email: '', reason: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const available = doctor.slots.filter(
    s => !bookings.some(b => b.doctorId === doctor.id && b.slot === s && b.status !== 'Cancelled')
  );
  const submit = async () => {
    setError('');
    if (!slot || !available.includes(slot)) {
      setError('Please select an available appointment slot.');
      return;
    }
    if (form.name.trim().length < 2) {
      setError('Enter the patient’s full name.');
      return;
    }
    if (!Number.isInteger(Number(form.age)) || Number(form.age) < 1 || Number(form.age) > 120) {
      setError('Enter a valid age between 1 and 120.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\s|-/g, ''))) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Enter a valid email address.');
      return;
    }
    setSaving(true);
    const result = await createBooking({
      doctorId: doctor.id,
      patientName: form.name.trim(),
      age: Number(form.age),
      phone: form.phone.replace(/\s|-/g, ''),
      email: form.email.trim(),
      reason: form.reason.trim() || 'General consultation',
      slot,
      date: new Date().toISOString().slice(0, 10),
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    nav('/confirmation');
  };
  return (
    <section className="booking-page">
      <p className="eyebrow plain">Appointment details</p>
      <h1>Book your appointment</h1>
      <p className="sub">Enter your details to save an appointment request to your MedQueue account.</p>
      <div className="booking-layout">
        <div className="form-card">
          <div className="form-grid">
            <label>
              Full name
              <input
                value={form.name}
                autoComplete="name"
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Your name"
                required
              />
            </label>
            <label>
              Age
              <input
                type="number"
                min="1"
                max="120"
                value={form.age}
                onChange={e => setForm({ ...form, age: e.target.value })}
                placeholder="Age"
                required
              />
            </label>
            <label>
              Mobile number
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="10-digit mobile"
                required
              />
            </label>
            <label>
              Email address
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                required
              />
            </label>
            <label className="full-field">
              Reason for visit (optional)
              <input
                value={form.reason}
                onChange={e => setForm({ ...form, reason: e.target.value })}
                placeholder="General consultation"
              />
            </label>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="primary full" disabled={saving} onClick={submit}>
            {saving ? 'Saving…' : 'Confirm appointment'} <Check size={17} />
          </button>
          <p className="panel-note">Demo only. Use fictional details, not real patient information.</p>
        </div>
        <aside className="summary-card">
          <p className="eyebrow plain">Booking summary</p>
          <h3>{doctor.name}</h3>
          <p>{doctor.specialty}</p>
          <div>
            <Clock size={16} /> Today · {slot || 'Choose a slot'}
          </div>
          <div>
            <Hospital size={16} /> {doctor.hospital}
          </div>
          <div>
            <MapPin size={16} /> {doctor.location}
          </div>
          <b>
            ₹{doctor.fee} <small>approximate fee</small>
          </b>
          <h4>Choose another slot</h4>
          <div className="slots">
            {doctor.slots
              .filter(s => !bookings.some(b => b.doctorId === doctor.id && b.slot === s && b.status !== 'Cancelled'))
              .map(s => (
                <button className={slot === s ? 'selected' : ''} key={s} onClick={() => setSlot(s)}>
                  {s}
                </button>
              ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

function Confirmation({
  nav,
  bookings,
  doctor,
}: {
  nav: any;
  bookings: Booking[];
  doctor: Doctor;
}) {
  const booking = bookings[0];
  const d = booking ? doctors.find(x => x.id === booking.doctorId) || doctor : doctor;
  if (!booking)
    return (
      <section className="confirmation">
        <h1>No booking found</h1>
        <p>Complete the booking form before viewing a confirmation.</p>
        <button className="primary" onClick={() => nav('/find')}>
          Find a doctor
        </button>
      </section>
    );
  return (
    <section className="confirmation">
      <div className="confirm-icon">
        <Check size={30} />
      </div>
      <p className="eyebrow plain">Booking saved</p>
      <h1>Appointment request created</h1>
      <p>Your appointment request has been saved to MedQueue.</p>
      <div className="confirm-card">
        <div className="card-title">
          <h3>{d.name}</h3>
          <span className="status">{booking.status}</span>
        </div>
        <b>{d.specialty}</b>
        <hr />
        <div>
          <CalendarDays /> {booking.date} · {booking.slot}
        </div>
        <div>
          <Hospital /> {d.hospital}
        </div>
        <div>
          <MapPin /> {d.location}
        </div>
        <div>
          <UserRound /> {booking.patientName}
        </div>
        <div>
          <Check /> Reference: {booking.id}
        </div>
      </div>
      <div className="confirm-actions">
        <button className="outline" onClick={() => nav('/dashboard')}>
          View patient dashboard
        </button>
        <button className="primary" onClick={() => nav('/find')}>
          Find another doctor
        </button>
      </div>
    </section>
  );
}

function HospitalsPage({ nav }: any) {
  return (
    <section className="directory">
      <div className="results-top">
        <div>
          <p className="eyebrow plain">Directory</p>
          <h1>Hospitals around Noida</h1>
          <p>Fictional providers included for the IMC demonstration.</p>
        </div>
      </div>
      <div className="hospital-grid">
        {hospitals.map(h => (
          <article className="hospital-card" key={h.id}>
            <div className="hospital-symbol">
              <Hospital />
            </div>
            <h3>{h.name}</h3>
            <p>
              <MapPin size={14} />
              {h.location} · {h.distance} km
            </p>
            <div className="tag-list">
              {h.departments.slice(0, 3).map(x => (
                <span key={x}>{x}</span>
              ))}
            </div>
            <hr />
            <p>
              <b>Facilities</b>
              <br />
              {h.facilities.join(' · ')}
            </p>
            <button className="outline full" onClick={() => nav('/find')}>
              View doctors <ArrowRight size={15} />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function DoctorsPage({
  openDoctor,
  startBooking,
}: {
  openDoctor: (d: Doctor) => void;
  startBooking: (d: Doctor) => void;
}) {
  return (
    <section className="directory">
      <div className="results-top">
        <div>
          <p className="eyebrow plain">Directory</p>
          <h1>Doctors</h1>
          <p>Browse the fictional provider list used in this prototype.</p>
        </div>
      </div>
      <div className="provider-list directory-list">
        {doctors.map(d => (
          <ProviderCard key={d.id} d={d} openDoctor={openDoctor} startBooking={startBooking} />
        ))}
      </div>
    </section>
  );
}

function HowPage() {
  return (
    <section className="how-page">
      <p className="eyebrow plain">The idea</p>
      <h1>
        A shorter path between
        <br />
        <span>need and care.</span>
      </h1>
      <p className="lead">
        MedQueue is a simple healthcare discovery concept: tell us what you need, compare nearby options, and choose an
        appointment.
      </p>
      <div className="steps large">
        <Step n="01" title="Tell us what you need" text="Search by specialty and location." />
        <Step n="02" title="Compare nearby options" text="See distance, experience, fees, facilities and availability." />
        <Step n="03" title="Book a slot" text="Choose a time and send the booking to the provider side." />
      </div>
    </section>
  );
}

function DoctorPortalPage({
  route,
  nav,
  authUser,
  setAuthUser,
  bookings,
  updateBooking,
}: {
  route: string;
  nav: any;
  authUser: any;
  setAuthUser: (u: any) => void;
  bookings: Booking[];
  updateBooking: (id: string, status: Booking['status']) => void;
}) {
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [name, setName] = useState(''),
    [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [certificate, setCertificate] = useState<File | null>(null);
  const [application, setApplication] = useState<any>({
    specialty: '',
    qualifications: '',
    experience: '',
    license_number: '',
    licensing_authority: '',
    clinic_name: '',
    address: '',
    city: '',
    consultation_type: 'In-person',
    fee: '',
    languages: 'English, Hindi',
    bio: '',
    working_days: 'Mon, Tue, Wed, Thu, Fri',
    start_time: '09:00',
    end_time: '17:00',
    slot_minutes: 30,
  });
  const [appointments, setAppointments] = useState<any[]>([]);

  const loadApplication = async () => {
    if (!authUser?.id) return;
    try {
      const client = requireSupabase();
      const { data, error } = await client
        .from('doctor_profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle();
      if (error) throw error;
      if (data)
        setApplication((old: any) => ({
          ...old,
          ...data,
          fee: data.fee ?? '',
          experience: data.experience ?? '',
          slot_minutes: data.slot_minutes ?? 30,
        }));
      if (['appointments', 'dashboard', 'calendar'].includes(route)) {
        const { data: rows, error: apptError } = await client
          .from('appointments')
          .select('*')
          .order('appointment_date', { ascending: true });
        if (apptError) throw apptError;
        setAppointments(rows || []);
      }
    } catch (e: any) {
      console.warn('Doctor workspace data fetch:', e?.message);
    }
  };

  useEffect(() => {
    void loadApplication();
  }, [authUser?.id, route]);

  const submitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (route === 'register' || route === 'signup') {
        if (password.length < 8) throw new Error('Use a password with at least 8 characters.');
        const result = await signUpWithEmail({
          fullName: name.trim(),
          email: email.trim(),
          password,
          role: 'provider',
        });
        if (!result.user) throw new Error('Account created. Check your email to verify it, then sign in.');
        if (!result.session) {
          setNotice(
            'Account created. Check your email for verification, then sign in to complete your professional profile.'
          );
          return;
        }
        const user = result.user;
        let profile: any = null;
        try {
          const { data } = await requireSupabase()
            .from('profiles')
            .select('full_name, role, is_suspended')
            .eq('id', user.id)
            .maybeSingle();
          profile = data;
        } catch {}
        const u = {
          id: user.id,
          name: profile?.full_name || name.trim(),
          email: user.email || email,
          role: profile?.role || 'patient',
        };
        setAuthUser(u);
        localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(u));
        nav('/doctor/onboarding');
      } else {
        const result = await signInWithEmail(email.trim(), password);
        const user = result.user;
        const { data: profile, error: profileError } = await requireSupabase()
          .from('profiles')
          .select('full_name, role, is_suspended')
          .eq('id', user.id)
          .maybeSingle();
        if (profileError) throw profileError;

        if (profile?.is_suspended) {
          try {
            await signOut();
          } catch {}
          throw new Error('Your doctor account has been suspended. Please contact platform administration.');
        }

        const u = {
          id: user.id,
          name: profile?.full_name || user.user_metadata?.full_name || '',
          email: user.email || email,
          role: profile?.role || 'patient',
        };
        setAuthUser(u);
        localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(u));
        nav('/doctor/dashboard');
      }
    } catch (e: any) {
      setError(e?.message || 'Authentication failed. Check Supabase configuration.');
    } finally {
      setBusy(false);
    }
  };

  const saveApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (!authUser?.id) throw new Error('Please sign in first.');
      if (
        !application.specialty.trim() ||
        !application.qualifications.trim() ||
        !application.license_number.trim()
      )
        throw new Error('Specialization, qualifications and medical registration number are required.');
      let certificatePath = application.registration_certificate_path || null;
      if (certificate) {
        const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!allowed.includes(certificate.type))
          throw new Error('Upload a PDF, JPG or PNG registration certificate.');
        if (certificate.size > 5 * 1024 * 1024)
          throw new Error('The registration certificate must be 5 MB or smaller.');
        const safeName = certificate.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        certificatePath = `${authUser.id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await requireSupabase()
          .storage.from('doctor-verification')
          .upload(certificatePath, certificate, { contentType: certificate.type, upsert: false });
        if (uploadError) throw uploadError;
      }
      const payload = {
        ...application,
        user_id: authUser.id,
        full_name: authUser.name || name,
        email: authUser.email || email,
        phone,
        status: 'Submitted for review',
        registration_certificate_path: certificatePath,
        updated_at: new Date().toISOString(),
        experience: Number(application.experience) || 0,
        fee: application.fee === '' ? null : Number(application.fee),
        slot_minutes: Number(application.slot_minutes) || 30,
      };
      const { error } = await requireSupabase().from('doctor_profiles').upsert(payload, { onConflict: 'user_id' });
      if (error) throw error;
      setApplication((old: any) => ({ ...old, ...payload }));
      setNotice('Your application has been saved and submitted for administrator review.');
    } catch (e: any) {
      setError(e?.message || 'Could not save your application. Run the doctor portal SQL migration first.');
    } finally {
      setBusy(false);
    }
  };

  const signOutDoctor = async () => {
    try {
      await signOut();
    } catch {}
    setAuthUser(null);
    localStorage.removeItem(ACTIVE_USER_KEY);
    nav('/doctor/login');
  };

  const title =
    route === 'profile'
      ? 'Professional profile'
      : route === 'appointments'
      ? 'Appointments'
      : route === 'calendar'
      ? 'Availability & calendar'
      : route === 'notifications'
      ? 'Notifications'
      : route === 'settings'
      ? 'Account settings'
      : 'Doctor dashboard';

  if (route === 'login' || route === 'register' || route === 'signup' || route === 'forgot-password') {
    if (route === 'forgot-password')
      return (
        <section className="doctor-auth-shell">
          <div className="doctor-auth-card">
            <div className="doctor-mark">
              <Stethoscope />
            </div>
            <p className="eyebrow">MEDQUEUE · DOCTOR PORTAL</p>
            <h1>Reset your password</h1>
            <form
              onSubmit={async e => {
                e.preventDefault();
                setBusy(true);
                setError('');
                try {
                  await requestPasswordReset(email);
                  setNotice('If the account exists, a password reset link has been sent.');
                } catch (x: any) {
                  setError(x.message || 'Could not request reset.');
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Professional email
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
              </label>
              {error && <p className="form-error">{error}</p>}
              {notice && <p className="form-success">{notice}</p>}
              <button className="primary full" disabled={busy}>
                {busy ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
            <button className="text-btn" onClick={() => nav('/doctor/login')}>
              Back to doctor login
            </button>
          </div>
        </section>
      );

    const isReg = route === 'register' || route === 'signup';
    return (
      <section className="doctor-auth-shell">
        <div className="doctor-auth-aside">
          <div className="doctor-mark">
            <Stethoscope />
          </div>
          <p className="eyebrow">MEDQUEUE FOR PROFESSIONALS</p>
          <h1>{isReg ? 'Build your professional presence.' : 'Welcome back, doctor.'}</h1>
          <p>Manage your profile, availability and appointment requests from one secure workspace.</p>
          <div className="doctor-promise">
            <Check /> Profile verification before public listing
          </div>
          <div className="doctor-promise">
            <Check /> Appointment tools in one place
          </div>
          <div className="doctor-promise">
            <Check /> Secure, role-aware access
          </div>
        </div>
        <div className="doctor-auth-card">
          <p className="eyebrow">{isReg ? 'JOIN MEDQUEUE' : 'SECURE ACCESS'}</p>
          <h2>{isReg ? 'Doctor registration' : 'Doctor login'}</h2>
          <p className="sub">
            {isReg
              ? 'Create an account, then submit your professional details for review.'
              : 'Sign in to continue to your doctor workspace.'}
          </p>
          <form onSubmit={submitAuth}>
            {isReg && (
              <label>
                Full name
                <input value={name} onChange={e => setName(e.target.value)} required autoComplete="name" />
              </label>
            )}
            <label>
              Professional email
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </label>
            {isReg && (
              <label>
                Mobile number
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                  placeholder="Contact number"
                />
              </label>
            )}
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete={isReg ? 'new-password' : 'current-password'}
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="form-success" role="status">
                {notice}
              </p>
            )}
            <button className="primary full" disabled={busy}>
              {busy ? 'Please wait…' : isReg ? 'Create doctor account' : 'Sign in securely'}{' '}
              <ArrowRight size={16} />
            </button>
          </form>
          <div className="doctor-auth-links">
            {isReg ? (
              <button onClick={() => nav('/doctor/login')}>Already registered? Log in</button>
            ) : (
              <>
                <button onClick={() => nav('/doctor/forgot-password')}>Forgot password?</button>
                <button onClick={() => nav('/doctor/signup')}>Register as a doctor</button>
              </>
            )}
          </div>
          <p className="doctor-disclaimer">
            New doctor accounts are not automatically verified. An administrator must review credentials before the
            profile can be publicly listed.
          </p>
        </div>
      </section>
    );
  }

  if (!authUser)
    return (
      <section className="doctor-auth-shell">
        <div className="doctor-auth-card">
          <div className="doctor-mark">
            <LockKeyhole />
          </div>
          <h1>Sign in to your doctor portal</h1>
          <p>Please sign in to view your professional workspace.</p>
          <button className="primary full" onClick={() => nav('/doctor/login')}>
            Doctor login
          </button>
        </div>
      </section>
    );

  const status = application.status || 'Draft';
  const saveSimple = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveApplication(e);
  };
  const visibleAppointments = appointments.filter(
    a => !application.doctor_id || a.doctor_id === application.doctor_id
  );

  return (
    <section className="doctor-workspace">
      <aside className="doctor-sidebar">
        <button className="doctor-side-brand" onClick={() => nav('/doctor/dashboard')}>
          <span className="doctor-mark small">
            <Stethoscope size={18} />
          </span>
          <span>
            <b>MedQueue</b>
            <small>Doctor Portal</small>
          </span>
        </button>
        <div className="doctor-side-user">
          <div className="avatar">
            {(authUser.name || 'D')
              .split(' ')
              .map((x: string) => x[0])
              .slice(0, 2)
              .join('')}
          </div>
          <div>
            <b>{authUser.name || 'Doctor account'}</b>
            <small>{authUser.email}</small>
          </div>
        </div>
        {[
          ['Overview', '/doctor/dashboard'],
          ['Professional profile', '/doctor/profile'],
          ['Appointments', '/doctor/appointments'],
          ['Availability & calendar', '/doctor/calendar'],
          ['Notifications', '/doctor/notifications'],
          ['Account settings', '/doctor/settings'],
        ].map(([label, path]) => (
          <button
            key={path}
            className={(route === 'dashboard' && label === 'Overview') || title === label ? 'active' : ''}
            onClick={() => nav(path)}
          >
            <ChevronRight size={16} />
            {label}
          </button>
        ))}
        <button className="doctor-side-logout" onClick={signOutDoctor}>
          <ArrowLeft size={16} /> Sign out
        </button>
      </aside>

      <div className="doctor-content">
        <div className="doctor-page-head">
          <div>
            <p className="eyebrow">MEDQUEUE / DOCTOR WORKSPACE</p>
            <h1>{title}</h1>
            <p>Manage your professional profile and appointment workflow.</p>
          </div>
          <span className={'verification-pill ' + (status === 'Verified' ? 'verified' : '')}>{status}</span>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="form-success" role="status">
            {notice}
          </p>
        )}

        {route === 'onboarding' || route === 'profile' ? (
          <form className="doctor-form-panel" onSubmit={saveSimple}>
            <div className="doctor-form-intro">
              <span>PROFILE & CREDENTIALS</span>
              <h2>{route === 'onboarding' ? 'Complete your professional profile' : 'Edit professional profile'}</h2>
              <p>
                Required details are sent to an administrator for verification. Saving never automatically marks an
                account as verified.
              </p>
            </div>
            <div className="doctor-form-grid">
              <label>
                Full name
                <input value={application.full_name ?? authUser.name ?? ''} readOnly />
              </label>
              <label>
                Professional email
                <input value={application.email ?? authUser.email ?? ''} readOnly />
              </label>
              <label>
                Mobile number
                <input
                  value={phone || application.phone || ''}
                  onChange={e => setPhone(e.target.value)}
                  required
                />
              </label>
              <label>
                Specialization
                <input
                  value={application.specialty || ''}
                  onChange={e => setApplication({ ...application, specialty: e.target.value })}
                  required
                  placeholder="e.g. Cardiology"
                />
              </label>
              <label>
                Qualifications
                <input
                  value={application.qualifications || ''}
                  onChange={e => setApplication({ ...application, qualifications: e.target.value })}
                  required
                  placeholder="MBBS, MD…"
                />
              </label>
              <label>
                Years of experience
                <input
                  type="number"
                  min="0"
                  max="70"
                  value={application.experience ?? ''}
                  onChange={e => setApplication({ ...application, experience: e.target.value })}
                />
              </label>
              <label>
                Medical registration number
                <input
                  value={application.license_number || ''}
                  onChange={e => setApplication({ ...application, license_number: e.target.value })}
                  required
                />
              </label>
              <label>
                Licensing authority
                <input
                  value={application.licensing_authority || ''}
                  onChange={e => setApplication({ ...application, licensing_authority: e.target.value })}
                  placeholder="Council / jurisdiction"
                />
              </label>
              <label>
                Medical registration certificate (PDF/JPG/PNG, max 5 MB)
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  onChange={e => setCertificate(e.target.files?.[0] || null)}
                />
                <small className="field-hint">
                  {certificate
                    ? `Selected: ${certificate.name}`
                    : application.registration_certificate_path
                    ? 'A certificate has already been uploaded. Select a file to replace it.'
                    : 'Required for verification review; upload a document you are authorized to share.'}
                </small>
              </label>
              <label>
                Clinic / hospital name
                <input
                  value={application.clinic_name || ''}
                  onChange={e => setApplication({ ...application, clinic_name: e.target.value })}
                />
              </label>
              <label>
                Consultation type
                <select
                  value={application.consultation_type || 'In-person'}
                  onChange={e => setApplication({ ...application, consultation_type: e.target.value })}
                >
                  <option>In-person</option>
                  <option>Online</option>
                  <option>Both</option>
                </select>
              </label>
              <label>
                Practice address
                <input
                  value={application.address || ''}
                  onChange={e => setApplication({ ...application, address: e.target.value })}
                />
              </label>
              <label>
                City
                <input
                  value={application.city || ''}
                  onChange={e => setApplication({ ...application, city: e.target.value })}
                />
              </label>
              <label>
                Consultation fee (₹)
                <input
                  type="number"
                  min="0"
                  value={application.fee ?? ''}
                  onChange={e => setApplication({ ...application, fee: e.target.value })}
                />
              </label>
              <label>
                Languages spoken
                <input
                  value={application.languages || ''}
                  onChange={e => setApplication({ ...application, languages: e.target.value })}
                />
              </label>
              <label className="wide">
                Professional biography
                <textarea
                  rows={4}
                  value={application.bio || ''}
                  onChange={e => setApplication({ ...application, bio: e.target.value })}
                  placeholder="Summarise your professional experience and clinical interests."
                />
              </label>
              <label>
                Working days
                <input
                  value={application.working_days || ''}
                  onChange={e => setApplication({ ...application, working_days: e.target.value })}
                />
              </label>
              <label>
                Consultation hours
                <input
                  value={`${application.start_time || '09:00'} – ${application.end_time || '17:00'}`}
                  readOnly
                />
                <div className="time-pair">
                  <input
                    aria-label="Start time"
                    type="time"
                    value={application.start_time || '09:00'}
                    onChange={e => setApplication({ ...application, start_time: e.target.value })}
                  />
                  <input
                    aria-label="End time"
                    type="time"
                    value={application.end_time || '17:00'}
                    onChange={e => setApplication({ ...application, end_time: e.target.value })}
                  />
                </div>
              </label>
            </div>
            <label className="doctor-declaration">
              <input type="checkbox" required /> I confirm that the professional information provided is accurate and
              can be reviewed for verification.
            </label>
            <div className="doctor-form-actions">
              <button type="button" className="outline" onClick={() => nav('/doctor/dashboard')}>
                Cancel
              </button>
              <button className="primary" disabled={busy}>
                {busy ? 'Saving…' : 'Save and submit for review'} <ArrowRight size={16} />
              </button>
            </div>
          </form>
        ) : route === 'appointments' ? (
          <div className="doctor-panel">
            <div className="doctor-panel-head">
              <h2>Appointment requests</h2>
              <span>{visibleAppointments.length} records</span>
            </div>
            {!visibleAppointments.length ? (
              <div className="doctor-empty">
                <CalendarDays />
                <h3>No appointments available</h3>
                <p>Requests assigned to your verified provider account will appear here.</p>
              </div>
            ) : (
              visibleAppointments.map(a => (
                <div className="doctor-appointment" key={a.id}>
                  <div className="appointment-date">
                    <b>{a.appointment_date}</b>
                    <span>{a.slot}</span>
                  </div>
                  <div className="appointment-detail">
                    <b>{a.patient_name}</b>
                    <span>
                      {a.doctor_name} · {a.specialty} · {a.hospital_name}
                    </span>
                    <small>
                      Reference {a.id} · {a.status}
                    </small>
                  </div>
                  <div className="appointment-actions">
                    {a.status === 'Pending' && (
                      <button onClick={() => updateBooking(a.id, 'Confirmed')}>Approve</button>
                    )}
                    {a.status !== 'Cancelled' && (
                      <button className="cancel-action" onClick={() => updateBooking(a.id, 'Cancelled')}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : route === 'calendar' ? (
          <div className="doctor-panel">
            <div className="doctor-panel-head">
              <h2>Weekly availability</h2>
              <span>Saved with your profile</span>
            </div>
            <form onSubmit={saveSimple} className="availability-form">
              <label>
                Working days
                <input
                  value={application.working_days || ''}
                  onChange={e => setApplication({ ...application, working_days: e.target.value })}
                />
              </label>
              <label>
                Start time
                <input
                  type="time"
                  value={application.start_time || '09:00'}
                  onChange={e => setApplication({ ...application, start_time: e.target.value })}
                />
              </label>
              <label>
                End time
                <input
                  type="time"
                  value={application.end_time || '17:00'}
                  onChange={e => setApplication({ ...application, end_time: e.target.value })}
                />
              </label>
              <label>
                Appointment duration
                <select
                  value={application.slot_minutes || 30}
                  onChange={e => setApplication({ ...application, slot_minutes: Number(e.target.value) })}
                >
                  <option value={15}>15 minutes</option>
                  <option value={20}>20 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
              </label>
              <button className="primary" disabled={busy}>
                Save availability
              </button>
            </form>
            <p className="doctor-note">
              Availability settings are stored with the doctor profile. Public booking slots use scheduled calendar
              rules.
            </p>
          </div>
        ) : route === 'notifications' ? (
          <div className="doctor-panel">
            <div className="doctor-panel-head">
              <h2>Notifications</h2>
            </div>
            <div className="doctor-empty">
              <Mail />
              <h3>You’re all caught up</h3>
              <p>Verification updates and appointment alerts will appear here.</p>
            </div>
          </div>
        ) : route === 'settings' ? (
          <div className="doctor-panel">
            <div className="doctor-panel-head">
              <h2>Account settings</h2>
            </div>
            <div className="settings-row">
              <div>
                <b>Account email</b>
                <p>{authUser.email}</p>
              </div>
              <span>Managed by secure sign-in</span>
            </div>
            <div className="settings-row">
              <div>
                <b>Verification status</b>
                <p>{status}</p>
              </div>
              <span>Admin review required</span>
            </div>
            <button className="outline" onClick={() => nav('/doctor/forgot-password')}>
              Change password
            </button>
            <button className="outline" onClick={signOutDoctor}>
              Sign out of this session
            </button>
          </div>
        ) : (
          <>
            <div className="doctor-stats">
              <div>
                <span>Profile completion</span>
                <b>
                  {(
                    (['specialty', 'qualifications', 'license_number', 'clinic_name', 'address', 'bio'].filter(
                      k => String(application[k] || '').trim()
                    ).length /
                      6) *
                    100
                  ) | 0}
                  %
                </b>
                <small>Complete your professional details</small>
              </div>
              <div>
                <span>Verification</span>
                <b className="status-text">{status}</b>
                <small>Reviewed by an administrator</small>
              </div>
              <div>
                <span>Appointments loaded</span>
                <b>{appointments.length || bookings.length}</b>
                <small>Only permitted records are shown</small>
              </div>
            </div>
            <div className="doctor-panel">
              <div className="doctor-panel-head">
                <h2>Getting started</h2>
                <span>Setup checklist</span>
              </div>
              <div className="doctor-checklist">
                <div>
                  <Check />
                  <span>
                    <b>Secure account created</b>
                    <small>Your login is handled by Supabase Auth.</small>
                  </span>
                </div>
                <div>
                  <UserRound />
                  <span>
                    <b>Complete your professional profile</b>
                    <small>Add qualifications and medical registration details.</small>
                  </span>
                  <button onClick={() => nav('/doctor/onboarding')}>Complete profile</button>
                </div>
                <div>
                  <ShieldCheck />
                  <span>
                    <b>Administrator verification</b>
                    <small>Public listing requires document review and approval.</small>
                  </span>
                </div>
                <div>
                  <CalendarDays />
                  <span>
                    <b>Set your availability</b>
                    <small>Save your regular working days and hours.</small>
                  </span>
                  <button onClick={() => nav('/doctor/calendar')}>Set schedule</button>
                </div>
              </div>
            </div>
            <div className="doctor-panel">
              <div className="doctor-panel-head">
                <h2>Recent appointments</h2>
                <button className="text-btn" onClick={() => nav('/doctor/appointments')}>
                  View all <ArrowRight size={14} />
                </button>
              </div>
              {!appointments.length ? (
                <p className="doctor-note">
                  No doctor-specific appointments are available yet. After verification and provider linking, assigned
                  appointment requests will appear here.
                </p>
              ) : (
                appointments.slice(0, 4).map(a => (
                  <div className="doctor-appointment" key={a.id}>
                    <div className="appointment-date">
                      <b>{a.appointment_date}</b>
                      <span>{a.slot}</span>
                    </div>
                    <div className="appointment-detail">
                      <b>{a.patient_name}</b>
                      <span>
                        {a.doctor_name} · {a.specialty}
                      </span>
                    </div>
                    <span className="status-text">{a.status}</span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <ToastProvider>
      <App />
    </ToastProvider>
  </BrowserRouter>
);
