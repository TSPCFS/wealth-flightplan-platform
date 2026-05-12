# Wealth FlightPlan™ Frontend

Frontend application for the Wealth FlightPlan™ platform.

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Router v6
- React Hook Form + Zod
- Vitest + React Testing Library

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

The development server runs on http://localhost:5173 and proxies API requests to http://localhost:8000.

### Build

```bash
npm run build
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Type Checking

```bash
npx tsc --noEmit
```

## Project Structure

```
src/
├── components/
│   ├── auth/          # Authentication components
│   ├── common/        # Shared UI components
│   └── pages/         # Page components
├── context/           # React contexts
├── hooks/             # Custom hooks
├── pages/             # Route page wrappers
├── services/          # API services
├── styles/            # Global styles
├── types/             # TypeScript type definitions
└── utils/             # Utility functions
```

## API Integration

The frontend communicates with the backend API at `http://localhost:8000`. The API client handles:

- JWT token management
- Automatic token refresh
- Error handling
- Request/response typing

## Authentication Flow

1. User registers with email/password
2. Email verification required
3. User logs in with credentials
4. JWT tokens stored in localStorage
5. Automatic token refresh on expiry
6. Protected routes redirect to login if unauthenticated

## Testing

Tests cover:
- Component rendering and interactions
- Form validation
- Authentication flows
- API error handling

Target coverage: ≥80% for auth and context modules.