import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request) {
  try {
    const { restaurantId, categoryName, imageData } = await request.json();

    if (!restaurantId || !categoryName || !imageData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get project root (one level up from user-side)
    const projectRoot = join(process.cwd(), '..');
    
    // Create directory path: restro_assets/[restaurantId]/icons/
    const iconsDir = join(projectRoot, 'restro_assets', restaurantId, 'icons');
    
    // Create directory if it doesn't exist
    if (!existsSync(iconsDir)) {
      await mkdir(iconsDir, { recursive: true });
    }

    // Remove data:image/... prefix if present
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Save file
    const filename = `${categoryName}.webp`;
    const filepath = join(iconsDir, filename);
    await writeFile(filepath, buffer);

    // Return the file path
    const relativePath = `/restro_assets/${restaurantId}/icons/${filename}`;

    return NextResponse.json({
      success: true,
      path: relativePath,
    });
  } catch (error) {
    console.error('Error saving category icon:', error);
    return NextResponse.json(
      { error: 'Failed to save icon', details: error.message },
      { status: 500 }
    );
  }
}
