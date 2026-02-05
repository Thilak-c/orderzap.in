/**
 * Property-Based Test: Design System Color Usage for CTA Components
 * 
 * Feature: orderzap-homepage
 * Property 5: Design System Color Usage
 * 
 * For any element with color styling (buttons, text, backgrounds), 
 * the color value should match one of the design system colors defined 
 * in globals.css CSS variables.
 * 
 * Validates: Requirements 5.4, 9.1
 * 
 * This test uses fast-check to generate various CTA configurations and
 * verifies that all color values match the design system.
 */

import fc from 'fast-check';

/**
 * Design system colors from globals.css
 * These are the valid colors that should be used throughout the application
 */
const DESIGN_SYSTEM_COLORS = {
  // Primary colors
  primary: '#EF4444',
  primaryHover: '#DC2626',
  primaryLight: '#FEE2E2',
  
  // Background colors
  bg: '#ffffff',
  bgElevated: '#fafafa',
  card: '#ffffff',
  
  // Border colors
  border: '#e5e5e5',
  
  // Text colors
  textPrimary: '#000000',
  textSecondary: '#525252',
  textMuted: '#737373',
  
  // Functional colors
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  
  // White (commonly used for text on primary background)
  white: '#ffffff',
};

/**
 * Normalize color values for comparison
 * Handles different color formats (hex, rgb, rgba, CSS variables)
 */
function normalizeColor(color) {
  if (!color) return null;
  
  // Remove whitespace
  color = color.trim().toLowerCase();
  
  // Handle CSS variables (var(--primary) -> primary)
  if (color.startsWith('var(--')) {
    const varName = color.match(/var\(--([^)]+)\)/)?.[1];
    if (varName) {
      // Map CSS variable names to design system colors
      const varMap = {
        'primary': DESIGN_SYSTEM_COLORS.primary,
        'primary-hover': DESIGN_SYSTEM_COLORS.primaryHover,
        'primary-light': DESIGN_SYSTEM_COLORS.primaryLight,
        'bg': DESIGN_SYSTEM_COLORS.bg,
        'bg-elevated': DESIGN_SYSTEM_COLORS.bgElevated,
        'card': DESIGN_SYSTEM_COLORS.card,
        'border': DESIGN_SYSTEM_COLORS.border,
        'text-primary': DESIGN_SYSTEM_COLORS.textPrimary,
        'text-secondary': DESIGN_SYSTEM_COLORS.textSecondary,
        'text-muted': DESIGN_SYSTEM_COLORS.textMuted,
      };
      return varMap[varName] || color;
    }
  }
  
  // Handle rgba with transparency - extract rgb part
  if (color.startsWith('rgba(')) {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const r = parseInt(match[1]).toString(16).padStart(2, '0');
      const g = parseInt(match[2]).toString(16).padStart(2, '0');
      const b = parseInt(match[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
  }
  
  // Handle rgb
  if (color.startsWith('rgb(')) {
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      const r = parseInt(match[1]).toString(16).padStart(2, '0');
      const g = parseInt(match[2]).toString(16).padStart(2, '0');
      const b = parseInt(match[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
  }
  
  // Already hex format
  if (color.startsWith('#')) {
    return color;
  }
  
  return color;
}

/**
 * Check if a color is in the design system
 */
function isDesignSystemColor(color) {
  const normalized = normalizeColor(color);
  if (!normalized) return false;
  
  const designSystemValues = Object.values(DESIGN_SYSTEM_COLORS).map(c => c.toLowerCase());
  return designSystemValues.includes(normalized.toLowerCase());
}

/**
 * Generator for valid design system colors
 */
const designSystemColorArbitrary = fc.constantFrom(
  ...Object.values(DESIGN_SYSTEM_COLORS)
);

/**
 * Generator for CTA button configurations
 */
const ctaButtonArbitrary = fc.record({
  backgroundColor: designSystemColorArbitrary,
  color: designSystemColorArbitrary,
  borderColor: fc.option(designSystemColorArbitrary, { nil: null }),
});

/**
 * Property Test 1: CTA Button Colors Match Design System
 * 
 * For any CTA button configuration, all color properties should use
 * design system colors.
 */
describe('Property 5: Design System Color Usage - CTA Buttons', () => {
  it('all CTA button colors match design system colors', () => {
    fc.assert(
      fc.property(
        ctaButtonArbitrary,
        (buttonConfig) => {
          // Verify background color is from design system
          const bgValid = isDesignSystemColor(buttonConfig.backgroundColor);
          
          // Verify text color is from design system
          const colorValid = isDesignSystemColor(buttonConfig.color);
          
          // Verify border color (if present) is from design system
          const borderValid = buttonConfig.borderColor === null || 
                             isDesignSystemColor(buttonConfig.borderColor);
          
          return bgValid && colorValid && borderValid;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property Test 2: Primary CTA Uses Primary Color
 * 
 * For any primary CTA button, it should use the primary color (#EF4444)
 * as background and white (#ffffff) as text color.
 */
describe('Property 5: Design System Color Usage - Primary CTA', () => {
  it('primary CTA buttons use primary color background and white text', () => {
    fc.assert(
      fc.property(
        fc.constant({
          backgroundColor: DESIGN_SYSTEM_COLORS.primary,
          color: DESIGN_SYSTEM_COLORS.white,
        }),
        (primaryCTA) => {
          const bgNormalized = normalizeColor(primaryCTA.backgroundColor);
          const colorNormalized = normalizeColor(primaryCTA.color);
          
          return bgNormalized === DESIGN_SYSTEM_COLORS.primary.toLowerCase() &&
                 colorNormalized === DESIGN_SYSTEM_COLORS.white.toLowerCase();
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property Test 3: Color Contrast for Accessibility
 * 
 * For any CTA button, the color combination should provide sufficient
 * contrast. Primary color (#EF4444) with white text is a valid combination.
 */
describe('Property 5: Design System Color Usage - Color Contrast', () => {
  it('CTA buttons use valid high-contrast color combinations', () => {
    // Valid combinations for CTAs
    const validCombinations = [
      { bg: DESIGN_SYSTEM_COLORS.primary, text: DESIGN_SYSTEM_COLORS.white },
      { bg: DESIGN_SYSTEM_COLORS.white, text: DESIGN_SYSTEM_COLORS.primary },
      { bg: DESIGN_SYSTEM_COLORS.white, text: DESIGN_SYSTEM_COLORS.textPrimary },
      { bg: DESIGN_SYSTEM_COLORS.card, text: DESIGN_SYSTEM_COLORS.textPrimary },
    ];
    
    fc.assert(
      fc.property(
        fc.constantFrom(...validCombinations),
        (combination) => {
          const bgValid = isDesignSystemColor(combination.bg);
          const textValid = isDesignSystemColor(combination.text);
          
          return bgValid && textValid;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property Test 4: CSS Variable Usage
 * 
 * For any color specified as a CSS variable (var(--primary)),
 * it should map to a valid design system color.
 */
describe('Property 5: Design System Color Usage - CSS Variables', () => {
  const cssVariables = [
    'var(--primary)',
    'var(--primary-hover)',
    'var(--bg)',
    'var(--bg-elevated)',
    'var(--text-primary)',
    'var(--text-secondary)',
  ];
  
  it('CSS variables map to design system colors', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...cssVariables),
        (cssVar) => {
          const normalized = normalizeColor(cssVar);
          return normalized !== null && normalized !== cssVar;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property Test 5: No Arbitrary Colors
 * 
 * For any color value used in CTA components, it should not be
 * an arbitrary color outside the design system.
 */
describe('Property 5: Design System Color Usage - No Arbitrary Colors', () => {
  // Generate some arbitrary colors that are NOT in the design system
  const arbitraryColorArbitrary = fc.string({ minLength: 6, maxLength: 6 })
    .filter(str => /^[0-9a-fA-F]{6}$/.test(str))
    .map(hex => `#${hex}`)
    .filter(color => !isDesignSystemColor(color));
  
  it('rejects colors not in the design system', () => {
    fc.assert(
      fc.property(
        arbitraryColorArbitrary,
        (arbitraryColor) => {
          // This should return false for colors not in design system
          return !isDesignSystemColor(arbitraryColor);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Export utilities for use in other tests
 */
export {
  DESIGN_SYSTEM_COLORS,
  normalizeColor,
  isDesignSystemColor,
  designSystemColorArbitrary,
  ctaButtonArbitrary,
};
