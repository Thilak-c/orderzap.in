// QR Authentication utility
// Manages 30-minute session after QR scan

const QR_SESSION_KEY = 'qr_scan_session';
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

// Generate a random session key
export function generateSessionKey() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789-';
  let key = '';
  for (let i = 0; i < 32; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

export function createQRSession(tableId, sessionKey) {
  const session = {
    tableId: String(tableId),
    sessionKey: sessionKey,
    timestamp: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION
  };
  
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(QR_SESSION_KEY, JSON.stringify(session));
  }
  
  return session;
}

export function getQRSession() {
  if (typeof window === 'undefined') return null;
  
  const sessionData = sessionStorage.getItem(QR_SESSION_KEY);
  if (!sessionData) return null;
  
  try {
    const session = JSON.parse(sessionData);
    
    // Check if session expired
    if (Date.now() > session.expiresAt) {
      clearQRSession();
      return null;
    }
    
    return session;
  } catch (e) {
    clearQRSession();
    return null;
  }
}

export function isQRSessionValid(tableId, sessionKey) {
  const session = getQRSession();
  if (!session) return false;
  
  // Check if session is for the requested table and has matching key
  return session.tableId === String(tableId) && session.sessionKey === sessionKey;
}

export function clearQRSession() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(QR_SESSION_KEY);
  }
}

export function getSessionTimeRemaining() {
  const session = getQRSession();
  if (!session) return 0;
  
  const remaining = session.expiresAt - Date.now();
  return Math.max(0, remaining);
}

export function formatTimeRemaining(milliseconds) {
  const hours = Math.floor(milliseconds / (60 * 60 * 1000));
  const minutes = Math.floor((milliseconds % (60 * 60 * 1000)) / (60 * 1000));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
