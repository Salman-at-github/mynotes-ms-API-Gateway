const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3030;

// Define the list of allowed origins (replace this with your frontend URL)
const allowedOrigins = ['http://yourfrontenddomain.com', 'https://yourfrontenddomain.com'];

// CORS Handling Middleware with specific options
const corsOptions = {
  origin: (origin, callback) => {
    // Check if the origin is in the allowedOrigins list or if it's not provided (e.g., a same-origin request)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Request Logging Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'deny');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// CORS Handling Middleware
app.use(cors(corsOptions));

// Rate Limiting Middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Proxy configuration for Auth microservice
app.use('/api/auth', createProxyMiddleware({ target: process.env.AUTH_HOST, changeOrigin: true }));

// Proxy configuration for Notes microservice
app.use('/api/notes', (req, res, next) => {
  const token = req.headers.authorization;

  if (token) {
    // Optionally, you can perform additional validation or manipulation of the token here
    req.headers.authorization = `Bearer ${token}`;
  }

  next();
}, createProxyMiddleware({ target: process.env.NOTES_HOST, changeOrigin: true }));

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

app.listen(PORT, () => {
  console.log(`API Gateway is running on Port ${PORT}`);
});
