"use client";
import Link from "next/link";

/**
 * FinalCTASection Component
 * 
 * Final conversion opportunity before footer with compelling headline and CTA.
 * Features primary color background with white text and large prominent button.
 * Implements responsive layout for all screen sizes.
 * 
 * Requirements: 5.2
 */
export default function FinalCTASection() {
  return (
    <section 
      className="final-cta-section py-16 sm:py-20 md:py-28 px-4 sm:px-6 md:px-8"
      aria-labelledby="final-cta-heading"
      style={{
        backgroundColor: 'var(--primary)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative background elements */}
      <div 
        className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 opacity-10 rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />
      <div 
        className="absolute bottom-0 left-0 w-56 h-56 sm:w-80 sm:h-80 opacity-10 rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* Content container */}
      <div className="cta-content max-w-4xl mx-auto text-center relative z-10 px-4">
        {/* Headline - Responsive text sizing */}
        <h2 
          id="final-cta-heading"
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-4 sm:mb-6 animate-fade-in"
          style={{
            color: '#ffffff',
            lineHeight: '1.2',
          }}
        >
          Ready to Transform Your Restaurant?
        </h2>

        {/* Subheadline - Responsive text sizing */}
        <p 
          className="text-base sm:text-lg md:text-xl lg:text-2xl mb-8 sm:mb-10 max-w-2xl mx-auto animate-fade-in delay-100"
          style={{
            color: 'rgba(255, 255, 255, 0.9)',
            lineHeight: '1.6',
          }}
        >
          Join restaurants in Patna using OrderZap to serve customers better
        </p>

        {/* Large Primary CTA Button - Touch-friendly sizing */}
        <div className="animate-slide-up delay-200">
          <Link href="/signup" className="inline-block w-full sm:w-auto">
            <button 
              className="btn-large w-full sm:w-auto text-base sm:text-lg md:text-xl px-8 sm:px-10 py-4 sm:py-5 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105"
              style={{
                backgroundColor: '#ffffff',
                color: 'var(--primary)',
                fontWeight: '700',
                minWidth: '200px',
                minHeight: '56px',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '12px'
              }}
              aria-label="Start free trial with OrderZap"
            >
              Start Free Trial
            </button>
          </Link>
        </div>

        {/* Additional trust element - Responsive text */}
        <p 
          className="mt-4 sm:mt-6 text-xs sm:text-sm md:text-base animate-fade-in delay-300"
          style={{
            color: 'rgba(255, 255, 255, 0.8)',
          }}
        >
          No credit card required • Setup in minutes • Cancel anytime
        </p>
      </div>
    </section>
  );
}
