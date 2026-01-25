# QR Authentication Implementation

## Overview
Secure QR code authentication system with session keys. Users must scan QR codes to get authenticated access with a unique session key.

## How It Works

### 1. QR Code Scanning Flow
**User scans QR code** → Opens `/auth/2` (for table 2)
- Auth page generates unique session key (e.g., `05e68inqbm-nt5mp3-b539mtyn`)
- Creates 30-minute session with table ID and key
- Redirects to `/menu/2?key=05e68inqbm-nt5mp3-b539mtyn`
- Menu validates key and grants access ✅

### 2. Direct URL Access (Blocked)
**User types `/menu/2` directly** → No session key
- Menu page checks for valid session key
- Redirects to home page `/` ❌
- Must scan QR code to get access

### 3. Session Management
- Session created with:
  - Table ID
  - Unique session key (32 characters)
  - Timestamp
  - Expiration time (30 minutes)
- Session stored in `sessionStorage`
- Key passed via URL parameter
- Persists across page refreshes within same tab

### 4. Session Expiry
- Sessions expire after 30 minutes
- When 10 minutes remain, warning popup appears
- When session expires, redirected to auth page
- Session time remaining shown in header (when < 30 minutes left)

## URL Structure

### Authentication Entry Point
- **URL**: `https://your-domain.com/auth/[tableId]`
- **Example**: `https://your-domain.com/auth/2`
- **Behavior**: Generates session key, redirects to menu with key

### Menu Access (With Key)
- **URL**: `https://your-domain.com/menu/[tableId]?key=[sessionKey]`
- **Example**: `https://your-domain.com/menu/2?key=05e68inqbm-nt5mp3-b539mtyn`
- **Behavior**: Validates key, grants access if valid

### Cart Access
- **URL**: `https://your-domain.com/cart/[tableId]`
- **Example**: `https://your-domain.com/cart/2`
- **Behavior**: Checks for valid session, redirects to auth if none exists

## Files Created/Modified

### New Files
- `user-side/app/auth/[tableId]/page.js` - Authentication page that generates session keys
- `user-side/lib/qrAuth.js` - QR authentication utility functions (updated)

### Modified Files
- `user-side/app/menu/[tableId]/page.js` - Validates session key from URL params
- `user-side/app/cart/[tableId]/page.js` - Validates session exists
- `user-side/app/admin/qr-codes/page.js` - Generates QR codes with auth URLs

## Key Functions

### `generateSessionKey()`
Generates a random 32-character session key.

### `createQRSession(tableId, sessionKey)`
Creates a new QR session with table ID and session key.

### `isQRSessionValid(tableId, sessionKey)`
Validates if session exists for table with matching key.

### `getSessionTimeRemaining()`
Returns milliseconds remaining in current session.

### `formatTimeRemaining(milliseconds)`
Formats time as "Xh Ym" or "Ym".

## User Experience Flow

### 1. QR Code Scan
```
User scans QR → /auth/2
                ↓
        Generates key: 05e68inqbm...
                ↓
        Creates session
                ↓
        /menu/2?key=05e68inqbm...
                ↓
        Validates key ✅
                ↓
        Access granted (30 minutes)
```

### 2. Direct URL Access
```
User types /menu/2
        ↓
    No valid key
        ↓
    Redirect to / (home)
        ↓
    Must scan QR code ❌
```

### 3. Session Active
- Can access menu and cart freely
- Session persists across refreshes
- Time remaining shown when < 30 minutes
- Key stays in URL for validation

### 4. Session Expiring
- Warning popup at 10 minutes remaining
- Time shown in header
- Can continue browsing

### 5. Session Expired
- Automatic redirect to home page `/`
- Must scan QR code again to get new session

## Security Features

- **Unique session keys**: 32-character random strings
- **Key validation**: Menu validates key matches session
- **Table-specific**: Can't use table 2's key for table 3
- **Time-limited**: 30-minute expiration
- **SessionStorage**: Cleared when tab closes
- **URL-based**: Key visible in URL for transparency

## Admin QR Code Generation

- Admin generates QR codes at `/admin/qr-codes`
- QR codes contain: `https://your-domain.com/auth/[tableId]`
- Can customize base URL in settings
- Download individual QR codes
- Test button opens auth flow

## Testing

### 1. Test QR Scan Flow
- Click TEST button in admin QR codes page
- Should open `/auth/2`
- Should show "Authenticating..." then "Access Granted!"
- Should redirect to `/menu/2?key=...`
- Should access menu successfully

### 2. Test Direct Access (Blocked)
- Open browser
- Navigate to `/menu/2` directly
- Should redirect to home page `/`
- Must scan QR code to access

### 3. Test Session Persistence
- Access menu with valid key
- Refresh page
- Should maintain access (key in URL)

### 4. Test Session Expiry
- Modify `SESSION_DURATION` in `qrAuth.js` to 1 minute
- Access menu via QR scan
- Wait 1 minute
- Should redirect to home page `/`

### 5. Test Cross-Table Security
- Get key for table 2
- Try to access `/menu/3?key=[table-2-key]`
- Should redirect to home page `/` (invalid key for table 3)

### 6. Test Invalid Key
- Try to access `/menu/2?key=invalid-key-123`
- Should redirect to home page `/`

## Example Session Key
```
05e68inqbm-nt5mp3-b539mtyn
```
- 32 characters
- Lowercase letters, numbers, hyphens
- Randomly generated
- Unique per session
