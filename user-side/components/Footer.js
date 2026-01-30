"use client";
import { useState, useEffect } from "react";
import Image from "next/image";

export default function Footer() {
  const [gitInfo, setGitInfo] = useState(null);

  useEffect(() => {
    fetch('/git-info.json')
      .then(res => res.json())
      .then(data => setGitInfo(data))
      .catch(() => setGitInfo(null));
  }, []);

  return (
    <footer className="py-4 px-4 border-t border-[--border] bg-[--bg] relative">
      <div className="flex items-center justify-center gap-2">
        <span className="text-xs text-[--text-muted]">Powered by</span>
        <Image
          src="/assets/logos/orderzap-logo.png"
          alt="OrderZap"
          width={50}
          height={14}
          className="object-contain"
        />
      </div>
      {/* <p className="text-xs text-[--text-muted] mt-1">How Patna Order's</p> */}

      {gitInfo && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-right">
          <div className="text-[8px] text-[--text-muted] font-mono">
            {gitInfo.message}
          </div>
          <div className="text-[8px] text-[--text-muted] font-mono">
            {gitInfo.author}
          </div>
        </div>
      )}
    </footer>
  );
}
