# Smart Todo App

A Next.js application where users interact with an AI chatbot to manage their to-do lists through natural language commands. The interface is split into two sections: a chatbot on the left for user input and a to-do list on the right for display.

## Features

- Natural language processing to interpret todo commands
- AI-powered chatbot for task management
- Firebase authentication
- Firestore database for storing tasks
- Real-time updates to the todo list

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Next.js API routes, Firebase Auth and Firestore
- **AI**: Groq API for natural language processing
- **Deployment**: Vercel

## Getting Started

1. Clone the repository
2. Install dependencies with `npm install`
3. Create a `.env` file with your Firebase and Groq API credentials
4. Run the development server with `npm run dev`
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Variables

Create a `.env` file with the following variables:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
GROQ_API_KEY=your_groq_api_key
```

## License

MIT
