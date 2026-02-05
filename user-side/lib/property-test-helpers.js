/**
 * Property-Based Testing Helpers for OrderZap Homepage
 * 
 * This module provides reusable generators, assertion helpers, and utilities
 * for property-based testing with fast-check.
 * 
 * Usage:
 *   import { featureArbitrary, assertHasRequiredStructure } from '@/lib/property-test-helpers';
 *   
 *   fc.assert(
 *     fc.property(featureArbitrary, (feature) => {
 *       return assertHasRequiredStructure(feature, ['icon', 'title', 'description']);
 *     }),
 *     { numRuns: 100 }
 *   );
 */

import fc from 'fast-check';

// ============================================================================
// DESIGN SYSTEM CONSTANTS
// ============================================================================

/**
 * Design system colors from globals.css
 * These are the valid colors that should be used throughout the application
 */
export const DESIGN_SYSTEM_COLORS = {
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
 * Valid animation classes from globals.css
 */
export const ANIMATION_CLASSES = [
  'animate-fade-in',
  'animate-slide-up',
  'animate-slide-down',
  'animate-bounce-in',
  'animate-scale-in',
  'animate-float',
  'animate-pulse-soft',
  'animate-wave-flow',
  'animate-number-spring',
  'animate-fade-slide-up',
];

/**
 * Valid border-radius values from design system
 */
export const BORDER_RADII = ['8px', '12px', '16px', '24px'];

/**
 * Valid asset directories
 */
export const ASSET_PATHS = {
  icons: '/assets/icons/',
  partners: '/assets/partners/',
  logos: '/assets/logos/',
  videos: '/assets/videos/',
  images: '/assets/images/',
  gifs: '/assets/gifs/',
};

// ============================================================================
// GENERATORS (ARBITRARIES)
// ============================================================================

/**
 * Generator for valid design system colors
 */
export const designSystemColorArbitrary = fc.constantFrom(
  ...Object.values(DESIGN_SYSTEM_COLORS)
);

/**
 * Generator for valid animation classes
 */
export const animationClassArbitrary = fc.constantFrom(...ANIMATION_CLASSES);

/**
 * Generator for valid border-radius values
 */
export const borderRadiusArbitrary = fc.constantFrom(...BORDER_RADII);

/**
 * Generator for feature card data
 * 
 * Generates feature objects with icon, title, and description
 */
export const featureArbitrary = fc.record({
  icon: fc.constantFrom(
    '/assets/icons/qr-ordering.png',
    '/assets/icons/digital-menu.png',
    '/assets/icons/online-payment.png',
    '/assets/icons/book-table.png',
    '/assets/icons/order-online.png',
    '/assets/icons/qr-scan.png',
    '/assets/icons/search-food.png',
    '/assets/icons/takeaway-order.png'
  ),
  title: fc.string({ minLength: 3, maxLength: 50 }),
  description: fc.string({ minLength: 10, maxLength: 200 }),
});

/**
 * Generator for process step data
 * 
 * Generates step objects with number, title, description, and icon
 */
export const processStepArbitrary = fc.record({
  number: fc.integer({ min: 1, max: 10 }).map(n => n.toString()),
  title: fc.string({ minLength: 3, maxLength: 50 }),
  description: fc.string({ minLength: 10, maxLength: 200 }),
  icon: fc.constantFrom(
    '/assets/icons/qr-ordering.png',
    '/assets/icons/digital-menu.png',
    '/assets/icons/online-payment.png',
    '/assets/icons/order-online.png'
  ),
});

/**
 * Generator for benefit data
 * 
 * Generates benefit objects with title, description, and icon (emoji)
 */
export const benefitArbitrary = fc.record({
  title: fc.string({ minLength: 3, maxLength: 50 }),
  description: fc.string({ minLength: 10, maxLength: 200 }),
  icon: fc.constantFrom('📈', '💰', '⚡', '✨', '🎯', '🚀', '💡', '🎉'),
});

/**
 * Generator for partner logo data
 */
export const partnerLogoArbitrary = fc.record({
  logo: fc.constantFrom(
    '/assets/partners/bts-disc-cafe-and-restro.png',
    '/assets/partners/manget-club-and-restro.png'
  ),
  name: fc.string({ minLength: 3, maxLength: 50 }),
});

/**
 * Generator for CTA button configurations
 */
export const ctaButtonArbitrary = fc.record({
  backgroundColor: designSystemColorArbitrary,
  color: designSystemColorArbitrary,
  borderColor: fc.option(designSystemColorArbitrary, { nil: null }),
  href: fc.constantFrom('/signup', '/demo', '/r/demo', '/signup/new'),
  text: fc.string({ minLength: 3, maxLength: 30 }),
});

/**
 * Generator for touch-friendly dimensions (minimum 44x44px)
 */
export const touchFriendlyDimensionsArbitrary = fc.record({
  width: fc.integer({ min: 44, max: 300 }),
  height: fc.integer({ min: 44, max: 100 }),
});

/**
 * Generator for image data with alt text
 */
export const imageArbitrary = fc.record({
  src: fc.oneof(
    fc.constantFrom(
      '/assets/icons/qr-ordering.png',
      '/assets/logos/logo_full.png',
      '/assets/partners/bts-disc-cafe-and-restro.png'
    ),
    fc.string({ minLength: 10, maxLength: 100 }).map(s => `/assets/images/${s}.jpg`)
  ),
  alt: fc.string({ minLength: 3, maxLength: 100 }),
});

/**
 * Generator for ARIA label data
 */
export const ariaLabelArbitrary = fc.record({
  'aria-label': fc.string({ minLength: 3, maxLength: 100 }),
});

// ============================================================================
// COLOR UTILITIES
// ============================================================================

/**
 * Normalize color values for comparison
 * Handles different color formats (hex, rgb, rgba, CSS variables)
 * 
 * @param {string} color - Color value to normalize
 * @returns {string|null} - Normalized color in hex format or null
 */
export function normalizeColor(color) {
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
 * 
 * @param {string} color - Color value to check
 * @returns {boolean} - True if color is in design system
 */
export function isDesignSystemColor(color) {
  const normalized = normalizeColor(color);
  if (!normalized) return false;
  
  const designSystemValues = Object.values(DESIGN_SYSTEM_COLORS).map(c => c.toLowerCase());
  return designSystemValues.includes(normalized.toLowerCase());
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Assert that an object has all required properties
 * 
 * @param {object} obj - Object to check
 * @param {string[]} requiredProps - Array of required property names
 * @returns {boolean} - True if all properties exist
 */
export function assertHasRequiredStructure(obj, requiredProps) {
  if (!obj || typeof obj !== 'object') return false;
  return requiredProps.every(prop => prop in obj && obj[prop] !== undefined);
}

/**
 * Assert that a string starts with one of the valid prefixes
 * 
 * @param {string} str - String to check
 * @param {string[]} validPrefixes - Array of valid prefixes
 * @returns {boolean} - True if string starts with a valid prefix
 */
export function assertStartsWithValidPrefix(str, validPrefixes) {
  if (typeof str !== 'string') return false;
  return validPrefixes.some(prefix => str.startsWith(prefix));
}

/**
 * Assert that a value is one of the valid values
 * 
 * @param {any} value - Value to check
 * @param {any[]} validValues - Array of valid values
 * @returns {boolean} - True if value is in valid values
 */
export function assertIsValidValue(value, validValues) {
  return validValues.includes(value);
}

/**
 * Assert that an animation class is valid
 * 
 * @param {string} className - Class name to check
 * @returns {boolean} - True if class is a valid animation class
 */
export function assertIsValidAnimationClass(className) {
  if (typeof className !== 'string') return false;
  
  // Check if it's one of the predefined animation classes
  if (ANIMATION_CLASSES.includes(className)) return true;
  
  // Check if it contains an animation class (for multiple classes)
  const classes = className.split(' ');
  return classes.some(cls => ANIMATION_CLASSES.includes(cls));
}

/**
 * Assert that a border-radius value is valid
 * 
 * @param {string} borderRadius - Border radius value to check
 * @returns {boolean} - True if border radius is valid
 */
export function assertIsValidBorderRadius(borderRadius) {
  if (typeof borderRadius !== 'string') return false;
  return BORDER_RADII.includes(borderRadius);
}

/**
 * Assert that dimensions meet touch-friendly requirements (44x44px minimum)
 * 
 * @param {object} dimensions - Object with width and height properties
 * @returns {boolean} - True if dimensions are touch-friendly
 */
export function assertIsTouchFriendly(dimensions) {
  if (!dimensions || typeof dimensions !== 'object') return false;
  const { width, height } = dimensions;
  return width >= 44 && height >= 44;
}

/**
 * Assert that an image has alt text
 * 
 * @param {object} image - Image object with src and alt properties
 * @returns {boolean} - True if image has alt text
 */
export function assertHasAltText(image) {
  if (!image || typeof image !== 'object') return false;
  return 'alt' in image && typeof image.alt === 'string';
}

/**
 * Assert that an element has ARIA label
 * 
 * @param {object} element - Element object with aria-label property
 * @returns {boolean} - True if element has aria-label
 */
export function assertHasAriaLabel(element) {
  if (!element || typeof element !== 'object') return false;
  return 'aria-label' in element && typeof element['aria-label'] === 'string' && element['aria-label'].length > 0;
}

// ============================================================================
// DOM QUERY HELPERS
// ============================================================================

/**
 * Query all elements with a specific test ID
 * 
 * @param {HTMLElement} container - Container element to query
 * @param {string} testId - Test ID to search for
 * @returns {HTMLElement[]} - Array of matching elements
 */
export function queryAllByTestId(container, testId) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(`[data-testid="${testId}"]`));
}

/**
 * Query element by test ID
 * 
 * @param {HTMLElement} container - Container element to query
 * @param {string} testId - Test ID to search for
 * @returns {HTMLElement|null} - Matching element or null
 */
export function queryByTestId(container, testId) {
  if (!container) return null;
  return container.querySelector(`[data-testid="${testId}"]`);
}

/**
 * Check if element has required structure (icon, title, description)
 * 
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} - True if element has required structure
 */
export function elementHasRequiredStructure(element) {
  if (!element) return false;
  
  const hasIcon = element.querySelector('img') !== null;
  const hasTitle = element.querySelector('h3') !== null || element.querySelector('h2') !== null;
  const hasDescription = element.querySelector('p') !== null;
  
  return hasIcon && hasTitle && hasDescription;
}

/**
 * Get computed style property value
 * 
 * @param {HTMLElement} element - Element to get style from
 * @param {string} property - CSS property name
 * @returns {string|null} - Property value or null
 */
export function getComputedStyleProperty(element, property) {
  if (!element || typeof window === 'undefined') return null;
  const computed = window.getComputedStyle(element);
  return computed.getPropertyValue(property);
}

/**
 * Check if element has animation class
 * 
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} - True if element has animation class
 */
export function elementHasAnimationClass(element) {
  if (!element || !element.className) return false;
  const classes = element.className.split(' ');
  return classes.some(cls => ANIMATION_CLASSES.includes(cls));
}

// ============================================================================
// TESTING PATTERNS DOCUMENTATION
// ============================================================================

/**
 * PROPERTY TESTING PATTERNS
 * 
 * 1. STRUCTURE VALIDATION
 *    Test that components have required structure across all inputs
 *    
 *    Example:
 *      fc.assert(
 *        fc.property(featureArbitrary, (feature) => {
 *          return assertHasRequiredStructure(feature, ['icon', 'title', 'description']);
 *        }),
 *        { numRuns: 100 }
 *      );
 * 
 * 2. ASSET PATH VALIDATION
 *    Test that asset paths use correct directories
 *    
 *    Example:
 *      fc.assert(
 *        fc.property(featureArbitrary, (feature) => {
 *          return assertStartsWithValidPrefix(feature.icon, ['/assets/icons/']);
 *        }),
 *        { numRuns: 100 }
 *      );
 * 
 * 3. DESIGN SYSTEM CONSISTENCY
 *    Test that colors, animations, and styles match design system
 *    
 *    Example:
 *      fc.assert(
 *        fc.property(designSystemColorArbitrary, (color) => {
 *          return isDesignSystemColor(color);
 *        }),
 *        { numRuns: 100 }
 *      );
 * 
 * 4. ACCESSIBILITY VALIDATION
 *    Test that elements have required accessibility attributes
 *    
 *    Example:
 *      fc.assert(
 *        fc.property(imageArbitrary, (image) => {
 *          return assertHasAltText(image);
 *        }),
 *        { numRuns: 100 }
 *      );
 * 
 * 5. RESPONSIVE DESIGN VALIDATION
 *    Test that interactive elements meet touch-friendly requirements
 *    
 *    Example:
 *      fc.assert(
 *        fc.property(touchFriendlyDimensionsArbitrary, (dimensions) => {
 *          return assertIsTouchFriendly(dimensions);
 *        }),
 *        { numRuns: 100 }
 *      );
 */

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Constants
  DESIGN_SYSTEM_COLORS,
  ANIMATION_CLASSES,
  BORDER_RADII,
  ASSET_PATHS,
  
  // Generators
  designSystemColorArbitrary,
  animationClassArbitrary,
  borderRadiusArbitrary,
  featureArbitrary,
  processStepArbitrary,
  benefitArbitrary,
  partnerLogoArbitrary,
  ctaButtonArbitrary,
  touchFriendlyDimensionsArbitrary,
  imageArbitrary,
  ariaLabelArbitrary,
  
  // Color utilities
  normalizeColor,
  isDesignSystemColor,
  
  // Assertion helpers
  assertHasRequiredStructure,
  assertStartsWithValidPrefix,
  assertIsValidValue,
  assertIsValidAnimationClass,
  assertIsValidBorderRadius,
  assertIsTouchFriendly,
  assertHasAltText,
  assertHasAriaLabel,
  
  // DOM query helpers
  queryAllByTestId,
  queryByTestId,
  elementHasRequiredStructure,
  getComputedStyleProperty,
  elementHasAnimationClass,
};
