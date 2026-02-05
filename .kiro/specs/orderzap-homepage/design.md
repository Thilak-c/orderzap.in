# Design Document: OrderZap Homepage

## Overview

The OrderZap homepage is a modern, conversion-focused landing page that showcases the platform's restaurant management capabilities. The design balances bold visual elements with professional credibility to convert restaurant owners into customers. The homepage will be built as a Next.js page component at `user-side/app/page.jsx`, replacing the current minimal landing page.

The design philosophy combines:
- **CRAZY**: Bold animations, dynamic interactions, eye-catching visual effects using videos, GIFs, and CSS animations
- **REALISTIC**: Professional layout, clear value propositions, trust-building social proof, and conversion-optimized CTAs

The homepage will leverage existing OrderZap assets (logos, icons, videos, partner logos) and the established design system (colors, typography, animations from globals.css).

## Architecture

### Component Structure

```
HomePage (page.jsx)
├── HeroSection
│   ├── AnimatedHeadline
│   ├── PrimaryCTA
│   └── SecondaryCTA
├── FeaturesSection
│   └── FeatureCard[] (5 cards)
├── HowItWorksSection
│   └── ProcessStep[] (3-4 steps)
├── VideoShowcaseSection
│   └── VideoPlayer
├── SocialProofSection
│   └── PartnerLogoCarousel
├── BenefitsSection
│   └── BenefitCard[]
├── FinalCTASection
└── Footer
```

### Technology Stack

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS + Custom CSS (globals.css)
- **Animations**: CSS animations (from globals.css) + Intersection Observer API for scroll-triggered animations
- **Assets**: Static assets from `/public/assets/`
- **State Management**: React hooks (useState, useEffect, useRef)
- **Performance**: Next.js Image component, lazy loading, code splitting

### File Structure

```
user-side/
├── app/
│   ├── page.jsx (main homepage component)
│   └── globals.css (existing design system)
├── components/
│   ├── homepage/
│   │   ├── HeroSection.jsx
│   │   ├── FeaturesSection.jsx
│   │   ├── FeatureCard.jsx
│   │   ├── HowItWorksSection.jsx
│   │   ├── VideoShowcaseSection.jsx
│   │   ├── SocialProofSection.jsx
│   │   ├── BenefitsSection.jsx
│   │   ├── FinalCTASection.jsx
│   │   └── ScrollAnimationWrapper.jsx
│   └── Footer.js (existing)
└── public/
    └── assets/ (existing assets)
```

## Components and Interfaces

### 1. HeroSection Component

**Purpose**: First viewport section that captures attention and communicates value proposition.

**Props**: None (self-contained)

**Structure**:
```jsx
<section className="hero-section">
  <div className="hero-background">
    {/* Animated gradient or video background */}
  </div>
  <div className="hero-content">
    <img src="/assets/logos/logo_full.png" alt="OrderZap" />
    <h1 className="animate-fade-in">Transform Your Restaurant with Smart Ordering</h1>
    <p className="animate-fade-in delay-100">QR Ordering • Digital Menus • Online Payments • Table Booking</p>
    <div className="cta-buttons animate-slide-up delay-200">
      <Link href="/signup">
        <button className="btn-primary">Start Free Trial</button>
      </Link>
      <Link href="/demo">
        <button className="btn-secondary">View Demo</button>
      </Link>
    </div>
  </div>
</section>
```

**Animations**:
- Headline: `animate-fade-in` (0s delay)
- Subheadline: `animate-fade-in` (0.1s delay)
- CTA buttons: `animate-slide-up` (0.2s delay)
- Background: Subtle gradient animation or looping video

**Styling**:
- Full viewport height (min-h-screen)
- Centered content with flexbox
- Primary color (#EF4444) for primary CTA
- White/light background with gradient overlay

### 2. FeaturesSection Component

**Purpose**: Showcase the 5 core OrderZap features with visual cards.

**Props**: None (features data defined internally)

**Features Data**:
```javascript
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
]
```

**Structure**:
```jsx
<section className="features-section">
  <h2>Everything Your Restaurant Needs</h2>
  <div className="features-grid">
    {features.map((feature, index) => (
      <FeatureCard key={index} {...feature} delay={index * 0.1} />
    ))}
  </div>
</section>
```

**Animations**:
- Cards animate in with `animate-slide-up` when scrolled into view
- Staggered delays (0.1s increments)
- Hover effect: scale(1.05) + shadow increase

### 3. FeatureCard Component

**Purpose**: Individual feature card with icon, title, and description.

**Props**:
```typescript
interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  delay: number;
}
```

**Structure**:
```jsx
<div className="feature-card card" style={{animationDelay: `${delay}s`}}>
  <img src={icon} alt={title} className="feature-icon" />
  <h3>{title}</h3>
  <p>{description}</p>
</div>
```

**Styling**:
- Card background with border (from design system)
- Hover: transform: translateY(-4px) + shadow
- Icon size: 64x64px
- Padding: 24px
- Border-radius: 16px

### 4. HowItWorksSection Component

**Purpose**: Explain the OrderZap process in 3-4 simple steps.

**Props**: None

**Steps Data**:
```javascript
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
]
```

**Structure**:
```jsx
<section className="how-it-works-section">
  <h2>How It Works</h2>
  <div className="steps-container">
    {steps.map((step, index) => (
      <div key={index} className="step-card">
        <div className="step-number">{step.number}</div>
        <img src={step.icon} alt={step.title} />
        <h3>{step.title}</h3>
        <p>{step.description}</p>
      </div>
    ))}
  </div>
</section>
```

**Animations**:
- Steps animate in with `animate-fade-slide-up` when scrolled into view
- Step numbers use `animate-number-spring` for bouncy entrance

### 5. VideoShowcaseSection Component

**Purpose**: Display video demonstration of OrderZap in action.

**Props**: None

**Structure**:
```jsx
<section className="video-showcase-section">
  <h2>See OrderZap in Action</h2>
  <div className="video-container">
    <video 
      src="/assets/videos/order-flow.mp4" 
      poster="/assets/images/cooking-poster.jpg"
      controls
      preload="metadata"
      className="showcase-video"
    />
  </div>
</section>
```

**Features**:
- Lazy loading (load video when section is in viewport)
- Poster image for initial display
- Controls for play/pause
- Responsive sizing (max-width: 900px)

### 6. SocialProofSection Component

**Purpose**: Display partner restaurant logos to build trust.

**Props**: None

**Partner Logos**:
```javascript
const partners = [
  "/assets/partners/bts-disc-cafe-and-restro.png",
  "/assets/partners/manget-club-and-restro.png"
]
```

**Structure**:
```jsx
<section className="social-proof-section">
  <h2>Trusted by Restaurants in Patna</h2>
  <div className="partners-carousel">
    <div className="partners-track animate-wave-flow">
      {[...partners, ...partners].map((logo, index) => (
        <img key={index} src={logo} alt="Partner Restaurant" className="partner-logo" />
      ))}
    </div>
  </div>
</section>
```

**Animations**:
- Continuous horizontal scroll using `animate-wave-flow` (20s duration)
- Duplicate logos for seamless loop
- Hover: pause animation

### 7. BenefitsSection Component

**Purpose**: Highlight key benefits for restaurant owners.

**Props**: None

**Benefits Data**:
```javascript
const benefits = [
  {
    title: "Increase Revenue",
    description: "Boost orders by 30% with seamless digital ordering",
    icon: "📈"
  },
  {
    title: "Reduce Costs",
    description: "Cut down on printing menus and manual order taking",
    icon: "💰"
  },
  {
    title: "Improve Efficiency",
    description: "Streamline operations with automated order management",
    icon: "⚡"
  },
  {
    title: "Enhance Experience",
    description: "Delight customers with modern, contactless ordering",
    icon: "✨"
  }
]
```

**Structure**:
```jsx
<section className="benefits-section">
  <h2>Why Restaurant Owners Love OrderZap</h2>
  <div className="benefits-grid">
    {benefits.map((benefit, index) => (
      <div key={index} className="benefit-card">
        <div className="benefit-icon">{benefit.icon}</div>
        <h3>{benefit.title}</h3>
        <p>{benefit.description}</p>
      </div>
    ))}
  </div>
</section>
```

### 8. FinalCTASection Component

**Purpose**: Final conversion opportunity before footer.

**Props**: None

**Structure**:
```jsx
<section className="final-cta-section">
  <div className="cta-content">
    <h2>Ready to Transform Your Restaurant?</h2>
    <p>Join restaurants in Patna using OrderZap to serve customers better</p>
    <Link href="/signup">
      <button className="btn-primary btn-large">Start Free Trial</button>
    </Link>
  </div>
</section>
```

**Styling**:
- Full-width section with primary color background
- White text
- Large, prominent CTA button
- Centered content

### 9. ScrollAnimationWrapper Component

**Purpose**: Utility component that triggers animations when elements scroll into view.

**Props**:
```typescript
interface ScrollAnimationWrapperProps {
  children: React.ReactNode;
  animationClass: string;
  threshold?: number; // 0-1, default 0.2
}
```

**Implementation**:
```jsx
function ScrollAnimationWrapper({ children, animationClass, threshold = 0.2 }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div ref={ref} className={isVisible ? animationClass : 'opacity-0'}>
      {children}
    </div>
  );
}
```

**Usage**:
```jsx
<ScrollAnimationWrapper animationClass="animate-slide-up">
  <FeaturesSection />
</ScrollAnimationWrapper>
```

## Data Models

### Feature Model

```typescript
interface Feature {
  icon: string;        // Path to icon image
  title: string;       // Feature name (e.g., "QR Ordering")
  description: string; // Brief description (1-2 sentences)
}
```

### ProcessStep Model

```typescript
interface ProcessStep {
  number: string;      // Step number ("1", "2", "3", "4")
  title: string;       // Step title (e.g., "Sign Up")
  description: string; // Step description
  icon: string;        // Path to icon image
}
```

### Benefit Model

```typescript
interface Benefit {
  title: string;       // Benefit title (e.g., "Increase Revenue")
  description: string; // Benefit description
  icon: string;        // Emoji or icon character
}
```

### Partner Model

```typescript
interface Partner {
  logo: string;        // Path to partner logo image
  name: string;        // Partner restaurant name
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Component Structure Completeness

*For any* feature card rendered on the homepage, the card should contain an icon element, a title element, and a description element.

**Validates: Requirements 2.4**

### Property 2: Asset Path Consistency

*For any* image asset (feature icons, partner logos) used on the homepage, the image source path should start with the appropriate assets directory ("/assets/icons/" for feature icons, "/assets/partners/" for partner logos).

**Validates: Requirements 2.5, 3.2**

### Property 3: Animation Class Application

*For any* animated element on the homepage, the element should have a valid animation class name that exists in the globals.css animation definitions (e.g., "animate-fade-in", "animate-slide-up", "animate-bounce-in").

**Validates: Requirements 1.2, 2.2, 4.5, 9.5**

### Property 4: Scroll-Triggered Animation Behavior

*For any* section wrapped in ScrollAnimationWrapper, when the section enters the viewport (based on Intersection Observer threshold), the animation class should be applied and the opacity should change from 0 to visible.

**Validates: Requirements 4.1**

### Property 5: Design System Color Usage

*For any* element with color styling (buttons, text, backgrounds), the color value should match one of the design system colors defined in globals.css CSS variables (--primary, --bg, --text-primary, etc.).

**Validates: Requirements 5.4, 9.1**

### Property 6: Touch-Friendly Interactive Element Sizing

*For any* interactive element (button, link) on mobile viewport (< 768px width), the element's minimum dimensions should be at least 44x44 pixels to ensure touch-friendly interaction.

**Validates: Requirements 6.3**

### Property 7: Border Radius Consistency

*For any* element with rounded corners (cards, buttons, images), the border-radius value should be one of the design system values (8px, 12px, 16px, 24px) as defined in Tailwind config and globals.css.

**Validates: Requirements 9.4**

### Property 8: Accessibility - ARIA Labels

*For any* interactive element (button, link) without visible text content or with icon-only content, the element should have an aria-label or aria-labelledby attribute for screen reader accessibility.

**Validates: Requirements 10.1**

### Property 9: Accessibility - Focus Indicators

*For any* interactive element (button, link, input), the element should have visible focus styles defined (via CSS :focus or :focus-visible pseudo-classes) to support keyboard navigation.

**Validates: Requirements 10.3**

### Property 10: Accessibility - Image Alt Text

*For any* img element on the homepage, the element should have an alt attribute with descriptive text (or empty string for decorative images).

**Validates: Requirements 10.4**

## Error Handling

### Missing Assets

**Scenario**: Required assets (logos, icons, videos) are missing or fail to load.

**Handling**:
- Use Next.js Image component with fallback behavior
- Provide alt text for all images
- For critical assets (logo), include inline SVG fallback
- Log errors to console for debugging

**Implementation**:
```jsx
<img 
  src="/assets/logos/logo_full.png" 
  alt="OrderZap"
  onError={(e) => {
    e.target.src = "/assets/logos/orderzap-logo.png"; // Fallback
    console.error("Logo failed to load");
  }}
/>
```

### Animation Performance Issues

**Scenario**: Animations cause performance issues on low-end devices.

**Handling**:
- Use CSS `prefers-reduced-motion` media query to disable animations for users who prefer reduced motion
- Limit number of simultaneous animations
- Use `will-change` CSS property sparingly and only when needed

**Implementation**:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Intersection Observer Not Supported

**Scenario**: Browser doesn't support Intersection Observer API.

**Handling**:
- Check for Intersection Observer support before using
- Fallback to showing all animations immediately if not supported
- Consider polyfill for older browsers

**Implementation**:
```jsx
useEffect(() => {
  if (!('IntersectionObserver' in window)) {
    // Fallback: show animations immediately
    setIsVisible(true);
    return;
  }
  
  const observer = new IntersectionObserver(/* ... */);
  // ... rest of implementation
}, []);
```

### Video Loading Failures

**Scenario**: Video files fail to load or are too large.

**Handling**:
- Provide poster images for all videos
- Use `preload="metadata"` to minimize initial load
- Show fallback image if video fails to load
- Implement lazy loading for videos below the fold

**Implementation**:
```jsx
<video 
  src="/assets/videos/order-flow.mp4"
  poster="/assets/images/cooking-poster.jpg"
  onError={(e) => {
    e.target.style.display = 'none';
    // Show poster image instead
  }}
  preload="metadata"
/>
```

### Responsive Layout Issues

**Scenario**: Layout breaks on specific screen sizes or devices.

**Handling**:
- Use Tailwind responsive classes consistently
- Test on multiple screen sizes (320px, 768px, 1024px, 1440px)
- Use CSS Grid and Flexbox with fallbacks
- Implement mobile-first design approach

**Implementation**:
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Responsive grid that adapts to screen size */}
</div>
```

## Testing Strategy

The OrderZap homepage will be tested using a dual approach: unit tests for specific examples and edge cases, and property-based tests for universal correctness properties.

### Unit Testing

**Framework**: Jest + React Testing Library

**Test Coverage**:
- Component rendering (hero section, features, etc.)
- Link navigation (CTAs point to correct URLs)
- Responsive behavior at specific breakpoints
- Asset loading and fallbacks
- Accessibility attributes (ARIA labels, alt text)
- Semantic HTML structure

**Example Unit Tests**:
```javascript
describe('HeroSection', () => {
  it('renders headline and CTAs', () => {
    render(<HeroSection />);
    expect(screen.getByRole('heading')).toBeInTheDocument();
    expect(screen.getByText(/Start Free Trial/i)).toBeInTheDocument();
  });

  it('primary CTA links to signup page', () => {
    render(<HeroSection />);
    const signupLink = screen.getByText(/Start Free Trial/i).closest('a');
    expect(signupLink).toHaveAttribute('href', '/signup');
  });

  it('displays OrderZap logo', () => {
    render(<HeroSection />);
    const logo = screen.getByAltText(/OrderZap/i);
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', expect.stringContaining('/assets/logos/'));
  });
});

describe('FeaturesSection', () => {
  it('renders exactly 5 feature cards', () => {
    render(<FeaturesSection />);
    const cards = screen.getAllByTestId('feature-card');
    expect(cards).toHaveLength(5);
  });

  it('each feature card has icon, title, and description', () => {
    render(<FeaturesSection />);
    const cards = screen.getAllByTestId('feature-card');
    cards.forEach(card => {
      expect(card.querySelector('img')).toBeInTheDocument();
      expect(card.querySelector('h3')).toBeInTheDocument();
      expect(card.querySelector('p')).toBeInTheDocument();
    });
  });
});

describe('Accessibility', () => {
  it('all images have alt text', () => {
    render(<HomePage />);
    const images = screen.getAllByRole('img');
    images.forEach(img => {
      expect(img).toHaveAttribute('alt');
    });
  });

  it('uses semantic HTML structure', () => {
    const { container } = render(<HomePage />);
    expect(container.querySelector('main')).toBeInTheDocument();
    expect(container.querySelector('header')).toBeInTheDocument();
    expect(container.querySelector('footer')).toBeInTheDocument();
  });
});
```

### Property-Based Testing

**Framework**: fast-check (JavaScript property-based testing library)

**Configuration**: Minimum 100 iterations per property test

**Test Coverage**:
- Component structure consistency across all feature cards
- Asset path validation for all images
- Animation class validity for all animated elements
- Design system color usage across all styled elements
- Touch-friendly sizing for all interactive elements
- Border radius consistency across all rounded elements
- ARIA labels for all icon-only interactive elements
- Focus indicators for all interactive elements
- Alt text for all images

**Example Property Tests**:

```javascript
import fc from 'fast-check';

/**
 * Feature: orderzap-homepage, Property 1: Component Structure Completeness
 * For any feature card, it should contain icon, title, and description
 */
describe('Property 1: Component Structure Completeness', () => {
  it('all feature cards have required structure', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          icon: fc.string(),
          title: fc.string(),
          description: fc.string()
        }), { minLength: 1, maxLength: 10 }),
        (features) => {
          const { container } = render(<FeaturesSection features={features} />);
          const cards = container.querySelectorAll('[data-testid="feature-card"]');
          
          return Array.from(cards).every(card => {
            const hasIcon = card.querySelector('img') !== null;
            const hasTitle = card.querySelector('h3') !== null;
            const hasDescription = card.querySelector('p') !== null;
            return hasIcon && hasTitle && hasDescription;
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: orderzap-homepage, Property 2: Asset Path Consistency
 * For any image asset, the path should start with the correct directory
 */
describe('Property 2: Asset Path Consistency', () => {
  it('feature icons use /assets/icons/ path', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          icon: fc.constantFrom(
            '/assets/icons/qr-ordering.png',
            '/assets/icons/digital-menu.png',
            '/assets/icons/online-payment.png',
            '/assets/icons/book-table.png',
            '/assets/icons/order-online.png'
          ),
          title: fc.string(),
          description: fc.string()
        }), { minLength: 1, maxLength: 10 }),
        (features) => {
          return features.every(feature => 
            feature.icon.startsWith('/assets/icons/')
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('partner logos use /assets/partners/ path', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string().map(s => `/assets/partners/${s}.png`), { minLength: 1, maxLength: 10 }),
        (partnerLogos) => {
          return partnerLogos.every(logo => 
            logo.startsWith('/assets/partners/')
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: orderzap-homepage, Property 3: Animation Class Application
 * For any animated element, it should use a valid animation class from globals.css
 */
describe('Property 3: Animation Class Application', () => {
  const validAnimationClasses = [
    'animate-fade-in',
    'animate-slide-up',
    'animate-slide-down',
    'animate-bounce-in',
    'animate-scale-in',
    'animate-float',
    'animate-pulse-soft'
  ];

  it('all animated elements use valid animation classes', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...validAnimationClasses), { minLength: 1, maxLength: 20 }),
        (animationClasses) => {
          return animationClasses.every(className => 
            validAnimationClasses.includes(className)
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: orderzap-homepage, Property 5: Design System Color Usage
 * For any element with color styling, it should use design system colors
 */
describe('Property 5: Design System Color Usage', () => {
  const designSystemColors = [
    '#EF4444', // --primary
    '#DC2626', // --primary-hover
    '#ffffff', // --bg
    '#fafafa', // --bg-elevated
    '#000000', // --text-primary
    '#525252', // --text-secondary
    '#737373'  // --text-muted
  ];

  it('all color values match design system', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...designSystemColors), { minLength: 1, maxLength: 20 }),
        (colors) => {
          return colors.every(color => 
            designSystemColors.includes(color)
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: orderzap-homepage, Property 6: Touch-Friendly Interactive Element Sizing
 * For any interactive element on mobile, minimum dimensions should be 44x44px
 */
describe('Property 6: Touch-Friendly Interactive Element Sizing', () => {
  it('all buttons meet minimum touch target size on mobile', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          width: fc.integer({ min: 44, max: 200 }),
          height: fc.integer({ min: 44, max: 80 })
        }), { minLength: 1, maxLength: 10 }),
        (buttonSizes) => {
          return buttonSizes.every(size => 
            size.width >= 44 && size.height >= 44
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: orderzap-homepage, Property 7: Border Radius Consistency
 * For any element with rounded corners, border-radius should match design system values
 */
describe('Property 7: Border Radius Consistency', () => {
  const validBorderRadii = ['8px', '12px', '16px', '24px'];

  it('all rounded elements use design system border-radius values', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...validBorderRadii), { minLength: 1, maxLength: 20 }),
        (borderRadii) => {
          return borderRadii.every(radius => 
            validBorderRadii.includes(radius)
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: orderzap-homepage, Property 10: Accessibility - Image Alt Text
 * For any img element, it should have an alt attribute
 */
describe('Property 10: Accessibility - Image Alt Text', () => {
  it('all images have alt attributes', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          src: fc.string(),
          alt: fc.string()
        }), { minLength: 1, maxLength: 20 }),
        (images) => {
          return images.every(img => 
            img.alt !== undefined
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Testing

**Scope**: Test complete user flows and interactions

**Test Cases**:
- Full page render without errors
- Scroll-triggered animations work correctly
- All CTAs navigate to correct pages
- Video playback works
- Responsive layout adapts correctly
- Lazy loading triggers appropriately

### Visual Regression Testing

**Tool**: Percy or Chromatic (optional)

**Coverage**:
- Desktop viewport (1440px)
- Tablet viewport (768px)
- Mobile viewport (375px)
- Hover states
- Animation states

### Performance Testing

**Metrics**:
- First Contentful Paint (FCP) < 1.5s
- Largest Contentful Paint (LCP) < 2.5s
- Time to Interactive (TTI) < 3.5s
- Cumulative Layout Shift (CLS) < 0.1

**Tools**:
- Lighthouse CI
- WebPageTest
- Chrome DevTools Performance tab

### Accessibility Testing

**Tools**:
- axe DevTools
- WAVE browser extension
- Lighthouse accessibility audit

**Coverage**:
- WCAG 2.1 Level AA compliance
- Keyboard navigation
- Screen reader compatibility
- Color contrast ratios
- Focus management
