# GitHub Copilot Instructions - Nginx WAF Management Platform
## 🚀 Nginx WAF Management Platform — AI Coding Agent Instructions

### 1. Big Picture Architecture
- Monorepo structure: `/apps/api` (Node.js/Express/Prisma backend), `/apps/web` (React/TypeScript frontend), `/apps/docs` (documentation), `/docker` (Docker configs), `/config` (Nginx configs), `/scripts` (deployment/setup).
- Backend follows Domain-Driven Design (DDD): see `/apps/api/src/domains/*` for business logic modules (auth, users, domains, ssl, modsec, acl, alerts, logs, performance, dashboard).
- Frontend uses React + TanStack Router, ShadCN UI, Tailwind CSS. Components and hooks are in `/apps/web/src/components/` and `/apps/web/src/hooks/`.
- Data flows: API server exposes RESTful endpoints, frontend consumes via TanStack Query. Real-time monitoring and alerting via websockets or polling (see `/apps/api/src/alerts/`, `/apps/api/src/performance/`).
- Infrastructure: Dockerized for local/dev/prod. Nginx and ModSecurity configs in `/config` and `/docker`.

### 2. Developer Workflows
- **Build/Dev:** Use `pnpm` and `turbo` for monorepo tasks. Common scripts:
   - `pnpm dev` (in `/apps/api` or `/apps/web`) for local development
   - `pnpm build` for production builds
   - `pnpm test` for Vitest unit/integration tests
- **Deployment:**
   - `./scripts/deploy.sh` for full production install (Nginx, backend, frontend)
   - `./scripts/quickstart.sh` for local dev (no Nginx/root)
   - `./scripts/update.sh` for upgrades
- **Database:**
   - Prisma migrations in `/apps/api/prisma/migrations/`
   - Seed scripts: `/apps/api/prisma/seed*.ts`
- **Debugging:**
   - Use Vitest for backend tests, React Testing Library for frontend (if present)
   - Logs: backend logs to console, audit logs in `/apps/api/src/logs/`

### 3. Project-Specific Conventions
- All API endpoints must validate input with `express-validator`.
- Role-based access control (RBAC) enforced in backend middleware.
- Sensitive operations (SSL, ModSecurity, Nginx config changes) require extra validation and audit logging.
- No hardcoded secrets; use environment variables and `.env` files.
- Frontend: use ShadCN UI and Tailwind for all new components; keep forms accessible and type-safe.
- Plugin system: plugins live in `/apps/api/src/plugins/` (backend) and `/apps/web/src/plugins/` (frontend). Each plugin has its own config file (e.g., `plugin.config.json`).

### 4. Integration Points & External Dependencies
- Nginx and ModSecurity: config templates in `/config` and `/docker`, managed via backend APIs.
- SSL: Let's Encrypt integration and manual upload supported (see `/apps/api/src/ssl/`).
- Alerts: email/Telegram notifications (see `/apps/api/src/alerts/`).
- Database: PostgreSQL via Prisma ORM.
- Marketplace: plugin marketplace supports zip upload/download and online registry (see plugin docs).

### 5. Examples & Patterns
- Example backend domain: `/apps/api/src/domains/` (site/domain CRUD, validation, RBAC)
- Example frontend page: `/apps/web/src/routes/` (route-based code splitting, TanStack Router)
- Example plugin: `/apps/api/src/plugins/hello-world/`, `/apps/web/src/plugins/hello-world/`
- Example migration: `/apps/api/prisma/migrations/20250930140957_initial_setup/`

### 6. Safety & Code Review
- Always validate input, sanitize outputs, and audit sensitive changes.
- Never generate test/debug files or code unless explicitly requested.
- All code must be clean, maintainable, and follow project architecture.
- Review for security: no hardcoded secrets, no dangerous shell commands, no sensitive data in logs/UI/API.

---
For more details, see:
- `README.md` (project overview, quickstart, features)
- `/apps/api/src/` and `/apps/web/src/` for code structure
- `/apps/docs/guide/plugins.md` for plugin development
- `/scripts/` for deployment workflows
- Use strict TypeScript configuration
- Define proper interfaces and types
- Avoid `any` types - use proper type definitions
- Implement generic types where appropriate

### Frontend Code Standards

#### React & TypeScript
- Use functional components with hooks
- Implement proper TypeScript interfaces for props and state
- Use React Query (TanStack Query) for server state management
- Follow component composition patterns

#### Routing & Navigation
- Use TanStack Router for type-safe routing
- Implement route-based code splitting
- Handle loading and error states properly

#### UI/UX Guidelines
- Use ShadCN UI components consistently
- Follow Tailwind CSS utility-first approach
- Implement responsive design patterns
- Ensure accessibility (a11y) standards

### Performance & Monitoring

#### Backend Performance
- Monitor API response times
- Implement proper caching strategies
- Use database query optimization
- Handle concurrent requests properly

#### Frontend Performance
- Implement lazy loading for routes and components
- Optimize bundle size with proper code splitting
- Use React.memo and useMemo for expensive operations
- Monitor Core Web Vitals

## 🧪 Testing Standards

### Backend Testing (Vitest)
- Unit tests for service layer functions
- Integration tests for API endpoints
- Mock external dependencies (file system, nginx configs)
- Test error handling scenarios

### Test File Organization
```
/apps/api/src/
├── domains/auth/__tests__/
├── domains/users/__tests__/
└── utils/__tests__/
```

## 🔧 Development Workflow

### Branch Naming
- `feature/` for new features
- `fix/` for bug fixes
- `security/` for security-related changes
- `refactor/` for code refactoring

### Commit Messages
Follow conventional commits:
- `feat:` for new features
- `fix:` for bug fixes
- `security:` for security improvements
- `refactor:` for code refactoring
- `test:` for adding tests
- `docs:` for documentation updates

## 📝 Specific Review Checkpoints

### When Reviewing Authentication Code
- [ ] JWT tokens are properly validated and expired
- [ ] Passwords are hashed using bcrypt with proper salt rounds
- [ ] Session management is secure
- [ ] Two-factor authentication implementation is correct
- [ ] Rate limiting is implemented for login attempts

### When Reviewing API Endpoints
- [ ] Input validation is comprehensive
- [ ] Error responses don't leak sensitive information
- [ ] Proper HTTP status codes are used
- [ ] Authentication middleware is applied where needed
- [ ] Database queries are optimized and safe

### When Reviewing Frontend Components
- [ ] TypeScript types are properly defined
- [ ] Loading and error states are handled
- [ ] Forms use proper validation
- [ ] Sensitive data is not logged or exposed
- [ ] Accessibility attributes are included

### When Reviewing Infrastructure Code
- [ ] Docker configurations are secure and optimized
- [ ] Nginx configurations follow security best practices
- [ ] ModSecurity rules are properly formatted
- [ ] SSL/TLS configurations are secure
- [ ] Environment variables are properly handled

### When Reviewing Database Schemas
- [ ] Proper constraints and indexes are defined
- [ ] Sensitive data fields are appropriately handled
- [ ] Migration scripts are safe and reversible
- [ ] Foreign key relationships are correctly defined

## 🚨 Security Red Flags

Immediately flag these security concerns:
- Hardcoded secrets or passwords
- SQL injection vulnerabilities
- Missing input validation
- Insecure file upload handling
- Improper authentication checks
- Sensitive data in logs
- Missing CORS configuration
- Weak cryptographic practices

## 🎯 Domain-Specific Knowledge

### Nginx & ModSecurity
- Understand nginx configuration syntax
- Review ModSecurity rule format and OWASP CRS
- Validate SSL certificate handling
- Check load balancing configurations

### WAF Management
- Review firewall rule logic
- Validate IP whitelist/blacklist functionality
- Check GeoIP filtering implementation
- Ensure proper logging of security events

## 📊 Performance Monitoring

Always consider:
- Database query performance and N+1 problems
- API response time optimization
- Frontend bundle size and loading performance
- Memory usage and potential leaks
- Proper caching implementation

This platform manages critical security infrastructure, so thorough code review is essential for maintaining system security and reliability.
