// Calculate distance between two GPS points using Haversine formula
export function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Check if user is within restaurant radius
// restaurantLocation should be an object with { lat, lng, radius, name }
export function checkLocationPermission(restaurantLocation) {
  return new Promise((resolve, reject) => {
    // Validate restaurant location data
    if (!restaurantLocation || !restaurantLocation.lat || !restaurantLocation.lng) {
      reject({ 
        code: "NO_RESTAURANT_LOCATION", 
        message: "Restaurant location not configured. Please contact the restaurant." 
      });
      return;
    }

    if (!navigator.geolocation) {
      reject({ code: "NOT_SUPPORTED", message: "Geolocation not supported" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const distance = getDistance(
          latitude,
          longitude,
          restaurantLocation.lat,
          restaurantLocation.lng
        );

        const radius = restaurantLocation.radius || 100; // Default 100m if not specified

        resolve({
          allowed: distance <= radius,
          distance: Math.round(distance),
          accuracy: Math.round(accuracy),
          userLat: latitude,
          userLng: longitude,
          requiredRadius: radius,
        });
      },
      (error) => {
        let message = "Location error";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "Location permission denied";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Location unavailable";
            break;
          case error.TIMEOUT:
            message = "Location request timed out";
            break;
        }
        reject({ code: error.code, message });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}
