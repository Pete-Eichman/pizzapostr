# PizzaPostr

A full-stack pizza creation and sharing app built with Next.js. Users sign in, build custom pizzas on an interactive canvas, apply animations and visual effects, export GIFs, and save their creations to the cloud.

## Tech Stack

- **Framework:** Next.js 15, React 19, TypeScript
- **Styling:** Tailwind CSS with dark mode support
- **Rendering:** HTML5 Canvas API (procedural, no image assets)
- **Backend:** Next.js Server Actions with Zod validation
- **Database:** PostgreSQL via Prisma ORM (hosted on Neon)
- **Auth:** NextAuth v5 (credentials + Google OAuth)
- **Testing:** Vitest + React Testing Library (unit/component), Cypress (E2E)

## Features

### Pizza Builder
- Interactive canvas-based pizza builder with procedural rendering
- 10 toppings: pepperoni, mushrooms, olives, peppers, pineapple, ham, chicken, onions, bacon, and ranch drizzle
- Whole and half & half pizza modes with independent topping selection per side
- Deterministic topping placement — saved pizzas render identically on reload

### Animations & Effects
- 5 animations: rotate CW/CCW, wave CW/CCW, and coin-flip
- 3 visual filters: monochrome, neon glow (Sobel edge detection), and negative
- Animated GIF export

### User System
- Email/password registration and sign-in
- Google OAuth integration
- Save, load, and delete pizza configurations per user
- Saved pizzas sidebar with topping and effect summaries

### UI/UX
- Light/dark theme with OS preference detection and localStorage persistence
- Responsive layout with accessible UI (ARIA labels, focus management, keyboard navigation)
- Client and server-side input validation via Zod schemas

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
AUTH_TRUST_HOST=true
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

### Unit & Component Tests

```bash
npm test             # Watch mode
npm run test:run     # Single run (CI)
```

### E2E Tests

Start the dev server first, then run Cypress:

```bash
npm run dev                # Terminal 1
npm run test:e2e           # Terminal 2 — interactive mode
npm run test:e2e:headless  # or headless mode
```

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
│   ├── api/auth/          # NextAuth route handler
│   ├── auth/              # Sign-in and registration pages
│   ├── layout.tsx         # Root layout with ThemeProvider
│   └── page.tsx           # Main authenticated page
├── components/
│   ├── PizzaCanvas.tsx    # Canvas pizza builder + saved pizzas sidebar
│   ├── ThemeProvider.tsx  # Dark/light theme context
│   └── ThemeToggle.tsx    # Sun/moon toggle button
├── lib/
│   ├── animation.ts       # Animation loop and frame logic
│   ├── auth.ts            # NextAuth v5 config
│   ├── pizzaRenderer.ts   # Procedural pizza drawing and effects
│   ├── prisma.ts          # Prisma client singleton
│   └── toppings.ts        # Topping definitions and placement
├── types/
│   └── pizza.ts           # Shared type definitions
└── __tests__/             # Unit and component tests

cypress/
├── e2e/                   # E2E specs (auth, pizza builder, theme)
└── support/

prisma/
└── schema.prisma          # User, Account, Session, Pizza models
```

## Deployment

The app is deployed on **Vercel** with a Neon PostgreSQL database.

To deploy your own instance:

1. Push the repo to GitHub
2. Import the project at [vercel.com/new](https://vercel.com/new)
3. Provision a PostgreSQL database ([Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app))
4. Set environment variables in the Vercel dashboard:
   - `DATABASE_URL` — your Postgres connection string
   - `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
   - `NEXTAUTH_URL` — your Vercel production URL
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (optional)
5. Deploy — Prisma migrations run automatically during the build step

## License

MIT
