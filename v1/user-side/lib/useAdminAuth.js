"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "./AdminContext";

export function useAdminAuth() {
  const router = useRouter();
  const { adminUser, loading } = useAdmin();
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    if (!loading) {
      const auth = sessionStorage.getItem("admin-auth");
      const hasValidAuth = auth === "true" && adminUser;
      
      setIsAuthenticated(hasValidAuth);
      
      if (!hasValidAuth) {
        router.replace("/admin/login");
      }
    }
  }, [adminUser, loading, router]);

  const logout = () => {
    sessionStorage.removeItem("admin-auth");
    sessionStorage.removeItem("admin-email");
    router.push("/admin/login");
  };

  return { 
    isAuthenticated, 
    loading: loading || isAuthenticated === null, 
    logout,
    adminUser 
  };
}
