import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(request, context) {
  try {
    // In Next.js 15+, params might need to be awaited
    const params = await context.params;
    const { restaurant, filename } = params;

    console.log('Params:', { restaurant, filename });

    // Construct path: PROJECT_ROOT/restro_assets/[restaurant]/menu_img/[filename]
    const cwd = process.cwd();
    console.log('Current working directory:', cwd);
    
    // Go up one level from user-side to project root
    const projectRoot = join(cwd, '..');
    console.log('Project root:', projectRoot);
    
    const imagePath = join(projectRoot, 'restro_assets', restaurant, 'menu_img', filename);

    console.log('Looking for image at:', imagePath);
    console.log('File exists:', existsSync(imagePath));

    // Check if file exists
    if (!existsSync(imagePath)) {
      console.log('File not found at:', imagePath);
      return new NextResponse('File not found', { status: 404 });
    }

    // Read the file
    const fileBuffer = await readFile(imagePath);

    // Return image with proper content type
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving menu image:', error);
    console.error('Error details:', error.message);
    return new NextResponse(`Error loading image: ${error.message}`, { status: 500 });
  }
}
