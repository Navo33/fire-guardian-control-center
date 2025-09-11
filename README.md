# Fire Guardian Control Center

A professional web-based platform for managing fire safety equipment, service requests, and maintenance records.

## 🏗️ Project Structure

This is a **monorepo** containing both frontend and backend applications:

```
FireGuardian/
├── 📁 frontend/          # Next.js React Application (Port 3000)
│   ├── src/app/
│   │   ├── login/        # Authentication pages
│   │   ├── dashboard/    # User dashboards
│   │   └── layout.tsx    # App layout
│   ├── package.json
│   └── README.md
├── 📁 backend/           # Express.js API Server (Port 5000)
│   ├── src/
│   │   ├── routes/       # API routes
│   │   ├── middleware/   # Security & validation
│   │   └── server.ts     # Main server file
│   ├── package.json
│   └── .env             # Environment variables
├── 📁 .github/          # GitHub configuration
│   └── copilot-instructions.md
├── .gitignore           # Git ignore rules for entire project
└── README.md            # This file
```

## Features

- **Multi-role Authentication**: Super Admin, Vendor, and Client roles
- **Equipment Management**: Track fire safety equipment with expiry dates
- **Service Requests**: Submit and manage maintenance requests
- **Professional UI**: Modern, responsive design with Tailwind CSS
- **Type Safety**: Full TypeScript implementation
- **Security**: JWT authentication, rate limiting, input validation

## User Roles

1. **Super Admin**: Creates and manages vendor accounts, monitors activity
2. **Vendor**: Manages client accounts, defines equipment types, assigns equipment to clients
3. **Client**: Views assigned equipment, expiry dates, and maintenance history; submits requests

## Tech Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form with Zod validation
- **Icons**: Heroicons
- **HTTP Client**: Axios

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Authentication**: JWT tokens
- **Security**: Helmet, CORS, Rate limiting
- **Validation**: Express Validator

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/fire-guardian-control-center.git
cd fire-guardian-control-center
```

### 2. Setup Backend
```bash
cd backend
npm install
npm run dev  # Starts on http://localhost:5000
```

### 3. Setup Frontend (in a new terminal)
```bash
cd frontend
npm install
npm run dev  # Starts on http://localhost:3000
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## Demo Credentials

For testing purposes, you can use these demo accounts:

- **Super Admin**: `admin@fireguardian.com` / `admin123`
- **Vendor**: `vendor@fireguardian.com` / `vendor123`  
- **Client**: `client@fireguardian.com` / `client123`

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/test` - Test authentication endpoint

### Health Check
- `GET /health` - Server health status

## Environment Variables

### Backend (.env)
```
PORT=5000
NODE_ENV=development
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=24h
```

## Development

### Backend Commands
```bash
npm run dev      # Start development server with nodemon
npm run build    # Compile TypeScript to JavaScript
npm start        # Start production server
```

### Frontend Commands
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

## Architecture

The application follows a clean architecture pattern:

- **Frontend**: React components with TypeScript, form validation, and API integration
- **Backend**: RESTful API with Express.js, middleware for security and validation
- **Authentication**: JWT-based authentication with role-based access control
- **Database**: Ready for PostgreSQL integration (currently using mock data)

## Security Features

- JWT token authentication
- Password hashing with bcrypt
- Rate limiting to prevent abuse
- Input validation and sanitization
- CORS configuration
- Helmet.js for security headers
- Environment variable protection

## Future Enhancements

- PostgreSQL database integration
- Email notifications (AWS SES)
- SMS notifications (Twilio)
- File upload capabilities
- Advanced reporting and analytics
- Mobile application
- Real-time notifications

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is proprietary software developed for Fire Guardian Control Center.

---

**Note**: This is a professional-grade application built with industry standards and best practices for real-world deployment.