# Design Document: Image-Based Theming System

## Overview

The image-based theming system provides automatic color extraction and theme application for Next.js applications. Users upload an image, the system extracts a 4-color palette, and instantly applies these colors as CSS custom properties throughout the application with automatic text contrast adjustment for accessibility.

The system consists of three main layers:
1. **API Layer**: Server-side color extraction endpoint
2. **Utility Layer**: Color processing, theme mapping, and contrast calculation
3. **Client Layer**: Image upload component and theme state management

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Application                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         ImageUploadComponent (Client)                  │ │
│  │  - File input interface                                │ │
│  │  - Upload handling                                     │ │
│  │  - Loading/error states                                │ │
│  └──────────────┬─────────────────────────────────────────┘ │
│                 │                                             │
│                 ▼                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         ThemeState (React State/Context)               │ │
│  │  - Stores extracted colors                             │ │
│  │  - Triggers theme updates                              │ │
│  └──────────────┬─────────────────────────────────────────┘ │
│                 │                                             │
│                 ▼                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         ThemeUtility (Client-side)                     │ │
│  │  - Maps colors to CSS variables                        │ │
│  │  - Calculates text contrast                            │ │
│  │  - Applies theme to DOM                                │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ HTTP POST /api/extract-colors
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         ColorExtractionAPI                             │ │
│  │  - Receives image file                                 │ │
│  │  - Validates file type/size                            │ │
│  │  - Extracts 4 colors                                   │ │
│  │  - Returns JSON response                               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. User selects image file → ImageUploadComponent
2. Component sends file to /api/extract-colors → ColorExtractionAPI
3. API extracts colors and returns palette → Component
4. Component updates ThemeState with new colors
5. ThemeState change triggers ThemeUtility
6. ThemeUtility calculates text contrast and applies CSS variables
7. Browser re-renders with new theme instantly

## Components and Interfaces

### 1. Color Extraction API (`/api/extract-colors/route.js`)

**Purpose**: Server-side endpoint for extracting color palettes from images

**Interface**:
```javascript
// Request
POST /api/extract-colors
Content-Type: multipart/form-data
Body: { image: File }

// Response (Success)
Status: 200
{
  "colors": {
    "dominant": "#hexcode",
    "muted": "#hexcode",
    "darkVibrant": "#hexcode",
    "lightVibrant": "#hexcode"
  }
}

// Response (Error)
Status: 400 | 415 | 500
{
  "error": "Error message"
}
```

**Implementation Approach**:
- Use `node-vibrant` library for color extraction
- Accept FormData with image file
- Validate file type (JPEG, PNG, WebP, GIF)
- Validate file size (max 10MB)
- Extract 4 specific colors from palette
- Return colors in hex format

**Error Handling**:
- 400: Missing or invalid file
- 415: Unsupported media type
- 500: Processing error

### 2. Theme Utility (`lib/theme-utils.js`)

**Purpose**: Core utility functions for theme management

**Functions**:

```javascript
// Calculate relative luminance for contrast
function getLuminance(hexColor: string): number
  Input: Hex color string (e.g., "#ff5733")
  Output: Luminance value (0-1)
  Algorithm: Convert RGB to relative luminance using WCAG formula

// Determine if color is light or dark
function isLightColor(hexColor: string): boolean
  Input: Hex color string
  Output: true if light (luminance > 0.5), false if dark
  Uses: getLuminance()

// Get appropriate text color for background
function getTextColor(backgroundColor: string): string
  Input: Background hex color
  Output: Text hex color (dark or light)
  Logic: 
    if isLightColor(backgroundColor) then return "#1a1a1a"
    else return "#f5f5f5"

// Map extracted colors to CSS variable names
function mapColorsToTheme(colors: ExtractedColors): ThemeColors
  Input: { dominant, muted, darkVibrant, lightVibrant }
  Output: { bg, primary, secondary, accent, text }
  Mapping:
    bg = dominant
    primary = darkVibrant
    secondary = lightVibrant
    accent = muted
    text = getTextColor(dominant)

// Apply theme to document
function applyTheme(themeColors: ThemeColors): void
  Input: Theme color object
  Effect: Sets CSS custom properties on document.documentElement
  Implementation:
    for each color in themeColors:
      document.documentElement.style.setProperty(`--${key}`, value)
```

**Constants**:
```javascript
const DEFAULT_THEME = {
  bg: "#ffffff",
  primary: "#3b82f6",
  secondary: "#8b5cf6",
  accent: "#ec4899",
  text: "#1a1a1a"
}
```

### 3. Image Upload Component (`components/ImageThemeUploader.js`)

**Purpose**: Client-side component for image upload and theme management

**Component Structure**:
```javascript
"use client"

function ImageThemeUploader() {
  // State
  const [colors, setColors] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Handlers
  async function handleImageUpload(file: File): Promise<void>
    1. Validate file exists
    2. Set loading state
    3. Create FormData with file
    4. POST to /api/extract-colors
    5. Parse response
    6. Update colors state
    7. Handle errors
    8. Clear loading state
  
  // Effects
  useEffect(() => {
    if (colors) {
      const theme = mapColorsToTheme(colors)
      applyTheme(theme)
    }
  }, [colors])
  
  // Render
  return (
    <div>
      <input type="file" accept="image/*" onChange={handleImageUpload} />
      {loading && <LoadingIndicator />}
      {error && <ErrorMessage message={error} />}
      {colors && <ColorPreview colors={colors} />}
    </div>
  )
}
```

**Props**: None (self-contained)

**State Management**:
- Local state for colors, loading, error
- Could be lifted to context for global access
- Theme application happens via side effect

### 4. Global CSS Setup (`app/globals.css`)

**Purpose**: Define CSS variables and transitions

```css
:root {
  /* Default theme colors */
  --bg: #ffffff;
  --primary: #3b82f6;
  --secondary: #8b5cf6;
  --accent: #ec4899;
  --text: #1a1a1a;
  
  /* Smooth transitions for theme changes */
  transition: background-color 0.3s ease,
              color 0.3s ease;
}

/* Apply theme colors to common elements */
body {
  background-color: var(--bg);
  color: var(--text);
}

/* Ensure all elements inherit transitions */
* {
  transition: background-color 0.3s ease,
              color 0.3s ease,
              border-color 0.3s ease;
}
```

### 5. Restaurant Integration (`user-side/app/r/[restaurantId]/layout.js`)

**Integration Approach**:
- Add ImageThemeUploader component to restaurant layout
- Theme applies globally via CSS variables
- Existing components automatically inherit theme
- No changes needed to existing component styles

**Modified Layout**:
```javascript
"use client";
import ImageThemeUploader from "@/components/ImageThemeUploader";

export default function RestaurantLayout({ children }) {
  return (
    <RestaurantProvider restaurantId={restaurantId}>
      <ImageThemeUploader />
      <RestaurantClosedCheck>
        {children}
      </RestaurantClosedCheck>
      <FloatingQuickMenu />
    </RestaurantProvider>
  );
}
```

## Data Models

### ExtractedColors
```javascript
{
  dominant: string,      // Hex color (e.g., "#ff5733")
  muted: string,         // Hex color
  darkVibrant: string,   // Hex color
  lightVibrant: string   // Hex color
}
```

### ThemeColors
```javascript
{
  bg: string,        // Background color (hex)
  primary: string,   // Primary accent color (hex)
  secondary: string, // Secondary accent color (hex)
  accent: string,    // Tertiary accent color (hex)
  text: string       // Text color (hex)
}
```

### APIResponse
```javascript
// Success
{
  colors: ExtractedColors
}

// Error
{
  error: string
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Color Extraction Completeness
*For any* valid image file, extracting colors should return exactly 4 colors with keys: dominant, muted, darkVibrant, and lightVibrant, all in valid hexadecimal format (#[0-9a-fA-F]{6})
**Validates: Requirements 1.1, 1.2**

### Property 2: Invalid File Error Handling
*For any* non-image file or unsupported format, the color extraction should return an error response with a descriptive message
**Validates: Requirements 1.3, 1.4**

### Property 3: Color to Theme Mapping Correctness
*For any* set of extracted colors, the theme mapping should assign: dominant→bg, darkVibrant→primary, lightVibrant→secondary, muted→accent, and calculate text color based on bg brightness
**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

### Property 4: Luminance-Based Text Contrast
*For any* background color, the contrast calculator should return dark text (#1a1a1a) for light backgrounds (luminance > 0.5) and light text (#f5f5f5) for dark backgrounds (luminance ≤ 0.5)
**Validates: Requirements 3.1, 3.2, 3.3**

### Property 5: WCAG Contrast Compliance
*For any* background and calculated text color pair, the contrast ratio should meet or exceed 4.5:1 (WCAG AA standard for normal text)
**Validates: Requirements 3.4**

### Property 6: Theme State Updates Trigger Application
*For any* theme state change, the CSS custom properties on document.documentElement should be updated with the new color values
**Validates: Requirements 4.1**

### Property 7: Theme Persistence Across Navigation
*For any* client-side navigation event, the current theme state should be preserved and remain applied
**Validates: Requirements 4.5**

### Property 8: Theme State Update Correctness
*For any* new set of extracted colors, updating the theme state should result in the state containing all four color values with their correct keys
**Validates: Requirements 6.1, 6.2**

### Property 9: API File Size Validation
*For any* file larger than 10MB, the API should reject the request and return an appropriate error status code (400 or 413)
**Validates: Requirements 7.4**

### Property 10: API Format Support
*For any* image file in a supported format (JPEG, PNG, WebP, GIF), the API should successfully process it and return extracted colors
**Validates: Requirements 7.5**

### Property 11: API Error Status Codes
*For any* invalid request (missing file, wrong format, processing error), the API should return an appropriate HTTP error status code (400, 415, or 500)
**Validates: Requirements 7.3**

### Property 12: Restaurant-Level Theme Customization
*For any* two different restaurant IDs, the theme system should allow independent theme configurations without interference
**Validates: Requirements 9.2**

### Property 13: Default Theme Fallback
*For any* restaurant without a custom theme, the theme system should apply the default theme values
**Validates: Requirements 9.5**

## Error Handling

### Color Extraction Errors
- **Invalid file type**: Return 415 Unsupported Media Type with message "Invalid image format. Supported formats: JPEG, PNG, WebP, GIF"
- **File too large**: Return 400 Bad Request with message "File size exceeds 10MB limit"
- **Missing file**: Return 400 Bad Request with message "No image file provided"
- **Processing failure**: Return 500 Internal Server Error with message "Failed to extract colors from image"

### Client-Side Errors
- **Network failure**: Display user-friendly message "Failed to upload image. Please check your connection and try again."
- **API error response**: Display the error message from API response
- **Invalid file selection**: Prevent upload and show "Please select a valid image file"

### Fallback Behavior
- If color extraction fails, maintain current theme (don't reset to default)
- If theme application fails, log error but don't crash application
- Always provide default theme values as CSS variable fallbacks

## Testing Strategy

### Unit Testing
The testing strategy employs both unit tests and property-based tests for comprehensive coverage.

**Unit Test Focus Areas**:
- Specific examples of color extraction (test with known images)
- Edge cases: pure white (#ffffff), pure black (#000000), grayscale images
- Error conditions: corrupted files, empty files, non-image files
- Default theme initialization
- CSS variable naming conventions
- API endpoint configuration

**Example Unit Tests**:
```javascript
describe('Theme Utility', () => {
  test('pure white background returns dark text', () => {
    expect(getTextColor('#ffffff')).toBe('#1a1a1a')
  })
  
  test('pure black background returns light text', () => {
    expect(getTextColor('#000000')).toBe('#f5f5f5')
  })
  
  test('default theme has all required variables', () => {
    expect(DEFAULT_THEME).toHaveProperty('bg')
    expect(DEFAULT_THEME).toHaveProperty('primary')
    expect(DEFAULT_THEME).toHaveProperty('secondary')
    expect(DEFAULT_THEME).toHaveProperty('accent')
    expect(DEFAULT_THEME).toHaveProperty('text')
  })
})
```

### Property-Based Testing
Property-based tests verify universal properties across randomized inputs. Each test should run a minimum of 100 iterations.

**Property Test Configuration**:
- Library: `fast-check` (for JavaScript/TypeScript)
- Minimum iterations: 100 per property
- Each test must reference its design document property number
- Tag format: `Feature: image-based-theming, Property N: [property text]`

**Property Test Focus Areas**:
- Color extraction returns correct structure for all valid images
- Theme mapping produces correct CSS variable assignments for all color sets
- Contrast calculation returns appropriate text colors for all background colors
- WCAG contrast ratios are met for all generated color pairs
- State updates correctly handle all possible color value combinations
- API validation correctly handles all file sizes and formats

**Example Property Tests**:
```javascript
import fc from 'fast-check'

describe('Property Tests', () => {
  // Feature: image-based-theming, Property 3: Color to Theme Mapping Correctness
  test('color mapping assigns correct CSS variables', () => {
    fc.assert(
      fc.property(
        fc.record({
          dominant: fc.hexaString({ minLength: 6, maxLength: 6 }),
          muted: fc.hexaString({ minLength: 6, maxLength: 6 }),
          darkVibrant: fc.hexaString({ minLength: 6, maxLength: 6 }),
          lightVibrant: fc.hexaString({ minLength: 6, maxLength: 6 })
        }),
        (colors) => {
          const theme = mapColorsToTheme(colors)
          expect(theme.bg).toBe(colors.dominant)
          expect(theme.primary).toBe(colors.darkVibrant)
          expect(theme.secondary).toBe(colors.lightVibrant)
          expect(theme.accent).toBe(colors.muted)
          expect(theme.text).toBeDefined()
        }
      ),
      { numRuns: 100 }
    )
  })
  
  // Feature: image-based-theming, Property 5: WCAG Contrast Compliance
  test('contrast ratio meets WCAG AA standard', () => {
    fc.assert(
      fc.property(
        fc.hexaString({ minLength: 6, maxLength: 6 }),
        (bgColor) => {
          const textColor = getTextColor(`#${bgColor}`)
          const ratio = calculateContrastRatio(`#${bgColor}`, textColor)
          expect(ratio).toBeGreaterThanOrEqual(4.5)
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

### Integration Testing
- Test complete flow: upload → extraction → state update → theme application
- Test restaurant context integration
- Test theme persistence across navigation
- Test error handling end-to-end

### Manual Testing Checklist
- Upload various image types (photos, logos, illustrations)
- Verify smooth color transitions
- Check text readability on all generated themes
- Test on different screen sizes
- Verify no flash of unstyled content
- Test with slow network conditions

## Performance Considerations

### Color Extraction
- Process images server-side to avoid blocking client
- Set 3-second timeout for extraction
- Consider caching extracted colors by image hash

### Theme Application
- Use CSS custom properties for instant updates (no re-render)
- Batch CSS variable updates in single operation
- Leverage browser's native CSS cascade

### Optimization Opportunities
- Compress uploaded images before sending to API
- Cache color palettes in localStorage
- Debounce rapid theme changes
- Lazy load color extraction library

## Security Considerations

### File Upload Security
- Validate file type on both client and server
- Enforce file size limits (10MB max)
- Sanitize file names
- Use temporary storage for uploaded files
- Delete uploaded files after processing

### Input Validation
- Validate hex color format before applying
- Sanitize CSS variable names
- Prevent CSS injection through color values
- Validate API responses before using

### API Security
- Rate limit color extraction endpoint
- Implement CSRF protection
- Validate Content-Type headers
- Handle malformed requests gracefully

## Future Enhancements

### Phase 2 Features (Optional)
1. **LocalStorage Persistence**: Save theme preferences per restaurant
2. **Automatic Dark Mode**: Generate dark theme variant from same image
3. **Tailwind CSS Integration**: Generate Tailwind config from extracted colors
4. **Enhanced Accessibility**: WCAG AAA compliance option (7:1 contrast)
5. **User Profile Themes**: Save multiple themes per user account
6. **Theme Preview**: Show theme preview before applying
7. **Color Palette Editing**: Allow manual adjustment of extracted colors
8. **Theme Sharing**: Export/import theme configurations

### Scalability Considerations
- Move color extraction to background job queue for high traffic
- Implement CDN caching for theme assets
- Consider database storage for restaurant themes
- Add analytics for popular color schemes
