import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

/**
 * Hook to protect routes based on user role
 * @param {string} restaurantId - The restaurant ID
 * @param {string[]} allowedRoles - Array of roles that can access this route (e.g., ['Owner', 'Manager'])
 * @returns {object} - { authUser, isAuthorized, isChecking }
 */
export function useRouteProtection(restaurantId, allowedRoles = []) {
  const router = useRouter();
  const [authUser, setAuthUser] = useState(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // Memoize allowedRoles to prevent infinite loop
  const allowedRolesStr = useMemo(() => JSON.stringify(allowedRoles), [allowedRoles.join(',')]);

  useEffect(() => {
    const authData = localStorage.getItem("adminAuth");
    
    if (!authData) {
      router.push(`/r/${restaurantId}/admin/login`);
      setIsChecking(false);
      return;
    }

    try {
      const parsed = JSON.parse(authData);
      setAuthUser(parsed);
      
      // Check if user's role is in allowed roles
      const userRole = parsed.role;
      const roles = JSON.parse(allowedRolesStr);
      const hasAccess = roles.length === 0 || roles.includes(userRole);
      
      setIsAuthorized(hasAccess);
      
      // If not authorized, redirect to orders page after showing message
      if (!hasAccess) {
        setTimeout(() => {
          router.push(`/r/${restaurantId}/admin/orders`);
        }, 2000);
      }
    } catch (e) {
      console.error("Invalid auth data");
      localStorage.removeItem("adminAuth");
      router.push(`/r/${restaurantId}/admin/login`);
    }
    
    setIsChecking(false);
  }, [restaurantId, router, allowedRolesStr]);

  return { authUser, isAuthorized, isChecking };
}
