import express from 'express';
import { PORT, SUPABASE_URL, SUPABASE_KEY } from './config.js';
import authRoutes from './routes/auth.js';

const app = express();
app.use(express.json());

app.get('/', (req, res) => res.json({ message: 'Auth Practice API' }));

app.use('/auth', authRoutes);

const server = app.listen(PORT);

server.on('listening', async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: SUPABASE_KEY },
    });
    console.log(response.ok ? 'Connected to Supabase' : 'Supabase health check failed');
  } catch {
    console.log('Could not reach Supabase — check SUPABASE_URL');
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} already in use — free it or set PORT`);
  } else {
    console.error(`Server failed to start: ${err.message}`);
  }
  process.exit(1);
});
