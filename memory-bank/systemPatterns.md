# System Patterns

## System Architecture

The application follows a monolithic architecture with a clear separation of concerns between the client and server, both written in TypeScript.

- **Server:** An Express.js server handles API requests, user authentication, and business logic. It's structured into modules for different concerns like `auth`, `storage`, `api-services`, and `routes`.
- **Client:** A React single-page application (SPA) built with Vite provides the user interface. It communicates with the server via a RESTful API.
- **Database:** A PostgreSQL database, accessed via the Drizzle ORM, persists all data, including users, uploads, analyses, and feedback.
- **External Services:** The system integrates with several third-party APIs for its core functionality:
    - **Google Gemini:** For AI-powered image analysis.
    - **eBay API:** For market data and pricing information.
    - **StockX API:** For additional market data, with an OAuth flow for authentication.
    - **Other Search APIs (SearchAPI, SerpAPI):** As alternative data sources for the multi-API analyzer.

## Key Technical Decisions

- **TypeScript End-to-End:** Using TypeScript for both the frontend and backend ensures type safety across the entire stack and allows for shared type definitions (`/shared` directory).
- **Modular Server Design:** The server logic is broken down into services (`ebay-api.ts`, `market-data-service.ts`) and managers (`multi-api-analyzer.ts`), promoting separation of concerns and easier maintenance.
- **ORM for Database Interaction:** Drizzle ORM provides a type-safe way to interact with the database, reducing the risk of SQL injection and making queries easier to write and maintain.
- **Centralized Caching:** A dedicated caching layer (`cache.ts`) is used to store the results of expensive API calls, improving performance and reducing costs. It includes logic for cache invalidation based on negative user feedback.
- **Robust Authentication:** User authentication is handled via sessions, with password hashing and middleware to protect routes. API integrations like StockX use OAuth 2.0.

## Component Relationships

- **Upload & Analysis Flow:**
    1. A user uploads an image via the client.
    2. The server receives the image, saves it to the `uploads/` directory, and creates an `upload` record in the database.
    3. The client then requests an analysis for that upload.
    4. The server's `multi-api-analyzer` coordinates with various services (Gemini, eBay, etc.) to gather data.
    5. The results are aggregated, validated by the `accuracy-validator`, and stored as an `analysis` record linked to the original upload.
    6. The final analysis is sent back to the client.
- **Feedback Loop:**
    1. Users can submit feedback on an analysis.
    2. If the feedback is negative, the caching layer is instructed to invalidate the cached result for that image hash, ensuring a fresh analysis is performed next time.

## Critical Implementation Paths

- **Multi-API Analyzer:** This is the core of the system's intelligence, responsible for orchestrating calls to various external and internal services to produce a single, coherent analysis. Its resilience and ability to handle failures (e.g., by suggesting a fallback to Gemini) are critical.
- **Authentication and Authorization:** The `auth.ts` module is central to securing the application, controlling access to user data and admin-only features.
- **Live Analysis WebSocket:** The WebSocket implementation (`live-api.ts`) is a critical path for the real-time analysis feature, requiring efficient handling of image data and quick responses from the analysis engine.
