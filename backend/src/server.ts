import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import database configuration
import { testConnection, closePool } from './config/database';
import { runMigrations } from './scripts/migrate';
import { seedAll } from './scripts/seed';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/validation';
import { DebugLogger } from './utils/DebugLogger';
import { securityMiddleware, cleanupExpiredSessions } from './middleware/security';

// Import routes
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import vendorRoutes from './routes/vendors';
import usersRoutes from './routes/users';
import userDetailsRoutes from './routes/userDetails';
import profileRoutes from './routes/profile';
import settingsRoutes from './routes/settings';
import adminAnalyticsRoutes from './routes/adminAnalytics';
import vendorAnalyticsRoutes from './routes/vendorAnalytics';
import equipmentRoutes from './routes/equipment';
import clientRoutes from './routes/clients';
import maintenanceTicketRoutes from './routes/maintenanceTickets';
import reportsRoutes from './routes/reports';
import clientViewsRoutes from './routes/clientViews';
import clientAnalyticsRoutes from './routes/clientAnalytics';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Test database connection and initialize on startup
const initializeDatabase = async () => {
  console.log('🔄 Starting database initialization...');
  
  const isConnected = await testConnection();
  if (!isConnected) {
    console.error('❌ Failed to connect to database. Exiting...');
    process.exit(1);
  }
  
  console.log('✅ Database connection successful');
  
  // Run migrations and seed data on startup (in development only)
  if (process.env.AUTO_MIGRATE === 'true') {
    try {
      console.log('🔄 Running database migrations...');
      await runMigrations();
      
      if (process.env.AUTO_SEED === 'true') {
        console.log('🌱 Seeding database...');
        await seedAll();
      }
      
      console.log('✅ Database initialization completed');
    } catch (error) {
      console.error('⚠️ Database initialization failed:', error);
      console.log('ℹ️  You may need to run: npm run db:init');
      // Don't exit - database might already be initialized
    }
  } else {
    console.log('ℹ️  Auto-migration disabled. Run "npm run db:init" if needed.');
  }
  
  // Start periodic cleanup of expired sessions (every 1 hour)
  setInterval(async () => {
    try {
      await cleanupExpiredSessions();
      console.log('🧹 Cleaned up expired sessions');
    } catch (error) {
      console.error('⚠️  Error during session cleanup:', error);
    }
  }, 60 * 60 * 1000); // 1 hour
};

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API
  crossOriginEmbedderPolicy: false
}));

// Rate limiting - Disabled in development
if (process.env.NODE_ENV === 'production') {
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 15 minutes
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');

  const limiter = rateLimit({
    windowMs,
    max: maxRequests,
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false
  });

  app.use(limiter);
  console.log(`🔒 Rate limiting enabled: ${maxRequests} requests per ${windowMs / 1000}s`);
} else {
  console.log('⚠️  Rate limiting disabled in development mode');
}

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://fire-guardian-control-center.vercel.app',
  'https://fire-guardian-control-center-git-dev-navo33.vercel.app',
  'https://fire-guardian-control-center-git-main-navo33.vercel.app'
];

const corsOptions = {
  origin: (origin: string | undefined, callback: Function) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allow all Vercel preview deployments
    if (origin.includes('fire-guardian-control-center') && origin.includes('vercel.app')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`❌ CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Logging
const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(logFormat));

// Debug middleware (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use(DebugLogger.requestMiddleware());
}

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  type: ['application/json', 'text/plain']
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    res.status(200).json({ 
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'Fire Guardian Backend',
      version: '1.0.0',
      database: dbConnected ? 'connected' : 'disconnected',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      service: 'Fire Guardian Backend',
      database: 'disconnected',
      error: 'Database connection failed'
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);

// Apply security middleware to all protected routes
app.use('/api/dashboard', securityMiddleware, dashboardRoutes);
app.use('/api/vendors', securityMiddleware, vendorRoutes);
app.use('/api/users', securityMiddleware, usersRoutes);
app.use('/api/user-details', securityMiddleware, userDetailsRoutes);
app.use('/api/profile', securityMiddleware, profileRoutes);
app.use('/api/settings', securityMiddleware, settingsRoutes);
app.use('/api/equipment', securityMiddleware, equipmentRoutes);
app.use('/api/admin/analytics', securityMiddleware, adminAnalyticsRoutes);
app.use('/api/vendor/analytics', securityMiddleware, vendorAnalyticsRoutes);
app.use('/api/client/analytics', securityMiddleware, clientAnalyticsRoutes);
app.use('/api/vendor/clients', securityMiddleware, clientRoutes);
app.use('/api/vendor/tickets', securityMiddleware, maintenanceTicketRoutes);
app.use('/api/reports', securityMiddleware, reportsRoutes);
app.use('/api/client-views', securityMiddleware, clientViewsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Fire Guardian Control Center API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler (must be before error handler)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🔄 Received ${signal}. Starting graceful shutdown...`);
  
  try {
    await closePool();
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle process termination
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start server
const startServer = async () => {
  try {
    // Initialize database connection
    await initializeDatabase();
    
    // Start the server
    const server = app.listen(PORT, () => {
      console.log('🔥 Fire Guardian Backend started successfully!');
      console.log(`📡 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API docs: http://localhost:${PORT}/`);
    });

    // Handle server errors
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the application
startServer();

export default app;