# Quiz Game - Admin Dashboard

Admin dashboard for managing Quiz Game resources built with React Admin.

## Features

- User Management (List, View, Edit)
- Book Management (List, View, Edit, Create)
- Chapter Management (List, Edit)
- Flashcard Management (List, Edit)
- JWT Authentication
- RESTful API Integration

## Tech Stack

- **React 19** - UI library
- **React Admin 5** - Admin framework
- **Material-UI 5** - Component library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Axios** - HTTP client

## Development

### Prerequisites

- Node.js >= 18
- npm >= 9
- Backend API running on http://localhost:3000

### Setup

1. Copy environment file:

```bash
cp .env.example .env
```

2. Install dependencies (from root):

```bash
npm install
```

3. Start development server:

```bash
# From root
npm run dev --workspace=@quiz-game/admin

# Or from admin directory
cd apps/admin
npm run dev
```

The admin dashboard will be available at http://localhost:5173

### Login

Use your admin credentials from the backend to login.

## Project Structure

```
src/
├── providers/
│   ├── authProvider.ts      # JWT authentication
│   └── dataProvider.ts      # API integration
├── resources/
│   ├── users/              # User resource components
│   ├── books/              # Book resource components
│   ├── chapters/           # Chapter resource components
│   └── flashcards/         # Flashcard resource components
├── components/             # Shared components
├── types/                  # TypeScript types
├── utils/                  # Utility functions
├── App.tsx                 # Main application
└── main.tsx               # Entry point
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Lint code

## API Integration

The admin dashboard connects to the NestJS backend API:

- **Base URL**: `http://localhost:3000/api` (configurable in .env)
- **Authentication**: JWT tokens stored in localStorage
- **Endpoints**:
  - `GET /users` - List users
  - `GET /users/:id` - Get user details
  - `PATCH /users/:id` - Update user
  - `GET /admin/books` - List books
  - `POST /admin/books` - Create book
  - `PATCH /admin/books/:id` - Update book
  - `DELETE /admin/books/:id` - Delete book
  - And more...

## Next Steps

- [ ] Add file upload for book files and covers
- [ ] Add "Process Book" action button
- [ ] Add "Generate Flashcards" action
- [ ] Implement dashboard home page with statistics
- [ ] Add advanced filters and search
- [ ] Custom theme and branding
- [ ] Error handling and notifications
- [ ] Loading states

## Resources

- [React Admin Documentation](https://marmelab.com/react-admin/)
- [Material-UI Documentation](https://mui.com/)
- [Vite Documentation](https://vitejs.dev/)
