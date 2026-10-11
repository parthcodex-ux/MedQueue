-- MedQueue Doctor Portal migration
-- Run after supabase-schema.sql and supabase-appointments-migration.sql.
-- Doctor role/verification is assigned only by an administrator; signup metadata is not trusted.

create table if not exists public.doctor_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  phone text not null default '',
  specialty text not null default '',
  qualifications text not null default '',
  experience integer not null default 0 check (experience between 0 and 70),
  license_number text not null default '',
  licensing_authority text not null default '',
  clinic_name text not null default '',
  address text not null default '',
  city text not null default '',
  consultation_type text not null default 'In-person' check (consultation_type in ('In-person','Online','Both')),
  fee numeric check (fee is null or fee >= 0),
  languages text not null default '',
  bio text not null default '',
  working_days text not null default 'Mon, Tue, Wed, Thu, Fri',
  start_time time not null default '09:00',
  end_time time not null default '17:00',
  slot_minutes integer not null default 30 check (slot_minutes in (15,20,30,45,60)),
  status text not null default 'Draft' check (status in ('Draft','Submitted for review','Under review','Verified','Rejected','Action required')),
  doctor_id text unique,
  registration_certificate_path text,
  admin_feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.doctor_profiles enable row level security;

drop policy if exists "Doctors can view own application" on public.doctor_profiles;
create policy "Doctors can view own application"
on public.doctor_profiles for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Doctors can submit their own application" on public.doctor_profiles;
create policy "Doctors can submit their own application"
on public.doctor_profiles for insert to authenticated
with check (
  auth.uid() = user_id
  and status in ('Draft','Submitted for review')
  and doctor_id is null
);

drop policy if exists "Doctors can update their own application" on public.doctor_profiles;
create policy "Doctors can update their own application"
on public.doctor_profiles for update to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and status in ('Draft','Submitted for review')
  and doctor_id is null
);

grant select, insert, update on public.doctor_profiles to authenticated;

-- Replace the starter prototype's broad provider appointment access with assignment-scoped access.
drop policy if exists "Patients can view own appointments or providers can view all" on public.appointments;
create policy "Patients and assigned doctors can view appointments"
on public.appointments for select to authenticated
using (
  auth.uid() = patient_id
  or exists (
    select 1 from public.profiles p
    join public.doctor_profiles dp on dp.user_id = p.id
    where p.id = auth.uid()
      and p.role = 'provider'
      and dp.doctor_id = appointments.doctor_id
      and dp.status = 'Verified'
  )
);

drop policy if exists "Patients can cancel own appointments or providers can update status" on public.appointments;
create policy "Patients or assigned doctors can update appointment status"
on public.appointments for update to authenticated
using (
  (auth.uid() = patient_id)
  or exists (
    select 1 from public.profiles p
    join public.doctor_profiles dp on dp.user_id = p.id
    where p.id = auth.uid()
      and p.role = 'provider'
      and dp.doctor_id = appointments.doctor_id
      and dp.status = 'Verified'
  )
)
with check (
  (auth.uid() = patient_id and status = 'Cancelled')
  or exists (
    select 1 from public.profiles p
    join public.doctor_profiles dp on dp.user_id = p.id
    where p.id = auth.uid()
      and p.role = 'provider'
      and dp.doctor_id = appointments.doctor_id
      and dp.status = 'Verified'
  )
);

-- Admin-only verification/linking example (run manually in SQL editor after review):
-- update public.doctor_profiles set status='Verified', doctor_id='d1'
-- where user_id='AUTH_USER_UUID';
-- update public.profiles set role='provider' where id='AUTH_USER_UUID';


-- Private storage for professional registration certificates (PDF/JPG/PNG).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('doctor-verification', 'doctor-verification', false, 5242880, array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['application/pdf','image/jpeg','image/png'];

drop policy if exists "Doctors upload own verification files" on storage.objects;
create policy "Doctors upload own verification files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'doctor-verification'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Doctors view own verification files" on storage.objects;
create policy "Doctors view own verification files"
on storage.objects for select to authenticated
using (
  bucket_id = 'doctor-verification'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Doctors replace own verification files" on storage.objects;
create policy "Doctors replace own verification files"
on storage.objects for update to authenticated
using (
  bucket_id = 'doctor-verification'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'doctor-verification'
  and (storage.foldername(name))[1] = auth.uid()::text
);
