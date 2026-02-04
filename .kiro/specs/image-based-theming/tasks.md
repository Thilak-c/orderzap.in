# Implementation Plan: Image-Based Theming System

## Overview

This implementation plan breaks down the image-based theming system into discrete coding tasks. The approach follows a bottom-up strategy: build core utilities first, then API layer, then client components, and finally integrate everything. Each task builds on previous work and includes testing sub-tasks to validate functionality incrementally.

## Tasks

- [x] 1. Set up project dependencies and global CSS
  - Install required packages: `node-vibrant` for color extraction, `fast-check` for property-based testing
  - Create `app/globals.css` with CSS custom properties for theme variables (--bg, --primary, --secondary, --accent, --text)
  - Add smooth transition properties (0.3s ease) for color changes
  - Define default theme values in :root
  - _Requirements: 5.1, 5.3, 5.4, 10.1, 10.4_

- [ ] 2. Implement theme utility functions
  - [x] 2.1 Create `lib/theme-utils.js` with color manipulation functions
    - Implement `getLuminance(hexColor)` using WCAG relative luminance formula
    - Implement `isLightColor(hexColor)` using luminance threshold of 0.5
    - Implement `getTextColor(backgroundColor)` returning #1a1a1a for light, #f5f5f5 for dark
    - Implement `calculateContrastRatio(color1, color2)` for WCAG compliance checking
    - Export DEFAULT_THEME constant with all 5 color values
    - _Requirements: 3.1, 3.2, 3.3, 5.1_
  
  - [ ]* 2.2 Write property test for luminance-based text contrast
    - **Property 4: Luminance-Based Text Contrast**
    - **Validates: Requirements 3.1, 3.2, 3.3**
  
  - [ ]* 2.3 Write property test for WCAG contrast compliance
    - **Property 5: WCAG Contrast Compliance**
    - **Validates: Requirements 3.4**
  
  - [ ]* 2.4 Write unit tests for edge cases
    - Test pure white (#ffffff) returns dark text
    - Test pure black (#000000) returns light text
    - Test grayscale colors
    - _Requirements: 3.2, 3.3_

- [ ] 3. Implement theme mapping and application functions
  - [x] 3.1 Add theme mapping and application to `lib/theme-utils.js`
    - Implement `mapColorsToTheme(colors)` mapping extracted colors to CSS variable names
    - Implement `applyTheme(themeColors)` using document.documentElement.style.setProperty
    - Ensure mapping: dominant→bg, darkVibrant→primary, lightVibrant→secondary, muted→accent
    - Calculate text color based on bg brightness
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 10.3_
  
  - [ ]* 3.2 Write property test for color to theme mapping correctness
    - **Property 3: Color to Theme Mapping Correctness**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
  
  - [ ]* 3.3 Write property test for theme state updates trigger application
    - **Property 6: Theme State Updates Trigger Application**
    - **Validates: Requirements 4.1**

- [x] 4. Checkpoint - Ensure utility tests pass
  - Run all tests for theme utilities
  - Verify color calculations work correctly
  - Ask the user if questions arise

- [x] 5. Implement color extraction API endpoint
  - [x] 5.1 Create `app/api/extract-colors/route.js`
    - Accept POST requests with multipart/form-data
    - Validate file exists in request
    - Validate file type (JPEG, PNG, WebP, GIF) - return 415 if unsupported
    - Validate file size (max 10MB) - return 400 if too large
    - Use node-vibrant to extract palette
    - Extract 4 specific colors: dominant, muted, darkVibrant, lightVibrant
    - Return JSON response with colors in hex format
    - Handle errors with appropriate status codes (400, 415, 500)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [ ]* 5.2 Write property test for color extraction completeness
    - **Property 1: Color Extraction Completeness**
    - **Validates: Requirements 1.1, 1.2**
  
  - [ ]* 5.3 Write property test for invalid file error handling
    - **Property 2: Invalid File Error Handling**
    - **Validates: Requirements 1.3, 1.4**
  
  - [ ]* 5.4 Write property test for API file size validation
    - **Property 9: API File Size Validation**
    - **Validates: Requirements 7.4**
  
  - [ ]* 5.5 Write property test for API format support
    - **Property 10: API Format Support**
    - **Validates: Requirements 7.5**
  
  - [ ]* 5.6 Write property test for API error status codes
    - **Property 11: API Error Status Codes**
    - **Validates: Requirements 7.3**
  
  - [ ]* 5.7 Write unit tests for API edge cases
    - Test missing file in request
    - Test corrupted image file
    - Test empty file
    - _Requirements: 1.3, 1.4, 7.3_

- [x] 6. Checkpoint - Ensure API tests pass
  - Run all tests for API endpoint
  - Test with sample images manually
  - Verify error handling works correctly
  - Ask the user if questions arise

- [x] 7. Implement image upload component
  - [x] 7.1 Create `components/ImageThemeUploader.js`
    - Mark as "use client" for client-side functionality
    - Implement state management: colors, loading, error
    - Create file input with accept="image/*"
    - Implement handleImageUpload function to send file to API
    - Display loading indicator during upload
    - Display error messages on failure
    - Display color preview on success (optional visual feedback)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [x] 7.2 Add useEffect hook for theme application
    - Watch colors state for changes
    - Call mapColorsToTheme when colors update
    - Call applyTheme with mapped colors
    - _Requirements: 6.2, 6.3, 4.1_
  
  - [ ]* 7.3 Write property test for theme state update correctness
    - **Property 8: Theme State Update Correctness**
    - **Validates: Requirements 6.1, 6.2**
  
  - [ ]* 7.4 Write unit tests for component state management
    - Test initial state has null colors
    - Test loading state toggles correctly
    - Test error state displays messages
    - _Requirements: 6.5, 8.4, 8.5_

- [ ] 8. Integrate theme system with restaurant layout
  - [x] 8.1 Add ImageThemeUploader to restaurant layout
    - Import ImageThemeUploader component
    - Add component to `user-side/app/r/[restaurantId]/layout.js`
    - Position appropriately (e.g., in admin section or settings)
    - Ensure it doesn't interfere with existing layout
    - _Requirements: 9.1, 9.4_
  
  - [x] 8.2 Implement restaurant-level theme customization
    - Add restaurantId prop to ImageThemeUploader
    - Store theme colors with restaurant context
    - Load saved theme on restaurant page load
    - _Requirements: 9.2, 9.5_
  
  - [ ]* 8.3 Write property test for restaurant-level theme customization
    - **Property 12: Restaurant-Level Theme Customization**
    - **Validates: Requirements 9.2**
  
  - [ ]* 8.4 Write property test for default theme fallback
    - **Property 13: Default Theme Fallback**
    - **Validates: Requirements 9.5**
  
  - [ ]* 8.5 Write integration tests for restaurant context
    - Test theme applies correctly per restaurant
    - Test navigation between restaurants preserves themes
    - Test fallback to default theme
    - _Requirements: 9.1, 9.3, 9.5_

- [x] 9. Implement theme persistence across navigation
  - [x] 9.1 Add navigation event listeners
    - Listen for client-side navigation events
    - Preserve theme state during navigation
    - Reapply theme after navigation if needed
    - _Requirements: 4.5_
  
  - [ ]* 9.2 Write property test for theme persistence across navigation
    - **Property 7: Theme Persistence Across Navigation**
    - **Validates: Requirements 4.5**

- [x] 10. Final checkpoint and polish
  - Run complete test suite (unit + property tests)
  - Test end-to-end flow: upload image → see theme change
  - Verify smooth transitions work
  - Test with various image types (photos, logos, illustrations)
  - Verify text readability on all generated themes
  - Check for any console errors or warnings
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests should run minimum 100 iterations each
- Use `fast-check` library for property-based testing
- All color values should be in hex format (#RRGGBB)
- CSS transitions provide smooth theme changes without JavaScript animation
- Theme application happens via CSS custom properties for instant updates
