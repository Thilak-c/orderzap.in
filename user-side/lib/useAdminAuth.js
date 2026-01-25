"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useAdminAuth() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = checking, true/false = result
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check immediately on mount
    const auth = sessionStorage.getItem("admin-auth");
    if (auth === "true") {
      setIsAuthenticated(true);
      setLoading(false);
    } else {
      setIsAuthenticated(false);
      setLoading(false);
      router.replace("/admin/login");
    }
  }, [router]);

  const logout = () => {
    sessionStorage.removeItem("admin-auth");
    router.push("/admin/login");
  };

  return { isAuthenticated, loading, logout };
}
