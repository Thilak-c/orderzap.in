/**
 * Theme Utility Functions
 * Provides color manipulation and theme management for image-based theming system
 */

/**
 * Default theme colors used as fallback values
 */
export const DEFAULT_THEME = {
  bg: "#ffffff",
  primary: "#3b82f6",
  secondary: "#8b5cf6",
  accent: "#ec4899",
  text: "#1a1a1a"
};

/**
 * Calculate relative luminance for a color using WCAG formula
 * @param {string} hexColor - Hex color string (e.g., "#ff5733" or "ff5733")
 * @returns {number} Luminance value between 0 and 1
 */
export function getLuminance(hexColor) {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  // Apply WCAG formula for relative luminance
  // Convert to linear RGB values
  const rLinear = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gLinear = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bLinear = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
  
  // Calculate relative luminance
  const luminance = 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  
  return luminance;
}

/**
 * Determine if a color is light or dark based on luminance
 * @param {string} hexColor - Hex color string
 * @returns {boolean} True if light (luminance > 0.5), false if dark
 */
export function isLightColor(hexColor) {
  return getLuminance(hexColor) > 0.5;
}

/**
 * Calculate contrast ratio between two colors for WCAG compliance
 * @param {string} color1 - First hex color
 * @param {string} color2 - Second hex color
 * @returns {number} Contrast ratio (1 to 21)
 */
export function calculateContrastRatio(color1, color2) {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  
  // WCAG formula: (lighter + 0.05) / (darker + 0.05)
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get appropriate text color for a given background color
 * Ensures WCAG AA compliance (4.5:1 contrast ratio minimum)
 * @param {string} backgroundColor - Background hex color
 * @returns {string} Text color (dark for light backgrounds, light for dark backgrounds)
 */
export function getTextColor(backgroundColor) {
  const darkText = "#000000";  // Pure black for maximum contrast
  const lightText = "#ffffff"; // Pure white for maximum contrast
  
  // Calculate contrast ratios for both options
  const darkContrast = calculateContrastRatio(backgroundColor, darkText);
  const lightContrast = calculateContrastRatio(backgroundColor, lightText);
  
  // Choose the option with higher contrast
  // If both meet WCAG AA (4.5:1), prefer based on luminance
  if (darkContrast >= 4.5 && lightContrast >= 4.5) {
    // Both meet standard, use luminance-based decision
    return isLightColor(backgroundColor) ? darkText : lightText;
  } else if (darkContrast >= 4.5) {
    return darkText;
  } else if (lightContrast >= 4.5) {
    return lightText;
  } else {
    // Neither meets standard, use the one with higher contrast
    return darkContrast > lightContrast ? darkText : lightText;
  }
}

/**
 * Map extracted colors to theme CSS variable names
 * @param {Object} colors - Extracted colors object
 * @param {string} colors.dominant - Dominant color from image
 * @param {string} colors.muted - Muted color from image
 * @param {string} colors.darkVibrant - Dark vibrant color from image
 * @param {string} colors.lightVibrant - Light vibrant color from image
 * @returns {Object} Theme colors mapped to CSS variable names
 */
export function mapColorsToTheme(colors) {
  const bg = colors.lightVibrant; // Use lightest color for background
  const primary = colors.darkVibrant; // Use darkest color for primary elements
  const secondary = colors.muted;
  const accent = colors.dominant;
  const text = colors.lightVibrant; // Use lightest color for text
  
  return {
    bg,
    primary,
    secondary,
    accent,
    text
  };
}

/**
 * Apply theme colors to the document by setting CSS custom properties
 * @param {Object} themeColors - Theme colors object
 * @param {string} themeColors.bg - Background color
 * @param {string} themeColors.primary - Primary color
 * @param {string} themeColors.secondary - Secondary color
 * @param {string} themeColors.accent - Accent color
 * @param {string} themeColors.text - Text color
 */
export function applyTheme(themeColors) {
  // Apply each color as a CSS custom property on the document root
  Object.keys(themeColors).forEach(key => {
    document.documentElement.style.setProperty(`--${key}`, themeColors[key]);
  });
}
