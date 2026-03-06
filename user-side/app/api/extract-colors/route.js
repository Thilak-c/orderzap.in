import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Get the image from form data
    const formData = await request.formData();
    const image = formData.get('image');
    
    if (!image) {
      return NextResponse.json({
        colors: {
          dominant: '#3b82f6',
          muted: '#ec4899',
          darkVibrant: '#1e40af',
          lightVibrant: '#8b5cf6'
        }
      }, { status: 200 });
    }

    // Return default colors for now (color extraction library disabled)
    // TODO: Implement proper color extraction
    return NextResponse.json({
      colors: {
        dominant: '#3b82f6',
        muted: '#ec4899',
        darkVibrant: '#1e40af',
        lightVibrant: '#8b5cf6'
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Color extraction error:', error);
    // Return default colors on error
    return NextResponse.json({
      colors: {
        dominant: '#3b82f6',
        muted: '#ec4899',
        darkVibrant: '#1e40af',
        lightVibrant: '#8b5cf6'
      }
    }, { status: 200 });
  }
}

