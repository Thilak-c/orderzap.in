import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(request, context) {
  try {
    // In Next.js 15+, params might need to be awaited
    const params = await context.params;
    const { restaurant, filename } = params;

    // Construct path: PROJECT_ROOT/restro_assets/[restaurant]/icons/[filename]
    const cwd = process.cwd();
    
    // Go up one level from user-side to project root
    const projectRoot = join(cwd, '..');
    
    const iconPath = join(projectRoot, 'restro_assets', restaurant, 'icons', filename);

    // Check if file exists
    if (!existsSync(iconPath)) {
      return new NextResponse('Icon not found', { status: 404 });
    }

    // Read the file
    const fileBuffer = await readFile(iconPath);

    // Return image with proper content type
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving category icon:', error);
    return new NextResponse(`Error loading icon: ${error.message}`, { status: 500 });
  }
}
