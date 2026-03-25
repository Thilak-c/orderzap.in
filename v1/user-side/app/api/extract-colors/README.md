# Color Extraction API

This API endpoint extracts a color palette from uploaded images using the node-vibrant library.

## Endpoint

`POST /api/extract-colors`

## Request

- **Content-Type**: `multipart/form-data`
- **Body**: Form data with an `image` field containing the image file

### Supported Formats
- JPEG (`image/jpeg`)
- PNG (`image/png`)
- WebP (`image/webp`)
- GIF (`image/gif`)

### File Size Limit
Maximum file size: 10MB

## Response

### Success (200)
```json
{
  "colors": {
    "dominant": "#hexcode",
    "muted": "#hexcode",
    "darkVibrant": "#hexcode",
    "lightVibrant": "#hexcode"
  }
}
```

### Errors

#### 400 Bad Request
- Missing file: `{ "error": "No image file provided" }`
- File too large: `{ "error": "File size exceeds 10MB limit" }`

#### 415 Unsupported Media Type
- Invalid format: `{ "error": "Invalid image format. Supported formats: JPEG, PNG, WebP, GIF" }`

#### 500 Internal Server Error
- Processing error: `{ "error": "Failed to extract colors from image" }`

## Testing

To test the API endpoint manually:

1. Start the Next.js development server:
   ```bash
   npm run dev:frontend
   ```

2. Run the test script:
   ```bash
   node app/api/extract-colors/test-api.js
   ```

## Example Usage

```javascript
const formData = new FormData();
formData.append('image', imageFile);

const response = await fetch('/api/extract-colors', {
  method: 'POST',
  body: formData
});

const { colors } = await response.json();
console.log(colors);
// {
//   dominant: "#ff5733",
//   muted: "#c0c0c0",
//   darkVibrant: "#8b0000",
//   lightVibrant: "#ffb6c1"
// }
```

## Implementation Details

- Uses `node-vibrant` library for color extraction
- Extracts 4 specific colors from the image palette
- Returns colors in hexadecimal format
- Includes fallback colors if specific swatches are not available
- Validates file type, size, and existence before processing
