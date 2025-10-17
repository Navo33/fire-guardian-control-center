# Fire Guardian Backend

This is the backend API for the Fire Guardian Control Center, built with Node.js, Express.js, TypeScript, and PostgreSQL.

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v13 or higher)
- npm or yarn

### Installation

1. **Clone and navigate to the backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup PostgreSQL database**
   
   Create a new PostgreSQL database:
   ```sql
   CREATE DATABASE fire_guardian;
   ```

4. **Configure environment variables**
   
   Copy the example environment file and update with your settings:
   ```bash
   cp .env.example .env
   ```
   
   Update the database credentials in `.env`:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=fire_guardian
   DB_USER=your_username
   DB_PASSWORD=your_password
   ```

5. **Initialize the database**
   ```bash
   npm run db:init
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

The server will start on http://localhost:5000

## 🛠️ Database Management

### Available Commands

| Command | Description | Use Case |
|---------|-------------|----------|
| `npm run db:init` | Initialize database (migrate + seed) | First time setup |
| `npm run db:migrate` | Run pending migrations only | Update schema mid-development |
| `npm run db:seed` | Seed initial data only | Add mock data |
| `npm run db:reset` | Drop all & recreate (dev only) | Start fresh |
| `npm run db:status` | Show migration status | Check what's applied |
| `npm run db:help` | Show help message | See all commands |

### Migration System

The database uses a professional migration system that:
- ✅ Tracks applied migrations (no duplicates)
- ✅ Safe mid-development updates (can add tables/columns without dropping data)
- ✅ Uses `schema_migrations` table for tracking
- ✅ Schema-driven approach (all tables in `schema.sql`)

See [Database Scripts README](src/scripts/README.md) for detailed documentation.

### Initial Credentials

After running `npm run db:init`, you can log in with:

**Admin:**
- Email: `admin@fireguardian.com`
- Password: `FireGuardian2024!`

**Mock Vendors:**
- `lakmal@safefire.lk` | VendorPass2025!
- `nimali@proguard.lk` | VendorPass2025!
- `ruwan@fireshield.lk` | VendorPass2025!

**Mock Clients:**
- `kasun@royalhotels.lk` | ClientPass2025!
- `shalini@techinnovations.lk` | ClientPass2025!
- `dilshan@citymall.lk` | ClientPass2025!

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration (admin only for vendors)
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info

### User Management Endpoints

- `GET /api/users` - Get all users (admin only)
- `GET /api/users/vendors` - Get all vendors (admin only)
- `GET /api/users/clients` - Get all clients (admin/vendor only)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (admin only)

### Health Check

- `GET /health` - Application health status

## 🏗️ Project Structure

```
src/
├── config/
│   └── database.ts          # Database configuration
├── middleware/
│   ├── auth.ts              # Authentication middleware
│   └── validation.ts        # Validation middleware
├── models/
│   ├── UserRepository.ts    # User database operations
│   └── AuditRepository.ts   # Audit log operations
├── routes/
│   ├── auth.ts              # Authentication routes
│   └── users.ts             # User management routes
├── scripts/
│   ├── dbCli.ts             # Database CLI tool
│   └── initDatabase.ts      # Database initialization
├── types/
│   └── index.ts             # TypeScript type definitions
└── server.ts                # Main application entry point
```

## 🔐 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt with configurable salt rounds
- **Rate Limiting** - Prevents brute force attacks
- **Account Locking** - Automatic account lock after failed attempts
- **CORS Protection** - Configurable cross-origin resource sharing
- **Helmet Security** - Security headers and protection
- **Input Validation** - Comprehensive request validation
- **Audit Logging** - Complete audit trail of all actions

## 👥 User Roles

1. **Super Admin** (`admin`)
   - Creates and manages vendor accounts
   - Full system access
   - Views all audit logs

2. **Vendor** (`vendor`)
   - Manages client accounts
   - Defines equipment types
   - Assigns equipment to clients

3. **Client** (`client`)
   - Views assigned equipment
   - Submits service requests
   - Limited system access

## 🗄️ Database Schema

The application uses the schema defined in `shema.sql` which includes:

- **Users & Authentication** - User accounts, roles, permissions
- **Equipment Management** - Equipment types, instances, assignments
- **Audit & Security** - Complete audit trail, notifications
- **Business Logic** - Vendor locations, equipment returns

## 🔧 Development

### Build for production
```bash
npm run build
```

### Start production server
```bash
npm start
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `5000` |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `fire_guardian` |
| `DB_USER` | Database username | - |
| `DB_PASSWORD` | Database password | - |
| `JWT_SECRET` | JWT signing secret | - |
| `BCRYPT_ROUNDS` | Password hashing rounds | `12` |

## 🐛 Troubleshooting

### Database Connection Issues

1. Ensure PostgreSQL is running
2. Verify database credentials in `.env`
3. Check if the database exists
4. Run `npm run db:status` to diagnose

### Authentication Issues

1. Verify JWT_SECRET is set in `.env`
2. Check if admin user exists: `npm run db:status`
3. Reinitialize if needed: `npm run db:reset`

### Common Errors

- **Port already in use**: Change PORT in `.env` or stop conflicting processes
- **Database not found**: Create the database manually first
- **Permission denied**: Check PostgreSQL user permissions

## 📈 Next Steps

- [ ] Add equipment management endpoints
- [ ] Implement notification system
- [ ] Add email/SMS integration
- [ ] Create comprehensive API tests
- [ ] Add API documentation with Swagger
- [ ] Implement file upload for equipment images
- [ ] Add advanced reporting features