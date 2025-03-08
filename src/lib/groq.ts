import { Todo } from "@/components/TodoList";

export interface AIResponse {
  text: string;
  action?: {
    type: "add_task" | "edit_task" | "delete_task" | "mark_completed" | "mark_pending" | "none";
    taskId?: string;
    task?: string;
  };
}

/**
 * This file contains types and interfaces for Groq AI responses.
 * The actual API call functionality has been moved to the API route at /api/groq/chat/route.ts
 * to prevent client-side Groq SDK usage which causes the "dangerouslyAllowBrowser" error.
 */ 