import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request) {
  try {
    const { restaurantId, itemName, imageData } = await request.json();

    if (!restaurantId || !itemName || !imageData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create directory path: PROJECT_ROOT/restro_assets/[restaurantId]/menu_img/
    const projectRoot = process.cwd().replace('/user-side', ''); // Go to project root
    const dirPath = join(projectRoot, 'restro_assets', restaurantId, 'menu_img');
    
    // Create directory if it doesn't exist
    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true });
    }

    // Convert base64 to buffer
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Save file
    const filePath = join(dirPath, `${itemName}.webp`);
    await writeFile(filePath, buffer);

    return NextResponse.json({ 
      success: true, 
      path: `/restro_assets/${restaurantId}/menu_img/${itemName}.webp` 
    });
  } catch (error) {
    console.error('Error saving menu image:', error);
    return NextResponse.json(
      { error: 'Failed to save image', details: error.message },
      { status: 500 }
    );
  }
}
