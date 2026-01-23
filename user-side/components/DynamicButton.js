'use client';

import { useTheme, getShapeClass, getButtonStyleClass } from '@/lib/useTheme';

export function DynamicButton({ 
  children, 
  variant = 'primary', 
  onClick, 
  className = '',
  ...props 
}) {
  const theme = useTheme();
  const shapeClass = getShapeClass(theme.buttonShape, 'button');
  const styleClass = getButtonStyleClass(theme.buttonStyle, variant);

  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 font-semibold transition-all dynamic-btn ${shapeClass} ${styleClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function DynamicCard({ children, className = '', ...props }) {
  const theme = useTheme();
  const shapeClass = getShapeClass(theme.cardShape, 'card');

  return (
    <div
      className={`p-4 border border-[--border] bg-[--card] dynamic-card ${shapeClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
