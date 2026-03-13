import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

export async function POST(request) {
  try {
    const formData = await request.formData();
    // Accept different field names; prefer explicit names for favicon vs full_logo
    const file = formData.get('favicon') || formData.get('logo') || formData.get('file') || formData.get('fullLogo') || formData.get('full_logo');
    const restaurantParam = formData.get('restaurant') || formData.get('restaurantName');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!restaurantParam) {
      return NextResponse.json({ error: 'Restaurant identifier is required' }, { status: 400 });
    }

    // Use provided restaurant param as folder name (sanitized)
    const folderName = String(restaurantParam)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Determine if this is a full-width logo upload
    const isFullLogo = Boolean(formData.get('full_logo') || formData.get('fullLogo'));

    // Save filenames consistently: favicon.webp for square, full_logo.webp for wide
    const fileName = isFullLogo ? 'full_logo.webp' : 'favicon.webp';

    // Find project root that contains `restro_assets` (works for different cwd setups)
    let projectRoot = process.cwd();
    if (!fs.existsSync(path.join(projectRoot, 'restro_assets'))) {
      const cand = path.join(projectRoot, '..');
      if (fs.existsSync(path.join(cand, 'restro_assets'))) projectRoot = cand;
      else {
        const cand2 = path.join(projectRoot, '..', '..');
        if (fs.existsSync(path.join(cand2, 'restro_assets'))) projectRoot = cand2;
      }
    }

    const uploadDir = path.join(projectRoot, 'restro_assets', folderName, 'logo');

    // Create directory if it doesn't exist
    await mkdir(uploadDir, { recursive: true });

    console.log('[upload-logo] saving to', uploadDir);

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Convert to WebP using sharp
    let transformer = sharp(buffer).webp({ quality: 90 });

    if (isFullLogo) {
      // For full logos, keep aspect ratio and resize by width
      transformer = transformer.resize({ width: 1200 });
    } else {
      // For favicon/square logos, resize to 512x512 and crop
      transformer = transformer.resize(512, 512, {
        fit: 'cover',
        position: 'center'
      });
    }

    const webpBuffer = await transformer.toBuffer();

    // Save file
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, webpBuffer);
    console.log(`[upload-logo] wrote ${webpBuffer.length} bytes to ${filePath}`);

    // Generate absolute path from root (starts with /)
    const logoUrl = `/api/logo/${folderName}/${fileName}`; // e.g. /api/logo/my-restaurant/favicon.webp

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
