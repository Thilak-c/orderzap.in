/**
 * BrandLogo Component
 * Displays restaurant name as a styled text logo (similar to OrderZap style)
 * Falls back to image logo if available
 */

export default function BrandLogo({ 
  brandName = "Restaurant", 
  brandLogo = null, 
  className = "h-8",
  textClassName = "text-white font-bold text-xl tracking-wide",
  showText = false
}) {
  // If there's a logo image, show it
  if (brandLogo) {
    return (
      <div className="flex items-center gap-3">
        <img 
          src={brandLogo} 
          alt={brandName} 
          className={`${className} object-cover rounded-full`}
        />
        {showText && (
          <span className={textClassName}>
            {brandName}
          </span>
        )}
      </div>
    );
  }

  // Otherwise show text logo (OrderZap style)
  return (
    <div className={`${className} flex items-center`}>
      <span className={textClassName}>
        {brandName}
      </span>
    </div>
  );
}
