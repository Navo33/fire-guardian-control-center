# Fire Guardian Control Center - Copilot Instructions

## Project Overview
Fire Guardian Control Center is a professional web-based platform for managing fire safety equipment, service requests, and maintenance records.

## Architecture
- **Frontend**: Next.js with TypeScript and Tailwind CSS
- **Backend**: Express.js with Node.js
- **Database**: PostgreSQL
- **Deployment**: AWS (ECS Fargate, RDS, S3/CloudFront)

## User Roles
1. **Super Admin**: Creates and manages vendor accounts, monitors activity
2. **Vendor**: Manages client accounts, defines equipment types, assigns equipment to clients
3. **Client**: Views equipment, submits service requests

## Development Standards
- Use TypeScript for type safety
- Follow industry-standard folder structure
- Implement proper error handling and validation
- Use modern React patterns (hooks, context)
- Implement proper authentication and authorization
- Use environment variables for configuration
- Follow security best practices

## Backend Architecture Standards
- **Repository Pattern**: All database queries MUST be in Repository classes (e.g., `UserRepository`, `VendorRepository`)
- **Routes**: Routes should only handle HTTP requests/responses and call Repository methods
- **No Direct SQL in Routes**: Never write SQL queries directly in route handlers
- **Database Schema**: Only add new columns/tables when explicitly requested by the user
- **Use Existing Schema**: Always check what columns exist in the database before writing queries
- **Model Layer**: Business logic and data access should be in the models/repositories, not in routes

## Progress Tracking
- [x] Project requirements clarified
- [x] Copilot instructions created
- [x] Frontend (Next.js) scaffolded
- [x] Backend (Express.js) scaffolded
- [x] Login page implemented
- [x] Basic authentication system setup
- [x] Database integration
- [ ] Core features implementation