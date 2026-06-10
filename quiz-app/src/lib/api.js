import { supabase, isSupabaseConfigured } from './supabase';

// The login screens use a plain "Username"; Supabase Auth needs an email, so a
// bare username is mapped to a synthetic address. Real emails are used as-is.
const toEmail = (u) => (u.includes('@') ? u.trim() : `${u.trim().toLowerCase()}@quizmaster.local`);

const ensure = () => {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured (set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
};

// ----------------------------- AUTH ----------------------------------------
export async function signIn(username, password) {
  ensure();
  const { data, error } = await supabase.auth.signInWithPassword({ email: toEmail(username), password });
  if (error) throw error;
  return data;
}

export async function signUp(username, password, role = 'player') {
  ensure();
  const { data, error } = await supabase.auth.signUp({
    email: toEmail(username),
    password,
    options: { data: { username: username.trim(), role } },
  });
  if (error) throw error;
  return data;
}

// Players self-register on first login; admins must already exist (and be promoted).
export async function signInOrSignUp(username, password, role = 'player') {
  try {
    return await signIn(username, password);
  } catch (e) {
    if (/invalid login credentials/i.test(e.message)) return await signUp(username, password, role);
    throw e;
  }
}

export async function getCurrentRole() {
  ensure();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return data?.role ?? 'player';
}

// Restored session from localStorage (null when offline or signed out).
export async function getSession() {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Subscribe to sign-in/sign-out; returns an unsubscribe fn.
export function onAuthChange(cb) {
  if (!isSupabaseConfigured) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

export async function signOut() {
  if (isSupabaseConfigured) await supabase.auth.signOut();
}

// --------------------------- QUIZZES ---------------------------------------
export async function listQuizzes() {
  ensure();
  const { data, error } = await supabase
    .from('quizzes_with_counts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createQuiz({ name, rounds = 1, timer = 15 }) {
  ensure();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('quizzes')
    .insert({ name, rounds, timer, created_by: user?.id ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteQuiz(id) {
  ensure();
  const { error } = await supabase.from('quizzes').delete().eq('id', id);
  if (error) throw error;
}

// --------------------------- QUESTIONS -------------------------------------
export async function listQuestions(quizId) {
  ensure();
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('quiz_id', quizId)
    .order('position', { ascending: true });
  if (error) throw error;
  return data;
}

export async function saveQuestion(quizId, q) {
  ensure();
  const row = {
    quiz_id: quizId,
    text: q.question ?? q.text,
    options: q.options,
    correct: q.correct,
    round: q.round ?? 1,
    image_url: q.image_url ?? null,
    video_url: q.video_url ?? null,
    position: q.position ?? 0,
  };
  const query = q.id
    ? supabase.from('questions').update(row).eq('id', q.id)
    : supabase.from('questions').insert(row);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

export async function deleteQuestion(id) {
  ensure();
  const { error } = await supabase.from('questions').delete().eq('id', id);
  if (error) throw error;
}

// --------------------------- GAME RESULTS ----------------------------------
export async function saveGameResult({ quizId = null, quizName, teams, winner }) {
  ensure();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('game_results')
    .insert({ quiz_id: quizId, quiz_name: quizName, teams, winner, created_by: user?.id ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listResults(limit = 50) {
  ensure();
  const { data, error } = await supabase
    .from('game_results')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

// ----------------------------- MEDIA ---------------------------------------
export async function uploadMedia(file) {
  ensure();
  const ext = file.name.split('.').pop();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('quiz-media').upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from('quiz-media').getPublicUrl(path);
  return data.publicUrl;
}
