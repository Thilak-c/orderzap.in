import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const restaurantName = formData.get('restaurantName');

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!restaurantName) {
      return NextResponse.json(
        { error: 'Restaurant name is required' },
        { status: 400 }
      );
    }

    // Convert restaurant name to folder name (same as ID generation)
    const folderName = restaurantName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Always save as WebP for better compression
    const fileName = 'logo.webp';

    // Create directory path: ROOT/restro_assets/[name]/logo/
    // Go up from user-side to project root
    const projectRoot = path.join(process.cwd(), '..');
    const uploadDir = path.join(projectRoot, 'restro_assets', folderName, 'logo');
    
    // Create directory if it doesn't exist
    await mkdir(uploadDir, { recursive: true });

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Convert to WebP using sharp
    const webpBuffer = await sharp(buffer)
      .webp({ quality: 90 }) // High quality WebP
      .resize(512, 512, { // Resize to 512x512 for consistency
        fit: 'cover',
        position: 'center'
      })
      .toBuffer();

    // Save file
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, webpBuffer);

    // Generate absolute path from root (starts with /)
    const logoUrl = `/api/logo/${folderName}/${fileName}`;

    return NextResponse.json({
      success: true,
      logoUrl: logoUrl,
      message: 'Logo uploaded and converted to WebP successfully'
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload logo', details: error.message },
      { status: 500 }
    );
  }
}
