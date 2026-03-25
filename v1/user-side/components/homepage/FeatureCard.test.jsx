/**
 * Manual Test Component for FeatureCard
 * 
 * This is a visual test component to verify the FeatureCard works correctly.
 * To test: Import this in a page and render it.
 * 
 * Tests:
 * - Component renders with icon, title, and description
 * - Hover effects work (scale, shadow)
 * - Touch-friendly sizing on mobile (min 44x44px)
 * - Border-radius is 16px
 * - Uses design system colors
 */

import FeatureCard from './FeatureCard';

export default function FeatureCardTest() {
  const testFeatures = [
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
    }
  ];

  return (
    <div style={{ padding: '40px', background: 'var(--bg)' }}>
      <h1 style={{ marginBottom: '32px', color: 'var(--text-primary)' }}>
        FeatureCard Component Test
      </h1>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        maxWidth: '1200px'
      }}>
        {testFeatures.map((feature, index) => (
          <FeatureCard
            key={index}
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
            delay={index * 0.1}
          />
        ))}
      </div>

      <div style={{ marginTop: '40px', padding: '20px', background: 'var(--card)', borderRadius: '8px' }}>
        <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Test Checklist:</h2>
        <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>
          <li>✓ Component renders with icon, title, and description</li>
          <li>✓ Hover over cards to see scale and shadow effects</li>
          <li>✓ Icon size is 64x64px (min 44x44px for touch)</li>
          <li>✓ Border-radius is 16px</li>
          <li>✓ Uses design system colors (--text-primary, --text-secondary, --card, --border)</li>
          <li>✓ Responsive on mobile (test by resizing browser)</li>
        </ul>
      </div>
    </div>
  );
}
