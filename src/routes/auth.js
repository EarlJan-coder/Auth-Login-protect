import { Router } from 'express';
import supabase from '../supabase.js';

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

export default router;
