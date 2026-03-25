import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(request, context) {
  try {
    const params = await context.params;
    const { restaurant, filename } = params;

    // Construct path: PROJECT_ROOT/restro_assets/[restaurant]/menu_img/[filename]
    const cwd = process.cwd();

    // Walk up a few levels from the current working directory until we
    // find a matching restro_assets/... path. This makes the API work
    // whether Next is running from the repo root, user-side, or .next.
    let imagePath = null;
    const tried = [];

    let currentDir = cwd;
    for (let i = 0; i < 6; i++) {
      const candidate = join(
        currentDir,
        'restro_assets',
        restaurant,
        'menu_img',
        filename
      );
      tried.push(candidate);
      if (existsSync(candidate)) {
        imagePath = candidate;
        break;
      }
      currentDir = join(currentDir, '..');
    }

    if (!imagePath) {
      console.error('Menu image not found. Tried paths:', tried);
      return new NextResponse('File not found', { status: 404 });
    }

    const fileBuffer = await readFile(imagePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'image/webp',
        // Disable caching so every device always fetches the latest image
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    return new NextResponse(
      `Error loading image: ${error.message}`,
      { status: 500 }
    );
  }
}
