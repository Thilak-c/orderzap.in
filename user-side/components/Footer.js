"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  const [gitInfo, setGitInfo] = useState(null);



  return (
    <footer 
      className="py-8 px-4 border-t border-[--border] bg-[--bg] relative"
      role="contentinfo"
      aria-label="Site footer"
    >
      <div className="max-w-7xl mx-auto">
        {/* Main footer content */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
          {/* Logo and branding */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[--text-muted]">Powered by</span>
            <Image
              src="/assets/logos/orderzap-logo.png"
              alt="OrderZap Logo"
              width={50}
              height={14}
              className="object-contain"
            />
          </div>

          {/* Footer links */}
         
        </div>

        {/* Copyright */}
        <div className="text-center">
          <p className="text-xs text-[--text-muted]">
            © {new Date().getFullYear()} OrderZap. All rights reserved.
          </p>
        </div>
      </div>

      {/* Git info (development only) */}
     
    </footer>
  );
}
