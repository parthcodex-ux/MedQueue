import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  ShieldCheck,
  CalendarDays,
  Building2,
  Tag,
  Star,
  BarChart3,
  Bell,
  FileText,
  Settings,
  User,
  LogOut,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Download,
  Plus,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Eye,
  Edit2,
  Trash2,
  Check,
  X,
  MapPin,
  Phone,
  FileCheck,
  AlertCircle,
  Menu,
  Layers,
  HeartPulse,
} from 'lucide-react';
import type {
  AuthUser,
  AdminStats,
  DoctorApplication,
  Appointment,
  HospitalRecord,
  SpecialtyRecord,
  ReviewRecord,
  AuditLogRecord,
  AdminNotification,
  SystemSettings,
} from '../types';
import {
  fetchAdminOverviewStats,
  fetchUsersList,
  updateUserProfile,
  toggleUserSuspension,
  fetchDoctorApplications,
  approveDoctorApplication,
  rejectDoctorApplication,
  requestDoctorInfo,
  setDoctorUnderReview,
  getDoctorCertificateSignedUrl,
  fetchAdminAppointments,
  updateAdminAppointmentStatus,
  fetchAdminHospitals,
  saveHospitalRecord,
  deleteHospitalRecord,
  fetchAdminSpecialties,
  saveSpecialtyRecord,
  deleteSpecialtyRecord,
  fetchAdminReviews,
  moderateReviewRecord,
  fetchAdminNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  fetchAdminAuditLogs,
  fetchSystemSettingsRecord,
  saveSystemSettingsRecord,
  exportToCsv,
} from '../lib/admin';
import { updatePassword } from '../lib/auth';
import { useToast } from '../components/Toast';

type AdminTab =
  | 'overview'
  | 'users'
  | 'doctors'
  | 'verification'
  | 'appointments'
  | 'hospitals'
  | 'specialties'
  | 'reviews'
  | 'analytics'
  | 'notifications'
  | 'audit-logs'
  | 'settings'
  | 'profile';

interface AdminDashboardProps {
  authUser: AuthUser;
  onSignOut: () => Promise<void>;
}

export function AdminDashboard({ authUser, onSignOut }: AdminDashboardProps) {
  const nav = useNavigate();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Notifications live badge count
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Global Refresh trigger
  const [refreshIndex, setRefreshIndex] = useState(0);
  const triggerRefresh = () => setRefreshIndex(prev => prev + 1);

  // Load unread notifications count
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const notifs = await fetchAdminNotifications();
        if (active) {
          setUnreadNotificationsCount(notifs.filter(n => !n.isRead).length);
        }
      } catch {}
    })();
    return () => {
      active = false;
    };
  }, [refreshIndex]);

  const navItems: { id: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
    { id: 'users', label: 'User Management', icon: <Users size={18} /> },
    { id: 'doctors', label: 'Doctor Management', icon: <Stethoscope size={18} /> },
    { id: 'verification', label: 'Doctor Verification', icon: <FileCheck size={18} /> },
    { id: 'appointments', label: 'Appointment Management', icon: <CalendarDays size={18} /> },
    { id: 'hospitals', label: 'Hospitals & Clinics', icon: <Building2 size={18} /> },
    { id: 'specialties', label: 'Specialties Management', icon: <Tag size={18} /> },
    { id: 'reviews', label: 'Reviews & Feedback', icon: <Star size={18} /> },
    { id: 'analytics', label: 'Reports & Analytics', icon: <BarChart3 size={18} /> },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <Bell size={18} />,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
    },
    { id: 'audit-logs', label: 'Audit Logs', icon: <FileText size={18} /> },
    { id: 'settings', label: 'System Settings', icon: <Settings size={18} /> },
    { id: 'profile', label: 'My Profile', icon: <User size={18} /> },
  ];

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out of the administrator console?')) {
      await onSignOut();
      nav('/admin/login');
    }
  };

  return (
    <div className="admin-portal-layout">
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div className="admin-sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Admin Sidebar */}
      <aside className={`admin-portal-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-brand-lockup">
            <span className="admin-brand-icon">
              <ShieldCheck size={20} />
            </span>
            <div>
              <h3>MedQueue Admin</h3>
              <small>System Control Hub</small>
            </div>
          </div>
          <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="admin-sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`admin-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(item.id);
                setSidebarOpen(false);
              }}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              <span className="admin-nav-label">{item.label}</span>
              {item.badge !== undefined && (
                <span className="admin-nav-badge">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-pill">
            <div className="admin-avatar">
              {(authUser.name || 'AD').slice(0, 2).toUpperCase()}
            </div>
            <div className="admin-user-meta">
              <b>{authUser.name || 'Administrator'}</b>
              <span>{authUser.email}</span>
            </div>
          </div>
          <button className="admin-logout-btn" onClick={handleLogout} title="Sign Out">
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="admin-portal-body">
        {/* Top Header */}
        <header className="admin-portal-topbar">
          <div className="admin-topbar-left">
            <button
              className="admin-mobile-toggle"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>
            <div className="admin-breadcrumb">
              <span>Admin Console</span>
              <ChevronRight size={14} />
              <b>{navItems.find(i => i.id === activeTab)?.label}</b>
            </div>
          </div>

          <div className="admin-topbar-right">
            <button
              className="admin-icon-action"
              onClick={triggerRefresh}
              title="Refresh Data"
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              className="admin-icon-action notif-btn"
              onClick={() => setActiveTab('notifications')}
              title="Notifications"
            >
              <Bell size={16} />
              {unreadNotificationsCount > 0 && (
                <span className="notif-dot">{unreadNotificationsCount}</span>
              )}
            </button>

            <div className="admin-portal-status">
              <span className="status-indicator-dot online" />
              <span>Supabase Connected</span>
            </div>
          </div>
        </header>

        {/* Content View */}
        <main className="admin-portal-content">
          {activeTab === 'overview' && (
            <AdminOverviewSection
              refreshIndex={refreshIndex}
              onNavigate={setActiveTab}
              showToast={showToast}
            />
          )}

          {activeTab === 'users' && (
            <AdminUsersSection refreshIndex={refreshIndex} showToast={showToast} />
          )}

          {activeTab === 'doctors' && (
            <AdminDoctorsSection
              refreshIndex={refreshIndex}
              onNavigate={setActiveTab}
              showToast={showToast}
            />
          )}

          {activeTab === 'verification' && (
            <AdminVerificationSection
              refreshIndex={refreshIndex}
              showToast={showToast}
              onApproved={triggerRefresh}
            />
          )}

          {activeTab === 'appointments' && (
            <AdminAppointmentsSection refreshIndex={refreshIndex} showToast={showToast} />
          )}

          {activeTab === 'hospitals' && (
            <AdminHospitalsSection refreshIndex={refreshIndex} showToast={showToast} />
          )}

          {activeTab === 'specialties' && (
            <AdminSpecialtiesSection refreshIndex={refreshIndex} showToast={showToast} />
          )}

          {activeTab === 'reviews' && (
            <AdminReviewsSection refreshIndex={refreshIndex} showToast={showToast} />
          )}

          {activeTab === 'analytics' && (
            <AdminAnalyticsSection refreshIndex={refreshIndex} showToast={showToast} />
          )}

          {activeTab === 'notifications' && (
            <AdminNotificationsSection
              refreshIndex={refreshIndex}
              showToast={showToast}
              onReadChange={triggerRefresh}
            />
          )}

          {activeTab === 'audit-logs' && (
            <AdminAuditLogsSection refreshIndex={refreshIndex} showToast={showToast} />
          )}

          {activeTab === 'settings' && (
            <AdminSettingsSection refreshIndex={refreshIndex} showToast={showToast} />
          )}

          {activeTab === 'profile' && (
            <AdminProfileSection authUser={authUser} showToast={showToast} />
          )}
        </main>
      </div>
    </div>
  );
}

// ==============================================================================
// 1. OVERVIEW SECTION
// ==============================================================================
function AdminOverviewSection({
  refreshIndex,
  onNavigate,
  showToast,
}: {
  refreshIndex: number;
  onNavigate: (tab: AdminTab) => void;
  showToast: (msg: string, type?: any) => void;
}) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const data = await fetchAdminOverviewStats();
        if (active) setStats(data);
      } catch (err: any) {
        if (active) showToast(err?.message || 'Could not load admin stats.', 'error');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshIndex]);

  if (loading && !stats) {
    return <div className="admin-loading-state">Loading live database telemetry…</div>;
  }

  const s = stats || {
    totalUsers: 0,
    totalDoctors: 0,
    verifiedDoctors: 0,
    pendingDoctorApplications: 0,
    rejectedOrIncompleteDoctors: 0,
    totalAppointments: 0,
    pendingAppointments: 0,
    confirmedAppointments: 0,
    cancelledAppointments: 0,
    specialtyDemand: [],
    appointmentsByStatus: [],
    recentRegistrations: [],
    recentApplications: [],
    recentAppointments: [],
    recentAuditLogs: [],
  };

  return (
    <div className="admin-section-wrap">
      <div className="admin-section-head">
        <div>
          <h2>System Telemetry & Operational Overview</h2>
          <p>Real-time status of users, provider credentialing, and platform bookings.</p>
        </div>
        <div className="admin-head-actions">
          {s.pendingDoctorApplications > 0 && (
            <button
              className="primary compact-btn"
              onClick={() => onNavigate('verification')}
            >
              <FileCheck size={15} />
              <span>Review {s.pendingDoctorApplications} Pending Doctors</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="admin-kpi-grid">
        <div className="kpi-card" onClick={() => onNavigate('users')}>
          <div className="kpi-top">
            <span className="kpi-label">Registered Users</span>
            <span className="kpi-icon users">
              <Users size={18} />
            </span>
          </div>
          <div className="kpi-value">{s.totalUsers}</div>
          <span className="kpi-meta">Patient accounts in database</span>
        </div>

        <div className="kpi-card" onClick={() => onNavigate('doctors')}>
          <div className="kpi-top">
            <span className="kpi-label">Total Doctors</span>
            <span className="kpi-icon doctors">
              <Stethoscope size={18} />
            </span>
          </div>
          <div className="kpi-value">{s.totalDoctors}</div>
          <span className="kpi-meta">{s.verifiedDoctors} actively verified</span>
        </div>

        <div className="kpi-card highlight-card" onClick={() => onNavigate('verification')}>
          <div className="kpi-top">
            <span className="kpi-label">Pending Verification</span>
            <span className="kpi-icon warning">
              <Clock size={18} />
            </span>
          </div>
          <div className="kpi-value">{s.pendingDoctorApplications}</div>
          <span className="kpi-meta">Awaiting document review</span>
        </div>

        <div className="kpi-card" onClick={() => onNavigate('appointments')}>
          <div className="kpi-top">
            <span className="kpi-label">Total Appointments</span>
            <span className="kpi-icon appts">
              <CalendarDays size={18} />
            </span>
          </div>
          <div className="kpi-value">{s.totalAppointments}</div>
          <span className="kpi-meta">{s.confirmedAppointments} confirmed bookings</span>
        </div>
      </div>

      {/* Secondary Status Metrics */}
      <div className="admin-subkpi-row">
        <div className="subkpi-pill">
          <span className="dot confirmed" />
          <span>Confirmed Bookings:</span>
          <b>{s.confirmedAppointments}</b>
        </div>
        <div className="subkpi-pill">
          <span className="dot pending" />
          <span>Pending Bookings:</span>
          <b>{s.pendingAppointments}</b>
        </div>
        <div className="subkpi-pill">
          <span className="dot cancelled" />
          <span>Cancelled Bookings:</span>
          <b>{s.cancelledAppointments}</b>
        </div>
        <div className="subkpi-pill">
          <span className="dot rejected" />
          <span>Rejected/Draft Doctors:</span>
          <b>{s.rejectedOrIncompleteDoctors}</b>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="admin-two-col-grid">
        {/* Specialty Demand */}
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h3>Most Frequently Booked Specialties</h3>
            <span className="panel-badge">Live DB Demand</span>
          </div>
          {s.specialtyDemand.length === 0 ? (
            <div className="admin-empty-state">
              <Tag size={28} />
              <p>No specialty booking records found yet.</p>
            </div>
          ) : (
            <div className="specialty-demand-list">
              {s.specialtyDemand.slice(0, 6).map(item => {
                const maxCount = Math.max(...s.specialtyDemand.map(x => x.count), 1);
                const percent = Math.round((item.count / maxCount) * 100);
                return (
                  <div key={item.specialty} className="demand-bar-row">
                    <div className="demand-info">
                      <span className="demand-name">{item.specialty}</span>
                      <span className="demand-count">{item.count} appointments</span>
                    </div>
                    <div className="demand-track">
                      <div className="demand-fill" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Doctor Applications */}
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h3>Recent Doctor Applications</h3>
            <button className="link-action" onClick={() => onNavigate('verification')}>
              View all queue →
            </button>
          </div>
          {s.recentApplications.length === 0 ? (
            <div className="admin-empty-state">
              <Stethoscope size={28} />
              <p>No doctor applications submitted yet.</p>
            </div>
          ) : (
            <div className="recent-list">
              {s.recentApplications.map(doc => (
                <div key={doc.user_id} className="recent-item">
                  <div className="recent-avatar doc">
                    <Stethoscope size={16} />
                  </div>
                  <div className="recent-meta">
                    <b>Dr. {doc.full_name || 'Unnamed Doctor'}</b>
                    <span>
                      {doc.specialty} · {doc.city || 'Location not specified'}
                    </span>
                  </div>
                  <span className={`status-badge status-${doc.status.toLowerCase().replace(/\s+/g, '-')}`}>
                    {doc.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Appointments & Audit Events */}
      <div className="admin-two-col-grid">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h3>Recent Platform Appointments</h3>
            <button className="link-action" onClick={() => onNavigate('appointments')}>
              View all →
            </button>
          </div>
          {s.recentAppointments.length === 0 ? (
            <div className="admin-empty-state">
              <CalendarDays size={28} />
              <p>No appointments created yet.</p>
            </div>
          ) : (
            <div className="recent-list">
              {s.recentAppointments.map(a => (
                <div key={a.id} className="recent-item">
                  <div className="recent-avatar appt">
                    <CalendarDays size={16} />
                  </div>
                  <div className="recent-meta">
                    <b>{a.patientName}</b>
                    <span>
                      Dr. {a.doctorName} · {a.appointmentDate} ({a.slot})
                    </span>
                  </div>
                  <span className={`status-badge status-${a.status.toLowerCase()}`}>
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="admin-panel">
          <div className="admin-panel-head">
            <h3>Recent Administrative Actions</h3>
            <button className="link-action" onClick={() => onNavigate('audit-logs')}>
              Audit log →
            </button>
          </div>
          {s.recentAuditLogs.length === 0 ? (
            <div className="admin-empty-state">
              <FileText size={28} />
              <p>No audit events recorded yet.</p>
            </div>
          ) : (
            <div className="recent-list">
              {s.recentAuditLogs.map(log => (
                <div key={log.id} className="recent-item">
                  <div className="recent-avatar audit">
                    <ShieldCheck size={16} />
                  </div>
                  <div className="recent-meta">
                    <b>{log.action.replace(/_/g, ' ').toUpperCase()}</b>
                    <span>
                      Target: {log.entityType} ({log.entityId.slice(0, 8)}…)
                    </span>
                  </div>
                  <small className="recent-time">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==============================================================================
// 2. USER MANAGEMENT SECTION
// ==============================================================================
function AdminUsersSection({
  refreshIndex,
  showToast,
}: {
  refreshIndex: number;
  showToast: (msg: string, type?: any) => void;
}) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Edit / Details Modal State
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchUsersList();
      setUsers(data);
    } catch (err: any) {
      showToast(err?.message || 'Failed to fetch registered users.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, [refreshIndex]);

  const handleToggleSuspension = async (user: any) => {
    const actionName = user.isSuspended ? 'reactivate' : 'suspend';
    if (!window.confirm(`Are you sure you want to ${actionName} account "${user.fullName}"?`)) {
      return;
    }
    const reason = window.prompt(`Enter reason for ${actionName} (optional):`) || '';
    try {
      await toggleUserSuspension(user.id, !user.isSuspended, reason);
      showToast(`User ${user.fullName} successfully ${user.isSuspended ? 'reactivated' : 'suspended'}.`, 'success');
      void loadUsers();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update account status.', 'error');
    }
  };

  const handleSaveProfile = async () => {
    if (!selectedUser) return;
    setSavingEdit(true);
    try {
      await updateUserProfile(selectedUser.id, { full_name: editName.trim() });
      showToast('User profile updated successfully.', 'success');
      setSelectedUser(null);
      void loadUsers();
    } catch (err: any) {
      showToast(err?.message || 'Could not update profile.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const filtered = users.filter(u => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'suspended' ? u.isSuspended : !u.isSuspended);
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="admin-section-wrap">
      <div className="admin-section-head">
        <div>
          <h2>User Account Management</h2>
          <p>Inspect registered platform identities, roles, suspension states, and history.</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-filter-bar">
        <div className="admin-search-input">
          <Search size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by full name or User UUID…"
          />
        </div>

        <div className="admin-filter-group">
          <label>Role:</label>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="all">All Roles</option>
            <option value="patient">Patient</option>
            <option value="provider">Doctor / Provider</option>
            <option value="admin">Administrator</option>
          </select>
        </div>

        <div className="admin-filter-group">
          <label>Status:</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="admin-table-card">
        {loading ? (
          <div className="admin-loading-state">Loading user accounts…</div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty-state">
            <Users size={32} />
            <h4>No user accounts match criteria</h4>
            <p>Try adjusting your search query or role filters.</p>
          </div>
        ) : (
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Registered</th>
                <th>Appointments</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="table-user-cell">
                      <div className="avatar-mini">
                        {(u.fullName || 'U').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <b>{u.fullName}</b>
                        <small>{u.id}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`role-badge role-${u.role}`}>{u.role}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${u.isSuspended ? 'status-suspended' : 'status-active'}`}>
                      {u.isSuspended ? 'Suspended' : 'Active'}
                    </span>
                  </td>
                  <td>
                    <span className="date-cell">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <span className="count-pill">{u.appointmentCount}</span>
                  </td>
                  <td>
                    <div className="table-actions-cell">
                      <button
                        className="table-action-btn"
                        onClick={() => {
                          setSelectedUser(u);
                          setEditName(u.fullName);
                        }}
                        title="View / Edit Profile"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        className={`table-action-btn ${u.isSuspended ? 'action-reactivate' : 'action-suspend'}`}
                        onClick={() => handleToggleSuspension(u)}
                        title={u.isSuspended ? 'Reactivate Account' : 'Suspend Account'}
                      >
                        {u.isSuspended ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* User Details & Edit Modal */}
      {selectedUser && (
        <div className="admin-modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>User Profile Details</h3>
              <button className="modal-close-btn" onClick={() => setSelectedUser(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="admin-modal-body">
              <div className="modal-info-block">
                <label>User UUID:</label>
                <code>{selectedUser.id}</code>
              </div>
              <div className="modal-info-block">
                <label>Account Role:</label>
                <span className={`role-badge role-${selectedUser.role}`}>{selectedUser.role}</span>
              </div>
              <div className="modal-info-block">
                <label>Account Status:</label>
                <span className={`status-badge ${selectedUser.isSuspended ? 'status-suspended' : 'status-active'}`}>
                  {selectedUser.isSuspended ? 'Suspended' : 'Active'}
                </span>
              </div>
              <div className="modal-info-block">
                <label>Registration Date:</label>
                <span>{new Date(selectedUser.createdAt).toLocaleString()}</span>
              </div>
              <div className="modal-info-block">
                <label>Total Bookings:</label>
                <span>{selectedUser.appointmentCount} records</span>
              </div>

              <hr />
              <h4>Permitted Profile Edits</h4>
              <label className="modal-field">
                <span>Full Name</span>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Enter full name"
                />
              </label>
            </div>
            <div className="admin-modal-footer">
              <button className="outline" onClick={() => setSelectedUser(null)}>
                Cancel
              </button>
              <button className="primary" disabled={savingEdit} onClick={handleSaveProfile}>
                {savingEdit ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================================================================
// 3. DOCTOR MANAGEMENT SECTION
// ==============================================================================
function AdminDoctorsSection({
  refreshIndex,
  onNavigate,
  showToast,
}: {
  refreshIndex: number;
  onNavigate: (tab: AdminTab) => void;
  showToast: (msg: string, type?: any) => void;
}) {
  const [doctors, setDoctors] = useState<DoctorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [inspectDoc, setInspectDoc] = useState<DoctorApplication | null>(null);

  const loadDoctors = async () => {
    setLoading(true);
    try {
      const data = await fetchDoctorApplications();
      setDoctors(data);
    } catch (err: any) {
      showToast(err?.message || 'Could not load doctor profiles.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDoctors();
  }, [refreshIndex]);

  const filtered = doctors.filter(d => {
    const q = searchTerm.toLowerCase();
    const matchQuery =
      d.full_name.toLowerCase().includes(q) ||
      d.email.toLowerCase().includes(q) ||
      d.specialty.toLowerCase().includes(q) ||
      d.clinic_name.toLowerCase().includes(q) ||
      (d.doctor_id || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchQuery && matchStatus;
  });

  return (
    <div className="admin-section-wrap">
      <div className="admin-section-head">
        <div>
          <h2>Doctor Roster & Verification Status</h2>
          <p>Manage registered medical practitioners, credentials, and verification state.</p>
        </div>
        <button className="primary compact-btn" onClick={() => onNavigate('verification')}>
          <FileCheck size={16} />
          <span>Open Verification Queue</span>
        </button>
      </div>

      <div className="admin-filter-bar">
        <div className="admin-search-input">
          <Search size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by doctor name, specialty, clinic, or ID…"
          />
        </div>

        <div className="admin-filter-group">
          <label>Status:</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="Verified">Verified</option>
            <option value="Submitted for review">Submitted for Review</option>
            <option value="Under review">Under Review</option>
            <option value="Action required">Action Required</option>
            <option value="Rejected">Rejected</option>
            <option value="Draft">Draft</option>
          </select>
        </div>
      </div>

      <div className="admin-table-card">
        {loading ? (
          <div className="admin-loading-state">Loading doctor records…</div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty-state">
            <Stethoscope size={32} />
            <h4>No doctor records found</h4>
            <p>No profiles match your filter criteria.</p>
          </div>
        ) : (
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Specialty</th>
                <th>Clinic / Hospital</th>
                <th>Experience</th>
                <th>License</th>
                <th>Status</th>
                <th>Catalog ID</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.user_id}>
                  <td>
                    <div className="table-user-cell">
                      <div className="avatar-mini doc">
                        {(d.full_name || 'Dr').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <b>Dr. {d.full_name || 'Unnamed'}</b>
                        <small>{d.email || d.phone}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="tag-pill">{d.specialty || 'General'}</span>
                  </td>
                  <td>{d.clinic_name || 'Private Practice'}</td>
                  <td>{d.experience} yrs</td>
                  <td>
                    <code>{d.license_number || 'N/A'}</code>
                  </td>
                  <td>
                    <span className={`status-badge status-${d.status.toLowerCase().replace(/\s+/g, '-')}`}>
                      {d.status}
                    </span>
                  </td>
                  <td>
                    <code>{d.doctor_id || 'Unassigned'}</code>
                  </td>
                  <td>
                    <div className="table-actions-cell">
                      <button
                        className="table-action-btn"
                        onClick={() => setInspectDoc(d)}
                        title="View Full Credentials"
                      >
                        <Eye size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Doctor Details Modal */}
      {inspectDoc && (
        <div className="admin-modal-overlay" onClick={() => setInspectDoc(null)}>
          <div className="admin-modal-card wide" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Doctor Professional Credentials</h3>
              <button className="modal-close-btn" onClick={() => setInspectDoc(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="admin-modal-body modal-grid-layout">
              <div>
                <h4>General Profile</h4>
                <div className="detail-row">
                  <span>Full Name:</span>
                  <b>Dr. {inspectDoc.full_name}</b>
                </div>
                <div className="detail-row">
                  <span>Professional Email:</span>
                  <span>{inspectDoc.email}</span>
                </div>
                <div className="detail-row">
                  <span>Contact Phone:</span>
                  <span>{inspectDoc.phone}</span>
                </div>
                <div className="detail-row">
                  <span>Specialty:</span>
                  <b>{inspectDoc.specialty}</b>
                </div>
                <div className="detail-row">
                  <span>Qualifications:</span>
                  <span>{inspectDoc.qualifications}</span>
                </div>
                <div className="detail-row">
                  <span>Experience:</span>
                  <span>{inspectDoc.experience} years</span>
                </div>
              </div>

              <div>
                <h4>Practice & Credentialing</h4>
                <div className="detail-row">
                  <span>Medical License #:</span>
                  <code>{inspectDoc.license_number}</code>
                </div>
                <div className="detail-row">
                  <span>Licensing Council:</span>
                  <span>{inspectDoc.licensing_authority || 'Not stated'}</span>
                </div>
                <div className="detail-row">
                  <span>Clinic / Hospital:</span>
                  <span>{inspectDoc.clinic_name}</span>
                </div>
                <div className="detail-row">
                  <span>Location:</span>
                  <span>
                    {inspectDoc.address ? `${inspectDoc.address}, ` : ''}
                    {inspectDoc.city}
                  </span>
                </div>
                <div className="detail-row">
                  <span>Consultation Fee:</span>
                  <span>₹{inspectDoc.fee ?? 'Not specified'}</span>
                </div>
                <div className="detail-row">
                  <span>Current Status:</span>
                  <span className={`status-badge status-${inspectDoc.status.toLowerCase().replace(/\s+/g, '-')}`}>
                    {inspectDoc.status}
                  </span>
                </div>
              </div>

              <div className="full-col">
                <h4>Biography & Working Hours</h4>
                <p className="modal-bio">{inspectDoc.bio || 'No biography provided.'}</p>
                <div className="detail-row">
                  <span>Working Schedule:</span>
                  <span>
                    {inspectDoc.working_days} ({inspectDoc.start_time} – {inspectDoc.end_time})
                  </span>
                </div>
                {inspectDoc.admin_feedback && (
                  <div className="admin-feedback-box">
                    <b>Admin Feedback / Reason:</b>
                    <p>{inspectDoc.admin_feedback}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="primary" onClick={() => setInspectDoc(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================================================================
// 4. DOCTOR VERIFICATION WORKBENCH
// ==============================================================================
function AdminVerificationSection({
  refreshIndex,
  showToast,
  onApproved,
}: {
  refreshIndex: number;
  showToast: (msg: string, type?: any) => void;
  onApproved: () => void;
}) {
  const [applications, setApplications] = useState<DoctorApplication[]>([]);
  const [loading, setLoading] = useState(true);

  // Rejection modal
  const [rejectingApp, setRejectingApp] = useState<DoctorApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Info request modal
  const [infoApp, setInfoApp] = useState<DoctorApplication | null>(null);
  const [infoMessage, setInfoMessage] = useState('');

  // Approval modal
  const [approvingApp, setApprovingApp] = useState<DoctorApplication | null>(null);
  const [assignedDocId, setAssignedDocId] = useState('');

  const loadQueue = async () => {
    setLoading(true);
    try {
      const data = await fetchDoctorApplications();
      // Filter to items needing attention or active review
      setApplications(
        data.filter(
          d =>
            d.status === 'Submitted for review' ||
            d.status === 'Under review' ||
            d.status === 'Action required'
        )
      );
    } catch (err: any) {
      showToast(err?.message || 'Could not load verification queue.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQueue();
  }, [refreshIndex]);

  const handleOpenCertificate = async (path: string | null | undefined) => {
    if (!path) {
      showToast('No registration certificate document was uploaded.', 'info');
      return;
    }
    try {
      const signedUrl = await getDoctorCertificateSignedUrl(path);
      if (signedUrl) {
        window.open(signedUrl, '_blank', 'noopener,noreferrer');
      } else {
        showToast('Unable to create signed URL for document. Verify bucket permissions.', 'error');
      }
    } catch (e: any) {
      showToast(e?.message || 'Certificate access error.', 'error');
    }
  };

  const handleMarkUnderReview = async (app: DoctorApplication) => {
    try {
      await setDoctorUnderReview(app.user_id);
      showToast(`Dr. ${app.full_name}'s application marked as Under Review.`, 'success');
      void loadQueue();
      onApproved();
    } catch (e: any) {
      showToast(e?.message || 'Could not update status.', 'error');
    }
  };

  const handleApproveSubmit = async () => {
    if (!approvingApp) return;
    try {
      await approveDoctorApplication(approvingApp.user_id, assignedDocId.trim() || undefined);
      showToast(`Dr. ${approvingApp.full_name} has been verified and granted provider access!`, 'success');
      setApprovingApp(null);
      void loadQueue();
      onApproved();
    } catch (e: any) {
      showToast(e?.message || 'Approval failed.', 'error');
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectingApp) return;
    if (!rejectionReason.trim()) {
      showToast('A reason is required to reject an application.', 'error');
      return;
    }
    try {
      await rejectDoctorApplication(rejectingApp.user_id, rejectionReason.trim());
      showToast(`Application for Dr. ${rejectingApp.full_name} marked as Rejected.`, 'info');
      setRejectingApp(null);
      setRejectionReason('');
      void loadQueue();
      onApproved();
    } catch (e: any) {
      showToast(e?.message || 'Rejection failed.', 'error');
    }
  };

  const handleInfoSubmit = async () => {
    if (!infoApp) return;
    if (!infoMessage.trim()) {
      showToast('Please state what additional information or documentation is needed.', 'error');
      return;
    }
    try {
      await requestDoctorInfo(infoApp.user_id, infoMessage.trim());
      showToast(`Information request sent to Dr. ${infoApp.full_name}.`, 'success');
      setInfoApp(null);
      setInfoMessage('');
      void loadQueue();
      onApproved();
    } catch (e: any) {
      showToast(e?.message || 'Request failed.', 'error');
    }
  };

  return (
    <div className="admin-section-wrap">
      <div className="admin-section-head">
        <div>
          <h2>Doctor Credentialing & Verification Queue</h2>
          <p>
            Verify medical licenses, inspect official certificates, and approve platform provider access.
          </p>
        </div>
        <span className="queue-counter-pill">
          {applications.length} Pending Review
        </span>
      </div>

      {loading ? (
        <div className="admin-loading-state">Loading verification workbench…</div>
      ) : applications.length === 0 ? (
        <div className="admin-empty-state card-padded">
          <CheckCircle2 size={42} className="text-success" />
          <h3>Verification Queue is Empty</h3>
          <p>All submitted doctor applications have been processed.</p>
        </div>
      ) : (
        <div className="verification-cards-grid">
          {applications.map(app => (
            <div key={app.user_id} className="verification-card">
              <div className="verif-card-header">
                <div>
                  <span className={`status-badge status-${app.status.toLowerCase().replace(/\s+/g, '-')}`}>
                    {app.status}
                  </span>
                  <h3>Dr. {app.full_name}</h3>
                  <p className="verif-sub">
                    {app.specialty} · {app.qualifications} · {app.experience} yrs exp
                  </p>
                </div>
                <div className="verif-badge-icon">
                  <Stethoscope size={24} />
                </div>
              </div>

              <div className="verif-details-grid">
                <div>
                  <small>Medical License Number</small>
                  <b>{app.license_number}</b>
                </div>
                <div>
                  <small>Licensing Authority</small>
                  <span>{app.licensing_authority || 'State Medical Council'}</span>
                </div>
                <div>
                  <small>Clinic / Hospital</small>
                  <span>{app.clinic_name || 'Independent Clinic'}</span>
                </div>
                <div>
                  <small>Location</small>
                  <span>{app.city || 'Not specified'}</span>
                </div>
              </div>

              {app.bio && (
                <div className="verif-bio-box">
                  <small>Applicant Statement</small>
                  <p>{app.bio}</p>
                </div>
              )}

              {/* Certificate Viewer Action */}
              <div className="verif-certificate-action">
                <button
                  className="outline compact-btn"
                  onClick={() => handleOpenCertificate(app.registration_certificate_path)}
                >
                  <ExternalLink size={14} />
                  <span>
                    {app.registration_certificate_path
                      ? 'Review Registration Certificate (Secure Link)'
                      : 'No Certificate Uploaded'}
                  </span>
                </button>
              </div>

              {/* Decision Action Buttons */}
              <div className="verif-actions-bar">
                {app.status !== 'Under review' && (
                  <button
                    className="outline compact-btn"
                    onClick={() => handleMarkUnderReview(app)}
                  >
                    Mark Under Review
                  </button>
                )}
                <button
                  className="outline compact-btn"
                  onClick={() => {
                    setInfoApp(app);
                    setInfoMessage('');
                  }}
                >
                  Request Info
                </button>
                <button
                  className="outline compact-btn btn-danger"
                  onClick={() => {
                    setRejectingApp(app);
                    setRejectionReason('');
                  }}
                >
                  Reject
                </button>
                <button
                  className="primary compact-btn"
                  onClick={() => {
                    setApprovingApp(app);
                    setAssignedDocId(app.doctor_id || `d_${app.full_name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)}`);
                  }}
                >
                  <Check size={14} /> Approve Doctor
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve Doctor Modal */}
      {approvingApp && (
        <div className="admin-modal-overlay" onClick={() => setApprovingApp(null)}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Approve Dr. {approvingApp.full_name}</h3>
              <button className="modal-close-btn" onClick={() => setApprovingApp(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="admin-modal-body">
              <p>
                Approving this application will mark the credentials as <strong>Verified</strong> and assign the{' '}
                <strong>provider</strong> role to their profile, granting access to the Doctor Workspace.
              </p>
              <label className="modal-field">
                <span>Assign Catalog Doctor ID (e.g., d1, d2, or custom ID):</span>
                <input
                  type="text"
                  value={assignedDocId}
                  onChange={e => setAssignedDocId(e.target.value)}
                  placeholder="e.g. d1"
                />
                <small className="field-hint">
                  This ID maps appointment requests and public booking slots to this doctor.
                </small>
              </label>
            </div>
            <div className="admin-modal-footer">
              <button className="outline" onClick={() => setApprovingApp(null)}>
                Cancel
              </button>
              <button className="primary" onClick={handleApproveSubmit}>
                Confirm & Grant Provider Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Doctor Modal */}
      {rejectingApp && (
        <div className="admin-modal-overlay" onClick={() => setRejectingApp(null)}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Reject Application — Dr. {rejectingApp.full_name}</h3>
              <button className="modal-close-btn" onClick={() => setRejectingApp(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="admin-modal-body">
              <p>
                Provide a reason for rejection. This feedback will be recorded in the audit log and displayed to the applicant.
              </p>
              <label className="modal-field">
                <span>Reason for Rejection (Required)</span>
                <textarea
                  rows={4}
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="e.g. Medical registration certificate could not be validated with state council records."
                  required
                />
              </label>
            </div>
            <div className="admin-modal-footer">
              <button className="outline" onClick={() => setRejectingApp(null)}>
                Cancel
              </button>
              <button className="primary btn-danger" onClick={handleRejectSubmit}>
                Reject Application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Info Modal */}
      {infoApp && (
        <div className="admin-modal-overlay" onClick={() => setInfoApp(null)}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Request Additional Information</h3>
              <button className="modal-close-btn" onClick={() => setInfoApp(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="admin-modal-body">
              <p>
                Inform Dr. {infoApp.full_name} what documents or clarifications are required before verification can proceed.
              </p>
              <label className="modal-field">
                <span>Instructions / Required Action:</span>
                <textarea
                  rows={4}
                  value={infoMessage}
                  onChange={e => setInfoMessage(e.target.value)}
                  placeholder="e.g. Please upload a clearer copy of your MBBS degree or council renewal certificate."
                  required
                />
              </label>
            </div>
            <div className="admin-modal-footer">
              <button className="outline" onClick={() => setInfoApp(null)}>
                Cancel
              </button>
              <button className="primary" onClick={handleInfoSubmit}>
                Send Action Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================================================================
// 5. APPOINTMENT MANAGEMENT SECTION
// ==============================================================================
function AdminAppointmentsSection({
  refreshIndex,
  showToast,
}: {
  refreshIndex: number;
  showToast: (msg: string, type?: any) => void;
}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Cancel dialog
  const [cancellingAppt, setCancellingAppt] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminAppointments();
      setAppointments(data);
    } catch (e: any) {
      showToast(e?.message || 'Could not load appointments.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAppointments();
  }, [refreshIndex]);

  const handleStatusChange = async (
    appt: Appointment,
    status: Appointment['status'],
    reason?: string
  ) => {
    try {
      await updateAdminAppointmentStatus(appt.id, status, reason);
      showToast(`Appointment status updated to ${status}.`, 'success');
      void loadAppointments();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update appointment.', 'error');
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Appointment ID',
      'Patient Name',
      'Age',
      'Phone',
      'Email',
      'Doctor Name',
      'Specialty',
      'Hospital',
      'Date',
      'Slot',
      'Reason',
      'Status',
      'Created At',
    ];
    const rows = filtered.map(a => [
      a.id,
      a.patientName,
      a.patientAge,
      a.patientPhone,
      a.patientEmail,
      a.doctorName,
      a.specialty,
      a.hospitalName,
      a.appointmentDate,
      a.slot,
      a.reason,
      a.status,
      a.createdAt,
    ]);
    exportToCsv('medqueue_appointments_report', headers, rows);
    showToast('Exported appointments CSV report.', 'success');
  };

  const filtered = appointments.filter(a => {
    const q = searchTerm.toLowerCase();
    const matchQuery =
      a.id.toLowerCase().includes(q) ||
      a.patientName.toLowerCase().includes(q) ||
      a.doctorName.toLowerCase().includes(q) ||
      a.specialty.toLowerCase().includes(q) ||
      a.hospitalName.toLowerCase().includes(q) ||
      a.appointmentDate.includes(q);
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchQuery && matchStatus;
  });

  return (
    <div className="admin-section-wrap">
      <div className="admin-section-head">
        <div>
          <h2>Appointment Management & Booking Governance</h2>
          <p>Platform-wide appointment records, status transitions, and schedule audit.</p>
        </div>
        <button className="outline compact-btn" onClick={handleExportCsv}>
          <Download size={15} />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="admin-filter-bar">
        <div className="admin-search-input">
          <Search size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by ID, patient, doctor, hospital, or date…"
          />
        </div>

        <div className="admin-filter-group">
          <label>Status:</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="admin-table-card">
        {loading ? (
          <div className="admin-loading-state">Loading appointments…</div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty-state">
            <CalendarDays size={32} />
            <h4>No appointments found</h4>
            <p>Try modifying your search or filter parameters.</p>
          </div>
        ) : (
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Patient Details</th>
                <th>Doctor & Specialty</th>
                <th>Hospital & Location</th>
                <th>Schedule</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id}>
                  <td>
                    <code className="ref-code">{a.id.slice(0, 8)}…</code>
                  </td>
                  <td>
                    <div className="table-user-cell">
                      <div>
                        <b>{a.patientName}</b>
                        <small>
                          {a.patientAge} yrs · {a.patientPhone}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>
                      <b>Dr. {a.doctorName}</b>
                      <small>{a.specialty}</small>
                    </div>
                  </td>
                  <td>
                    <div>
                      <span>{a.hospitalName}</span>
                      <small>{a.location}</small>
                    </div>
                  </td>
                  <td>
                    <div>
                      <b>{a.appointmentDate}</b>
                      <small>{a.slot}</small>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge status-${a.status.toLowerCase()}`}>
                      {a.status}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions-cell">
                      {a.status === 'Pending' && (
                        <button
                          className="table-action-btn action-confirm"
                          onClick={() => handleStatusChange(a, 'Confirmed')}
                          title="Confirm Appointment"
                        >
                          <Check size={14} />
                        </button>
                      )}
                      {a.status !== 'Cancelled' && (
                        <button
                          className="table-action-btn action-cancel"
                          onClick={() => {
                            setCancellingAppt(a);
                            setCancelReason('');
                          }}
                          title="Cancel Appointment"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Cancellation Dialog with Required Reason */}
      {cancellingAppt && (
        <div className="admin-modal-overlay" onClick={() => setCancellingAppt(null)}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Cancel Appointment #{cancellingAppt.id.slice(0, 8)}</h3>
              <button className="modal-close-btn" onClick={() => setCancellingAppt(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="admin-modal-body">
              <p>
                Cancelling this booking for <strong>{cancellingAppt.patientName}</strong> will release the slot and notify the patient.
              </p>
              <label className="modal-field">
                <span>Reason for Cancellation (Required):</span>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="e.g. Doctor emergency or clinic rescheduling."
                  required
                />
              </label>
            </div>
            <div className="admin-modal-footer">
              <button className="outline" onClick={() => setCancellingAppt(null)}>
                Close
              </button>
              <button
                className="primary btn-danger"
                onClick={async () => {
                  if (!cancelReason.trim()) {
                    showToast('Cancellation reason is required.', 'error');
                    return;
                  }
                  await handleStatusChange(cancellingAppt, 'Cancelled', cancelReason.trim());
                  setCancellingAppt(null);
                }}
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================================================================
// 6. HOSPITAL AND CLINIC MANAGEMENT
// ==============================================================================
function AdminHospitalsSection({
  refreshIndex,
  showToast,
}: {
  refreshIndex: number;
  showToast: (msg: string, type?: any) => void;
}) {
  const [hospitals, setHospitals] = useState<HospitalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Add / Edit Modal
  const [editingHospital, setEditingHospital] = useState<Partial<HospitalRecord> | null>(null);
  const [saving, setSaving] = useState(false);

  const loadHospitals = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminHospitals();
      setHospitals(data);
    } catch (e: any) {
      showToast(e?.message || 'Could not load hospitals.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHospitals();
  }, [refreshIndex]);

  const handleSaveHospital = async () => {
    if (!editingHospital?.name?.trim() || !editingHospital?.location?.trim()) {
      showToast('Hospital name and location are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      await saveHospitalRecord(editingHospital);
      showToast('Hospital details saved successfully.', 'success');
      setEditingHospital(null);
      void loadHospitals();
    } catch (err: any) {
      showToast(err?.message || 'Could not save hospital.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHospital = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete listing for "${name}"?`)) return;
    try {
      await deleteHospitalRecord(id);
      showToast(`Hospital "${name}" deleted.`, 'info');
      void loadHospitals();
    } catch (err: any) {
      showToast(err?.message || 'Could not delete hospital.', 'error');
    }
  };

  const filtered = hospitals.filter(h =>
    h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-section-wrap">
      <div className="admin-section-head">
        <div>
          <h2>Hospital & Clinic Directory Management</h2>
          <p>Database-backed hospital listings, departments, facilities, and contact details.</p>
        </div>
        <button
          className="primary compact-btn"
          onClick={() =>
            setEditingHospital({
              id: '',
              name: '',
              location: '',
              distance: 1.0,
              departments: ['General Medicine'],
              facilities: ['Pharmacy', 'Diagnostic Lab'],
              hours: 'Open 24 hours',
              phone: '+91 120 400 0000',
              doctorIds: [],
              isActive: true,
            })
          }
        >
          <Plus size={16} />
          <span>Add Clinic / Hospital</span>
        </button>
      </div>

      <div className="admin-filter-bar">
        <div className="admin-search-input">
          <Search size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search hospitals or clinics by name or location…"
          />
        </div>
      </div>

      <div className="admin-cards-catalog">
        {loading ? (
          <div className="admin-loading-state">Loading facilities directory…</div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty-state">
            <Building2 size={32} />
            <h4>No hospitals found</h4>
          </div>
        ) : (
          filtered.map(h => (
            <div key={h.id} className="hospital-admin-card">
              <div className="hosp-card-head">
                <div className="hosp-icon">
                  <Building2 size={22} />
                </div>
                <div className="hosp-name-block">
                  <h4>{h.name}</h4>
                  <span>
                    <MapPin size={13} /> {h.location} · {h.distance} km
                  </span>
                </div>
                <span className={`status-badge ${h.isActive ? 'status-active' : 'status-suspended'}`}>
                  {h.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="hosp-info-details">
                <div>
                  <small>Operating Hours:</small>
                  <span>{h.hours}</span>
                </div>
                <div>
                  <small>Helpline:</small>
                  <span>{h.phone}</span>
                </div>
              </div>

              <div className="hosp-tags">
                <small>Departments:</small>
                <div className="tag-list">
                  {h.departments.map(d => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
              </div>

              <div className="hosp-card-footer">
                <button
                  className="outline compact-btn"
                  onClick={() => setEditingHospital(h)}
                >
                  <Edit2 size={14} /> Edit Listing
                </button>
                <button
                  className="table-action-btn action-cancel"
                  onClick={() => handleDeleteHospital(h.id, h.name)}
                  title="Delete Hospital"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit / Add Modal */}
      {editingHospital && (
        <div className="admin-modal-overlay" onClick={() => setEditingHospital(null)}>
          <div className="admin-modal-card wide" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editingHospital.id ? 'Edit Hospital Listing' : 'Add New Hospital / Clinic'}</h3>
              <button className="modal-close-btn" onClick={() => setEditingHospital(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="admin-modal-body modal-grid-layout">
              <label className="modal-field">
                <span>Facility Name</span>
                <input
                  type="text"
                  value={editingHospital.name || ''}
                  onChange={e => setEditingHospital({ ...editingHospital, name: e.target.value })}
                  placeholder="e.g. Apex Multispeciality Hospital"
                  required
                />
              </label>

              <label className="modal-field">
                <span>Location / Address</span>
                <input
                  type="text"
                  value={editingHospital.location || ''}
                  onChange={e => setEditingHospital({ ...editingHospital, location: e.target.value })}
                  placeholder="e.g. Sector 62, Noida"
                  required
                />
              </label>

              <label className="modal-field">
                <span>Contact Phone</span>
                <input
                  type="text"
                  value={editingHospital.phone || ''}
                  onChange={e => setEditingHospital({ ...editingHospital, phone: e.target.value })}
                  placeholder="+91 120 400 0000"
                />
              </label>

              <label className="modal-field">
                <span>Operating Hours</span>
                <input
                  type="text"
                  value={editingHospital.hours || ''}
                  onChange={e => setEditingHospital({ ...editingHospital, hours: e.target.value })}
                  placeholder="e.g. Open 24 hours"
                />
              </label>

              <label className="modal-field full-col">
                <span>Departments (comma-separated):</span>
                <input
                  type="text"
                  value={(editingHospital.departments || []).join(', ')}
                  onChange={e =>
                    setEditingHospital({
                      ...editingHospital,
                      departments: e.target.value
                        .split(',')
                        .map(s => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Cardiology, Neurology, Pediatrics"
                />
              </label>

              <label className="modal-field full-col">
                <span>Facilities (comma-separated):</span>
                <input
                  type="text"
                  value={(editingHospital.facilities || []).join(', ')}
                  onChange={e =>
                    setEditingHospital({
                      ...editingHospital,
                      facilities: e.target.value
                        .split(',')
                        .map(s => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="ECG, Pharmacy, Emergency Services, ICU"
                />
              </label>
            </div>
            <div className="admin-modal-footer">
              <button className="outline" onClick={() => setEditingHospital(null)}>
                Cancel
              </button>
              <button className="primary" disabled={saving} onClick={handleSaveHospital}>
                {saving ? 'Saving…' : 'Save Facility'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================================================================
// 7. SPECIALTIES MANAGEMENT SECTION
// ==============================================================================
function AdminSpecialtiesSection({
  refreshIndex,
  showToast,
}: {
  refreshIndex: number;
  showToast: (msg: string, type?: any) => void;
}) {
  const [specialties, setSpecialties] = useState<SpecialtyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSpecialty, setEditingSpecialty] = useState<Partial<SpecialtyRecord> | null>(null);
  const [saving, setSaving] = useState(false);

  const loadSpecs = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminSpecialties();
      setSpecialties(data);
    } catch (e: any) {
      showToast(e?.message || 'Could not load specialties.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSpecs();
  }, [refreshIndex]);

  const handleSave = async () => {
    if (!editingSpecialty?.name?.trim()) {
      showToast('Specialty name is required.', 'error');
      return;
    }
    setSaving(true);
    try {
      await saveSpecialtyRecord(editingSpecialty);
      showToast('Specialty saved successfully.', 'success');
      setEditingSpecialty(null);
      void loadSpecs();
    } catch (e: any) {
      showToast(e?.message || 'Could not save specialty.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s: SpecialtyRecord) => {
    if (!window.confirm(`Are you sure you want to delete specialty "${s.name}"?`)) return;
    try {
      await deleteSpecialtyRecord(s.id, s.name);
      showToast(`Specialty "${s.name}" deleted.`, 'info');
      void loadSpecs();
    } catch (e: any) {
      showToast(e?.message || 'Could not delete specialty.', 'error');
    }
  };

  return (
    <div className="admin-section-wrap">
      <div className="admin-section-head">
        <div>
          <h2>Medical Specialties Governance</h2>
          <p>
            Configure active healthcare fields. Integrated with doctor onboarding, search, and directory filters.
          </p>
        </div>
        <button
          className="primary compact-btn"
          onClick={() =>
            setEditingSpecialty({
              name: '',
              description: '',
              icon: 'Stethoscope',
              isActive: true,
            })
          }
        >
          <Plus size={16} />
          <span>Add Specialty</span>
        </button>
      </div>

      <div className="admin-table-card">
        {loading ? (
          <div className="admin-loading-state">Loading specialties…</div>
        ) : (
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Specialty</th>
                <th>Description</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {specialties.map(s => (
                <tr key={s.id}>
                  <td>
                    <div className="table-user-cell">
                      <div className="avatar-mini spec">
                        <Tag size={15} />
                      </div>
                      <b>{s.name}</b>
                    </div>
                  </td>
                  <td>{s.description || 'Specialized clinical field'}</td>
                  <td>
                    <span className={`status-badge ${s.isActive ? 'status-active' : 'status-suspended'}`}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions-cell">
                      <button
                        className="table-action-btn"
                        onClick={() => setEditingSpecialty(s)}
                        title="Edit Specialty"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        className="table-action-btn action-cancel"
                        onClick={() => handleDelete(s)}
                        title="Delete Specialty"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editingSpecialty && (
        <div className="admin-modal-overlay" onClick={() => setEditingSpecialty(null)}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editingSpecialty.id ? 'Edit Specialty' : 'Add New Medical Specialty'}</h3>
              <button className="modal-close-btn" onClick={() => setEditingSpecialty(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="admin-modal-body">
              <label className="modal-field">
                <span>Specialty Name (Required)</span>
                <input
                  type="text"
                  value={editingSpecialty.name || ''}
                  onChange={e => setEditingSpecialty({ ...editingSpecialty, name: e.target.value })}
                  placeholder="e.g. Ophthalmology"
                  required
                />
              </label>

              <label className="modal-field">
                <span>Clinical Description</span>
                <textarea
                  rows={3}
                  value={editingSpecialty.description || ''}
                  onChange={e => setEditingSpecialty({ ...editingSpecialty, description: e.target.value })}
                  placeholder="Summarize the medical conditions treated under this specialty."
                />
              </label>

              <label className="modal-checkbox">
                <input
                  type="checkbox"
                  checked={editingSpecialty.isActive ?? true}
                  onChange={e => setEditingSpecialty({ ...editingSpecialty, isActive: e.target.checked })}
                />
                <span>Active for public doctor search and onboarding</span>
              </label>
            </div>
            <div className="admin-modal-footer">
              <button className="outline" onClick={() => setEditingSpecialty(null)}>
                Cancel
              </button>
              <button className="primary" disabled={saving} onClick={handleSave}>
                {saving ? 'Saving…' : 'Save Specialty'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================================================================
// 8. REVIEWS AND FEEDBACK MODERATION
// ==============================================================================
function AdminReviewsSection({
  refreshIndex,
  showToast,
}: {
  refreshIndex: number;
  showToast: (msg: string, type?: any) => void;
}) {
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const [moderatingReview, setModeratingReview] = useState<ReviewRecord | null>(null);
  const [modStatus, setModStatus] = useState<ReviewRecord['status']>('Published');
  const [modNote, setModNote] = useState('');

  const loadReviews = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminReviews();
      setReviews(data);
    } catch (e: any) {
      showToast(e?.message || 'Could not load reviews.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReviews();
  }, [refreshIndex]);

  const handleModerateSubmit = async () => {
    if (!moderatingReview) return;
    try {
      await moderateReviewRecord(moderatingReview.id, modStatus, modNote.trim());
      showToast(`Review updated to ${modStatus}.`, 'success');
      setModeratingReview(null);
      void loadReviews();
    } catch (err: any) {
      showToast(err?.message || 'Moderation action failed.', 'error');
    }
  };

  const filtered = reviews.filter(r => statusFilter === 'all' || r.status === statusFilter);

  return (
    <div className="admin-section-wrap">
      <div className="admin-section-head">
        <div>
          <h2>Patient Reviews & Content Moderation</h2>
          <p>Audit genuine patient testimonials, investigate flagged content, and record policy decisions.</p>
        </div>
      </div>

      <div className="admin-filter-bar">
        <div className="admin-filter-group">
          <label>Status Filter:</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Reviews</option>
            <option value="Published">Published</option>
            <option value="Flagged">Flagged</option>
            <option value="Under Review">Under Review</option>
            <option value="Hidden">Hidden</option>
          </select>
        </div>
      </div>

      <div className="admin-table-card">
        {loading ? (
          <div className="admin-loading-state">Loading reviews…</div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty-state">
            <Star size={32} />
            <h4>No patient reviews recorded</h4>
            <p>Reviews submitted by patients following verified consultations will appear here.</p>
          </div>
        ) : (
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Rating</th>
                <th>Testimonial</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td>
                    <b>{r.patientName}</b>
                  </td>
                  <td>
                    <span>Dr. {r.doctorName}</span>
                  </td>
                  <td>
                    <span className="rating-pill">
                      <Star size={13} fill="currentColor" /> {r.rating}/5
                    </span>
                  </td>
                  <td className="comment-cell">
                    <p>{r.comment}</p>
                    {r.moderationNote && (
                      <small className="mod-note">Note: {r.moderationNote}</small>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge status-${r.status.toLowerCase().replace(/\s+/g, '-')}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>
                    <span className="date-cell">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <button
                      className="outline compact-btn"
                      onClick={() => {
                        setModeratingReview(r);
                        setModStatus(r.status);
                        setModNote(r.moderationNote || '');
                      }}
                    >
                      Moderate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {moderatingReview && (
        <div className="admin-modal-overlay" onClick={() => setModeratingReview(null)}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Moderate Patient Review</h3>
              <button className="modal-close-btn" onClick={() => setModeratingReview(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="admin-modal-body">
              <div className="modal-review-preview">
                <b>{moderatingReview.patientName}</b> review for <b>Dr. {moderatingReview.doctorName}</b>
                <p>"{moderatingReview.comment}"</p>
              </div>

              <label className="modal-field">
                <span>Moderation Decision:</span>
                <select
                  value={modStatus}
                  onChange={e => setModStatus(e.target.value as ReviewRecord['status'])}
                >
                  <option value="Published">Published (Publicly visible)</option>
                  <option value="Flagged">Flagged (Pending investigation)</option>
                  <option value="Under Review">Under Review (Temporarily withheld)</option>
                  <option value="Hidden">Hidden (Violates platform policy)</option>
                </select>
              </label>

              <label className="modal-field">
                <span>Moderation Policy Note (Auditable):</span>
                <textarea
                  rows={3}
                  value={modNote}
                  onChange={e => setModNote(e.target.value)}
                  placeholder="Record justification for moderation action."
                />
              </label>
            </div>
            <div className="admin-modal-footer">
              <button className="outline" onClick={() => setModeratingReview(null)}>
                Cancel
              </button>
              <button className="primary" onClick={handleModerateSubmit}>
                Save Moderation Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================================================================
// 9. REPORTS AND ANALYTICS SECTION
// ==============================================================================
function AdminAnalyticsSection({
  refreshIndex,
  showToast,
}: {
  refreshIndex: number;
  showToast: (msg: string, type?: any) => void;
}) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchAdminOverviewStats();
        if (active) setStats(data);
      } catch (e: any) {
        if (active) showToast(e?.message || 'Could not load analytics.', 'error');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshIndex]);

  const handleExportAnalytics = () => {
    if (!stats) return;
    const headers = ['Metric', 'Count / Value'];
    const rows = [
      ['Total Users', stats.totalUsers],
      ['Total Doctors', stats.totalDoctors],
      ['Verified Doctors', stats.verifiedDoctors],
      ['Pending Doctor Applications', stats.pendingDoctorApplications],
      ['Total Appointments', stats.totalAppointments],
      ['Confirmed Appointments', stats.confirmedAppointments],
      ['Pending Appointments', stats.pendingAppointments],
      ['Cancelled Appointments', stats.cancelledAppointments],
      ...stats.specialtyDemand.map(s => [`Specialty: ${s.specialty}`, s.count]),
    ];
    exportToCsv('medqueue_platform_analytics', headers, rows);
    showToast('Analytics summary exported.', 'success');
  };

  if (loading || !stats) {
    return <div className="admin-loading-state">Computing analytics aggregations…</div>;
  }

  const completionRate =
    stats.totalAppointments > 0
      ? Math.round((stats.confirmedAppointments / stats.totalAppointments) * 100)
      : 0;

  const doctorApprovalRate =
    stats.totalDoctors > 0
      ? Math.round((stats.verifiedDoctors / stats.totalDoctors) * 100)
      : 0;

  return (
    <div className="admin-section-wrap">
      <div className="admin-section-head">
        <div>
          <h2>Platform Analytics & Executive Reports</h2>
          <p>
            Aggregated metrics derived strictly from live database records. No fabricated data.
          </p>
        </div>
        <div className="admin-head-actions">
          <select value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
            <option value="all">All Historical Time</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last Quarter (90 Days)</option>
          </select>
          <button className="outline compact-btn" onClick={handleExportAnalytics}>
            <Download size={15} />
            <span>Export Analytics CSV</span>
          </button>
        </div>
      </div>

      <div className="admin-kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Booking Completion Rate</span>
          <div className="kpi-value">{completionRate}%</div>
          <span className="kpi-meta">Confirmed vs Total Bookings</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Doctor Approval Rate</span>
          <div className="kpi-value">{doctorApprovalRate}%</div>
          <span className="kpi-meta">Verified vs Total Applications</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Active Specialty Count</span>
          <div className="kpi-value">{stats.specialtyDemand.length}</div>
          <span className="kpi-meta">Specialties with bookings</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Cancellation Ratio</span>
          <div className="kpi-value">
            {stats.totalAppointments > 0
              ? Math.round((stats.cancelledAppointments / stats.totalAppointments) * 100)
              : 0}
            %
          </div>
          <span className="kpi-meta">Cancelled Bookings</span>
        </div>
      </div>

      <div className="admin-two-col-grid">
        <div className="admin-panel">
          <h3>Appointment Status Breakdown</h3>
          <div className="analytics-breakdown-box">
            {stats.appointmentsByStatus.map(st => {
              const pct =
                stats.totalAppointments > 0
                  ? Math.round((st.count / stats.totalAppointments) * 100)
                  : 0;
              return (
                <div key={st.status} className="analytics-breakdown-row">
                  <div className="analytics-breakdown-meta">
                    <b>{st.status}</b>
                    <span>
                      {st.count} ({pct}%)
                    </span>
                  </div>
                  <div className="demand-track">
                    <div
                      className={`demand-fill fill-${st.status.toLowerCase()}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="admin-panel">
          <h3>Top Specialties Ranked by Patient Demand</h3>
          {stats.specialtyDemand.length === 0 ? (
            <p className="field-hint">No bookings yet recorded.</p>
          ) : (
            <div className="analytics-breakdown-box">
              {stats.specialtyDemand.slice(0, 5).map((spec, i) => (
                <div key={spec.specialty} className="analytics-breakdown-row">
                  <div className="analytics-breakdown-meta">
                    <span>
                      #{i + 1} <b>{spec.specialty}</b>
                    </span>
                    <span>{spec.count} bookings</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==============================================================================
// 10. NOTIFICATIONS SECTION
// ==============================================================================
function AdminNotificationsSection({
  refreshIndex,
  showToast,
  onReadChange,
}: {
  refreshIndex: number;
  showToast: (msg: string, type?: any) => void;
  onReadChange: () => void;
}) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const loadNotifs = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminNotifications();
      setNotifications(data);
    } catch (e: any) {
      showToast(e?.message || 'Could not load notifications.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifs();
  }, [refreshIndex]);

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      void loadNotifs();
      onReadChange();
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      showToast('All notifications marked as read.', 'success');
      void loadNotifs();
      onReadChange();
    } catch (e: any) {
      showToast(e?.message || 'Could not update notifications.', 'error');
    }
  };

  const filtered = unreadOnly ? notifications.filter(n => !n.isRead) : notifications;

  return (
    <div className="admin-section-wrap">
      <div className="admin-section-head">
        <div>
          <h2>Administrative Event Center</h2>
          <p>Real-time alerts for incoming doctor applications, credential decisions, and system alerts.</p>
        </div>
        <div className="admin-head-actions">
          <label className="checkbox-toggle">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={e => setUnreadOnly(e.target.checked)}
            />
            <span>Unread Only</span>
          </label>
          <button className="outline compact-btn" onClick={handleMarkAllRead}>
            Mark All as Read
          </button>
        </div>
      </div>

      <div className="notifications-list-wrap">
        {loading ? (
          <div className="admin-loading-state">Loading notifications…</div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty-state card-padded">
            <Bell size={32} />
            <h4>No notifications to display</h4>
            <p>You're completely up to date.</p>
          </div>
        ) : (
          filtered.map(n => (
            <div key={n.id} className={`notification-item-card ${n.isRead ? 'read' : 'unread'}`}>
              <div className="notif-icon-col">
                {n.type === 'doctor_application' && <Stethoscope size={18} />}
                {n.type === 'verification_decision' && <FileCheck size={18} />}
                {n.type === 'appointment_update' && <CalendarDays size={18} />}
                {n.type === 'system_warning' && <AlertTriangle size={18} />}
                {n.type === 'user_event' && <Users size={18} />}
              </div>
              <div className="notif-content-col">
                <div className="notif-headline">
                  <b>{n.title}</b>
                  <small>{new Date(n.createdAt).toLocaleString()}</small>
                </div>
                <p>{n.message}</p>
              </div>
              {!n.isRead && (
                <button
                  className="table-action-btn action-confirm"
                  onClick={() => handleMarkRead(n.id)}
                  title="Mark as read"
                >
                  <Check size={14} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ==============================================================================
// 11. AUDIT LOGS SECTION
// ==============================================================================
function AdminAuditLogsSection({
  refreshIndex,
  showToast,
}: {
  refreshIndex: number;
  showToast: (msg: string, type?: any) => void;
}) {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [inspectLog, setInspectLog] = useState<AuditLogRecord | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminAuditLogs();
      setLogs(data);
    } catch (e: any) {
      showToast(e?.message || 'Could not load audit logs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs();
  }, [refreshIndex]);

  const handleExportAuditCsv = () => {
    const headers = ['Timestamp', 'Actor Email', 'Action', 'Entity Type', 'Entity ID', 'Details JSON'];
    const rows = filtered.map(l => [
      l.createdAt,
      l.actorEmail,
      l.action,
      l.entityType,
      l.entityId,
      JSON.stringify(l.details),
    ]);
    exportToCsv('medqueue_audit_logs', headers, rows);
    showToast('Audit log exported to CSV.', 'success');
  };

  const filtered = logs.filter(l => {
    const q = searchTerm.toLowerCase();
    return (
      l.actorEmail.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.entityType.toLowerCase().includes(q) ||
      l.entityId.toLowerCase().includes(q)
    );
  });

  return (
    <div className="admin-section-wrap">
      <div className="admin-section-head">
        <div>
          <h2>Immutable System Audit Trail</h2>
          <p>
            Cryptographically and RLS-protected append-only record of all administrative operations.
          </p>
        </div>
        <button className="outline compact-btn" onClick={handleExportAuditCsv}>
          <Download size={15} />
          <span>Export Audit CSV</span>
        </button>
      </div>

      <div className="admin-filter-bar">
        <div className="admin-search-input">
          <Search size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search audit trail by actor, action, or entity ID…"
          />
        </div>
      </div>

      <div className="admin-table-card">
        {loading ? (
          <div className="admin-loading-state">Loading audit logs…</div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty-state">
            <FileText size={32} />
            <h4>No audit records found</h4>
          </div>
        ) : (
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Acting Administrator</th>
                <th>Action</th>
                <th>Target Entity</th>
                <th>Entity Identifier</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id}>
                  <td>
                    <span className="date-cell">
                      {new Date(l.createdAt).toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <b>{l.actorEmail}</b>
                  </td>
                  <td>
                    <span className="audit-action-pill">{l.action}</span>
                  </td>
                  <td>{l.entityType}</td>
                  <td>
                    <code>{l.entityId.slice(0, 10)}…</code>
                  </td>
                  <td>
                    <button
                      className="outline compact-btn"
                      onClick={() => setInspectLog(l)}
                    >
                      <Eye size={13} /> View JSON
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {inspectLog && (
        <div className="admin-modal-overlay" onClick={() => setInspectLog(null)}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Audit Event #{inspectLog.id.slice(0, 8)}</h3>
              <button className="modal-close-btn" onClick={() => setInspectLog(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="admin-modal-body">
              <div className="modal-info-block">
                <label>Actor:</label>
                <span>{inspectLog.actorEmail} ({inspectLog.actorId})</span>
              </div>
              <div className="modal-info-block">
                <label>Action:</label>
                <b>{inspectLog.action}</b>
              </div>
              <div className="modal-info-block">
                <label>Target:</label>
                <span>
                  {inspectLog.entityType} : {inspectLog.entityId}
                </span>
              </div>
              <div className="modal-info-block">
                <label>Recorded Timestamp:</label>
                <span>{new Date(inspectLog.createdAt).toISOString()}</span>
              </div>

              <h4>Raw Event Details</h4>
              <pre className="audit-json-box">
                {JSON.stringify(inspectLog.details, null, 2)}
              </pre>
            </div>
            <div className="admin-modal-footer">
              <button className="primary" onClick={() => setInspectLog(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================================================================
// 12. SYSTEM SETTINGS SECTION
// ==============================================================================
function AdminSettingsSection({
  refreshIndex,
  showToast,
}: {
  refreshIndex: number;
  showToast: (msg: string, type?: any) => void;
}) {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchSystemSettingsRecord();
        if (active) setSettings(data);
      } catch (e: any) {
        if (active) showToast(e?.message || 'Could not load system settings.', 'error');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshIndex]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      await saveSystemSettingsRecord(settings);
      showToast('System settings updated and persisted.', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Could not save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return <div className="admin-loading-state">Loading system settings…</div>;
  }

  return (
    <div className="admin-section-wrap">
      <div className="admin-section-head">
        <div>
          <h2>Platform Configuration & Security Settings</h2>
          <p>Govern platform-wide operational policies, email dispatchers, and credentialing SLAs.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="admin-settings-form">
        <div className="admin-panel">
          <h3>Operational Controls</h3>
          <div className="settings-field-group">
            <label className="settings-toggle-label">
              <div>
                <b>Maintenance Mode</b>
                <p>Prevent public booking creation while maintaining administrator access.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.maintenance_mode}
                onChange={e =>
                  setSettings({ ...settings, maintenance_mode: e.target.checked })
                }
              />
            </label>

            <label className="settings-toggle-label">
              <div>
                <b>Auto-Assign Catalog Doctor ID on Approval</b>
                <p>
                  Automatically generate catalog identifier if not manually entered during verification.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.doctor_auto_assign}
                onChange={e =>
                  setSettings({ ...settings, doctor_auto_assign: e.target.checked })
                }
              />
            </label>

            <label className="settings-toggle-label">
              <div>
                <b>Email Notifications Dispatcher</b>
                <p>
                  Dispatch transactional emails for verification outcomes and booking changes.
                </p>
                <small className="notice-box">
                  Note: Transactional emails require an external SMTP or Resend API key configured in Supabase.
                  Currently running in direct DB notification mode.
                </small>
              </div>
              <input
                type="checkbox"
                checked={settings.email_notifications_enabled}
                onChange={e =>
                  setSettings({
                    ...settings,
                    email_notifications_enabled: e.target.checked,
                  })
                }
              />
            </label>
          </div>
        </div>

        <div className="admin-panel">
          <h3>Credentialing SLA & Platform Branding</h3>
          <div className="settings-grid-two">
            <label className="modal-field">
              <span>Target Verification SLA (Hours):</span>
              <input
                type="number"
                min="1"
                max="168"
                value={settings.verification_sla_hours}
                onChange={e =>
                  setSettings({
                    ...settings,
                    verification_sla_hours: Number(e.target.value) || 48,
                  })
                }
              />
            </label>

            <label className="modal-field">
              <span>Platform Display Name:</span>
              <input
                type="text"
                value={settings.platform_branding.name}
                onChange={e =>
                  setSettings({
                    ...settings,
                    platform_branding: {
                      ...settings.platform_branding,
                      name: e.target.value,
                    },
                  })
                }
              />
            </label>

            <label className="modal-field">
              <span>Support Contact Helpline:</span>
              <input
                type="text"
                value={settings.platform_branding.support_phone}
                onChange={e =>
                  setSettings({
                    ...settings,
                    platform_branding: {
                      ...settings.platform_branding,
                      support_phone: e.target.value,
                    },
                  })
                }
              />
            </label>

            <label className="modal-field">
              <span>Support Contact Email:</span>
              <input
                type="email"
                value={settings.platform_branding.support_email}
                onChange={e =>
                  setSettings({
                    ...settings,
                    platform_branding: {
                      ...settings.platform_branding,
                      support_email: e.target.value,
                    },
                  })
                }
              />
            </label>
          </div>
        </div>

        <div className="admin-form-actions">
          <button className="primary" type="submit" disabled={saving}>
            {saving ? 'Saving Settings…' : 'Save Platform Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ==============================================================================
// 13. MY PROFILE SECTION
// ==============================================================================
function AdminProfileSection({
  authUser,
  showToast,
}: {
  authUser: AuthUser;
  showToast: (msg: string, type?: any) => void;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Password confirmation does not match.', 'error');
      return;
    }
    setUpdating(true);
    try {
      await updatePassword(newPassword);
      showToast('Password updated successfully for administrator account.', 'success');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      showToast(e?.message || 'Could not update password.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="admin-section-wrap">
      <div className="admin-section-head">
        <div>
          <h2>Administrator Account Profile</h2>
          <p>Privileged operator credentials and security configuration.</p>
        </div>
      </div>

      <div className="admin-two-col-grid">
        <div className="admin-panel">
          <h3>Administrator Identity</h3>
          <div className="profile-identity-card">
            <div className="avatar-large admin">
              {(authUser.name || 'AD').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3>{authUser.name || 'System Administrator'}</h3>
              <p>{authUser.email}</p>
              <span className="role-tag admin">Role: {authUser.role}</span>
            </div>
          </div>

          <hr />
          <h4>Assigned Authorization Scopes</h4>
          <div className="permission-badges-list">
            <span className="perm-pill">
              <Check size={12} /> Full Platform Access
            </span>
            <span className="perm-pill">
              <Check size={12} /> Doctor Credentialing & Verification
            </span>
            <span className="perm-pill">
              <Check size={12} /> User Account Moderation & Suspension
            </span>
            <span className="perm-pill">
              <Check size={12} /> Appointment Status Management
            </span>
            <span className="perm-pill">
              <Check size={12} /> System Telemetry & Audit Logs
            </span>
          </div>
        </div>

        <div className="admin-panel">
          <h3>Security & Password Management</h3>
          <form onSubmit={handlePasswordUpdate} className="admin-password-form">
            <label className="modal-field">
              <span>New Security Password</span>
              <input
                type="password"
                minLength={8}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
              />
            </label>

            <label className="modal-field">
              <span>Confirm New Password</span>
              <input
                type="password"
                minLength={8}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
              />
            </label>

            <button className="primary" type="submit" disabled={updating}>
              {updating ? 'Updating Password…' : 'Update Administrator Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
