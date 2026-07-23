# Momentum

A full-stack habit tracking application designed with a strict Domain-Driven architecture, enforcing unidirectional data flow and absolute separation of concerns. Every line of code adheres to the immutable principles defined in the Momentum Constitution.

## Overview

Momentum provides users with a reliable and extensible platform for building and monitoring personal habits. The system handles identity management, granular access control via subscription plans, habit lifecycle tracking, and intelligent habit logging — all while maintaining a clean decoupling between backend domains and frontend presentation layers.

The codebase is intentionally structured to remain open for extension but closed for modification. New capabilities are always introduced through isolated files rather than by inflating existing ones. Architectural decisions, data flow rules, and development mandates are documented once and for all in the [Momentum Constitution](docs/Constitution.md), which serves as the single source of truth for the entire project.

## Technology Stack

The application is built using the following technologies. No specific version numbers are referenced here in order to keep this document permanently valid.

- **Backend:** PHP with Laravel
- **Frontend:** TypeScript, React, Bootstrap
- **State Management:** TanStack Query (React Query)
- **Build Tools & Package Management:** Composer, npm
- **Database:** Relational (MySQL/PostgreSQL compatible)
- **Queue & Scheduling:** Laravel Queues, Task Scheduling
- **Payment Integration:** Paymenter

## Architecture at a Glance

- **Domain-Driven Design (Backend):** Business logic is split into bounded contexts (Identity, Habit, Billing, Streak, Taxonomy). Cross-domain communication occurs only through injected services (synchronous) or events (asynchronous).
- **Strict File Isolation:** Each file has exactly one responsibility. Adding a feature means creating new files — never bloating existing ones.
- **Fullstack Data Flow:** Requests travel through Routes, Middleware, Form Requests, thin Controllers, dedicated Services, Models, and API Resources. On the frontend, data flows from Axios services through React Query hooks, action hooks, pages, and pure UI components.
- **Immutable Contract:** API Resources define the JSON contract; frontend TypeScript types and Zod validation schemas mirror backend Form Requests exactly.

For the complete and unbreakable set of rules, refer to the [Momentum Constitution](docs/Constitution.md). Any developer or automated tool must treat that document as the supreme reference.

## Getting Started

### Prerequisites

Ensure your system has the following installed:

- PHP (with required Laravel extensions)
- Composer
- Node.js and npm
- A supported relational database (MySQL, PostgreSQL, etc.)
- Git

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Shahrokh1383/Momentum.git
   cd Momentum
   ```

2. **Backend setup**

   ```bash
   cd back-end
   composer install
   cp .env.example .env
   ```

   Edit the newly created `.env` file to match your environment:
   - Database connection details
   - Mail driver and credentials (required for email verification and notifications)
   - Payment gateway (Paymenter) configuration
   - Any other service keys

   Then generate the application key, run migrations, and seed the database:

   ```bash
   php artisan key:generate
   php artisan migrate --seed
   ```

3. **Frontend setup**

   ```bash
   cd ../front-end
   npm install
   ```

   Build the assets for production or start a development server:

   ```bash
   npm run build   # for production
   npm run dev     # for development with hot reload
   ```

### Running the Application

To serve the backend locally, you can use Laravel’s built-in development server:

```bash
cd back-end
php artisan serve
```

For email delivery and scheduled tasks to function correctly, you must run the queue worker and the task scheduler continuously:

```bash
php artisan queue:work
php artisan schedule:work
```

These commands process queued jobs (such as sending emails) and execute periodic tasks (like subscription checks). Keep them running in separate terminal sessions or configure a process manager for production environments.

Finally, ensure the frontend development server or built assets are properly pointed to your backend’s URL by adjusting the `front-end` configuration as needed (e.g., `.env` variables for API base URL).

## Configuration

The `.env` file in the backend directory is the central place for all environment-specific settings. Key variables include:

- `APP_URL`, `FRONTEND_URL` – base URLs for backend and frontend
- `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
- `MAIL_MAILER`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_ENCRYPTION`
- Paymenter credentials for subscription handling
- Queue connection (defaults to `database`, requires the queue worker)

Never commit sensitive values into version control. Use the `.env.example` file as a template.

## Contribution Guidelines

Momentum is governed by an immutable constitution. Before contributing, thoroughly study the [Momentum Constitution](docs/Constitution.md) to understand the boundaries and mandatory practices. Any code that violates the constitution — regardless of its functionality — will be rejected.

New features must follow the File-Isolation Mandate: create new files in their appropriate domain layers rather than extending existing ones. Backend and frontend must remain strictly aligned on data contracts defined by Form Requests and API Resources.

## License

This project is proprietary. All rights reserved. See the [LICENSE](LICENSE) file for details.