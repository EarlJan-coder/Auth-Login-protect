import { Router } from 'express';

const router = Router();

router.get('/profile', (req, res) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  // Stage 3 adds real verification here
  res.status(200).json({ message: 'Token presented (not yet verified)' });
});

export default router;
