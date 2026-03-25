"use client";
import { createContext, useContext, useState, useEffect } from "react";

const SessionContext = createContext();

// Generate a unique session ID for this browser/device
function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function SessionProvider({ children }) {
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    // Get or create session ID
    let id = localStorage.getItem("qr-session-id");
    if (!id) {
      id = generateSessionId();
      localStorage.setItem("qr-session-id", id);
    }
    setSessionId(id);
  }, []);

  return (
    <SessionContext.Provider value={{ sessionId }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
