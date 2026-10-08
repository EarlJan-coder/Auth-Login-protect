import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

router.get('/profile', requireAuth, (req, res) => {
  const { id, email, created_at } = req.user;
  res.status(200).json({ id, email, created_at });
});

router.get('/dashboard', requireAuth, (req, res) => {
  res.status(200).json({
    message: `Welcome back, ${req.user.email}`,
    user: { id: req.user.id, email: req.user.email },
  });
});

export default router;
