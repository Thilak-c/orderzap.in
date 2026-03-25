'use client';

import React from 'react';
import Image from 'next/image';

/**
 * HowItWorksSection Component
 * 
 * Displays a 4-step process explaining how OrderZap works for restaurant owners.
 * Each step includes a number, icon, title, and description with animations.
 * Optimized with lazy loading for images below the fold.
 * 
 * Requirements: 8.1
 * Performance: 7.2
 */
export default function HowItWorksSection() {
  // Define the 4-step process data
  const steps = [
    {
      number: "1",
      title: "Sign Up",
      description: "Create your restaurant account in minutes",
      icon: "/assets/icons/order-online.png"
    },
    {
      number: "2",
      title: "Set Up Menu",
      description: "Add your dishes with photos and prices",
      icon: "/assets/icons/digital-menu.png"
    },
    {
      number: "3",
      title: "Generate QR Codes",
      description: "Get unique QR codes for each table",
      icon: "/assets/icons/qr-ordering.png"
    },
    {
      number: "4",
      title: "Start Receiving Orders",
      description: "Customers order and pay directly from their phones",
      icon: "/assets/icons/online-payment.png"
    }
  ];

  return (
    <section 
      className="how-it-works-section py-12 sm:py-16 md:py-24 px-4 sm:px-6 bg-white"
      aria-labelledby="how-it-works-heading"
    >
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <h2 
            id="how-it-works-heading"
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-black mb-3 sm:mb-4"
          >
            How It Works
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-4">
            Get started with OrderZap in four simple steps
          </p>
        </div>

        {/* Steps Container - Responsive Grid */}
        <div className="steps-container grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 md:gap-6">
          {steps.map((step, index) => (
            <div 
              key={index} 
              className="step-card text-center opacity-0 animate-fade-slide-up px-4 sm:px-2"
              tabIndex={0}
              role="article"
              aria-label={`Step ${step.number}: ${step.title}`}
              style={{ animationDelay: `${index * 0.15}s`, animationFillMode: 'forwards' }}
            >
              {/* Step Number with Spring Animation - Touch-friendly size */}
              <div 
                className="step-number inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-50 text-red-500 text-xl sm:text-2xl font-bold mb-4 sm:mb-6 opacity-0 animate-number-spring"
                style={{ 
                  animationDelay: `${index * 0.15 + 0.2}s`, 
                  animationFillMode: 'forwards',
                  minWidth: '44px',
                  minHeight: '44px'
                }}
              >
                {step.number}
              </div>

              {/* Step Icon - Responsive sizing */}
              <div className="step-icon mb-3 sm:mb-4 flex justify-center">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20">
                  <Image
                    src={step.icon}
                    alt={step.title}
                    fill
                    className="object-contain"
                    loading="lazy"
                    sizes="(max-width: 640px) 64px, 80px"
                  />
                </div>
              </div>

              {/* Step Title - Responsive text */}
              <h3 className="text-lg sm:text-xl md:text-xl font-semibold text-black mb-2 sm:mb-3">
                {step.title}
              </h3>

              {/* Step Description - Responsive text */}
              <p className="text-sm sm:text-sm md:text-base text-gray-600 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
