import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Heartbeat route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Backend Service',
    timestamp: new Date().toISOString()
  });
});

// Sample route for backward compatibility
app.post('/api/chat', (req, res) => {
  const { message } = req.body as { message: string };
  res.json({
    response: `Backend received: "${message}".`
  });
});

app.listen(PORT, () => {
  console.log(`⚡ Server running on http://localhost:${PORT}`);
});

export default app;
