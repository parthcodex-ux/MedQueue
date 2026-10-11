-- ==============================================================================
-- MedQueue Admin Dashboard, Role-Based Access Control & Operations Migration
-- ==============================================================================
-- Run after supabase-schema.sql, supabase-appointments-migration.sql,
-- and supabase-doctor-portal-migration.sql in Supabase Dashboard > SQL Editor.
-- ==============================================================================

-- 1. EXTEND PROFILES WITH ADMIN ROLE AND ACCOUNT SUSPENSION
-- ------------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('patient', 'provider', 'admin'));

alter table public.profiles add column if not exists is_suspended boolean not null default false;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- Helper function to check if the current or specified user is an active admin.
-- Uses SECURITY DEFINER with empty search_path to prevent recursive RLS evaluation.
create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = coalesce(check_user_id, auth.uid())
      and role = 'admin'
      and is_suspended = false
  );
$$;

-- Helper function to check if a user is an active verified provider.
create or replace function public.is_verified_provider(check_user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    join public.doctor_profiles dp on dp.user_id = p.id
    where p.id = coalesce(check_user_id, auth.uid())
      and p.role = 'provider'
      and p.is_suspended = false
      and dp.status = 'Verified'
  );
$$;

-- Allow administrators to view and manage all profiles
drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
on public.profiles for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());


-- 2. AUDIT LOGS (TAMPER-PROOF, APPEND-ONLY)
-- ------------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text not null default '',
  action text not null,
  entity_type text not null,
  entity_id text not null,
  details jsonb not null default '{}'::jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

alter table public.audit_logs enable row level security;

drop policy if exists "Admins can view audit logs" on public.audit_logs;
create policy "Admins can view audit logs"
on public.audit_logs for select
to authenticated
using (public.is_admin());

drop policy if exists "Authenticated users can create audit log records" on public.audit_logs;
create policy "Authenticated users can create audit log records"
on public.audit_logs for insert
to authenticated
with check (auth.uid() is not null);

grant select, insert on public.audit_logs to authenticated;


-- 3. HOSPITALS AND CLINICS PERSISTENCE
-- ------------------------------------------------------------------------------
create table if not exists public.hospitals (
  id text primary key,
  name text not null,
  location text not null,
  distance numeric not null default 0,
  departments text[] not null default '{}',
  facilities text[] not null default '{}',
  hours text not null default 'Open 24 hours',
  phone text not null default '',
  doctor_ids text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hospitals enable row level security;

drop policy if exists "Anyone can view active hospitals" on public.hospitals;
create policy "Anyone can view active hospitals"
on public.hospitals for select
to authenticated, anon
using (is_active = true or public.is_admin());

drop policy if exists "Admins can insert hospitals" on public.hospitals;
create policy "Admins can insert hospitals"
on public.hospitals for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update hospitals" on public.hospitals;
create policy "Admins can update hospitals"
on public.hospitals for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete hospitals" on public.hospitals;
create policy "Admins can delete hospitals"
on public.hospitals for delete
to authenticated
using (public.is_admin());

grant select on public.hospitals to authenticated, anon;
grant insert, update, delete on public.hospitals to authenticated;

-- Seed existing hospital data safely
insert into public.hospitals (id, name, location, distance, departments, facilities, hours, phone, doctor_ids)
values
  ('h1', 'CarePoint Hospital', 'Sector 62, Noida', 2.8, array['Cardiology','Neurology','General Medicine','Orthopedics'], array['ECG','Echocardiography','Diagnostic lab','Emergency services'], 'Open 24 hours', '+91 120 400 1200', array['d1','d4']),
  ('h2', 'NorthStar Medical Centre', 'Sector 18, Noida', 4.1, array['Dermatology','ENT','General Medicine'], array['Pharmacy','Diagnostics','Day care'], '8:00 AM – 9:00 PM', '+91 120 400 1800', array['d2','d6']),
  ('h3', 'Lifeline Multispeciality', 'Indirapuram, Ghaziabad', 7.2, array['Cardiology','Pediatrics','Gynecology'], array['ICU','ECG','Maternity care'], 'Open 24 hours', '+91 120 400 2200', array['d3','d7']),
  ('h4', 'Medora Clinic', 'Sector 50, Noida', 5.3, array['Dermatology','General Medicine','ENT'], array['Consultation rooms','Lab collection','Pharmacy'], '9:00 AM – 8:00 PM', '+91 120 400 2600', array['d5','d8']),
  ('h5', 'GreenCross Hospital', 'Greater Noida West', 12.4, array['Orthopedics','Neurology','General Medicine'], array['Physiotherapy','MRI referral','Emergency care'], 'Open 24 hours', '+91 120 400 3100', array['d9','d10']),
  ('h6', 'CityCare Medical Centre', 'Sector 137, Noida', 9.1, array['Pediatrics','Gynecology','Cardiology'], array['Ultrasound','ECG','Pathology'], '8:00 AM – 10:00 PM', '+91 120 400 3600', array['d11','d12'])
on conflict (id) do update set
  name = excluded.name,
  location = excluded.location,
  departments = excluded.departments,
  facilities = excluded.facilities,
  hours = excluded.hours,
  phone = excluded.phone,
  doctor_ids = excluded.doctor_ids;


-- 4. SPECIALTIES PERSISTENCE
-- ------------------------------------------------------------------------------
create table if not exists public.specialties (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  icon text not null default 'Stethoscope',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.specialties enable row level security;

drop policy if exists "Anyone can view active specialties" on public.specialties;
create policy "Anyone can view active specialties"
on public.specialties for select
to authenticated, anon
using (is_active = true or public.is_admin());

drop policy if exists "Admins can manage specialties" on public.specialties;
create policy "Admins can manage specialties"
on public.specialties for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on public.specialties to authenticated, anon;
grant insert, update, delete on public.specialties to authenticated;

-- Seed default specialties
insert into public.specialties (name, description, icon)
values
  ('Cardiology', 'Heart and cardiovascular care, ECG, hypertension management', 'HeartPulse'),
  ('Dermatology', 'Skin, hair, nails and cosmetic dermatology treatments', 'Sparkles'),
  ('Orthopedics', 'Bones, joints, spine and musculoskeletal mobility', 'Bone'),
  ('Neurology', 'Brain, nerve disorders, headaches and neurology consults', 'Brain'),
  ('ENT', 'Ear, nose, throat and hearing health consultations', 'Headphones'),
  ('Pediatrics', 'Comprehensive healthcare for infants, children and teens', 'Baby'),
  ('General Medicine', 'Primary care, fever, routine health and preventive screenings', 'Stethoscope'),
  ('Gynecology', 'Women’s health, maternal care and routine checkups', 'User')
on conflict (name) do nothing;


-- 5. REVIEWS AND CONTENT MODERATION
-- ------------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references auth.users(id) on delete set null,
  patient_name text not null,
  doctor_id text not null,
  doctor_name text not null,
  appointment_id uuid references public.appointments(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  status text not null default 'Published' check (status in ('Published', 'Flagged', 'Hidden', 'Under Review')),
  moderation_note text,
  moderated_by uuid references auth.users(id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

drop policy if exists "Anyone can view published reviews" on public.reviews;
create policy "Anyone can view published reviews"
on public.reviews for select
to authenticated, anon
using (status = 'Published' or public.is_admin());

drop policy if exists "Patients can write reviews" on public.reviews;
create policy "Patients can write reviews"
on public.reviews for insert
to authenticated
with check (auth.uid() = patient_id);

drop policy if exists "Admins can moderate reviews" on public.reviews;
create policy "Admins can moderate reviews"
on public.reviews for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete reviews" on public.reviews;
create policy "Admins can delete reviews"
on public.reviews for delete
to authenticated
using (public.is_admin());

grant select on public.reviews to authenticated, anon;
grant insert, update, delete on public.reviews to authenticated;

-- Seed realistic reviews for initial data demonstration
insert into public.reviews (patient_name, doctor_id, doctor_name, rating, comment, status)
values
  ('Aarav Mehta', 'd1', 'Dr. Ananya Mehra', 5, 'Exceptional cardiologist. Explained the ECG report clearly and provided a reassuring treatment plan.', 'Published'),
  ('Priya Sharma', 'd2', 'Dr. Rohan Kapoor', 5, 'Very knowledgeable dermatologist. The prescribed allergy ointment resolved my symptoms quickly.', 'Published'),
  ('Rahul Verma', 'd3', 'Dr. Vikram Sethi', 4, 'Consultation was thorough. Waiting time was minimal and clinic staff was supportive.', 'Published'),
  ('Sneha Patel', 'd5', 'Dr. Neha Bansal', 5, 'Dr. Bansal listened patiently to all my symptoms and provided practical preventive guidance.', 'Published'),
  ('Aditya Nair', 'd6', 'Dr. Arjun Khanna', 4, 'Good ENT specialist, provided quick relief for sinus pain.', 'Published')
on conflict do nothing;


-- 6. ADMIN NOTIFICATIONS
-- ------------------------------------------------------------------------------
create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('doctor_application', 'verification_decision', 'appointment_update', 'user_event', 'system_warning')),
  title text not null,
  message text not null,
  entity_type text,
  entity_id text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.admin_notifications enable row level security;

drop policy if exists "Admins can view and manage notifications" on public.admin_notifications;
create policy "Admins can view and manage notifications"
on public.admin_notifications for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update, delete on public.admin_notifications to authenticated;

-- Seed an initial welcome notification
insert into public.admin_notifications (type, title, message, entity_type, entity_id)
values (
  'system_warning',
  'Admin Dashboard Initialized',
  'Welcome to the MedQueue Management Console. Review pending doctor applications and system events from here.',
  'system',
  'system_init'
)
on conflict do nothing;


-- 7. SYSTEM SETTINGS
-- ------------------------------------------------------------------------------
create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.system_settings enable row level security;

drop policy if exists "Admins can view system settings" on public.system_settings;
create policy "Admins can view system settings"
on public.system_settings for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can update system settings" on public.system_settings;
create policy "Admins can update system settings"
on public.system_settings for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, update, insert on public.system_settings to authenticated;

insert into public.system_settings (key, value, description)
values
  ('maintenance_mode', 'false'::jsonb, 'Global maintenance mode flag'),
  ('doctor_auto_assign', 'false'::jsonb, 'Automatically assign next available catalog doctor ID on verification'),
  ('email_notifications_enabled', 'false'::jsonb, 'Send email notifications for status updates (requires external SMTP/Resend service)'),
  ('verification_sla_hours', '48'::jsonb, 'Target SLA in hours for doctor application review'),
  ('platform_branding', '{"name": "MedQueue", "support_phone": "+91 120 400 1200", "support_email": "support@medqueue.example"}'::jsonb, 'Platform metadata')
on conflict (key) do nothing;


-- 8. EXTEND DOCTOR_PROFILES AND APPOINTMENTS ACCESS FOR ADMINISTRATORS
-- ------------------------------------------------------------------------------
drop policy if exists "Admins can view all doctor profiles" on public.doctor_profiles;
create policy "Admins can view all doctor profiles"
on public.doctor_profiles for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can update all doctor profiles" on public.doctor_profiles;
create policy "Admins can update all doctor profiles"
on public.doctor_profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can view all appointments" on public.appointments;
create policy "Admins can view all appointments"
on public.appointments for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can update all appointments" on public.appointments;
create policy "Admins can update all appointments"
on public.appointments for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Storage: allow administrators to view verification certificates
drop policy if exists "Admins can view verification documents" on storage.objects;
create policy "Admins can view verification documents"
on storage.objects for select
to authenticated
using (
  bucket_id = 'doctor-verification'
  and public.is_admin()
);


-- 9. PRIVILEGED ADMINISTRATIVE FUNCTIONS (RPCs)
-- ------------------------------------------------------------------------------

-- Function to approve a doctor application and assign role & catalog doctor ID
create or replace function public.admin_approve_doctor(
  target_user_id uuid,
  assigned_doctor_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_email text;
  doc_profile record;
  assigned_id text := assigned_doctor_id;
begin
  -- Enforce admin authorization
  if not public.is_admin(caller_id) then
    raise exception 'Unauthorized: Administrator privileges are required.';
  end if;

  select email into caller_email from auth.users where id = caller_id;
  select * into doc_profile from public.doctor_profiles where user_id = target_user_id;

  if not found then
    raise exception 'Doctor profile not found for user %', target_user_id;
  end if;

  -- Default doctor_id if not provided
  if assigned_id is null or assigned_id = '' then
    assigned_id := coalesce(doc_profile.doctor_id, 'doc_' || substr(target_user_id::text, 1, 8));
  end if;

  -- Update doctor profile
  update public.doctor_profiles
  set status = 'Verified',
      doctor_id = assigned_id,
      admin_feedback = 'Your application has been verified and approved by the MedQueue administration.',
      updated_at = now()
  where user_id = target_user_id;

  -- Update auth user profile to provider
  update public.profiles
  set role = 'provider',
      updated_at = now()
  where id = target_user_id;

  -- Record audit log
  insert into public.audit_logs (actor_id, actor_email, action, entity_type, entity_id, details)
  values (
    caller_id,
    coalesce(caller_email, 'admin'),
    'doctor_approved',
    'doctor_profile',
    target_user_id::text,
    jsonb_build_object(
      'doctor_name', doc_profile.full_name,
      'doctor_id', assigned_id,
      'previous_status', doc_profile.status
    )
  );

  -- Record notification
  insert into public.admin_notifications (type, title, message, entity_type, entity_id)
  values (
    'verification_decision',
    'Doctor Application Approved',
    'Dr. ' || doc_profile.full_name || ' was verified and approved by ' || coalesce(caller_email, 'an administrator') || '.',
    'doctor_profile',
    target_user_id::text
  );

  return jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'doctor_id', assigned_id,
    'status', 'Verified'
  );
end;
$$;

-- Function to reject a doctor application with required reason
create or replace function public.admin_reject_doctor(
  target_user_id uuid,
  rejection_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_email text;
  doc_profile record;
begin
  if not public.is_admin(caller_id) then
    raise exception 'Unauthorized: Administrator privileges are required.';
  end if;

  if rejection_reason is null or trim(rejection_reason) = '' then
    raise exception 'A rejection reason is required.';
  end if;

  select email into caller_email from auth.users where id = caller_id;
  select * into doc_profile from public.doctor_profiles where user_id = target_user_id;

  if not found then
    raise exception 'Doctor profile not found for user %', target_user_id;
  end if;

  update public.doctor_profiles
  set status = 'Rejected',
      admin_feedback = trim(rejection_reason),
      updated_at = now()
  where user_id = target_user_id;

  insert into public.audit_logs (actor_id, actor_email, action, entity_type, entity_id, details)
  values (
    caller_id,
    coalesce(caller_email, 'admin'),
    'doctor_rejected',
    'doctor_profile',
    target_user_id::text,
    jsonb_build_object(
      'doctor_name', doc_profile.full_name,
      'reason', trim(rejection_reason),
      'previous_status', doc_profile.status
    )
  );

  insert into public.admin_notifications (type, title, message, entity_type, entity_id)
  values (
    'verification_decision',
    'Doctor Application Rejected',
    'Application for Dr. ' || doc_profile.full_name || ' was marked Rejected. Reason: ' || trim(rejection_reason),
    'doctor_profile',
    target_user_id::text
  );

  return jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'status', 'Rejected'
  );
end;
$$;

-- Function to request additional info from doctor
create or replace function public.admin_request_info_doctor(
  target_user_id uuid,
  feedback_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_email text;
  doc_profile record;
begin
  if not public.is_admin(caller_id) then
    raise exception 'Unauthorized: Administrator privileges are required.';
  end if;

  if feedback_notes is null or trim(feedback_notes) = '' then
    raise exception 'Feedback notes are required.';
  end if;

  select email into caller_email from auth.users where id = caller_id;
  select * into doc_profile from public.doctor_profiles where user_id = target_user_id;

  update public.doctor_profiles
  set status = 'Action required',
      admin_feedback = trim(feedback_notes),
      updated_at = now()
  where user_id = target_user_id;

  insert into public.audit_logs (actor_id, actor_email, action, entity_type, entity_id, details)
  values (
    caller_id,
    coalesce(caller_email, 'admin'),
    'doctor_info_requested',
    'doctor_profile',
    target_user_id::text,
    jsonb_build_object(
      'doctor_name', doc_profile.full_name,
      'feedback', trim(feedback_notes)
    )
  );

  return jsonb_build_object('success', true, 'status', 'Action required');
end;
$$;

-- Function to suspend or reactivate an account
create or replace function public.admin_set_user_suspension(
  target_user_id uuid,
  suspend boolean,
  reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_email text;
  target_profile record;
begin
  if not public.is_admin(caller_id) then
    raise exception 'Unauthorized: Administrator privileges are required.';
  end if;

  if caller_id = target_user_id then
    raise exception 'Cannot suspend your own administrator account.';
  end if;

  select email into caller_email from auth.users where id = caller_id;
  select * into target_profile from public.profiles where id = target_user_id;

  if not found then
    raise exception 'User profile not found.';
  end if;

  update public.profiles
  set is_suspended = suspend,
      updated_at = now()
  where id = target_user_id;

  insert into public.audit_logs (actor_id, actor_email, action, entity_type, entity_id, details)
  values (
    caller_id,
    coalesce(caller_email, 'admin'),
    case when suspend then 'user_suspended' else 'user_reactivated' end,
    'user_profile',
    target_user_id::text,
    jsonb_build_object(
      'user_name', target_profile.full_name,
      'role', target_profile.role,
      'reason', reason
    )
  );

  insert into public.admin_notifications (type, title, message, entity_type, entity_id)
  values (
    'user_event',
    case when suspend then 'Account Suspended' else 'Account Reactivated' end,
    target_profile.full_name || ' was ' || (case when suspend then 'suspended' else 'reactivated' end) || ' by ' || coalesce(caller_email, 'an administrator') || '.',
    'user_profile',
    target_user_id::text
  );

  return jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'is_suspended', suspend
  );
end;
$$;

-- 10. SECURE BOOTSTRAP FUNCTION FOR FIRST ADMINISTRATOR
-- ------------------------------------------------------------------------------
-- Can be called via SQL Editor or securely by system owner to provision the first admin:
-- select public.promote_to_admin('owner@example.com');
create or replace function public.promote_to_admin(target_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid;
begin
  select id into target_id from auth.users where email = trim(lower(target_email));

  if target_id is null then
    raise exception 'User with email % does not exist in auth.users. Please create the user account first via Supabase Auth.', target_email;
  end if;

  update public.profiles
  set role = 'admin',
      is_suspended = false,
      updated_at = now()
  where id = target_id;

  insert into public.audit_logs (actor_id, actor_email, action, entity_type, entity_id, details)
  values (
    target_id,
    target_email,
    'admin_bootstrapped',
    'profiles',
    target_id::text,
    jsonb_build_object('promoted_email', target_email)
  );

  return jsonb_build_object('success', true, 'email', target_email, 'user_id', target_id, 'role', 'admin');
end;
$$;

-- Ensure triggers on doctor applications notify administrators
create or replace function public.notify_on_doctor_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (TG_OP = 'INSERT' and new.status = 'Submitted for review') or
     (TG_OP = 'UPDATE' and old.status <> 'Submitted for review' and new.status = 'Submitted for review') then
    insert into public.admin_notifications (type, title, message, entity_type, entity_id)
    values (
      'doctor_application',
      'New Doctor Application Submitted',
      'Dr. ' || new.full_name || ' submitted qualifications for review (' || new.specialty || ').',
      'doctor_profile',
      new.user_id::text
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_doctor_profile_submitted on public.doctor_profiles;
create trigger on_doctor_profile_submitted
after insert or update on public.doctor_profiles
for each row execute procedure public.notify_on_doctor_submission();
