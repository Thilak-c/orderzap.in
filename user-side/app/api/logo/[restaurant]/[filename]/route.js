import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(request, { params }) {
  try {
    // Await params in Next.js 15+
    const { restaurant, filename } = await params;

    // Build path to logo file in project root
    const projectRoot = path.join(process.cwd(), '..');
    const logoPath = path.join(projectRoot, 'restro_logo', restaurant, 'logo', filename);

    // Read the file
    const fileBuffer = await readFile(logoPath);

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
    console.error('Error serving logo:', error);
    return NextResponse.json(
      { error: 'Logo not found' },
      { status: 404 }
    );
  }
}
