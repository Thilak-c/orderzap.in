import { Vibrant } from 'node-vibrant/node';
import { NextResponse } from 'next/server';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(request) {
  try {
    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get('image');

    // Validate file exists
    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid image format. Supported formats: JPEG, PNG, WebP, GIF' },
        { status: 415 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Convert file to buffer for node-vibrant
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract color palette using node-vibrant
    const palette = await Vibrant.from(buffer).getPalette();

    // Extract the 4 specific colors
    const colors = {
      dominant: palette.Vibrant?.hex || palette.DarkVibrant?.hex || '#3b82f6',
      muted: palette.Muted?.hex || '#ec4899',
      darkVibrant: palette.DarkVibrant?.hex || '#1e40af',
      lightVibrant: palette.LightVibrant?.hex || '#8b5cf6'
    };

    return NextResponse.json({ colors }, { status: 200 });

  } catch (error) {
    console.error('Color extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract colors from image' },
      { status: 500 }
    );
  }
}
