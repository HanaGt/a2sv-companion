import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { submissionRouter } from './routes/submission';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: (origin, cb) => {
    const allowed = [
      'http://localhost:3000',
      'https://a2sv-companion-dev.vercel.app',
      'https://a2sv-companion.vercel.app',
    ];
    const isExtension = origin?.startsWith('chrome-extension://');
    if (!origin || allowed.includes(origin) || isExtension) {
      return cb(null, true);
    }
    cb(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// OAuth callback route
app.get('/', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Authorization code is required');
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code
      })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('OAuth error:', tokenData);
      return res.status(400).send('OAuth authorization failed');
    }

    // Return styled HTML page with access token for the content script to extract
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Authorization Successful</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: 'Inter', sans-serif;
    }

    body {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #eef2ff, #f8fafc);
    }

    .card {
      background: #ffffff;
      padding: 50px 40px;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
      text-align: center;
      max-width: 420px;
      width: 90%;
      animation: fadeIn 0.5s ease-in-out;
    }

    .success-icon {
      width: 70px;
      height: 70px;
      margin: 0 auto 20px;
      border-radius: 50%;
      background-color: #e6f9f0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .success-icon svg {
      width: 36px;
      height: 36px;
      stroke: #16a34a;
    }

    h1 {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 12px;
    }

    p {
      color: #6b7280;
      font-size: 15px;
      margin-bottom: 30px;
    }

    .btn {
      display: inline-block;
      padding: 12px 22px;
      border-radius: 8px;
      background-color: #4f46e5;
      color: white;
      text-decoration: none;
      font-weight: 600;
      transition: 0.2s ease;
    }

    .btn:hover {
      background-color: #4338ca;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="success-icon">
      <svg fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>

    <h1>Authorization Successful</h1>
    <p>Your account has been successfully authorized. You can safely close this window now.</p>

    <input type="hidden" id="access_token" value="${tokenData.access_token}" />

    <a href="#" class="btn">Close Window</a>
  </div>
</body>
</html>`;

    res.send(html);

  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send('Internal server error during OAuth callback');
  }
});

// Routes
app.use('/api', submissionRouter);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/health`);
});

export default app;