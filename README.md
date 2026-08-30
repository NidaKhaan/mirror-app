# Mirror — AI Mentor

A dark, luxury-themed AI mentoring experience that gives brutally honest, personalized feedback based on your goals, excuses, and fears.

## Tech Stack
- React 19 + Vite 6 + TypeScript
- Tailwind CSS
- Groq API (`openai/gpt-oss-120b`) for AI responses
- Framer Motion, Recharts, Three.js for UI/visualization

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:

npm install

2. Create a `.env` file in the root with:

VITE_GROQ_API_KEY="your_groq_api_key_here"

3. Run the app:

npm run dev


## Deployment
Deployed on Vercel with a serverless function proxying Groq API calls (API key kept server-side).