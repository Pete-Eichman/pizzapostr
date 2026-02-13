# Pizza Builder

A full-stack pizza customization app. Users sign in, build a pizza with toppings on an interactive canvas, and save/load their creations.

## Tech Stack

- **Framework:** Next.js 15, React 19, TypeScript
- **Styling:** Tailwind CSS
- **Rendering:** Canvas API
- **Backend:** Next.js Server Actions
- **Database:** SQLite (dev) / PostgreSQL (prod), Prisma ORM
- **Auth:** NextAuth v5 (credentials + Google OAuth)

## Features

- Interactive pizza builder with canvas rendering
- Deterministic topping placement (saved pizzas render identically on reload)
- User authentication (email/password and Google OAuth)
- Save and load pizza configurations
- Protected routes with user-specific data

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or hosted)

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="<generate with: openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"

# Optional for Google OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

### Database Setup

```bash
npm run db:push      # Apply schema to database
npm run db:generate  # Generate Prisma Client
```

### Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## Google OAuth Setup (Optional)

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Google+ API
3. Create OAuth 2.0 credentials
4. Add redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Add credentials to `.env`

## Project Structure

```
src/
├── app/
│   ├── actions/           # Server Actions for CRUD operations
│   ├── api/auth/          # NextAuth endpoints
│   ├── auth/              # Authentication pages
│   ├── page.tsx           # Main application
│   └── layout.tsx
├── components/
│   ├── PizzaCanvas.tsx    # Canvas animation component
│   └── SessionProvider.tsx
└── lib/
    ├── auth.ts            # NextAuth config
    └── prisma.ts          # Database client

prisma/
└── schema.prisma          # Database schema
```

## Available Scripts

```bash
npm run dev        # Development server
npm run build      # Production build
npm run start      # Production server
npm run lint       # ESLint
npm run db:push    # Update database schema
npm run db:studio  # Open Prisma Studio
```

## Deployment

The app is designed to run on Vercel with a PostgreSQL database. Set environment variables in your hosting provider's dashboard and connect to a managed Postgres instance (Neon, Supabase, Railway, etc.).

## Potential Improvements

- Public pizza sharing with URLs
- Gallery of user creations
- Additional toppings and customization
- GIF export functionality
- Social features

## License

MIT
