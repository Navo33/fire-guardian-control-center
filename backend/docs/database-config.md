# Backend Database Configuration Guide

This document explains how to configure the database connection for different deployment scenarios.

## Environment Variables

The backend now supports two methods of database configuration:

### Method 1: DATABASE_URL (Recommended for Production)
```env
DATABASE_URL=postgresql://username:password@hostname:port/database_name
```

### Method 2: Individual Parameters (Local Development)
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fireguardian_db
DB_USER=fireguardian_user
DB_PASSWORD=fire1234
```

## Configuration Priority

1. If `DATABASE_URL` is set, it will be used (overrides individual parameters)
2. If `DATABASE_URL` is not set, individual parameters will be used
3. SSL is automatically enabled in production when using `DATABASE_URL`

## Deployment Scenarios

### 1. Local Development
Create `.env` file with individual parameters:
```env
NODE_ENV=development
PORT=5000

# Database Configuration (Individual Parameters)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fireguardian_db
DB_USER=fireguardian_user
DB_PASSWORD=fire1234

# Other configurations...
JWT_SECRET=your-development-secret
```

### 2. Render Deployment
In Render dashboard, set environment variables:
```env
NODE_ENV=production
PORT=5000

# Database Configuration (Render provides DATABASE_URL automatically)
DATABASE_URL=postgresql://user:pass@host:port/dbname

# Other configurations...
JWT_SECRET=your-production-secret-key
ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app
```

### 3. Railway Deployment
In Railway dashboard, set environment variables:
```env
NODE_ENV=production
PORT=5000

# Database Configuration (Railway provides DATABASE_URL automatically)
DATABASE_URL=postgresql://user:pass@host:port/dbname

# Other configurations...
JWT_SECRET=your-production-secret-key
ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app
```

### 4. Heroku Deployment
In Heroku dashboard, set environment variables:
```env
NODE_ENV=production

# Database Configuration (Heroku provides DATABASE_URL automatically)
DATABASE_URL=postgresql://user:pass@host:port/dbname

# Other configurations...
JWT_SECRET=your-production-secret-key
ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app
```

## Database URL Format

The DATABASE_URL should follow this format:
```
postgresql://[username[:password]@][host][:port][/database][?parameter_list]
```

Examples:
```env
# Local PostgreSQL
DATABASE_URL=postgresql://postgres:password@localhost:5432/fireguardian_db

# Cloud Provider (Render, Railway, etc.)
DATABASE_URL=postgresql://user:pass@hostname:5432/database_name

# With SSL (automatic in production)
DATABASE_URL=postgresql://user:pass@hostname:5432/database_name?sslmode=require
```

## Migration from Individual Parameters

If you're currently using individual database parameters, you can migrate by:

1. **Keep existing setup for local development** (no changes needed)
2. **For production deployment**, set only the `DATABASE_URL` environment variable
3. **Remove individual DB_* variables** from production environment (optional)

## SSL Configuration

- **Development**: SSL is disabled by default
- **Production**: SSL is automatically enabled when using `DATABASE_URL`
- **Custom SSL**: You can override by setting specific connection parameters

## Troubleshooting

### Connection Issues
1. **Check DATABASE_URL format**: Ensure it follows the correct PostgreSQL URL format
2. **Verify credentials**: Make sure username, password, and database name are correct
3. **Check network access**: Ensure your deployment platform can reach the database
4. **SSL certificates**: In production, SSL is required by most cloud providers

### Environment Variable Priority
```bash
# This will use DATABASE_URL (Method 1)
DATABASE_URL=postgresql://user:pass@host:port/db
DB_HOST=localhost  # Ignored

# This will use individual parameters (Method 2)
DB_HOST=localhost
DB_PORT=5432
# DATABASE_URL not set
```

### Debug Database Connection
The application logs which connection method is being used:
- `🔗 Using DATABASE_URL for database connection`
- `🔧 Using individual database connection parameters`

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment variables** for all sensitive data
3. **Use strong passwords** for database users
4. **Enable SSL** in production environments
5. **Rotate credentials** regularly
6. **Use read-only users** when possible for specific operations

## Example .env Files

### Local Development (.env)
```env
NODE_ENV=development
PORT=5000

# Database - Individual Parameters
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fireguardian_db
DB_USER=fireguardian_user
DB_PASSWORD=fire1234

JWT_SECRET=dev-secret-key
ALLOWED_ORIGINS=http://localhost:3000
```

### Production (Set in deployment platform)
```env
NODE_ENV=production
PORT=5000

# Database - Single URL (provided by hosting platform)
DATABASE_URL=postgresql://user:password@host:port/database

JWT_SECRET=super-secure-production-key
ALLOWED_ORIGINS=https://your-app.vercel.app
```