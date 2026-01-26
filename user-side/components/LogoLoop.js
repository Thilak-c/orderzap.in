"use client";
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

export default function LogoLoop({
  logos = [],
  speed = 100,
  direction = 'left',
  logoHeight = 60,
  gap = 60,
  hoverSpeed = 0,
  scaleOnHover = false,
  fadeOut = false,
  fadeOutColor = '#ffffff',
  ariaLabel = 'Partner logos',
}) {
  const containerRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const actualSpeed = isHovered ? hoverSpeed : speed;
    if (actualSpeed === 0) return;

    let animationId;
    let position = 0;
    const contentWidth = container.scrollWidth / 2;

    const animate = () => {
      position += direction === 'left' ? -actualSpeed / 60 : actualSpeed / 60;
      
      if (direction === 'left' && Math.abs(position) >= contentWidth) {
        position = 0;
      } else if (direction === 'right' && position >= 0) {
        position = -contentWidth;
      }

      container.style.transform = `translateX(${position}px)`;
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [speed, direction, hoverSpeed, isHovered]);

  return (
    <div 
      className="relative w-full overflow-hidden"
      style={{ height: `${logoHeight + 20}px` }}
      aria-label={ariaLabel}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        ref={containerRef}
        className="flex items-center absolute"
        style={{ gap: `${gap}px` }}
      >
        {/* Render logos twice for seamless loop */}
        {[...logos, ...logos].map((logo, index) => (
          <div
            key={index}
            className={`flex-shrink-0 transition-transform ${scaleOnHover ? 'hover:scale-110' : ''}`}
            style={{ height: `${logoHeight}px`, width: `${logoHeight}px` }}
          >
            {logo.src ? (
              <a href={logo.href} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
                <Image
                  src={logo.src}
                  alt={logo.alt || 'Partner logo'}
                  width={logoHeight}
                  height={logoHeight}
                  className="h-full w-full object-cover rounded-full grayscale opacity-70 hover:opacity-100 transition-opacity"
                />
              </a>
            ) : logo.node ? (
              <a href={logo.href} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
                <div className="h-full w-full flex items-center justify-center text-4xl">
                  {logo.node}
                </div>
              </a>
            ) : null}
          </div>
        ))}
      </div>

      {/* Fade out edges */}
      {fadeOut && (
        <>
          <div
            className="absolute left-0 top-0 bottom-0 w-32 pointer-events-none z-10"
            style={{
              background: `linear-gradient(to right, ${fadeOutColor}, transparent)`,
            }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-32 pointer-events-none z-10"
            style={{
              background: `linear-gradient(to left, ${fadeOutColor}, transparent)`,
            }}
          />
        </>
      )}
    </div>
  );
}
