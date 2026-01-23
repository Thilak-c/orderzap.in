"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useAdminAuth() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = sessionStorage.getItem("admin-auth");
    if (auth === "true") {
      setIsAuthenticated(true);
    } else {
      router.replace("/admin/login");
    }
    setLoading(false);
  }, [router]);

  const logout = () => {
    sessionStorage.removeItem("admin-auth");
    router.push("/admin/login");
  };

  return { isAuthenticated, loading, logout };
}
