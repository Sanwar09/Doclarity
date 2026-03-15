import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import uploadRoute from './routes/upload.js';
import analyzeRoute from './routes/analyze.js';
import chatRoute from "./routes/chat.js";
import compareRoute from './routes/compare.js';
import authRoute from './routes/auth.js';
import secure from './routes/secure.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.ALLOWED_ORIGIN || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

app.set('trust proxy', 1);

app.use(cors({
  origin(origin, callback) {
    // Allow server-to-server tools and same-origin requests without an Origin header.
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

app.use('/me', secure);
app.use('/api/auth', authRoute);
app.use('/api/upload', uploadRoute);
app.use('/api/analyze', analyzeRoute);
app.use('/api/chat', chatRoute);
app.use('/api/compare', compareRoute);
// Readiness endpoints so Passenger’s first probe gets a fast 200
app.get('/', (_req, res) => res.status(200).send('OK'));
app.get('/api', (_req, res) => res.status(200).send('OK'));
app.get('/api/health', (_req, res) => res.json({ ok: true, port: PORT, ts: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`[passenger] Node app listening on port ${PORT}`);
});
