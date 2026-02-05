"use client";
import Image from "next/image";

/**
 * SocialProofSection Component
 * 
 * Displays partner restaurant logos with continuous scrolling animation to build trust and credibility.
 * Features seamless infinite loop with hover pause effect.
 * Optimized with Next.js Image component for automatic optimization and lazy loading.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 * Performance: 7.2, 7.3
 */
export default function SocialProofSection() {
  // Partner logos from /assets/partners/ directory
  const partners = [
    {
      logo: "/assets/partners/bts-disc-cafe-and-restro.png",
      name: "BTS Disc Cafe and Restro"
    },
    {
      logo: "/assets/partners/manget-club-and-restro.png",
      name: "Manget Club and Restro"
    }
  ];

  return (
    <section 
      className="social-proof-section py-12 sm:py-16 md:py-24 px-4 sm:px-6 md:px-8"
      aria-labelledby="social-proof-heading"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        overflow: 'hidden',
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Heading */}
        <h2 
          id="social-proof-heading"
          className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-center mb-8 sm:mb-10 md:mb-12 px-4"
          style={{
            color: 'var(--text-primary)',
          }}
        >
          Trusted by Restaurants in Patna
        </h2>

        {/* Partners Carousel Container */}
        <div 
          className="partners-carousel relative"
          style={{
            width: '100%',
            overflow: 'hidden',
            maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
          }}
        >
          {/* Partners Track with Continuous Scrolling Animation */}
          <div 
            className="partners-track animate-wave-flow flex gap-12 md:gap-16"
            style={{
              display: 'flex',
              gap: '64px',
              width: 'max-content',
            }}
            onMouseEnter={(e) => {
              // Pause animation on hover
              e.currentTarget.style.animationPlayState = 'paused';
            }}
            onMouseLeave={(e) => {
              // Resume animation on mouse leave
              e.currentTarget.style.animationPlayState = 'running';
            }}
          >
            {/* Duplicate logos for seamless loop - Responsive sizing */}
            {[...partners, ...partners, ...partners, ...partners].map((partner, index) => (
              <div
                key={index}
                className="partner-logo-container flex items-center justify-center"
                style={{
                  minWidth: '150px',
                  height: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  className="partner-logo-wrapper"
                  style={{
                    position: 'relative',
                    width: '140px',
                    height: '60px',
                    filter: 'grayscale(100%)',
                    opacity: '0.7',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    // Remove grayscale and increase opacity on hover
                    e.currentTarget.style.filter = 'grayscale(0%)';
                    e.currentTarget.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    // Restore grayscale and opacity
                    e.currentTarget.style.filter = 'grayscale(100%)';
                    e.currentTarget.style.opacity = '0.7';
                  }}
                >
                  <Image
                    src={partner.logo}
                    alt={partner.name}
                    fill
                    className="partner-logo object-contain"
                    loading="lazy"
                    sizes="140px"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Optional: Add testimonial or statistic */}
        <p 
          className="text-center mt-6 sm:mt-8 text-sm sm:text-base px-4"
          style={{
            color: 'var(--text-muted)',
          }}
        >
          Join restaurants using OrderZap to serve customers better
        </p>
      </div>

      {/* Responsive styles for mobile */}
      <style jsx>{`
        @media (max-width: 640px) {
          .partners-track {
            gap: 48px !important;
          }
          
          .partner-logo-container {
            min-width: 120px !important;
            height: 60px !important;
          }
          
          .partner-logo {
            max-width: 100px !important;
            max-height: 50px !important;
          }
        }
      `}</style>
    </section>
  );
}
