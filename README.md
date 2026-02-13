# PizzaPostr

A full-stack pizza creation and sharing app built with Next.js. Users sign in, build a pizza with toppings on an interactive canvas, and save/load their creations. Features light/dark theming, deterministic topping rendering, and full authentication.

## Tech Stack

- **Framework:** Next.js 15, React 18, TypeScript
- **Styling:** Tailwind CSS with dark mode support
- **Rendering:** Canvas API (deterministic topping placement)
- **Backend:** Next.js Server Actions with Zod validation
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** NextAuth v5 (credentials + Google OAuth)
- **Unit Tests:** Vitest + React Testing Library
- **E2E Tests:** Cypress

## Features

- Interactive pizza builder with HTML5 Canvas rendering
- Deterministic topping placement — saved pizzas render identically on reload
- Four topping types: pepperoni, mushrooms, olives, peppers
- User authentication (email/password registration and Google OAuth)
- Save, load, and delete pizza configurations per user
- Light/dark theme toggle with OS preference detection and localStorage persistence
- Responsive layout with accessible UI (ARIA labels, focus rings, keyboard navigation)
- Input validation on client and server (Zod schemas)
- Protected routes with user-scoped data

## Setup

### Prerequisites

- Node.js 18+

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/pizzapostr"
NEXTAUTH_SECRET="<generate with: openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"

# Optional — for Google OAuth
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

## Testing

### Unit & Component Tests (Vitest)

```bash
npm test             # Watch mode
npm run test:run     # Single run (CI)
```

**34 tests** across 4 suites:

| Suite | Tests | Coverage |
|---|---|---|
| ThemeProvider | 5 | Default theme, localStorage, toggle, persistence, dark class |
| ThemeToggle | 4 | ARIA labels, click handler, icon rendering |
| PizzaCanvas | 12 | Topping toggle, save dialog, validation, CRUD, empty state |
| Validation schemas | 13 | Pizza name/topping bounds, registration email/password/name |

### E2E Tests (Cypress)

Start the dev server first, then run Cypress:

```bash
npm run dev                # Terminal 1
npm run test:e2e           # Terminal 2 — interactive mode
npm run test:e2e:headless  # or headless mode
```

E2E specs cover authentication flow, pizza builder interactions, and theme persistence.

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
│   ├── actions/           # Server Actions (pizza CRUD, auth)
│   │   ├── auth.ts        # User registration with Zod + bcrypt
│   │   └── pizza.ts       # Save, load, delete pizzas
│   ├── api/auth/          # NextAuth route handler
│   ├── auth/              # Sign-in and registration pages
│   │   ├── signin/
│   │   └── register/
│   ├── globals.css
│   ├── layout.tsx         # Root layout with ThemeProvider
│   └── page.tsx           # Main authenticated page
├── components/
│   ├── PizzaCanvas.tsx    # Canvas pizza builder + saved pizzas sidebar
│   ├── ThemeProvider.tsx  # Dark/light theme context + localStorage
│   └── ThemeToggle.tsx    # Sun/moon toggle button
├── lib/
│   ├── auth.ts            # NextAuth v5 config
│   └── prisma.ts          # Prisma client singleton
└── __tests__/             # Vitest unit & component tests
    ├── setup.ts
    ├── ThemeProvider.test.tsx
    ├── ThemeToggle.test.tsx
    ├── PizzaCanvas.test.tsx
    └── validation.test.ts

cypress/
├── e2e/                   # Cypress E2E specs
│   ├── auth.cy.ts
│   ├── pizza-builder.cy.ts
│   └── theme.cy.ts
└── support/
    └── e2e.ts

prisma/
└── schema.prisma          # User, Account, Session, Pizza models
```

## All Scripts

```bash
npm run dev              # Development server
npm run build            # Production build
npm run start            # Production server
npm run lint             # ESLint
npm test                 # Vitest watch mode
npm run test:run         # Vitest single run
npm run test:e2e         # Cypress interactive
npm run test:e2e:headless # Cypress headless
npm run db:push          # Apply Prisma schema
npm run db:studio        # Open Prisma Studio
npm run db:generate      # Generate Prisma Client
```

## Deployment

The app is ready to deploy on **Vercel** with a hosted PostgreSQL database.

1. Push the repo to GitHub
2. Import the project at [vercel.com/new](https://vercel.com/new)
3. Provision a PostgreSQL database ([Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app) all have free tiers)
4. Set these environment variables in the Vercel dashboard:
   - `DATABASE_URL` — your Postgres connection string
   - `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
   - `NEXTAUTH_URL` — your Vercel production URL (e.g. `https://pizzapostr.vercel.app`)
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (optional)
5. Deploy — Prisma migrations run automatically during the build step

## Potential Improvements

- Public pizza sharing with unique URLs
- Pizza animation builder with GIF export
- Gallery of community creations
- Additional toppings, crust types, and sauce options
- Drag-and-drop topping placement
- Social features (likes, comments)

## License

MIT
