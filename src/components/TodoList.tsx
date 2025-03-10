"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Todo {
  id: string;
  description: string;
  completed: boolean;
  createdAt: Date | { seconds: number; nanoseconds: number } | string | number;
}

interface TodoListProps {
  todos: Todo[];
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onAddTodo: (description: string) => void;
}

export function TodoList({
  todos,
  onToggleTodo,
  onDeleteTodo,
  onAddTodo,
}: TodoListProps) {
  const [newTodoText, setNewTodoText] = useState("");

  // Sort todos: incomplete first, then by creation date (newest first)
  const sortedTodos = [...todos].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }

    // Handle different possible formats of createdAt
    // Safe function to get timestamp value regardless of type
    const getTimeValue = (date: any): number => {
      if (!date) return 0;

      // If it's a Date object
      if (date instanceof Date) {
        return date.getTime();
      }

      // If it's a Firebase Timestamp object with seconds and nanoseconds
      if (date && typeof date === "object" && "seconds" in date) {
        return date.seconds * 1000 + (date.nanoseconds || 0) / 1000000;
      }

      // If it's a string, try to parse it
      if (typeof date === "string") {
        return new Date(date).getTime();
      }

      // If it's a number (timestamp)
      if (typeof date === "number") {
        return date;
      }

      return 0;
    };

    return getTimeValue(b.createdAt) - getTimeValue(a.createdAt);
  });

  const pendingTodos = sortedTodos.filter((todo) => !todo.completed);
  const completedTodos = sortedTodos.filter((todo) => todo.completed);

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodoText.trim()) {
      onAddTodo(newTodoText.trim());
      setNewTodoText("");
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle>Your Todo List</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-4 pb-0 overflow-hidden">
        <form onSubmit={handleAddTodo} className="flex space-x-2 mb-4">
          <Input
            type="text"
            placeholder="Add a new task..."
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={!newTodoText.trim()}>
            <PlusIcon className="h-4 w-4 mr-1" />
            Add
          </Button>
        </form>
        <ScrollArea className="h-[calc(100vh-280px)]">
          {pendingTodos.length === 0 && completedTodos.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center p-4">
              <div className="text-muted-foreground">
                <p>You don&apos;t have any todos yet.</p>
                <p className="text-sm">
                  Add a task using the form above or chat with the AI assistant!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingTodos.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Pending</h3>
                  <div className="space-y-2">
                    {pendingTodos.map((todo) => (
                      <TodoItem
                        key={todo.id}
                        todo={todo}
                        onToggle={onToggleTodo}
                        onDelete={onDeleteTodo}
                      />
                    ))}
                  </div>
                </div>
              )}

              {completedTodos.length > 0 && (
                <div>
                  <Separator className="my-4" />
                  <h3 className="text-sm font-medium mb-2">Completed</h3>
                  <div className="space-y-2">
                    {completedTodos.map((todo) => (
                      <TodoItem
                        key={todo.id}
                        todo={todo}
                        onToggle={onToggleTodo}
                        onDelete={onDeleteTodo}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = () => {
    // Start animation if being marked as complete
    if (!todo.completed) {
      setIsAnimating(true);
      // Reset animation state after animation completes
      setTimeout(() => setIsAnimating(false), 500);
    }
    onToggle(todo.id);
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between p-2 rounded-md transition-all duration-300",
        isAnimating ? "bg-green-50" : "hover:bg-neutral-100"
      )}
    >
      <div className="flex items-center gap-2">
        <Checkbox
          id={`todo-${todo.id}`}
          checked={todo.completed}
          onCheckedChange={handleToggle}
        />
        <label
          htmlFor={`todo-${todo.id}`}
          className={`text-sm ${
            todo.completed ? "line-through text-muted-foreground" : ""
          } ${isAnimating ? "text-green-600 font-medium" : ""}`}
        >
          {todo.description}
        </label>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(todo.id)}
        className="h-7 w-7 p-0"
      >
        ×
      </Button>
    </div>
  );
}
