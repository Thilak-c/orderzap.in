"use client";

// This layout overrides the admin layout for the waiter dashboard
// Waiters don't need the admin sidebar
export default function WaiterLayout({ children }) {
  return <>{children}</>;
}
