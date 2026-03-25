/**
 * Manual Test Component for VideoShowcaseSection
 * 
 * This is a visual test component to verify the VideoShowcaseSection works correctly.
 * To test: Import this in a page and render it.
 * 
 * Tests:
 * - Video element renders with correct source
 * - Poster image is set correctly
 * - Lazy loading works (video loads when section enters viewport)
 * - Video controls are present
 * - preload="metadata" attribute is set
 * - Error handling displays fallback when video fails
 * - Responsive video sizing works across devices
 * - Loading state displays while video loads
 * - Section heading and description display correctly
 */

import VideoShowcaseSection from './VideoShowcaseSection';

export default function VideoShowcaseSectionTest() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ padding: '40px 20px', background: 'var(--bg-elevated)' }}>
        <h1 style={{ 
          marginBottom: '16px', 
          color: 'var(--text-primary)',
          fontSize: '2rem',
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          VideoShowcaseSection Component Test
        </h1>
        <p style={{ 
          color: 'var(--text-secondary)', 
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          Scroll down to test lazy loading behavior
        </p>
      </div>

      {/* Spacer to test lazy loading */}
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ 
          padding: '32px', 
          background: 'var(--card)', 
          borderRadius: '12px',
          border: '1px solid var(--border)',
          maxWidth: '600px',
          textAlign: 'center'
        }}>
          <h2 style={{ 
            marginBottom: '16px', 
            color: 'var(--text-primary)',
            fontSize: '1.5rem',
            fontWeight: 'bold'
          }}>
            👇 Scroll Down
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            The video section below should only load when it enters the viewport.
            Watch the network tab to verify lazy loading behavior.
          </p>
        </div>
      </div>

      {/* The actual VideoShowcaseSection component */}
      <VideoShowcaseSection />

      <div style={{ 
        margin: '40px auto', 
        padding: '24px', 
        background: 'var(--card)', 
        borderRadius: '12px',
        maxWidth: '800px',
        border: '1px solid var(--border)'
      }}>
        <h2 style={{ 
          marginBottom: '16px', 
          color: 'var(--text-primary)',
          fontSize: '1.5rem',
          fontWeight: 'bold'
        }}>
          Test Checklist:
        </h2>
        <ul style={{ 
          color: 'var(--text-secondary)', 
          lineHeight: '2',
          listStyle: 'none',
          paddingLeft: '0'
        }}>
          <li>✓ Section renders with heading "See OrderZap in Action"</li>
          <li>✓ Video element has src="/assets/videos/order-flow.mp4"</li>
          <li>✓ Poster image is set to "/assets/images/cooking-poster.jpg"</li>
          <li>✓ Video has controls attribute</li>
          <li>✓ Video has preload="metadata" attribute</li>
          <li>✓ Lazy loading: Video only loads when section enters viewport</li>
          <li>✓ Loading spinner displays while video loads</li>
          <li>✓ Video is responsive (max-width: 900px, centered)</li>
          <li>✓ Video maintains 16:9 aspect ratio</li>
          <li>✓ Error fallback displays if video fails to load</li>
          <li>✓ Poster image shows before video loads</li>
          <li>✓ Section has proper padding and spacing</li>
          <li>✓ Gradient background (white to gray-50)</li>
          <li>✓ Descriptive text below video</li>
        </ul>

        <div style={{ 
          marginTop: '24px', 
          padding: '16px', 
          background: 'var(--bg-elevated)',
          borderRadius: '8px'
        }}>
          <h3 style={{ 
            marginBottom: '12px', 
            color: 'var(--text-primary)',
            fontSize: '1.125rem',
            fontWeight: '600'
          }}>
            Requirements Validated:
          </h3>
          <ul style={{ 
            color: 'var(--text-secondary)', 
            lineHeight: '1.8',
            fontSize: '0.875rem'
          }}>
            <li><strong>Requirement 4.6:</strong> Videos are lazy-loaded to optimize performance</li>
            <li><strong>Requirement 7.2:</strong> Lazy-loads videos that are below the fold</li>
            <li><strong>Requirement 8.3:</strong> Includes video demonstration section</li>
          </ul>
        </div>

        <div style={{ 
          marginTop: '24px', 
          padding: '16px', 
          background: '#FEF3C7',
          borderRadius: '8px',
          border: '1px solid #FCD34D'
        }}>
          <h3 style={{ 
            marginBottom: '12px', 
            color: '#92400E',
            fontSize: '1.125rem',
            fontWeight: '600'
          }}>
            Testing Tips:
          </h3>
          <ul style={{ 
            color: '#78350F', 
            lineHeight: '1.8',
            fontSize: '0.875rem'
          }}>
            <li><strong>Lazy Loading:</strong> Open DevTools Network tab, refresh page, and verify video doesn't load until you scroll to the section</li>
            <li><strong>Error Handling:</strong> Temporarily change video src to invalid path to test error fallback</li>
            <li><strong>Responsive:</strong> Resize browser to test video sizing on mobile, tablet, and desktop</li>
            <li><strong>Loading State:</strong> Throttle network speed in DevTools to see loading spinner</li>
            <li><strong>Accessibility:</strong> Use screen reader to verify aria-labels are present</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
