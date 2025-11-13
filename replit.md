# Guriri Express B2B Delivery Platform

## Overview

Guriri Express is a B2B logistics platform connecting businesses with delivery drivers (motoboys) for same-day urban deliveries. The system provides real-time order management, GPS tracking, and automated driver assignment through three role-based dashboards: Central Operations, Client, and Driver interfaces.

The platform uses an enterprise dashboard pattern optimized for data-dense displays and multi-role operational workflows, with real-time WebSocket communication for live order updates.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript
- Vite as build tool and development server
- Wouter for client-side routing
- TanStack Query (React Query) for server state management
- shadcn/ui component library with Radix UI primitives
- Tailwind CSS for styling with custom design system

**Design System:**
- Enterprise dashboard pattern following Carbon Design System and Ant Design principles
- Inter font family from Google Fonts
- Custom color system supporting light/dark themes via CSS variables
- Responsive grid layouts with mobile-first approach
- Fixed sidebar navigation (256px) with collapsible mobile drawer

**Component Architecture:**
- Reusable UI components in `/client/src/components/ui/`
- Business components: OrderCard, StatCard, StatusBadge, OrderForm
- Role-specific sidebar navigation via AppSidebar component
- Form management using react-hook-form with Zod validation

**State Management:**
- TanStack Query for API data caching and synchronization
- React Context for authentication state (AuthContext)
- Local state with useState/useEffect for component-level concerns
- WebSocket connections for real-time updates per dashboard

### Backend Architecture

**Technology Stack:**
- Node.js with Express.js server
- TypeScript with ES modules
- WebSocket server (ws library) for real-time bidirectional communication
- Drizzle ORM for database operations
- bcryptjs for password hashing
- jsonwebtoken (JWT) for authentication

**API Design:**
- RESTful endpoints under `/api/*` namespace
- JWT-based authentication with Bearer token in Authorization header
- Role-based access control (central, client, motoboy roles)
- WebSocket endpoint at `/ws` with query parameter for client identification

**Key Endpoints:**
- `/api/auth/login` - User authentication
- `/api/orders` - Order CRUD operations
- `/api/orders/:id/accept` - Driver order acceptance
- `/api/orders/:id/deliver` - Mark order as delivered
- `/api/motoboys` - Motoboy management
- `/api/clients` - Client management
- `/api/chat` - Chat message operations

**AI Engine:**
- Automatic driver assignment based on proximity scoring
- Distance calculation using Haversine formula
- Scoring algorithm considers: distance, online status, availability
- Dynamic tax calculation based on distance and time factors

**Real-time Communication:**
- WebSocket connections identified by user/role ID
- Broadcast system for order updates (new_order, order_accepted, order_delivered)
- Client-specific notifications for order status changes
- Automatic refetching of order data on WebSocket events

### Database Schema

**ORM Configuration:**
- Drizzle ORM with PostgreSQL dialect
- Schema defined in `/shared/schema.ts`
- Neon Database serverless driver (@neondatabase/serverless)
- Migration files output to `/migrations` directory

**Core Tables:**

1. **users** - Authentication and user management
   - id (varchar, primary key)
   - name, role, phone, email
   - password (hashed with bcrypt)
   - status, createdAt

2. **motoboys** - Delivery driver profiles
   - id (UUID, auto-generated)
   - name, phone, placa, cpf
   - taxaPadrao (default delivery fee)
   - online (boolean status)
   - currentLat, currentLng (GPS coordinates as decimal)
   - status, createdAt

3. **clients** - Business customer profiles
   - id (varchar, primary key)
   - name, phone, email, company
   - address fields, createdAt

4. **orders** - Delivery order records
   - id (varchar, primary key)
   - clientId, motoboyId, motoboyName
   - Collection address (coletaRua, coletaNumero, coletaBairro, coletaCep)
   - Delivery address (entregaRua, entregaNumero, entregaBairro, entregaCep)
   - valor (order value), taxaMotoboy (driver fee)
   - status (pending, in_progress, delivered, cancelled)
   - Timestamps: createdAt, acceptedAt, deliveredAt

5. **liveDocs** - Live documentation/tracking events
   - Linked to orders for event tracking

6. **chatMessages** - Support chat functionality
   - senderId, message, timestamp

7. **motoboySchedule** & **clientSchedule** - Scheduling system

**Data Validation:**
- Zod schemas generated from Drizzle tables via drizzle-zod
- Frontend and backend share schema definitions from `/shared/schema.ts`
- Insert schemas exclude auto-generated fields (id, timestamps)

### Authentication & Authorization

**Authentication Flow:**
1. Login credentials (id + password) sent to `/api/auth/login`
2. Backend validates credentials using bcrypt comparison
3. JWT token generated with user id and role in payload
4. Token stored in localStorage as 'guriri_token'
5. Token included in Authorization header for subsequent API requests

**Session Management:**
- JWT tokens with 24-hour expiration
- Tokens contain user id and role for authorization
- Frontend AuthContext manages login/logout state
- Protected routes redirect unauthenticated users to landing page
- Role-based route protection (central, client, motoboy)

**Password Security:**
- bcryptjs with automatic salt generation
- Passwords never stored in plain text
- Password validation on login only

## External Dependencies

### Third-party UI Libraries
- **Radix UI** - Headless UI primitives for accessibility (20+ component primitives)
- **shadcn/ui** - Pre-built component library using Radix UI
- **Lucide React** - Icon library for UI elements
- **cmdk** - Command menu component
- **vaul** - Drawer/modal component
- **embla-carousel-react** - Carousel functionality
- **recharts** - Chart visualization components

### Form & Validation
- **react-hook-form** - Form state management
- **@hookform/resolvers** - Validation resolver integration
- **zod** - Schema validation for forms and API data
- **drizzle-zod** - Generate Zod schemas from Drizzle tables

### Database & ORM
- **@neondatabase/serverless** - Serverless PostgreSQL client for Neon Database
- **drizzle-orm** - TypeScript ORM
- **drizzle-kit** - Migration and schema management CLI

### Real-time Communication
- **ws** - WebSocket server library
- Custom WebSocket client in browser for bidirectional communication

### Build Tools & Development
- **Vite** - Frontend build tool and dev server
- **@vitejs/plugin-react** - React integration for Vite
- **esbuild** - Backend bundler for production
- **tsx** - TypeScript execution for development server
- **Tailwind CSS** - Utility-first CSS framework
- **PostCSS** - CSS processing with autoprefixer

### Utilities
- **clsx** & **tailwind-merge** - Conditional className utilities
- **class-variance-authority** - Component variant management
- **date-fns** - Date manipulation and formatting
- **nanoid** - Unique ID generation

### Replit Integration
- **@replit/vite-plugin-runtime-error-modal** - Error overlay in development
- **@replit/vite-plugin-cartographer** - Code navigation
- **@replit/vite-plugin-dev-banner** - Development banner

### API Integration Points
- Google Fonts CDN for Inter font family
- WebSocket protocol (ws:// or wss://) for real-time updates
- JWT-based REST API communication
- No external payment processors or SMS services currently integrated