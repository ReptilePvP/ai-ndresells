# Technical Context

## Technologies Used

- **Backend:** Node.js with Express.js, written in TypeScript.
- **Frontend:** React with Vite, also in TypeScript.
- **Database:** PostgreSQL, managed with Drizzle ORM.
- **AI/ML:** Google Gemini for image analysis.
- **UI Components:** Radix UI for accessible, unstyled components, styled with Tailwind CSS.
- **Authentication:** `express-session` with `connect-pg-simple` for session storage, and `bcryptjs` for password hashing. StockX integration uses OAuth.
- **Data Fetching (Client):** TanStack Query for managing server state.
- **Schema Validation:** Zod for data validation on both client and server.

## Development Setup

- **Package Manager:** npm
- **Development Server:** `npm run dev` starts the backend server using `tsx` for hot-reloading and the Vite dev server for the frontend.
- **Build Process:** `npm run build` compiles the frontend assets with Vite and the backend server with esbuild.
- **Database Migrations:** `npm run db:push` pushes schema changes to the database using Drizzle Kit.

## Technical Constraints

- The system relies on external APIs (Google Gemini, eBay, StockX), so it must be resilient to their potential downtime or changes.
- Image analysis is computationally intensive and requires efficient caching strategies to manage costs and performance.
- Real-time analysis via WebSockets requires careful management of server resources and network latency.

## Dependencies

- A comprehensive list of dependencies is available in the `package.json` file. Key dependencies include `express`, `react`, `drizzle-orm`, `@google/genai`, `axios`, and `multer`.
