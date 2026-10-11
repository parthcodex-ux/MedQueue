import { requireSupabase, supabase, supabaseConfigured } from './supabase';
import type {
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
import { hospitals as fallbackHospitals } from '../data/data';

// Helper to map appointment row
export function mapAppointmentRow(row: any): Appointment {
  return {
    id: row.id,
    patientId: row.patient_id,
    doctorId: row.doctor_id,
    doctorName: row.doctor_name || 'Assigned Doctor',
    specialty: row.specialty || 'General',
    hospitalName: row.hospital_name || 'Care Center',
    location: row.location || 'Noida',
    patientName: row.patient_name || '',
    patientAge: row.patient_age || 0,
    patientPhone: row.patient_phone || '',
    patientEmail: row.patient_email || '',
    reason: row.reason || '',
    appointmentDate: row.appointment_date,
    slot: row.slot,
    status: row.status,
    createdAt: row.created_at,
  };
}

// 1. ADMIN OVERVIEW STATS
export async function fetchAdminOverviewStats(): Promise<AdminStats> {
  if (!supabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }
  const client = requireSupabase();

  // Parallel queries to fetch live database records
  const [
    profilesRes,
    doctorProfilesRes,
    appointmentsRes,
    auditLogsRes,
  ] = await Promise.all([
    client.from('profiles').select('id, full_name, role, is_suspended, created_at').order('created_at', { ascending: false }),
    client.from('doctor_profiles').select('*').order('created_at', { ascending: false }),
    client.from('appointments').select('*').order('created_at', { ascending: false }),
    client.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(10),
  ]);

  const profiles = profilesRes.data || [];
  const doctorProfiles: DoctorApplication[] = doctorProfilesRes.data || [];
  const appointments: Appointment[] = (appointmentsRes.data || []).map(mapAppointmentRow);
  const auditLogs: AuditLogRecord[] = auditLogsRes.data || [];

  const totalUsers = profiles.length;
  const totalDoctors = doctorProfiles.length;
  const verifiedDoctors = doctorProfiles.filter(d => d.status === 'Verified').length;
  const pendingDoctorApplications = doctorProfiles.filter(
    d => d.status === 'Submitted for review' || d.status === 'Under review'
  ).length;
  const rejectedOrIncompleteDoctors = doctorProfiles.filter(
    d => d.status === 'Rejected' || d.status === 'Action required' || d.status === 'Draft'
  ).length;

  const totalAppointments = appointments.length;
  const pendingAppointments = appointments.filter(a => a.status === 'Pending').length;
  const confirmedAppointments = appointments.filter(a => a.status === 'Confirmed').length;
  const cancelledAppointments = appointments.filter(a => a.status === 'Cancelled').length;

  // Aggregate specialty demand
  const specialtyCounts: Record<string, number> = {};
  appointments.forEach(a => {
    if (a.specialty) {
      specialtyCounts[a.specialty] = (specialtyCounts[a.specialty] || 0) + 1;
    }
  });
  const specialtyDemand = Object.entries(specialtyCounts)
    .map(([specialty, count]) => ({ specialty, count }))
    .sort((a, b) => b.count - a.count);

  const appointmentsByStatus = [
    { status: 'Confirmed', count: confirmedAppointments },
    { status: 'Pending', count: pendingAppointments },
    { status: 'Cancelled', count: cancelledAppointments },
  ];

  const recentRegistrations = profiles.slice(0, 8).map(p => ({
    id: p.id,
    name: p.full_name || 'Anonymous User',
    email: '', // auth email is protected in profiles table
    role: p.role,
    date: p.created_at,
  }));

  return {
    totalUsers,
    totalDoctors,
    verifiedDoctors,
    pendingDoctorApplications,
    rejectedOrIncompleteDoctors,
    totalAppointments,
    pendingAppointments,
    confirmedAppointments,
    cancelledAppointments,
    specialtyDemand,
    appointmentsByStatus,
    recentRegistrations,
    recentApplications: doctorProfiles.slice(0, 6),
    recentAppointments: appointments.slice(0, 6),
    recentAuditLogs: auditLogs,
  };
}

// 2. USER MANAGEMENT
export async function fetchUsersList(): Promise<any[]> {
  const client = requireSupabase();
  const [profilesRes, appointmentsRes] = await Promise.all([
    client.from('profiles').select('*').order('created_at', { ascending: false }),
    client.from('appointments').select('id, patient_id, appointment_date, status'),
  ]);

  if (profilesRes.error) throw profilesRes.error;
  const profiles = profilesRes.data || [];
  const appts = appointmentsRes.data || [];

  return profiles.map(p => {
    const userAppts = appts.filter(a => a.patient_id === p.id);
    return {
      id: p.id,
      fullName: p.full_name || 'Unnamed',
      role: p.role || 'patient',
      isSuspended: Boolean(p.is_suspended),
      createdAt: p.created_at,
      appointmentCount: userAppts.length,
      recentAppointmentStatus: userAppts[0]?.status || 'None',
    };
  });
}

export async function updateUserProfile(userId: string, updates: { full_name?: string; role?: string }) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;
  await logAdminAction('user_profile_updated', 'profiles', userId, updates);
  return data;
}

export async function toggleUserSuspension(userId: string, suspend: boolean, reason: string = '') {
  const client = requireSupabase();
  // Try RPC first
  try {
    const { data, error } = await client.rpc('admin_set_user_suspension', {
      target_user_id: userId,
      suspend,
      reason,
    });
    if (!error) return data;
  } catch {
    // Fall back to direct update if RPC is pending migration
  }

  const { data, error } = await client
    .from('profiles')
    .update({ is_suspended: suspend, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;

  await logAdminAction(
    suspend ? 'user_suspended' : 'user_reactivated',
    'profiles',
    userId,
    { reason }
  );
  return data;
}

// 3. DOCTOR MANAGEMENT & VERIFICATION
export async function fetchDoctorApplications(): Promise<DoctorApplication[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('doctor_profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function approveDoctorApplication(userId: string, assignedDoctorId?: string) {
  const client = requireSupabase();
  // Try RPC first
  try {
    const { data, error } = await client.rpc('admin_approve_doctor', {
      target_user_id: userId,
      assigned_doctor_id: assignedDoctorId || null,
    });
    if (!error) return data;
  } catch {}

  // Fallback direct execution
  const fallbackId = assignedDoctorId || `doc_${userId.slice(0, 6)}`;
  const { error: docError } = await client
    .from('doctor_profiles')
    .update({
      status: 'Verified',
      doctor_id: fallbackId,
      admin_feedback: 'Application approved by administration.',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (docError) throw docError;

  const { error: profileError } = await client
    .from('profiles')
    .update({ role: 'provider', updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (profileError) throw profileError;

  await logAdminAction('doctor_approved', 'doctor_profiles', userId, {
    doctor_id: fallbackId,
  });
  return { success: true, doctor_id: fallbackId };
}

export async function rejectDoctorApplication(userId: string, reason: string) {
  const client = requireSupabase();
  try {
    const { data, error } = await client.rpc('admin_reject_doctor', {
      target_user_id: userId,
      rejection_reason: reason,
    });
    if (!error) return data;
  } catch {}

  const { error } = await client
    .from('doctor_profiles')
    .update({
      status: 'Rejected',
      admin_feedback: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;

  await logAdminAction('doctor_rejected', 'doctor_profiles', userId, { reason });
  return { success: true };
}

export async function requestDoctorInfo(userId: string, feedback: string) {
  const client = requireSupabase();
  try {
    const { data, error } = await client.rpc('admin_request_info_doctor', {
      target_user_id: userId,
      feedback_notes: feedback,
    });
    if (!error) return data;
  } catch {}

  const { error } = await client
    .from('doctor_profiles')
    .update({
      status: 'Action required',
      admin_feedback: feedback,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;

  await logAdminAction('doctor_info_requested', 'doctor_profiles', userId, { feedback });
  return { success: true };
}

export async function setDoctorUnderReview(userId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from('doctor_profiles')
    .update({
      status: 'Under review',
      admin_feedback: 'Application is currently under review by our medical credentialing team.',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;

  await logAdminAction('doctor_under_review', 'doctor_profiles', userId, {});
  return { success: true };
}

export async function getDoctorCertificateSignedUrl(path: string): Promise<string | null> {
  if (!path) return null;
  const client = requireSupabase();
  try {
    const { data, error } = await client.storage
      .from('doctor-verification')
      .createSignedUrl(path, 3600); // 1 hour expiration
    if (error) throw error;
    return data.signedUrl;
  } catch (err) {
    console.warn('Could not generate signed URL for certificate:', err);
    return null;
  }
}

// 4. APPOINTMENT MANAGEMENT
export async function fetchAdminAppointments(): Promise<Appointment[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('appointments')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapAppointmentRow);
}

export async function updateAdminAppointmentStatus(
  appointmentId: string,
  newStatus: Appointment['status'],
  reason?: string
) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('appointments')
    .update({ status: newStatus })
    .eq('id', appointmentId)
    .select('*')
    .single();
  if (error) throw error;

  await logAdminAction('appointment_status_changed', 'appointments', appointmentId, {
    newStatus,
    reason: reason || 'Admin status change',
  });
  return mapAppointmentRow(data);
}

// 5. HOSPITALS & CLINICS
export async function fetchAdminHospitals(): Promise<HospitalRecord[]> {
  const client = requireSupabase();
  try {
    const { data, error } = await client
      .from('hospitals')
      .select('*')
      .order('name', { ascending: true });
    if (!error && data && data.length > 0) {
      return data.map((h: any) => ({
        id: h.id,
        name: h.name,
        location: h.location,
        distance: Number(h.distance) || 0,
        departments: Array.isArray(h.departments) ? h.departments : [],
        facilities: Array.isArray(h.facilities) ? h.facilities : [],
        hours: h.hours || 'Open 24 hours',
        phone: h.phone || '',
        doctorIds: Array.isArray(h.doctor_ids) ? h.doctor_ids : [],
        isActive: h.is_active ?? true,
        createdAt: h.created_at,
        updatedAt: h.updated_at,
      }));
    }
  } catch (err) {
    console.warn('Hospitals table query error, falling back to static list:', err);
  }

  // Fallback to starter catalog
  return fallbackHospitals.map(h => ({
    id: h.id,
    name: h.name,
    location: h.location,
    distance: h.distance,
    departments: h.departments,
    facilities: h.facilities,
    hours: h.hours,
    phone: h.phone,
    doctorIds: h.doctorIds,
    isActive: true,
  }));
}

export async function saveHospitalRecord(hospital: Partial<HospitalRecord>) {
  const client = requireSupabase();
  const payload = {
    id: hospital.id || `h_${Date.now()}`,
    name: hospital.name?.trim(),
    location: hospital.location?.trim(),
    distance: Number(hospital.distance) || 0,
    departments: hospital.departments || [],
    facilities: hospital.facilities || [],
    hours: hospital.hours || 'Open 24 hours',
    phone: hospital.phone || '',
    doctor_ids: hospital.doctorIds || [],
    is_active: hospital.isActive ?? true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from('hospitals')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) throw error;

  await logAdminAction('hospital_saved', 'hospitals', payload.id, { name: payload.name });
  return data;
}

export async function deleteHospitalRecord(hospitalId: string) {
  const client = requireSupabase();
  const { error } = await client.from('hospitals').delete().eq('id', hospitalId);
  if (error) throw error;
  await logAdminAction('hospital_deleted', 'hospitals', hospitalId, {});
  return true;
}

// 6. SPECIALTIES MANAGEMENT
export async function fetchAdminSpecialties(): Promise<SpecialtyRecord[]> {
  const client = requireSupabase();
  try {
    const { data, error } = await client
      .from('specialties')
      .select('*')
      .order('name', { ascending: true });
    if (!error && data && data.length > 0) {
      return data.map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description || '',
        icon: s.icon || 'Stethoscope',
        isActive: s.is_active ?? true,
        createdAt: s.created_at,
      }));
    }
  } catch {}

  const defaults = [
    'Cardiology', 'Dermatology', 'Orthopedics', 'Neurology',
    'ENT', 'Pediatrics', 'General Medicine', 'Gynecology'
  ];
  return defaults.map((name, i) => ({
    id: `spec-${i + 1}`,
    name,
    description: `Specialized healthcare field for ${name.toLowerCase()}`,
    icon: 'Stethoscope',
    isActive: true,
  }));
}

export async function saveSpecialtyRecord(specialty: Partial<SpecialtyRecord>) {
  const client = requireSupabase();
  const payload = {
    name: specialty.name?.trim(),
    description: specialty.description?.trim() || '',
    icon: specialty.icon || 'Stethoscope',
    is_active: specialty.isActive ?? true,
  };

  if (specialty.id && !specialty.id.startsWith('spec-')) {
    const { data, error } = await client
      .from('specialties')
      .update(payload)
      .eq('id', specialty.id)
      .select('*')
      .single();
    if (error) throw error;
    await logAdminAction('specialty_updated', 'specialties', specialty.id, payload);
    return data;
  } else {
    const { data, error } = await client
      .from('specialties')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    await logAdminAction('specialty_created', 'specialties', data.id, payload);
    return data;
  }
}

export async function deleteSpecialtyRecord(specialtyId: string, specialtyName: string) {
  const client = requireSupabase();
  // Check if any doctor profiles or appointments reference this specialty
  const [docCheck, apptCheck] = await Promise.all([
    client.from('doctor_profiles').select('user_id').eq('specialty', specialtyName).limit(1),
    client.from('appointments').select('id').eq('specialty', specialtyName).limit(1),
  ]);

  if ((docCheck.data && docCheck.data.length > 0) || (apptCheck.data && apptCheck.data.length > 0)) {
    throw new Error(
      `Cannot delete specialty "${specialtyName}" because it is currently referenced by existing doctors or appointments. Consider marking it Inactive instead.`
    );
  }

  const { error } = await client.from('specialties').delete().eq('id', specialtyId);
  if (error) throw error;
  await logAdminAction('specialty_deleted', 'specialties', specialtyId, { specialtyName });
  return true;
}

// 7. REVIEWS & FEEDBACK MODERATION
export async function fetchAdminReviews(): Promise<ReviewRecord[]> {
  const client = requireSupabase();
  try {
    const { data, error } = await client
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      return data.map((r: any) => ({
        id: r.id,
        patientId: r.patient_id,
        patientName: r.patient_name,
        doctorId: r.doctor_id,
        doctorName: r.doctor_name,
        appointmentId: r.appointment_id,
        rating: r.rating,
        comment: r.comment,
        status: r.status,
        moderationNote: r.moderation_note,
        moderatedBy: r.moderated_by,
        moderatedAt: r.moderated_at,
        createdAt: r.created_at,
      }));
    }
  } catch {}
  return [];
}

export async function moderateReviewRecord(
  reviewId: string,
  newStatus: ReviewRecord['status'],
  note: string = ''
) {
  const client = requireSupabase();
  const user = (await client.auth.getUser()).data.user;
  const { data, error } = await client
    .from('reviews')
    .update({
      status: newStatus,
      moderation_note: note,
      moderated_by: user?.id || null,
      moderated_at: new Date().toISOString(),
    })
    .eq('id', reviewId)
    .select('*')
    .single();
  if (error) throw error;

  await logAdminAction('review_moderated', 'reviews', reviewId, {
    newStatus,
    note,
  });
  return data;
}

// 8. ADMIN NOTIFICATIONS
export async function fetchAdminNotifications(): Promise<AdminNotification[]> {
  const client = requireSupabase();
  try {
    const { data, error } = await client
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      return data.map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        entityType: n.entity_type,
        entityId: n.entity_id,
        isRead: Boolean(n.is_read),
        createdAt: n.created_at,
      }));
    }
  } catch {}
  return [];
}

export async function markNotificationAsRead(id: string) {
  const client = requireSupabase();
  const { error } = await client
    .from('admin_notifications')
    .update({ is_read: true })
    .eq('id', id);
  if (error) throw error;
  return true;
}

export async function markAllNotificationsAsRead() {
  const client = requireSupabase();
  const { error } = await client
    .from('admin_notifications')
    .update({ is_read: true })
    .eq('is_read', false);
  if (error) throw error;
  return true;
}

// 9. AUDIT LOGS
export async function fetchAdminAuditLogs(): Promise<AuditLogRecord[]> {
  const client = requireSupabase();
  try {
    const { data, error } = await client
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      return data.map((l: any) => ({
        id: l.id,
        actorId: l.actor_id,
        actorEmail: l.actor_email,
        action: l.action,
        entityType: l.entity_type,
        entityId: l.entity_id,
        details: l.details || {},
        ipAddress: l.ip_address,
        createdAt: l.created_at,
      }));
    }
  } catch {}
  return [];
}

export async function logAdminAction(
  action: string,
  entityType: string,
  entityId: string,
  details: Record<string, any> = {}
) {
  if (!supabaseConfigured || !supabase) return;
  try {
    const user = (await supabase.auth.getUser()).data.user;
    await supabase.from('audit_logs').insert({
      actor_id: user?.id || null,
      actor_email: user?.email || 'admin',
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
    });
  } catch (err) {
    console.warn('Could not record audit log:', err);
  }
}

// 10. SYSTEM SETTINGS
export async function fetchSystemSettingsRecord(): Promise<SystemSettings> {
  const defaults: SystemSettings = {
    maintenance_mode: false,
    doctor_auto_assign: false,
    email_notifications_enabled: false,
    verification_sla_hours: 48,
    platform_branding: {
      name: 'MedQueue',
      support_phone: '+91 120 400 1200',
      support_email: 'support@medqueue.example',
    },
  };

  const client = requireSupabase();
  try {
    const { data, error } = await client.from('system_settings').select('*');
    if (!error && data && data.length > 0) {
      const settingsMap = data.reduce((acc: any, row: any) => {
        acc[row.key] = row.value;
        return acc;
      }, {});
      return { ...defaults, ...settingsMap };
    }
  } catch {}
  return defaults;
}

export async function saveSystemSettingsRecord(settings: Partial<SystemSettings>) {
  const client = requireSupabase();
  const promises = Object.entries(settings).map(([key, value]) =>
    client.from('system_settings').upsert({
      key,
      value,
      updated_at: new Date().toISOString(),
    })
  );
  await Promise.all(promises);
  await logAdminAction('system_settings_updated', 'system_settings', 'global', settings);
  return settings;
}

// 11. CSV EXPORT UTILITY
export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escapeCell = (cell: string | number) => {
    const str = String(cell ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map(row => row.map(escapeCell).join(',')),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
