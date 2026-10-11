import type { Session, User } from '@supabase/supabase-js';
import { requireSupabase, supabaseConfigured, supabase } from './supabase';
import type { CarePathRole, AuthUser } from '../types';

export type { CarePathRole };

export async function signUpWithEmail(input: {
  fullName: string;
  email: string;
  password: string;
  role: CarePathRole;
}) {
  const client = requireSupabase();
  const redirectTo = `${window.location.origin}/login`;
  // Even if provider is requested, the server-side trigger handle_new_user() creates a patient profile.
  // Provider role must be approved and granted by an administrator.
  const { data, error } = await client.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      emailRedirectTo: redirectTo,
      data: {
        full_name: input.fullName.trim(),
        requested_role: input.role,
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  return data;
}

export async function signInAsAdmin(email: string, password: string): Promise<{ user: User; profile: any }> {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  if (!data.user) throw new Error('Authentication failed: no user returned.');

  // Verify administrator role in profiles table
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id, full_name, role, is_suspended')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError) {
    await client.auth.signOut();
    throw new Error(`Profile lookup error: ${profileError.message}`);
  }

  if (!profile || profile.role !== 'admin') {
    await client.auth.signOut();
    throw new Error('Access Denied: This account does not possess administrator privileges.');
  }

  if (profile.is_suspended) {
    await client.auth.signOut();
    throw new Error('Access Denied: This administrator account has been suspended.');
  }

  return { user: data.user, profile };
}

export async function signInAsDoctor(email: string, password: string): Promise<{
  user: User;
  profile: any;
  doctorProfile: any;
}> {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  if (!data.user) throw new Error('Authentication failed: no user returned.');

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id, full_name, role, is_suspended')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  if (profile?.is_suspended) {
    await client.auth.signOut();
    throw new Error('Your account is currently suspended. Please contact platform administration.');
  }

  const { data: doctorProfile } = await client
    .from('doctor_profiles')
    .select('*')
    .eq('user_id', data.user.id)
    .maybeSingle();

  return { user: data.user, profile, doctorProfile };
}

export async function requestPasswordReset(email: string) {
  const { error } = await requireSupabase().auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function updatePassword(password: string) {
  const { data, error } = await requireSupabase().auth.updateUser({ password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabaseConfigured || !supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
  if (!supabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getCurrentUser(): Promise<User | null> {
  if (!supabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function fetchFullUserProfile(userId: string): Promise<AuthUser | null> {
  if (!supabaseConfigured || !supabase) return null;
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, role, is_suspended, created_at')
      .eq('id', userId)
      .maybeSingle();

    const { data: userResp } = await supabase.auth.getUser();
    const user = userResp?.user;

    return {
      id: userId,
      name: profile?.full_name || user?.user_metadata?.full_name || '',
      email: user?.email || '',
      role: (profile?.role as CarePathRole) || 'patient',
      isSuspended: Boolean(profile?.is_suspended),
      createdAt: profile?.created_at,
    };
  } catch (e) {
    console.error('Error fetching user profile:', e);
    return null;
  }
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  if (!supabaseConfigured || !supabase) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }
  return supabase.auth.onAuthStateChange((_event, session) => callback(session));
}
