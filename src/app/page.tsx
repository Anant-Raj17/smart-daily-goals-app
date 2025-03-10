"use client";

import { useState, useEffect } from "react";
import { ChatInterface, Message } from "@/components/ChatInterface";
import { TodoList, Todo } from "@/components/TodoList";
import {
  signInWithGoogle,
  signOut,
  onAuthStateChange,
  getTodos,
  addTodo,
  updateTodoStatus,
  deleteTodo,
  updateTodoText,
} from "@/lib/firebase/firebaseUtils";
import { nanoid } from "nanoid";
import { User } from "firebase/auth";
import { Button } from "@/components/ui/button";

// Define the AIResponse interface here since we no longer import it from groq.ts
interface AIResponse {
  text: string;
  action?: {
    type:
      | "add_task"
      | "add_multiple_tasks"
      | "edit_task"
      | "delete_task"
      | "mark_completed"
      | "mark_pending"
      | "none";
    taskId?: string;
    task?: string;
    tasks?: string[];
  };
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange((authUser) => {
      setUser(authUser);

      if (authUser) {
        // Fetch todos when user logs in
        fetchTodos(authUser.uid);

        // Add welcome message
        setMessages([
          {
            id: nanoid(),
            role: "assistant",
            content:
              "Hello! I'm your AI assistant. How can I help you manage your tasks today?",
            timestamp: new Date(),
          },
        ]);
      } else {
        // Clear todos and messages when user logs out
        setTodos([]);
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch todos from Firestore
  const fetchTodos = async (userId: string) => {
    if (!userId) {
      console.error("Cannot fetch todos: No user ID provided");
      return;
    }

    try {
      console.log("Fetching todos for user:", userId);
      const fetchedTodos = await getTodos(userId);
      console.log("Successfully fetched todos:", fetchedTodos.length);
      setTodos(fetchedTodos);
    } catch (error) {
      console.error("Error fetching todos:", error);

      // Add a system message to inform the user about the error
      setMessages((prev) => [
        ...prev,
        {
          id: nanoid(),
          role: "assistant",
          content:
            "I'm having trouble accessing your tasks. Please try refreshing the page or signing out and back in.",
          timestamp: new Date(),
        },
      ]);
    }
  };

  // Handle user message and AI response
  const handleSendMessage = async (userMessage: string) => {
    if (!user) return;

    // Add user message to chat
    const userMessageObj: Message = {
      id: nanoid(),
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessageObj]);
    setIsLoading(true);

    try {
      console.log("Sending message to API:", userMessage);
      console.log("Current todos state:", todos);

      // Call the API route instead of directly using processMessage
      const response = await fetch("/api/groq/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userMessage, todos }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const aiResponse: AIResponse = await response.json();
      console.log("Received AI response:", aiResponse);

      // Add AI response to chat
      const aiMessageObj: Message = {
        id: nanoid(),
        role: "assistant",
        content: aiResponse.text,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessageObj]);

      // Handle any actions returned by the AI
      if (aiResponse.action) {
        console.log("Processing action from AI:", aiResponse.action);
        await handleAIAction(aiResponse.action);
      }
    } catch (error) {
      console.error("Error processing message:", error);

      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: nanoid(),
          role: "assistant",
          content:
            "Sorry, I encountered an error. Please try again. If you're having trouble adding or editing tasks, please check your browser's network settings or disable any ad blockers that might be affecting Firebase connections.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle AI actions (add, edit, delete todos)
  const handleAIAction = async (action: any) => {
    if (!user) return;

    console.log("Processing action:", action);

    // Check if the action is in the expected format
    if (!action || typeof action !== "object") {
      console.error("Invalid action format:", action);
      return;
    }

    // Handle both format possibilities (with or without action wrapper)
    const actionType = action.type;

    if (!actionType) {
      console.error("Action type missing:", action);
      return;
    }

    switch (actionType) {
      case "add_task":
        if (action.task) {
          console.log("Adding task:", action.task);
          try {
            const newTodo = await addTodo(user.uid, action.task);
            setTodos((prev) => [...prev, newTodo]);
            console.log("Task added successfully:", newTodo);
          } catch (error) {
            console.error("Error adding task:", error);
          }
        }
        break;

      case "add_multiple_tasks":
        if (
          action.tasks &&
          Array.isArray(action.tasks) &&
          action.tasks.length > 0
        ) {
          console.log("Adding multiple tasks:", action.tasks);

          try {
            const newTodos: Todo[] = [];

            // Add each task sequentially
            for (const task of action.tasks) {
              if (typeof task === "string" && task.trim()) {
                const newTodo = await addTodo(user.uid, task);
                newTodos.push(newTodo);
                console.log(`Task added successfully: ${newTodo.description}`);
              }
            }

            // Update state once with all new todos
            if (newTodos.length > 0) {
              setTodos((prev) => [...prev, ...newTodos]);
            }
          } catch (error) {
            console.error("Error adding multiple tasks:", error);
          }
        }
        break;

      case "mark_completed":
      case "mark_pending":
        if (action.taskId) {
          const isCompleted = actionType === "mark_completed";
          console.log(
            `Marking task ${action.taskId} as ${
              isCompleted ? "completed" : "pending"
            }`
          );
          try {
            await updateTodoStatus(user.uid, action.taskId, isCompleted);
            setTodos((prev) =>
              prev.map((todo) =>
                todo.id === action.taskId
                  ? { ...todo, completed: isCompleted }
                  : todo
              )
            );
            console.log("Task status updated successfully");
          } catch (error) {
            console.error("Error updating task status:", error);
          }
        }
        break;

      case "edit_task":
        if (action.taskId && action.task) {
          console.log(`Editing task ${action.taskId} to: ${action.task}`);
          try {
            await updateTodoText(user.uid, action.taskId, action.task);
            setTodos((prev) =>
              prev.map((todo) =>
                todo.id === action.taskId
                  ? { ...todo, description: action.task }
                  : todo
              )
            );
            console.log("Task edited successfully");
          } catch (error) {
            console.error("Error editing task:", error);
          }
        }
        break;

      case "delete_task":
        if (action.taskId) {
          console.log(`Deleting task ${action.taskId}`);
          try {
            await deleteTodo(user.uid, action.taskId);
            setTodos((prev) =>
              prev.filter((todo) => todo.id !== action.taskId)
            );
            console.log("Task deleted successfully");
          } catch (error) {
            console.error("Error deleting task:", error);
          }
        }
        break;

      case "none":
        console.log("No action needed");
        break;

      default:
        console.warn("Unknown action type:", actionType);
        break;
    }
  };

  // Handle toggling todo completion status
  const handleToggleTodo = async (todoId: string) => {
    if (!user) return;

    const todo = todos.find((t) => t.id === todoId);
    if (todo) {
      const newStatus = !todo.completed;
      await updateTodoStatus(user.uid, todoId, newStatus);
      setTodos((prev) =>
        prev.map((t) => (t.id === todoId ? { ...t, completed: newStatus } : t))
      );
    }
  };

  // Handle deleting a todo
  const handleDeleteTodo = async (todoId: string) => {
    if (!user) return;

    await deleteTodo(user.uid, todoId);
    setTodos((prev) => prev.filter((t) => t.id !== todoId));
  };

  return (
    <main className="flex min-h-screen flex-col p-4 md:p-8">
      {user ? (
        <div className="flex flex-col h-screen">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-semibold">Smart Daily Tasks</h1>
            <Button onClick={signOut} variant="outline" size="sm">
              Sign Out
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow overflow-hidden">
            <div className="h-full">
              <ChatInterface
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
              />
            </div>
            <div className="h-full">
              <TodoList
                todos={todos}
                onToggleTodo={handleToggleTodo}
                onDeleteTodo={handleDeleteTodo}
                onAddTodo={(description) => {
                  const handleNewTodo = async () => {
                    if (user) {
                      try {
                        const newTodo = await addTodo(user.uid, description);
                        setTodos((prev) => [...prev, newTodo]);
                      } catch (error) {
                        console.error("Error adding todo:", error);
                      }
                    }
                  };
                  handleNewTodo();
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-2xl font-semibold mb-8">Smart Daily Tasks</h1>
          <div className="flex flex-col w-full max-w-sm p-6 border rounded-lg shadow-sm">
            <h2 className="text-xl font-medium mb-6 text-center">Sign In</h2>
            <Button onClick={signInWithGoogle} className="w-full">
              Sign in with Google
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
