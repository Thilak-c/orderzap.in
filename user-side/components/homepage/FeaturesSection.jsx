"use client";
import FeatureCard from "./FeatureCard";

/**
 * FeaturesSection Component
 * 
 * Displays the features section with 5 feature cards showcasing OrderZap's capabilities.
 * Features include QR ordering, digital menus, online payments, table booking, and staff management.
 * Implements responsive grid layout (1 column mobile, 2-3 columns desktop) with staggered entrance animations.
 * 
 * Requirements: 2.1, 2.2, 2.5
 */
export default function FeaturesSection() {
  // Define features data array with 5 features
  const features = [
    {
      icon: "/assets/icons/qr-ordering.png",
      title: "QR Ordering",
      description: "Customers scan, browse, and order instantly from their phones"
    },
    {
      icon: "/assets/icons/digital-menu.png",
      title: "Digital Menus",
      description: "Beautiful, easy-to-update menus with photos and descriptions"
    },
    {
      icon: "/assets/icons/online-payment.png",
      title: "Online Payments",
      description: "Secure payment processing with multiple payment methods"
    },
    {
      icon: "/assets/icons/book-table.png",
      title: "Table Booking",
      description: "Let customers reserve tables online 24/7"
    },
    {
      icon: "/assets/icons/order-online.png",
      title: "Staff Management",
      description: "Streamline operations with staff call buttons and order tracking"
    }
  ];

  return (
    <section 
      className="features-section py-12 sm:py-16 md:py-24 px-4 sm:px-6 md:px-8"
      aria-labelledby="features-heading"
      style={{
        backgroundColor: 'var(--bg)',
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Heading */}
        <h2 
          id="features-heading"
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-3 sm:mb-4 px-4"
          style={{
            color: 'var(--text-primary)',
            marginBottom: '16px',
          }}
        >
          Everything Your Restaurant Needs
        </h2>
        
        {/* Section Subheading */}
        <p 
          className="text-base sm:text-lg md:text-xl text-center mb-8 sm:mb-12 md:mb-16 px-4"
          style={{
            color: 'var(--text-secondary)',
            maxWidth: '700px',
            margin: '0 auto 64px',
          }}
        >
          Powerful features to transform your restaurant operations
        </p>

        {/* Features Grid - Responsive Layout */}
        <div 
          className="features-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8"
          style={{
            display: 'grid',
            gap: '24px',
          }}
        >
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              delay={index * 0.1} // Staggered entrance animations (0.1s increments)
            />
          ))}
        </div>
      </div>
    </section>
  );
}
