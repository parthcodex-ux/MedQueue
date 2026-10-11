-- CarePath appointment persistence migration
-- Run once in Supabase Dashboard > SQL Editor after the profiles schema exists.
-- Uses non-destructive CREATE statements; does not drop existing data or policies.

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users(id) on delete cascade,
  doctor_id text not null,
  doctor_name text not null,
  specialty text not null,
  hospital_name text not null,
  location text not null,
  patient_name text not null,
  patient_age integer not null check (patient_age between 1 and 120),
  patient_phone text not null,
  patient_email text not null,
  reason text not null default 'General consultation',
  appointment_date date not null,
  slot text not null,
  status text not null default 'Pending' check (status in ('Pending', 'Confirmed', 'Cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists appointments_patient_created_idx
  on public.appointments (patient_id, created_at desc);

-- Prevent two active bookings for the same doctor, date, and slot.
-- Cancelled bookings release the slot.
create unique index if not exists appointments_active_slot_unique
  on public.appointments (doctor_id, appointment_date, slot)
  where status <> 'Cancelled';

alter table public.appointments enable row level security;

create policy "Patients can view own appointments or providers can view all"
on public.appointments for select
to authenticated
using (
  auth.uid() = patient_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'provider'
  )
);

create policy "Patients can create their own appointments"
on public.appointments for insert
to authenticated
with check (auth.uid() = patient_id);

create policy "Patients can cancel own appointments or providers can update status"
on public.appointments for update
to authenticated
using (
  auth.uid() = patient_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'provider'
  )
)
with check (
  (auth.uid() = patient_id and status = 'Cancelled')
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'provider'
  )
);

-- Restrict authenticated clients to updating only status; they cannot rewrite
-- the patient, doctor, date, slot, or contact details through this table grant.
grant select, insert on public.appointments to authenticated;
grant update (status) on public.appointments to authenticated;
