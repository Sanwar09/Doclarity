import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import uploadRoute from './routes/upload.js';
import analyzeRoute from './routes/analyze.js';
import chatRoute from "./routes/chat.js";
import secure from './routes/secure.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/me', secure);
app.use('/api/upload', uploadRoute);
app.use('/api/analyze', analyzeRoute);
app.use('/api/chat', chatRoute);
// Readiness endpoints so Passenger’s first probe gets a fast 200
app.get('/', (_req, res) => res.status(200).send('OK'));
app.get('/api', (_req, res) => res.status(200).send('OK'));
app.get('/api/health', (_req, res) => res.json({ ok: true, port: PORT, ts: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`[passenger] Node app listening on port ${PORT}`);
});

