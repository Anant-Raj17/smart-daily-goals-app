import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  query,
  where,
  getDocs,
  Timestamp
} from "firebase/firestore";
import { Todo } from "@/components/TodoList";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Authentication functions
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

// Create a listener for auth state changes
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Firestore functions for todos
export const getTodos = async (userId: string): Promise<Todo[]> => {
  // Validate user ID
  if (!userId) {
    console.error("Error getting todos: No user ID provided");
    throw new Error("No user ID provided");
  }

  try {
    // Check if user is authenticated
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.uid !== userId) {
      console.error("Error getting todos: User not authenticated or ID mismatch");
      throw new Error("User not authenticated or ID mismatch");
    }

    return await retryOperation(async () => {
      const userDoc = await getDoc(doc(db, "users", userId));
      
      if (userDoc.exists()) {
        const todos = userDoc.data().todos || [];
        
        // Add debug logging for createdAt fields
        if (todos.length > 0 && process.env.NODE_ENV !== 'production') {
          const sample = todos[0];
          console.log('Sample todo createdAt type:', sample.createdAt ? 
            (sample.createdAt instanceof Date ? 'Date' : 
             typeof sample.createdAt === 'object' && 'seconds' in sample.createdAt ? 'Firestore Timestamp' :
             typeof sample.createdAt) : 'undefined');
        }
        
        return todos;
      } else {
        console.log("User document doesn't exist. Creating new document for user:", userId);
        // Create user document if it doesn't exist
        await setDoc(doc(db, "users", userId), { todos: [] });
        return [];
      }
    });
  } catch (error) {
    console.error("Error getting todos:", error);
    throw error;
  }
};

// Helper function to retry operations in case of network issues
const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      console.error(`Operation failed (attempt ${attempt + 1}/${maxRetries}):`, error);
      lastError = error;
      
      // If this is not the last attempt, wait before retrying
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
      }
    }
  }
  
  throw lastError!;
};

export const addTodo = async (userId: string, todoText: string): Promise<Todo> => {
  // Validate user ID and todo text
  if (!userId) {
    console.error("Error adding todo: No user ID provided");
    throw new Error("No user ID provided");
  }
  
  if (!todoText.trim()) {
    console.error("Error adding todo: Empty todo text");
    throw new Error("Todo text cannot be empty");
  }

  // Create the todo object first
  const newTodo: Todo = {
    id: Date.now().toString(), // Generate a unique ID
    description: todoText,
    completed: false,
    createdAt: Timestamp.now(), // Use Firestore Timestamp instead of Date
  };

  try {
    // Check if user is authenticated
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.uid !== userId) {
      console.error("Error adding todo: User not authenticated or ID mismatch");
      throw new Error("User not authenticated or ID mismatch");
    }

    await retryOperation(async () => {
      // Check if user document exists first
      const userDoc = await getDoc(doc(db, "users", userId));
      
      if (userDoc.exists()) {
        // Update existing document with new todo
        await updateDoc(doc(db, "users", userId), {
          todos: arrayUnion(newTodo)
        });
      } else {
        // Create new user document with todo
        await setDoc(doc(db, "users", userId), {
          todos: [newTodo]
        });
      }
    });
    
    return newTodo;
  } catch (error) {
    console.error("Error adding todo:", error);
    throw error;
  }
};

export const updateTodoStatus = async (userId: string, todoId: string, completed: boolean): Promise<void> => {
  try {
    await retryOperation(async () => {
      // Get current todos
      const todos = await getTodos(userId);
      
      // Find and update the todo
      const updatedTodos = todos.map(todo => {
        if (todo.id === todoId) {
          return { ...todo, completed };
        }
        return todo;
      });
      
      // Update the document with the new todos array
      await setDoc(doc(db, "users", userId), { todos: updatedTodos });
    });
  } catch (error) {
    console.error("Error updating todo status:", error);
    throw error;
  }
};

export const deleteTodo = async (userId: string, todoId: string): Promise<void> => {
  try {
    await retryOperation(async () => {
      // Get current todos
      const todos = await getTodos(userId);
      
      // Find the todo to remove
      const todoToRemove = todos.find(todo => todo.id === todoId);
      
      if (todoToRemove) {
        // Filter out the todo
        const updatedTodos = todos.filter(todo => todo.id !== todoId);
        
        // Update the document with the new todos array
        await setDoc(doc(db, "users", userId), { todos: updatedTodos });
      }
    });
  } catch (error) {
    console.error("Error deleting todo:", error);
    throw error;
  }
};

export const updateTodoText = async (userId: string, todoId: string, newText: string): Promise<void> => {
  try {
    await retryOperation(async () => {
      // Get current todos
      const todos = await getTodos(userId);
      
      // Find and update the todo
      const updatedTodos = todos.map(todo => {
        if (todo.id === todoId) {
          return { ...todo, description: newText };
        }
        return todo;
      });
      
      // Update the document with the new todos array
      await setDoc(doc(db, "users", userId), { todos: updatedTodos });
    });
  } catch (error) {
    console.error("Error updating todo text:", error);
    throw error;
  }
};
