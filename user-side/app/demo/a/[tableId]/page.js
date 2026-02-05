"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { generateSessionKey, createQRSession } from "@/lib/qrAuth";

export default function AuthPage() {
  const { tableId } = useParams();
  const router = useRouter();

  useEffect(() => {
    if (!tableId) {
      router.replace('/');
      return;
    }

    // Generate session key and create session
    const sessionKey = generateSessionKey();
    createQRSession(tableId, sessionKey);
    
    // Redirect to menu with key after brief delay
    setTimeout(() => {
      router.replace(`/demo/m/${tableId}`);
    }, 500);
  }, [tableId, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[--bg] px-4">
      <div className="text-center">
      
        <p className="loader-4">Table {tableId}</p>
      </div>
    </div>
  );
}
