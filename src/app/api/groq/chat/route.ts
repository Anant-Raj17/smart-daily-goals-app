import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { Todo } from "@/components/TodoList";

// Initialize Groq client (server-side only)
const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY || "",
});

export async function POST(request: NextRequest) {
  try {
    const { message, todos } = await request.json();
    
    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Format current todos for the AI
    const formattedTodos = todos.map(
      (todo: Todo) => `${todo.id}: ${todo.description} (${todo.completed ? "completed" : "pending"})`
    ).join("\n");

    // Create system prompt with instructions for the AI
    const systemPrompt = `You are an AI assistant for a todo list app. Help the user manage their tasks.
The user will send you messages, and you should respond in a helpful, conversational way.
You can also perform actions on the todo list based on the user's request.

Current todo list:
${formattedTodos || "No tasks yet."}

INSTRUCTIONS FOR FORMATTING YOUR RESPONSE:
1. First, provide a natural language response to the user.
2. Then, if an action is needed (like adding a task), include a JSON object for the action at the VERY END of your message.

The JSON MUST follow this exact format:
- Adding a task: {"type":"add_task","task":"Buy groceries"}
- Adding multiple tasks: {"type":"add_multiple_tasks","tasks":["Buy groceries", "Go to gym", "Call mom"]}
- Marking complete: {"type":"mark_completed","taskId":"123"}
- Marking pending: {"type":"mark_pending","taskId":"123"}
- Editing a task: {"type":"edit_task","taskId":"123","task":"New description"}
- Deleting a task: {"type":"delete_task","taskId":"123"}
- No action needed: {"type":"none"}

CRITICAL RULES:
- When the user asks to add multiple tasks in a single request, use the add_multiple_tasks action
- The JSON MUST be the last thing in your response
- Do NOT wrap the JSON in any code block formatting or explanatory text
- Do NOT include the word "action" in your JSON object
- Make sure to use proper JSON syntax with double quotes around keys and string values
- Use the exact task IDs as provided in the current todo list`;

    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      max_tokens: 800,
    });

    const response = completion.choices[0].message.content || "";

    // Extract the JSON action from the response
    let action = { type: "none" as const };
    
    // Find the last opening curly brace in the response
    const lastOpenBrace = response.lastIndexOf("{");
    if (lastOpenBrace !== -1) {
      try {
        // Find the matching closing brace
        let depth = 0;
        let closingBraceIndex = -1;
        
        for (let i = lastOpenBrace; i < response.length; i++) {
          if (response[i] === "{") depth++;
          else if (response[i] === "}") {
            depth--;
            if (depth === 0) {
              closingBraceIndex = i;
              break;
            }
          }
        }
        
        if (closingBraceIndex !== -1) {
          const jsonString = response.substring(lastOpenBrace, closingBraceIndex + 1);
          console.log("Extracted JSON string:", jsonString);
          try {
            const parsedJson = JSON.parse(jsonString);
            if (parsedJson.action) {
              action = parsedJson.action;
            } else {
              // The JSON might be in a different format, try to extract action directly
              action = parsedJson;
            }
            console.log("Parsed action:", action);
          } catch (jsonError) {
            console.error("Failed to parse JSON:", jsonError, "Raw string:", jsonString);
          }
        }
      } catch (e) {
        console.error("Failed to parse action JSON:", e);
      }
    }

    // Clean up the text by removing the JSON portion (anything from the last opening brace)
    let cleanText = response;
    if (lastOpenBrace !== -1) {
      cleanText = response.substring(0, lastOpenBrace).trim();
    }

    return NextResponse.json({
      text: cleanText,
      action: action && Object.keys(action).length > 0 ? action : { type: "none" },
    });
  } catch (error: any) {
    console.error("Error calling Groq API:", error);
    return NextResponse.json(
      { 
        error: "Error processing request",
        message: error.message,
        text: "I'm sorry, I encountered an error while processing your request. Please check your browser console for more details and ensure there are no browser extensions blocking Firebase connections.",
        action: { type: "none" } 
      },
      { status: 500 }
    );
  }
} 