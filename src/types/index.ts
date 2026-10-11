export type CarePathRole = 'patient' | 'provider' | 'admin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: CarePathRole;
  isSuspended?: boolean;
  createdAt?: string;
}

export interface DoctorApplication {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  specialty: string;
  qualifications: string;
  experience: number;
  license_number: string;
  licensing_authority: string;
  clinic_name: string;
  address: string;
  city: string;
  consultation_type: 'In-person' | 'Online' | 'Both';
  fee: number | null;
  languages: string;
  bio: string;
  working_days: string;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  status: 'Draft' | 'Submitted for review' | 'Under review' | 'Verified' | 'Rejected' | 'Action required';
  doctor_id?: string | null;
  registration_certificate_path?: string | null;
  admin_feedback?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  hospitalName: string;
  location: string;
  patientName: string;
  patientAge: number;
  patientPhone: string;
  patientEmail: string;
  reason: string;
  appointmentDate: string;
  slot: string;
  status: 'Pending' | 'Confirmed' | 'Cancelled';
  createdAt: string;
}

export interface HospitalRecord {
  id: string;
  name: string;
  location: string;
  distance: number;
  departments: string[];
  facilities: string[];
  hours: string;
  phone: string;
  doctorIds: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SpecialtyRecord {
  id: string;
  name: string;
  description: string;
  icon: string;
  isActive: boolean;
  createdAt?: string;
}

export interface ReviewRecord {
  id: string;
  patientId?: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  appointmentId?: string;
  rating: number;
  comment: string;
  status: 'Published' | 'Flagged' | 'Hidden' | 'Under Review';
  moderationNote?: string;
  moderatedBy?: string;
  moderatedAt?: string;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  actorId?: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

export interface AdminNotification {
  id: string;
  type: 'doctor_application' | 'verification_decision' | 'appointment_update' | 'user_event' | 'system_warning';
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface SystemSettings {
  maintenance_mode: boolean;
  doctor_auto_assign: boolean;
  email_notifications_enabled: boolean;
  verification_sla_hours: number;
  platform_branding: {
    name: string;
    support_phone: string;
    support_email: string;
  };
}

export interface AdminStats {
  totalUsers: number;
  totalDoctors: number;
  verifiedDoctors: number;
  pendingDoctorApplications: number;
  rejectedOrIncompleteDoctors: number;
  totalAppointments: number;
  pendingAppointments: number;
  confirmedAppointments: number;
  cancelledAppointments: number;
  specialtyDemand: { specialty: string; count: number }[];
  appointmentsByStatus: { status: string; count: number }[];
  recentRegistrations: { id: string; name: string; email: string; role: string; date: string }[];
  recentApplications: DoctorApplication[];
  recentAppointments: Appointment[];
  recentAuditLogs: AuditLogRecord[];
}
