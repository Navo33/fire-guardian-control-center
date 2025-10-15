# Environment Configuration Guide

This document explains how to configure environment variables for different deployment scenarios.

## Environment Files

### `.env.local` (Local Development)
Used when running the frontend locally with `npm run dev`.
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_DEBUG_FRONTEND=true
NEXT_PUBLIC_DEBUG_API=true
NEXT_PUBLIC_DEBUG_AUTH=true
NODE_ENV=development
```

### `.env.production` (Production Deployment)
Used when deploying to production (Vercel).
```env
NEXT_PUBLIC_API_URL=https://your-railway-backend-url.railway.app/api
NEXT_PUBLIC_DEBUG_FRONTEND=false
NEXT_PUBLIC_DEBUG_API=false
NEXT_PUBLIC_DEBUG_AUTH=false
NODE_ENV=production
```

## Setup Instructions

### 1. Local Development
1. Copy `.env.example` to `.env.local`
2. Ensure backend is running on `http://localhost:5000`
3. Run `npm run dev`

### 2. Production Deployment (Vercel + Railway)

#### Backend on Railway:
1. Deploy your backend to Railway
2. Note your Railway app URL (e.g., `https://your-app-name.railway.app`)
3. Ensure your backend serves the API at `/api` endpoint

#### Frontend on Vercel:
1. In your Vercel project dashboard, go to Settings > Environment Variables
2. Add the following variables:
   ```
   NEXT_PUBLIC_API_URL = https://your-railway-backend-url.railway.app/api
   NEXT_PUBLIC_DEBUG_FRONTEND = false
   NEXT_PUBLIC_DEBUG_API = false
   NEXT_PUBLIC_DEBUG_AUTH = false
   NODE_ENV = production
   ```
3. Redeploy your application

### 3. Environment Variables Explained

- **NEXT_PUBLIC_API_URL**: Base URL for your backend API
- **NEXT_PUBLIC_DEBUG_FRONTEND**: Enable frontend debug logging
- **NEXT_PUBLIC_DEBUG_API**: Enable API call logging  
- **NEXT_PUBLIC_DEBUG_AUTH**: Enable authentication debug logging
- **NODE_ENV**: Environment mode (development/production)

## API Configuration

The application now uses a centralized API configuration system in `src/config/api.ts`:

- **API_ENDPOINTS**: Centralized endpoint definitions
- **getAuthHeaders()**: Consistent authentication headers
- **logApiCall()**: Debug logging for API calls
- **buildApiUrl()**: Helper for building URLs with query parameters

## Deployment Checklist

### Before Deploying:
- [ ] Update `.env.production` with your Railway backend URL
- [ ] Test API endpoints are accessible from your domain
- [ ] Verify CORS settings on backend allow your frontend domain
- [ ] Set debug flags to `false` in production
- [ ] Test authentication flow works with production URLs

### After Deploying:
- [ ] Verify API calls are hitting the correct backend
- [ ] Check browser console for any CORS or network errors
- [ ] Test login functionality end-to-end
- [ ] Verify all CRUD operations work correctly

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Ensure your backend allows requests from your Vercel domain
2. **API URL Issues**: Check that `NEXT_PUBLIC_API_URL` is correctly set
3. **Authentication Issues**: Verify JWT tokens are being sent correctly
4. **Network Errors**: Ensure Railway backend is running and accessible

### Debug Mode:
Enable debug logging by setting debug flags to `true` in your environment variables to see detailed API call information in the browser console.