// OrderZap Design System - Mobile First, Aesthetic, Simple

export const spacing = {
  xs: '8px',   // 0.5rem - tight spacing
  sm: '16px',  // 1rem - default spacing
  md: '24px',  // 1.5rem - section spacing
  lg: '32px',  // 2rem - large spacing
};

export const radius = {
  sm: '8px',   // buttons, inputs
  md: '12px',  // cards
  lg: '16px',  // modals
  full: '999px', // pills
};

export const typography = {
  xs: '12px',   // captions, labels
  sm: '14px',   // body, secondary
  base: '16px', // body, primary
  lg: '20px',   // subheadings
  xl: '24px',   // headings
  xxl: '32px',  // page titles
};

export const colors = {
  // Monochrome base
  black: '#000000',
  white: '#ffffff',
  gray: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    900: '#171717',
  },
  // Functional colors
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
};

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
};

export const animations = {
  // Only 2 animations - that's it
  fade: 'fade-in 0.2s ease-out',
  slide: 'slide-up 0.3s ease-out',
};
