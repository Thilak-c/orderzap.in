/**
 * Manual Test Component for ScrollAnimationWrapper
 * 
 * This is a visual test component to verify the ScrollAnimationWrapper works correctly.
 * To test: Import this in a page and render it.
 * 
 * Tests:
 * - Intersection Observer detects viewport entry
 * - Animation classes are applied when scrolling into view
 * - Browser compatibility fallback works
 * - Threshold configuration works correctly
 * - Different animation types work
 * 
 * Requirements: 4.1
 */

import ScrollAnimationWrapper from './ScrollAnimationWrapper';

export default function ScrollAnimationWrapperTest() {
  const testSections = [
    {
      title: "Fade In Animation",
      animationClass: "animate-fade-in",
      description: "This section should fade in when scrolled into view"
    },
    {
      title: "Slide Up Animation",
      animationClass: "animate-slide-up",
      description: "This section should slide up when scrolled into view"
    },
    {
      title: "Slide Down Animation",
      animationClass: "animate-slide-down",
      description: "This section should slide down when scrolled into view"
    },
    {
      title: "Bounce In Animation",
      animationClass: "animate-bounce-in",
      description: "This section should bounce in when scrolled into view"
    },
    {
      title: "Scale In Animation",
      animationClass: "animate-scale-in",
      description: "This section should scale in when scrolled into view"
    },
    {
      title: "Custom Threshold (0.5)",
      animationClass: "animate-fade-in",
      description: "This section uses a higher threshold (0.5) - needs to be 50% visible",
      threshold: 0.5
    }
  ];

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header - Always visible */}
      <div style={{ 
        padding: '40px', 
        background: 'var(--card)', 
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <h1 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>
          ScrollAnimationWrapper Component Test
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Scroll down to see animations trigger as sections enter the viewport
        </p>
        <div style={{ 
          padding: '16px', 
          background: 'var(--bg-elevated)', 
          borderRadius: '8px',
          fontSize: '14px',
          color: 'var(--text-secondary)'
        }}>
          <strong style={{ color: 'var(--text-primary)' }}>Test Checklist:</strong>
          <ul style={{ marginTop: '8px', lineHeight: '1.8' }}>
            <li>✓ Sections are initially invisible (opacity: 0)</li>
            <li>✓ Animations trigger when scrolling sections into view</li>
            <li>✓ Each section uses a different animation type</li>
            <li>✓ Animations only trigger once (not on scroll up)</li>
            <li>✓ Default threshold is 0.2 (20% visible)</li>
            <li>✓ Custom threshold works (test section 6)</li>
            <li>✓ Fallback works in browsers without IntersectionObserver</li>
          </ul>
        </div>
      </div>

      {/* Spacer to ensure scrolling is needed */}
      <div style={{ height: '50vh' }} />

      {/* Test Sections */}
      {testSections.map((section, index) => (
        <div key={index}>
          <ScrollAnimationWrapper 
            animationClass={section.animationClass}
            threshold={section.threshold}
          >
            <div style={{
              margin: '40px auto',
              maxWidth: '800px',
              padding: '60px 40px',
              background: 'var(--card)',
              border: '2px solid var(--border)',
              borderRadius: '16px',
              textAlign: 'center'
            }}>
              <h2 style={{ 
                fontSize: '2rem', 
                marginBottom: '16px', 
                color: 'var(--primary)' 
              }}>
                {section.title}
              </h2>
              <p style={{ 
                fontSize: '1.1rem', 
                color: 'var(--text-secondary)',
                lineHeight: '1.6'
              }}>
                {section.description}
              </p>
              <div style={{
                marginTop: '24px',
                padding: '12px 24px',
                background: 'var(--bg-elevated)',
                borderRadius: '8px',
                display: 'inline-block',
                fontSize: '14px',
                color: 'var(--text-muted)'
              }}>
                Animation Class: <code style={{ 
                  color: 'var(--primary)', 
                  fontWeight: 'bold' 
                }}>{section.animationClass}</code>
                {section.threshold && (
                  <span> | Threshold: <code style={{ 
                    color: 'var(--primary)', 
                    fontWeight: 'bold' 
                  }}>{section.threshold}</code></span>
                )}
              </div>
            </div>
          </ScrollAnimationWrapper>
          
          {/* Spacer between sections */}
          <div style={{ height: '30vh' }} />
        </div>
      ))}

      {/* Footer */}
      <div style={{ 
        padding: '40px', 
        background: 'var(--card)', 
        borderTop: '1px solid var(--border)',
        textAlign: 'center',
        color: 'var(--text-secondary)'
      }}>
        <p>End of ScrollAnimationWrapper Test</p>
        <p style={{ marginTop: '8px', fontSize: '14px' }}>
          Scroll back up to see that animations don't re-trigger
        </p>
      </div>
    </div>
  );
}
