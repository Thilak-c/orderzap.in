"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Store, ArrowRight } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [showOptions, setShowOptions] = useState(false);


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[--bg] via-[--bg-elevated] to-[--bg] p-4">
      <div className="text-center max-w-md w-full">
        <img 
          className="w-20 mx-auto mb-6 animate-bounce-in" 
          src="/assets/logos/favicon_io/android-chrome-192x192.png" 
          alt="OrderZap" 
        />
        
        <h1 className="text-3xl font-bold text-[--text-primary] mb-2 animate-fade-in">
          OrderZap
        </h1>
        <p className="text-[--text-muted] text-sm mb-8 animate-fade-in" style={{animationDelay: '0.1s'}}>
          How Patna Orders
        </p>

        {showOptions && (
          <div className="space-y-3 animate-slide-up" style={{animationDelay: '0.2s'}}>
            <Link
              href="/signup"
              className="flex items-center justify-between w-full p-4 bg-[--card] hover:bg-[--bg-elevated] border border-[--border] rounded-xl transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[--primary]/10 flex items-center justify-center">
                  <Store size={20} className="text-[--primary]" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-[--text-primary]">
                    New Restaurant?
                  </p>
                  <p className="text-xs text-[--text-muted]">
                    Sign up now
                  </p>
                </div>
              </div>
              <ArrowRight size={18} className="text-[--text-muted] group-hover:text-[--primary] transition-colors" />
            </Link>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[--border]"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-[--bg] text-[--text-dim]">or</span>
              </div>
            </div>

            <div className="text-center">
              <div className="loader-2 mx-auto mb-2" />
              <p className="text-xs text-[--text-muted]">
                Redirecting to default restaurant...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
