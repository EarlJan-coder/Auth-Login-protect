import { Router } from 'express';
import supabase from '../supabase.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

router.post('/signup', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json(data.user);
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: 'Invalid login credentials' });
  return res.status(200).json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
});

router.post('/logout', requireAuth, async (req, res) => {
  // supabase.auth.signOut() acts on a *stored* session; this server-side client
  // holds none, so we invoke the same /auth/v1/logout endpoint it calls, but
  // with the caller's token so THEIR session is actually revoked.
  try {
    await fetch(`${process.env.SUPABASE_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_KEY,
        Authorization: `Bearer ${req.accessToken}`,
      },
    });
  } catch {
    // Supabase unreachable — local logout still succeeds
  }
  res.status(204).send();
});

export default router;
