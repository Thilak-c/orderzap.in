// Utility helpers for logo URLs and paths

/**
 * Given a restaurant object (from Convex) and its short id,
 * return the square favicon URL to use throughout the app.
 *
 * Priority order:
 *   1. restaurant.favicon_url (new db field)
 *   2. restaurant.logo_url (legacy field)
 *   3. computed `/api/logo/<id>/favicon.webp`
 *   4. default OrderZap icon
 */
export function squareLogoUrl(restaurant, restaurantId) {
  if (restaurant) {
    if (restaurant.favicon_url) return restaurant.favicon_url;
    if (restaurant.logo_url) return restaurant.logo_url; // legacy
  }
  if (restaurantId) return `/api/logo/${restaurantId}/favicon.webp`;
  return `/assets/logos/s-logo-sq.webp`;
}

/**
 * Return the full-width logo URL.
 * Falls back to square favicon if full logo not present.
 */
export function fullLogoUrl(restaurant, restaurantId) {
  // Check legacy database fields first (for backward compatibility)
  if (restaurant && (restaurant.full_logo_url || restaurant.fullLogoUrl)) {
    return restaurant.full_logo_url || restaurant.fullLogoUrl;
  }
  // Try filesystem path for full logo
  if (restaurantId) {
    return `/api/logo/${restaurantId}/full_logo.webp`;
  }
  // fall back to square if no dedicated full logo
  return squareLogoUrl(restaurant, restaurantId);
}

/**
 * Favicon URL - circular cropping is done in layout/theme loader.
 */
export function faviconUrl(restaurant, restaurantId) {
  return squareLogoUrl(restaurant, restaurantId);
}
