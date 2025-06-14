# Resale Intelligence Platform

## Overview

This is a full-stack AI-powered product analysis platform that enables resellers and individuals to determine the market value of products through image analysis. The application integrates with multiple APIs including Google Gemini for AI analysis, eBay for market data, and various search APIs to provide comprehensive pricing intelligence.

## System Architecture

The application follows a monolithic architecture with clear separation between client and server:

- **Frontend**: React SPA built with Vite, TypeScript, and Tailwind CSS
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth (OpenID Connect) with session storage
- **External APIs**: Google Gemini, eBay API, SearchAPI, SerpAPI
- **Real-time**: WebSocket implementation for live analysis

## Key Components

### Frontend Architecture
- **React Router**: wouter for client-side routing
- **State Management**: TanStack Query for server state, local state with hooks
- **UI Components**: Radix UI primitives with custom styling
- **Styling**: Tailwind CSS with CSS variables for theming
- **File Structure**: Pages, components, hooks, and utilities clearly separated

### Backend Architecture
- **API Services**: Modular services for eBay, StockX, and search APIs
- **Analysis Pipeline**: Multi-API analyzer that coordinates between different providers
- **Caching Layer**: In-memory caching with negative feedback tracking
- **Storage Layer**: Abstracted database operations through storage interface
- **Authentication**: Session middleware with role-based access control

### Database Schema
- **Users**: Authentication and profile management with API provider preferences
- **Uploads**: File metadata and session tracking
- **Analyses**: Product analysis results linked to uploads
- **Sessions**: Express session storage
- **Feedback**: User accuracy ratings for continuous improvement
- **Saved Analyses**: User bookmarking system

## Data Flow

1. **Image Upload**: User uploads image → Server saves to uploads directory → Database record created
2. **Analysis Request**: Client requests analysis → Multi-API analyzer orchestrates API calls → Results cached and stored
3. **Result Display**: Analysis data retrieved from database → Formatted and displayed to user
4. **Feedback Loop**: User provides accuracy feedback → Cache invalidated if negative → System learns and improves

## External Dependencies

### Required APIs
- **Google Gemini**: Primary AI analysis engine (API key required)
- **eBay API**: Market pricing data (client ID/secret required)
- **SearchAPI**: Alternative analysis provider (API key required)
- **SerpAPI**: Additional search capabilities (API key required)

### Infrastructure
- **PostgreSQL**: Database persistence
- **Node.js 20**: Runtime environment
- **File System**: Local file storage for uploads

## Deployment Strategy

The application is configured for Replit deployment with:

- **Development**: `npm run dev` starts both frontend and backend with hot reloading
- **Production Build**: `npm run build` compiles assets and server bundle
- **Database**: PostgreSQL module provisioned automatically
- **Environment Variables**: Managed through Replit secrets
- **Auto-scaling**: Configured for production deployment target

### Port Configuration
- **Development**: Port 5000 with Vite dev server proxy
- **Production**: Port 5000 mapped to external port 80

## Changelog
- June 12, 2025. Initial setup
- June 12, 2025. Fixed API provider caching bug and added public uploads route
  - Created public/uploads directory for external API access
  - Added /uploads static route to serve images publicly
  - Updated SearchAPI and SerpAPI to use public URLs
  - Fixed cache system to include API provider in cache keys
- June 14, 2025. Migrated from custom authentication to Replit Auth
  - Replaced email/password authentication with Replit OAuth system
  - Updated database schema to use Replit user structure (string IDs, removed password fields)
  - Implemented OpenID Connect integration with session storage
  - Created landing page for unauthenticated users
  - Updated frontend routing and authentication hooks
- June 14, 2025. Implemented admin role management system
  - Added role-based access control with admin and user roles
  - Created admin middleware for protecting admin-only routes
  - Implemented user role management API endpoints
  - Added admin promotion system with secure endpoint
  - Enhanced admin panel with user management interface
  - Added ability to promote/demote users between admin and user roles
- June 14, 2025. Fixed history tab functionality
  - Added unified `/api/analyses` endpoint for both authenticated and guest users
  - Implemented history clearing functionality with timeframe options
  - Added `clearUserHistory` method to storage interface
  - Fixed Drizzle ORM imports for database operations
  - History tab now properly updates and displays user analysis history

## User Preferences

Preferred communication style: Simple, everyday language.