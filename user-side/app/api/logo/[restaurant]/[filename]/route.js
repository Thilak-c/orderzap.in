import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(request, { params }) {
  try {
    // Await params in Next.js 15+
    const { restaurant, filename } = await params;

    // Build path to logo file in project root
    const projectRoot = path.join(process.cwd(), '..');
    const logoPath = path.join(projectRoot, 'restro_assets', restaurant, 'logo', filename);

    // Read the file (try primary path)
    let fileBuffer;
    try {
      fileBuffer = await readFile(logoPath);
    } catch (err) {
      // fallback logic for renamed files and legacy names
      const altPaths = [];
      if (filename === 'favicon.webp') {
        altPaths.push(path.join(projectRoot, 'restro_assets', restaurant, 'logo', 'logo.webp'));
      }
      if (filename === 'logo.webp') {
        altPaths.push(path.join(projectRoot, 'restro_assets', restaurant, 'logo', 'favicon.webp'));
      }
      if (filename === 'full_logo.webp') {
        // no fallback for full logo; maybe try full-logo.webp from older scheme
        altPaths.push(path.join(projectRoot, 'restro_assets', restaurant, 'logo', 'full-logo.webp'));
      }

      for (const p of altPaths) {
        try {
          fileBuffer = await readFile(p);
          break;
        } catch (_) {
          // continue
        }
      }
      if (!fileBuffer) {
        throw err;
      }
    }

    // Determine content type based on file extension
    const ext = filename.split('.').pop().toLowerCase();
    const contentTypes = {
      'webp': 'image/webp',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml'
    };

    const contentType = contentTypes[ext] || 'image/webp'; // Default to webp

    // Return the image
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (error) {
    // If logo not found, return default OrderZap logo
    try {
      const defaultLogoPath = path.join(process.cwd(), 'public', 'assets', 'logos', 's-logo-sq.webp');
      const defaultBuffer = await readFile(defaultLogoPath);
      
      return new NextResponse(defaultBuffer, {
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour (shorter than custom logos)
        },
      });
    } catch (fallbackError) {
      console.error('Error serving logo:', error);
      console.error('Error serving fallback logo:', fallbackError);
      return NextResponse.json(
        { error: 'Logo not found' },
        { status: 404 }
      );
    }
  }
}
