# CarePath — Rule 08 prototype

## Run locally
1. Extract the ZIP.
2. Open Terminal in the `carepath` folder.
3. Run `npm install`
4. Run `npm run dev`
5. Open the local URL printed by Vite.

## Demonstration flow
Home/search → doctor profile → select a free slot → enter patient details → create booking → confirmation → patient dashboard/provider dashboard.

## Data flow
Authentication uses Supabase Auth. Appointment records are stored in the Supabase `public.appointments` table and are fetched according to Row Level Security. The database unique index prevents two active bookings for the same doctor/date/slot. Patient cancellation and provider status changes update the stored appointment row. Doctor selection is retained in browser localStorage.

## Prototype limitations
- Doctor, hospital, fee, review, distance, and availability data are fictional.
- Doctor, hospital, fee, and schedule data are still fictional; this is not real provider availability.
- Appointment records are synchronized through this Supabase project, but are not sent to a real hospital system.
- No external healthcare API, payment, or real-time provider integration is used.
- Use fictional patient details for demonstrations; do not enter real sensitive medical information.
- This prototype does not provide medical diagnosis or emergency services.

## Verification
The archive structure and TypeScript source edits were checked. A production build/browser end-to-end test was not run in this environment; run `npm run build` locally and test the demonstration flow before submission.


## Supabase setup (authentication and appointments)

1. In Supabase, create a project.
2. Open **Project Settings → API** (or **Connect**) and copy the Project URL and the **publishable key** (`sb_publishable_...`). The legacy `anon` key is also intended for browser use if your project shows that instead.
3. Copy `.env.example` to `.env` in this `carepath` folder.
4. Replace the placeholders:
   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
   ```
5. In Supabase **Authentication → URL Configuration**, add your local Vite URL (typically `http://localhost:5173`) to **Redirect URLs**.
6. Open **SQL Editor**, paste and run `supabase-schema.sql`.
7. Run the appointments migration once: open `supabase-appointments-migration.sql` in the SQL Editor and run it. This creates the appointments table, RLS policies, and a unique active-slot index. Do not run this migration a second time unless you first remove/reconcile its existing policies.
8. Install the client library:
   ```bash
   npm install @supabase/supabase-js
   ```
9. Restart Vite after editing `.env`:
   ```bash
   npm run dev
   ```

### Code entry points
- `src/lib/supabase.ts`: reads the two Vite environment variables and creates the client.
- `src/lib/auth.ts`: working Supabase Auth functions for signup, login, password recovery, password update, session, and logout.
- `supabase-schema.sql`: profiles table, automatic patient profile creation, and row-level policies.
- `supabase-appointments-migration.sql`: appointments table, RLS, and duplicate active-slot prevention.

### Authentication wired in this version
- The navbar links to Log in / Create account; `/login`, `/signup`, `/forgot-password`, and `/reset-password` use Supabase Auth.
- New signups create patient accounts only. Provider access must be granted by an administrator in Supabase.
- Supabase session is restored when the page is refreshed; Log out calls Supabase Auth.
- Booking creation, patient appointment history, and provider appointment status updates use Supabase. The provider dashboard requires an administrator to promote a verified account to the `provider` role.
- Never put a Supabase `service_role` or secret key in a Vite `VITE_*` variable or frontend code.
- Test with a non-sensitive demo account. This remains a student prototype, not a production healthcare system.

### Provider test account
New accounts are always patients. To enable a separate demo provider account, create that account through `/signup`, find its UUID in Supabase **Authentication → Users**, and run this administrator-only statement in the SQL Editor, replacing the placeholder UUID:

```sql
update public.profiles
set role = 'provider'
where id = 'PASTE_AUTH_USER_UUID_HERE';
```

Then sign out and sign back in with that account. Do not expose provider role selection in public signup.

### Manual test checklist
1. Sign in with a patient account and create an appointment using fictional details.
2. Verify the row appears in Supabase **Table Editor → appointments**.
3. Refresh `/dashboard`; the booking should remain.
4. Cancel the appointment and verify its status changes to `Cancelled` in Supabase.
5. Create/promote a separate provider test account, sign in with it, and verify the provider dashboard can see the request and change its status.
6. Attempt to book the same doctor/date/slot from another patient account while the first booking is active; the database should reject the duplicate.

This is a student prototype. Do not store real patient health information or use it for clinical care.


## Doctor Portal

The project now includes doctor-facing routes:
- `/doctor/login`
- `/doctor/register`
- `/doctor/forgot-password`
- `/doctor/onboarding`
- `/doctor/dashboard`
- `/doctor/profile`
- `/doctor/appointments`
- `/doctor/calendar`
- `/doctor/notifications`
- `/doctor/settings`

### Enable the doctor portal backend

1. Configure Supabase using the `.env` steps above.
2. Run `supabase-doctor-portal-migration.sql` after the base schema and appointments migration.
3. Doctor signup does not grant provider permissions. The account can submit a professional profile, but it remains unverified until an administrator reviews the credentials.
4. After reviewing the submitted documents outside the prototype, an administrator can link the verified account to an existing doctor listing using the SQL example at the bottom of the migration. Replace the example UUID and doctor ID with approved values.
5. To permit appointment access, the administrator must set the user's `profiles.role` to `provider`, and the linked `doctor_profiles.status` must be `Verified`. Row-level security then limits appointment access to the linked doctor ID.

### Current limitations

- Doctor profile fields, basic weekly availability, and application status persist in Supabase after the migration is installed.
- Certificate uploads use a private Supabase Storage bucket with per-user object policies when the migration is installed. Automated email/SMS notifications, an admin review UI, generated appointment slots, and server-side rescheduling are not implemented in this student prototype.
- The appointment page only shows records allowed by Supabase Row Level Security. A doctor must be explicitly linked to a verified doctor listing before assigned appointments are visible.
- Fictional provider directory data remains demonstration data. Do not use real patient information or use this prototype for clinical care.
- Never promote a doctor or mark a profile verified without checking the professional registration with the relevant authority.


## Administrator Console & Operations (MedQueue Upgrade)

### New Administrator & Operations Features
- **Upgraded Single-Action Navbar**: Duplicate login and registration buttons removed from the left-side navigation. Desktop and mobile menus provide clean, single-point role selection modals for Sign In (Patient, Doctor, Admin) and Registration (Patient, Doctor).
- **No Public Administrator Signup**: Admin accounts cannot be created through public registration; they must be provisioned through authorized backend operations.
- **Role-Based Authentication**:
  - `patient` (regular user) → `/login` → Patient Dashboard (`/dashboard`)
  - `provider` (doctor) → `/doctor/login` → Doctor Portal (`/doctor/dashboard`)
  - `admin` (administrator) → `/admin/login` → Admin Management Console (`/admin`)
- **14 Functional Admin Console Sections at `/admin`**:
  1. **Overview**: Live database telemetry, KPIs (users, verified doctors, pending applications, bookings), demand charts, and recent activity streams.
  2. **User Management**: Searchable user roster, role filter, account suspension / reactivation with auditable reasons.
  3. **Doctor Management**: Credentials catalog, license inspection, city/clinic mapping, and catalog ID linking.
  4. **Doctor Verification**: Focused credentialing workbench with secure certificate inspection (signed URLs), single-click approval with role promotion, rejection with required reason, and information requests.
  5. **Appointment Management**: Platform-wide booking governance, status transitions, cancellation reason requirement, and CSV export.
  6. **Hospitals & Clinics**: Database-backed hospital management with active status toggles, department tags, and facility listings.
  7. **Specialties Management**: Clinical specialties governance with deletion safety constraints preventing removal of referenced specialties.
  8. **Reviews & Feedback**: Moderation of patient reviews with auditable status decisions and policy notes.
  9. **Reports & Analytics**: Aggregations based strictly on accessible database records with date range filters and CSV export.
  10. **Notifications**: Administrative event center for pending applications, verification events, and system alerts.
  11. **Audit Logs**: Tamper-proof, append-only administrative audit trail with JSON inspection and CSV export.
  12. **System Settings**: Global operational toggles (maintenance mode, doctor auto-assignment, notification dispatcher, SLA hours).
  13. **My Profile**: Administrator identity, permissions matrix, and password updates.
  14. **Logout**: Session termination with redirection to login.

### Database Setup & Administrator Provisioning

1. Run the base migrations in Supabase SQL Editor if not already done:
   - `supabase-schema.sql`
   - `supabase-appointments-migration.sql`
   - `supabase-doctor-portal-migration.sql`
2. Run `supabase-admin-migration.sql` in the **Supabase Dashboard > SQL Editor**. This installs:
   - The `admin` role constraint and `is_suspended` column on `public.profiles`.
   - Security-definer `public.is_admin()` helper function (prevents recursive RLS evaluations).
   - Tables for `audit_logs`, `hospitals`, `specialties`, `reviews`, `admin_notifications`, and `system_settings`.
   - Least-privilege Row Level Security (RLS) policies.
   - Privileged administrative RPCs (`admin_approve_doctor`, `admin_reject_doctor`, `admin_request_info_doctor`, `admin_set_user_suspension`).
3. **Provisioning the First Administrator**:
   - Create an account using the normal signup page (`/signup`) with your email (e.g. `owner@example.com`).
   - Open Supabase **SQL Editor** and run:
     ```sql
     select public.promote_to_admin('owner@example.com');
     ```
   - Go to `/admin/login` and sign in with those credentials to access `/admin`.
