"use client";
import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50 px-6">
      <div className="max-w-2xl w-full text-center">
        {/* 404 Animation */}
        <div className="mb-8 animate-fade-in">
          <div className="relative inline-block">
            <h1 className="text-[120px] md:text-[180px] font-bold text-slate-200 leading-none select-none">
              404
            </h1>
            <div className="absolute inset-0 flex items-center justify-center">
              <img 
                src="https://cdn.dribbble.com/users/285475/screenshots/2083086/dribbble_1.gif" 
                alt="404" 
                className="w-48 h-48 md:w-64 md:h-64 object-contain opacity-90"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 animate-slide-up" style={{animationDelay: '0.2s', animationFillMode: 'forwards', opacity: 0}}>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
            Looks like you're lost
          </h2>
          <p className="text-lg text-slate-600 max-w-md mx-auto">
            The page you are looking for is not available!
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-6">
            <Link 
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-all duration-200 shadow-lg shadow-emerald-500/30"
            >
              <Home size={20} />
              Go to Home
            </Link>
            <button 
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-all duration-200"
            >
              <ArrowLeft size={20} />
              Go Back
            </button>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="mt-16 flex justify-center gap-2 opacity-30">
          <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{animationDelay: '0s'}} />
          <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{animationDelay: '0.2s'}} />
          <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{animationDelay: '0.4s'}} />
        </div>
      </div>
    </div>
  );
}
