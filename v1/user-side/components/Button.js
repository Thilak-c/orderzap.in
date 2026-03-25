export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className = '',
  ...props 
}) {
  const baseClass = 'btn';
  const variantClass = variant === 'primary' ? 'btn-primary' : 'btn-secondary';
  
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
  };
  
  return (
    <button 
      className={`${baseClass} ${variantClass} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
