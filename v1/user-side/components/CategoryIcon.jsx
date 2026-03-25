"use client";
import { useEffect, useState } from "react";

const cache = new Map();

export default function CategoryIcon({ categoryName, iconState, className = "", ariaLabel }) {
  const iconPath = `/assets/icons/categories/v3/${categoryName}-${iconState}.svg`;
  const [svg, setSvg] = useState(() => cache.get(iconPath) || null);

  useEffect(() => {
    let mounted = true;
    if (cache.has(iconPath)) {
      setSvg(cache.get(iconPath));
      return;
    }

    fetch(iconPath)
      .then((r) => r.text())
      .then((text) => {
        // Remove any explicit fill/width/height attributes to allow CSS control
        let cleaned = text.replace(/\sfill=("|')[^"']*("|')/gi, "");
        cleaned = cleaned.replace(/\swidth=("|')[^"']*("|')/gi, "");
        cleaned = cleaned.replace(/\sheight=("|')[^"']*("|')/gi, "");
        // Ensure the root <svg> has fill="currentColor"
        cleaned = cleaned.replace(/<svg(\s|>)/, (m, g1) => `<svg fill=\"currentColor\"${g1}`);

        cache.set(iconPath, cleaned);
        if (mounted) setSvg(cleaned);
      })
      .catch(() => {
        // on error, leave svg null
      });

    return () => {
      mounted = false;
    };
  }, [iconPath]);

  return (
    <div
      className={`w-14 h-14 ${className} flex items-center justify-center`}
      aria-label={ariaLabel}
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}
