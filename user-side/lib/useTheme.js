'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useEffect } from 'react';

export function useTheme() {
  const settings = useQuery(api.settings.getAll);

  useEffect(() => {
    if (settings) {
      const root = document.documentElement;
      
      // Apply colors
      const primaryColor = settings.theme_primaryColor || settings.themePrimaryColor || '#000000';
      const backgroundColor = settings.theme_backgroundColor || settings.themeBackgroundColor || '#ffffff';
      const textColor = settings.theme_textColor || settings.themeTextColor || '#000000';
      const borderColor = settings.theme_borderColor || settings.themeBorderColor || '#e5e5e5';
      
      if (primaryColor) {
        root.style.setProperty('--primary', primaryColor);
        root.style.setProperty('--primary-light', lightenColor(primaryColor, 20));
        root.style.setProperty('--primary-dark', darkenColor(primaryColor, 20));
      }
      
      if (backgroundColor) {
        root.style.setProperty('--bg', backgroundColor);
        root.style.setProperty('--bg-deep', backgroundColor);
        root.style.setProperty('--card', backgroundColor);
        const elevated = isLightColor(backgroundColor) 
          ? darkenColor(backgroundColor, 3)
          : lightenColor(backgroundColor, 10);
        root.style.setProperty('--bg-elevated', elevated);
        root.style.setProperty('--card-hover', elevated);
      }
      
      if (textColor) {
        root.style.setProperty('--text-primary', textColor);
        const secondary = adjustOpacity(textColor, 0.7);
        const muted = adjustOpacity(textColor, 0.5);
        const dim = adjustOpacity(textColor, 0.4);
        root.style.setProperty('--text-secondary', secondary);
        root.style.setProperty('--text-muted', muted);
        root.style.setProperty('--text-dim', dim);
      }
      
      if (borderColor) {
        root.style.setProperty('--border', borderColor);
        root.style.setProperty('--border-light', lightenColor(borderColor, 10));
      }

      // Apply button styles
      if (settings.theme_buttonBorderRadius) {
        root.style.setProperty('--button-radius', settings.theme_buttonBorderRadius);
      }
      if (settings.theme_buttonFontSize) {
        root.style.setProperty('--button-font-size', settings.theme_buttonFontSize);
      }
      if (settings.theme_buttonFontWeight) {
        root.style.setProperty('--button-font-weight', settings.theme_buttonFontWeight);
      }
      if (settings.theme_buttonPadding) {
        root.style.setProperty('--button-padding', settings.theme_buttonPadding);
      }

      // Apply card styles
      if (settings.theme_cardBorderRadius) {
        root.style.setProperty('--card-radius', settings.theme_cardBorderRadius);
      }
      if (settings.theme_cardPadding) {
        root.style.setProperty('--card-padding', settings.theme_cardPadding);
      }

      // Apply typography
      if (settings.theme_headingFontSize) {
        root.style.setProperty('--heading-font-size', settings.theme_headingFontSize);
      }
      if (settings.theme_headingFontWeight) {
        root.style.setProperty('--heading-font-weight', settings.theme_headingFontWeight);
      }

      // Apply image styles
      if (settings.theme_imageBorderRadius) {
        root.style.setProperty('--image-radius', settings.theme_imageBorderRadius);
      }

      // Store shape preferences in data attributes for CSS
      const buttonShape = settings.themeButtonShape || 'square';
      const cardShape = settings.themeCardShape || 'square';
      const buttonStyle = settings.theme_buttonStyle || settings.themeButtonStyle || 'solid';
      
      root.setAttribute('data-button-shape', buttonShape);
      root.setAttribute('data-card-shape', cardShape);
      root.setAttribute('data-button-style', buttonStyle);
    }
  }, [settings]);

  return {
    primaryColor: settings?.theme_primaryColor || settings?.themePrimaryColor || '#000000',
    backgroundColor: settings?.theme_backgroundColor || settings?.themeBackgroundColor || '#ffffff',
    textColor: settings?.theme_textColor || settings?.themeTextColor || '#000000',
    borderColor: settings?.theme_borderColor || settings?.themeBorderColor || '#e5e5e5',
    buttonShape: settings?.themeButtonShape || 'square',
    cardShape: settings?.themeCardShape || 'square',
    buttonStyle: settings?.theme_buttonStyle || settings?.themeButtonStyle || 'solid',
    buttonBorderRadius: settings?.theme_buttonBorderRadius || '0px',
    cardBorderRadius: settings?.theme_cardBorderRadius || '0px',
    imageBorderRadius: settings?.theme_imageBorderRadius || '0px',
  };
}

// Helper functions for color manipulation
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function lightenColor(hex, percent) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const amount = Math.round(2.55 * percent);
  const r = Math.min(255, rgb.r + amount);
  const g = Math.min(255, rgb.g + amount);
  const b = Math.min(255, rgb.b + amount);
  
  return rgbToHex(r, g, b);
}

function darkenColor(hex, percent) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const amount = Math.round(2.55 * percent);
  const r = Math.max(0, rgb.r - amount);
  const g = Math.max(0, rgb.g - amount);
  const b = Math.max(0, rgb.b - amount);
  
  return rgbToHex(r, g, b);
}

function isLightColor(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;
  
  // Calculate relative luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5;
}

function adjustOpacity(hex, opacity) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}

// Helper function to get border radius class based on shape
export function getShapeClass(shape, type = 'button') {
  const shapeMap = {
    square: 'rounded-none',
    rounded: type === 'button' ? 'rounded-lg' : 'rounded-xl',
    pill: 'rounded-full'
  };
  return shapeMap[shape] || 'rounded-none';
}

// Helper function to get button style classes
export function getButtonStyleClass(style, variant = 'primary') {
  if (style === 'solid') {
    return variant === 'primary'
      ? 'bg-[--primary] text-white border-2 border-[--primary]'
      : 'bg-[--bg-elevated] text-[--text-primary] border-2 border-[--border]';
  }
  if (style === 'outline') {
    return 'bg-transparent border-2 border-[--primary] text-[--primary]';
  }
  return 'bg-transparent border-2 border-transparent text-[--text-muted] hover:bg-[--bg-elevated]';
}
