# Database Scripts

This folder contains all database management scripts for the Fire Guardian Control Center.

## 📁 Structure

```
scripts/
├── schema.sql          # Complete database schema definition
├── db.ts              # Main CLI tool for database operations
├── migrate.ts         # Migration runner and tracker
├── seed.ts            # Seed data generator
└── seeds/             # SQL seed files (future use)
```

## 🚀 Quick Start

### First Time Setup
```bash
npm run db init
```
This will:
1. Run all migrations (create tables from schema.sql)
2. Seed initial data (admin, vendors, clients, equipment)

### Available Commands

| Command | Description | Use Case |
|---------|-------------|----------|
| `npm run db init` | Initialize database (migrate + seed) | First time setup |
| `npm run db migrate` | Run pending migrations only | Update schema |
| `npm run db seed` | Seed initial data only | Add mock data |
| `npm run db reset` | Drop all & recreate (dev only) | Start fresh |
| `npm run db status` | Show migration status | Check what's applied |
| `npm run db help` | Show help message | See all commands |

## 🔄 How It Works

### Migration System

The migration system tracks which migrations have been applied using the `schema_migrations` table:

```sql
CREATE TABLE schema_migrations (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) UNIQUE NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  execution_time_ms INT,
  success BOOLEAN DEFAULT TRUE
);
```

**Benefits:**
- ✅ No duplicate migrations
- ✅ Safe mid-development updates
- ✅ Can add new tables/columns without dropping existing data
- ✅ Rollback support (future)

### Schema Definition

All tables are defined in `schema.sql`. This file contains:
- Table definitions with proper foreign keys
- Indexes for performance
- Check constraints for data validation
- Default values

To update the schema:
1. Edit `schema.sql`
2. Run `npm run db migrate`
3. The system will apply only new changes

### Seed Data

Seed data is managed in `seed.ts` with separate functions for each data type:

- `seedRoles()` - User roles (admin, vendor, client)
- `seedPermissions()` - System permissions
- `seedSpecializations()` - Fire safety specializations
- `seedAdminUser()` - Default admin account
- `seedMockVendors()` - 3 mock vendor accounts
- `seedMockClients()` - 3 mock client accounts
- `seedMockEquipment()` - Fire safety equipment catalog
- `seedMockEquipmentInstances()` - Physical equipment units
- `seedMockAssignments()` - Client-vendor assignments
- `seedMockMaintenanceTickets()` - Sample maintenance tickets

## 🔐 Default Credentials

After running `npm run db init`, you can login with:

### Admin
- **Email:** admin@fireguardian.com
- **Password:** FireGuardian2024!

### Vendors
- **Email:** lakmal@safefire.lk
- **Email:** nimali@proguard.lk  
- **Email:** ruwan@fireshield.lk
- **Password:** VendorPass2025! (all)

### Clients
- **Email:** kasun@royalhotels.lk
- **Email:** shalini@techinnovations.lk
- **Email:** dilshan@citymall.lk
- **Password:** ClientPass2025! (all)

## 🔧 Development Workflow

### Adding New Tables

1. **Edit schema.sql**
   ```sql
   CREATE TABLE IF NOT EXISTS new_table (
     id SERIAL PRIMARY KEY,
     name VARCHAR(255) NOT NULL
   );
   ```

2. **Create a new migration in migrate.ts**
   ```typescript
   {
     name: '002_add_new_table',
     description: 'Add new_table for X feature',
     up: async () => {
       await pool.query('CREATE TABLE IF NOT EXISTS new_table...');
     }
   }
   ```

3. **Run migration**
   ```bash
   npm run db migrate
   ```

### Adding New Seed Data

1. **Edit seed.ts**
   ```typescript
   export const seedNewData = async (): Promise<void> => {
     // Add your seed logic here
   };
   ```

2. **Add to seedAll() function**
   ```typescript
   export const seedAll = async (): Promise<void> => {
     await seedRoles();
     await seedPermissions();
     await seedNewData(); // Add here
   };
   ```

3. **Run seed**
   ```bash
   npm run db seed
   ```

## ⚠️ Important Notes

### Production Safety
- `npm run db reset` is **disabled in production** (checks NODE_ENV)
- Always backup before running migrations in production
- Use `npm run db status` to check migration state

### Mid-Development Updates
The system is designed to handle mid-development schema changes:
- Existing data is preserved
- Use `CREATE TABLE IF NOT EXISTS`
- Use `ALTER TABLE IF EXISTS`
- Migrations are idempotent (can run multiple times safely)

### Reset Database (Development Only)
```bash
npm run db reset
```
This will:
1. Drop all tables
2. Recreate schema
3. Seed fresh data
⚠️ **WARNING:** This deletes ALL data!

## 🗄️ Database Schema

### Core Tables
- `user` - All users (admin, vendor, client)
- `role` - User roles
- `permission` - System permissions
- `role_permission` - Role-permission mapping

### Vendor Tables
- `vendor_company` - Vendor company information
- `vendor_contact` - Vendor contact details
- `vendor_address` - Vendor addresses
- `vendor_specialization` - Vendor specializations

### Client Tables
- `client_company` - Client company information (with vendor relationship)
- `client_contact` - Client contact details
- `client_address` - Client addresses

### Equipment Tables
- `equipment` - Equipment catalog (types/models)
- `equipment_instance` - Physical equipment units
- `equipment_assignment` - Client-vendor equipment assignments
- `assignment_item` - Items in an assignment

### Other Tables
- `specialization` - Fire safety specializations
- `maintenance_ticket` - Maintenance requests
- `notification` - User notifications
- `audit_log` - System audit trail
- `password_reset` - Password reset tokens
- `schema_migrations` - Migration tracking

## 📚 Additional Resources

- **Backend API:** See `/backend/README.md`
- **Database Config:** See `/backend/src/config/database.ts`
- **Deployment:** See deployment documentation

## 🐛 Troubleshooting

### Migration Fails
```bash
# Check current status
npm run db status

# Reset and try again (dev only)
npm run db reset
```

### Connection Issues
Check your `.env` file:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fireguardian_db
DB_USER=your_user
DB_PASSWORD=your_password
```

### Seed Data Issues
Seed functions are idempotent (use `ON CONFLICT DO NOTHING`), so you can run them multiple times safely:
```bash
npm run db seed
```
