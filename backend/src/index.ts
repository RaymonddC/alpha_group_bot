import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { logger } from './services/logger';
import { errorHandler, notFoundHandler } from './api/middleware/error-handler';

// Import routes
import verifyRoutes from './api/routes/verify';
import adminRoutes from './api/routes/admin';
import cronRoutes from './api/routes/cron';
import healthRoutes from './api/routes/health';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const TELEGRAM_SECRET_TOKEN = process.env.TELEGRAM_SECRET_TOKEN;

// CORS configuration
const ALLOWED_ORIGINS = [
  FRONTEND_URL,
  'http://localhost:3000',
  'https://alpha-groups.vercel.app'
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// JSON parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global rate limiting (100 req/15min per IP)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', globalLimiter);

// Verification endpoint rate limiting (10 req/hour per IP)
const verifyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many verification attempts. Please try again later.'
});

app.use('/api/verify', verifyLimiter);

// Telegram webhook endpoint
app.post('/webhook', async (req, res) => {
  try {
    // Verify webhook secret token
    const receivedToken = req.headers['x-telegram-bot-api-secret-token'];

    if (receivedToken !== TELEGRAM_SECRET_TOKEN) {
      logger.error('Invalid webhook secret - potential attack!', {
        ip: req.ip,
        headers: req.headers
      });
      res.status(403).send('Forbidden');
      return;
    }

    // Import bot dynamically (will be available after bot-dev creates it)
    try {
      const { bot } = await import('./bot/telegram-bot');
      await bot.processUpdate(req.body);
      res.sendStatus(200);
    } catch (importError) {
      logger.warn('Bot module not available yet', { error: importError });
      res.sendStatus(200); // Return 200 to avoid Telegram retries
    }
  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.sendStatus(500);
  }
});

// Mount API routes
app.use('/api', verifyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api', healthRoutes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'Alpha Groups Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      verify: 'POST /api/verify',
      admin: '/api/admin/*',
      cron: 'POST /api/cron/recheck-members'
    }
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Initialize bot and set up function references
async function initializeBot() {
  try {
    const {
      grantTelegramAccess,
      kickMember,
      notifyUser,
      testTelegramConnection
    } = await import('./bot/telegram-bot');

    // Set bot functions in verify route
    const { setBotFunctions: setVerifyBotFunctions } = await import('./api/routes/verify');
    setVerifyBotFunctions(grantTelegramAccess, notifyUser);

    // Set bot functions in admin route
    const { setBotFunctions: setAdminBotFunctions } = await import('./api/routes/admin');
    setAdminBotFunctions(kickMember);

    // Set bot functions in member-checker
    const { setBotFunctions: setCheckerBotFunctions } = await import(
      './services/member-checker'
    );
    setCheckerBotFunctions(kickMember, notifyUser);

    // Set bot functions in health route
    const { setBotFunctions: setHealthBotFunctions } = await import('./api/routes/health');
    setHealthBotFunctions(testTelegramConnection);

    logger.info('Bot functions initialized successfully');
  } catch (error) {
    logger.warn('Bot module not available - will use mock functions', { error });
    // Set mock functions for development without bot
    const mockGrant = async (_userId: number, _groupId: number): Promise<void> => { logger.info('Mock: grant access'); };
    const mockKick = async (_userId: number, _groupId: number): Promise<void> => { logger.info('Mock: kick member'); };
    const mockNotify = async (_userId: number, _message: string): Promise<void> => { logger.info('Mock: notify user'); };
    const mockTest = async (): Promise<boolean> => true;

    const { setBotFunctions: setVerifyBotFunctions } = await import('./api/routes/verify');
    setVerifyBotFunctions(mockGrant, mockNotify);

    const { setBotFunctions: setAdminBotFunctions } = await import('./api/routes/admin');
    setAdminBotFunctions(mockKick);

    const { setBotFunctions: setCheckerBotFunctions } = await import(
      './services/member-checker'
    );
    setCheckerBotFunctions(mockKick, mockNotify);

    const { setBotFunctions: setHealthBotFunctions } = await import('./api/routes/health');
    setHealthBotFunctions(mockTest);
  }
}

// Start server
async function startServer() {
  try {
    // Initialize bot functions
    await initializeBot();

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`Server started on port ${PORT}`, {
        environment: process.env.NODE_ENV || 'development',
        port: PORT
      });
      console.log(`\n🚀 Alpha Groups Backend API`);
      console.log(`📡 Server running on http://localhost:${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📝 API docs: http://localhost:${PORT}/\n`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
