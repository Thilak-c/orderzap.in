"use client";
import Link from "next/link";
import Image from "next/image";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[--bg] via-[--bg-elevated] to-[--bg]">
      {/* Animated gradient background - Multiple layers for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-[--primary-light] via-transparent to-transparent opacity-30 animate-pulse-soft" />
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[--primary-light] to-transparent opacity-20 animate-pulse-soft" style={{ animationDelay: '1s', animationDuration: '3s' }} />
      
      {/* Optional: Animated gradient orbs for more dynamic effect */}
      <div 
        className="absolute top-1/4 left-1/4 w-96 h-96 opacity-10 rounded-full blur-3xl animate-float" 
        style={{ 
          background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)',
          animationDuration: '6s'
        }}
      />
      <div 
        className="absolute bottom-1/4 right-1/4 w-80 h-80 opacity-10 rounded-full blur-3xl animate-float" 
        style={{ 
          background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)',
          animationDelay: '2s', 
          animationDuration: '5s' 
        }}
      />
      
      {/* Content container */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        {/* Logo */}
        <div className="mb-8 animate-bounce-in">
          <Image
            src="/assets/logos/orderzap-logo.png"
            alt="OrderZap Logo"
            width={800}
            height={200}
            className="mx-auto w-64 sm:w-80 md:w-96 lg:w-[500px] h-auto"
            priority
          />
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[--text-primary] mb-6 animate-fade-in leading-tight">
          Transform Your Restaurant with Smart Ordering
        </h1>

        {/* Subheadline */}
        <p className="text-base sm:text-lg md:text-xl text-[--text-secondary] mb-10 max-w-3xl mx-auto animate-fade-in delay-100 leading-relaxed">
          QR Ordering • Digital Menus • Online Payments • Table Booking
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up delay-200">
          <Link href="/signup" className="w-full sm:w-auto">
            <button 
              className="btn btn-primary text-base md:text-lg px-8 py-4 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 w-full sm:w-auto min-w-[200px] min-h-[56px]"
              style={{
                borderRadius: '12px'
              }}
              aria-label="Start free trial with OrderZap"
            >
              Start Free Trial
            </button>
          </Link>
          
          <Link href="/demo" className="w-full sm:w-auto">
            <button 
              className="btn btn-secondary text-base md:text-lg px-8 py-4 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 w-full sm:w-auto min-w-[200px] min-h-[56px]"
              style={{
                borderRadius: '12px'
              }}
              aria-label="View OrderZap demo"
            >
              View Demo
            </button>
          </Link>
        </div>

        {/* Additional value proposition */}
        <p className="mt-8 text-sm md:text-base text-[--text-muted] animate-fade-in delay-300">
          Join restaurants in Patna using OrderZap to serve customers better
        </p>
      </div>

      {/* Decorative floating elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-[--primary] opacity-10 rounded-full blur-xl animate-float" aria-hidden="true" />
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-[--primary] opacity-10 rounded-full blur-xl animate-float" style={{ animationDelay: '1s' }} aria-hidden="true" />
    </section>
  );
}
