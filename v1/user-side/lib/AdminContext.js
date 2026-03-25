"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

const AdminContext = createContext();

export function AdminProvider({ children }) {
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get admin email from session storage
  const adminEmail = typeof window !== 'undefined' 
    ? sessionStorage.getItem("admin-email") 
    : null;

  // Fetch admin user data from database
  const adminData = useQuery(
    api.admin.getAdminByEmail, 
    adminEmail ? { email: adminEmail } : "skip"
  );

  useEffect(() => {
    if (adminEmail && adminData !== undefined) {
      setAdminUser(adminData);
      setLoading(false);
    } else if (!adminEmail) {
      setAdminUser(null);
      setLoading(false);
    }
  }, [adminEmail, adminData]);

  const login = (email) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem("admin-auth", "true");
      sessionStorage.setItem("admin-email", email);
    }
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem("admin-auth");
      sessionStorage.removeItem("admin-email");
    }
    setAdminUser(null);
  };

  const value = {
    adminUser,
    loading,
    login,
    logout,
    isAuthenticated: !!adminUser,
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}