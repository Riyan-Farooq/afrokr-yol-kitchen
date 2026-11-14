# Afrodelicious

Afrodelicious is a food and community platform focused on recipes, food culture, and culinary experiences.

## Technology Stack

- React
- TypeScript
- Vite
- Supabase
- FastAPI AI Backend
- CrewAI
- Groq API

## Features

- Browse and explore recipes.
- Admin recipe management.
- Import recipes from supported URLs using the AI Recipe Collector.
- Preview extracted recipes before saving.
- Save imported recipes as drafts.
- Admin review and manual publishing.
- Community and food-related features.

## AI Integration

The Afrodelicious website integrates only the Recipe Collector agent.

Brendy (marketing) and SAM (product development) are separate standalone backend agents and are not integrated into this website.

## Requirements

- Node.js and npm
- Access to a configured Supabase project
- Running or deployed Afrodelicious AI backend

## Installation

1. Clone or download the repository.
2. Open the frontend project directory.
3. Install dependencies:

   `npm install --legacy-peer-deps`

4. Create your environment file:

   `Copy-Item .env.example .env`

5. Configure the following environment variables:

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_API_URL`

6. Start the development server:

   `npm run dev`

## Production Build

Run:

`npm run build`

## Backend

The AI backend is maintained separately. Refer to the backend repository README for backend installation and setup instructions.

## Security

- Never commit `.env` files.
- Never expose API keys or private credentials.
- Use client-owned Supabase and Groq credentials.
- Configure production API URLs before deployment.

## Important

Imported recipes are saved as drafts and require administrator review before publication.