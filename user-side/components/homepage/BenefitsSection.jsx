"use client";

import Image from "next/image";

/**
 * BenefitsSection Component
 * 
 * Displays the benefits section highlighting key advantages for restaurant owners.
 * Features 4 benefit cards with icon images, titles, and descriptions.
 * Clean, modern design with smooth animations.
 * 
 * Requirements: 8.2
 */
export default function BenefitsSection() {
  // Define 4 benefits data with icon images
  const benefits = [
    {
      icon: "/assets/icons/benefits/reduce-cost.png",
      title: "Reduce Costs",
      description: "Cut down on printing menus and manual order taking",
    },
    {
      icon: "/assets/icons/benefits/reduce-staff.png",
      title: "Reduce Staff Needs",
      description: "If you have 10 waiters, reduce them by 50% with automated ordering",
    },
    {
      icon: "/assets/icons/benefits/improve-efficiency.png",
      title: "Improve Efficiency",
      description: "Streamline operations with automated order management",
    },
    {
      icon: "/assets/icons/benefits/enhance-experience.png",
      title: "Enhance Experience",
      description: "Delight customers with modern, contactless ordering",
    }
  ];

  return (
    <section 
      className="benefits-section py-16 md:py-24 lg:py-32 px-4 sm:px-6 lg:px-8"
      aria-labelledby="benefits-heading"
      style={{
        backgroundColor: 'var(--bg)',
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Heading */}
        <div className="text-center mb-16 md:mb-20">
          <h2 
            id="benefits-heading"
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4"
            style={{
              color: 'var(--text-primary)',
            }}
          >
            Why Restaurant Owners Love OrderZap
          </h2>
          
          <p 
            className="text-lg md:text-xl max-w-2xl mx-auto"
            style={{
              color: 'var(--text-secondary)',
            }}
          >
            Transform your restaurant with proven results
          </p>
        </div>

        {/* Benefits Grid - Clean 4-column layout */}
        <div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8"
        >
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="benefit-card group"
              data-testid="benefit-card"
              role="article"
              aria-label={`Benefit: ${benefit.title}`}
              style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '32px 24px',
                textAlign: 'center',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                animationDelay: `${index * 0.1}s`,
                cursor: 'default',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(239, 68, 68, 0.15)';
                e.currentTarget.style.borderColor = 'var(--primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              {/* Icon Container */}
              <div 
                className="benefit-icon-container mb-6"
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  margin: '0 auto 24px',
                }}
              >
                <div
                  style={{
                    width: '96px',
                    height: '96px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--bg-elevated)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    transition: 'all 0.3s ease',
                  }}
                  className="group-hover:scale-110"
                >
                  <Image
                    src={benefit.icon}
                    alt={`${benefit.title} icon`}
                    width={64}
                    height={64}
                    className="w-16 h-16 object-contain"
                  />
                </div>
              </div>

              {/* Title */}
              <h3 
                className="text-xl md:text-2xl font-bold mb-3"
                style={{
                  color: 'var(--text-primary)',
                }}
              >
                {benefit.title}
              </h3>

              {/* Description */}
              <p 
                className="text-sm md:text-base leading-relaxed"
                style={{
                  color: 'var(--text-secondary)',
                }}
              >
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
