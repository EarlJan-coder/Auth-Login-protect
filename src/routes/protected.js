import { Router } from 'express';
import supabase from '../supabase.js';

const router = Router();

router.get('/profile', async (req, res) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  res.status(200).json({
    id: user.id,
    email: user.email,
    created_at: user.created_at,
  });
});

export default router;
