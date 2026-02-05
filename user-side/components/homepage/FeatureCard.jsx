"use client";
import Image from "next/image";

/**
 * FeatureCard Component
 * 
 * Displays a feature card with icon, title, and description.
 * Includes hover effects (scale, shadow) and responsive design.
 * Optimized with lazy loading for images below the fold.
 * 
 * @param {Object} props - Component props
 * @param {string} props.icon - Path to the feature icon image
 * @param {string} props.title - Feature title
 * @param {string} props.description - Feature description
 * @param {number} [props.delay=0] - Animation delay in seconds
 * 
 * Requirements: 2.3, 2.4, 6.3, 9.4
 * Performance: 7.2
 */
export default function FeatureCard({ icon, title, description, delay = 0 }) {
  return (
    <div
      className="feature-card card group cursor-pointer"
      data-testid="feature-card"
      tabIndex={0}
      role="article"
      aria-label={`Feature: ${title}`}
      style={{
        animationDelay: `${delay}s`,
        borderRadius: '16px',
        padding: '20px',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        minHeight: '240px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
        e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      onFocus={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
        e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.12)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Feature Icon - Touch-friendly sizing */}
      <div 
        className="feature-icon-wrapper mb-4 sm:mb-6"
        style={{
          width: '56px',
          height: '56px',
          minWidth: '44px',
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image
          src={icon}
          alt={title}
          width={56}
          height={56}
          className="feature-icon"
          loading="lazy"
          style={{
            width: '56px',
            height: '56px',
            objectFit: 'contain',
          }}
        />
      </div>

      {/* Feature Title - Responsive text */}
      <h3 
        className="text-lg sm:text-xl md:text-xl font-bold mb-2 sm:mb-3"
        style={{
          color: 'var(--text-primary)',
          fontSize: '1.125rem',
          fontWeight: '700',
          marginBottom: '12px',
        }}
      >
        {title}
      </h3>

      {/* Feature Description - Responsive text */}
      <p 
        className="text-sm sm:text-base"
        style={{
          color: 'var(--text-secondary)',
          fontSize: '0.875rem',
          lineHeight: '1.6',
        }}
      >
        {description}
      </p>
    </div>
  );
}
