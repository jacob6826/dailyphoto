import { NextResponse } from 'next/server';
import { addPhotoToPool } from '@/lib/state';
import { getStore } from '@netlify/blobs';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('photos');

    if (!files || files.length === 0) {
      // Fallback to 'photo' just in case a frontend sends singular
      const singleFile = formData.get('photo');
      if (singleFile && typeof singleFile !== 'string') {
        files.push(singleFile);
      } else {
        return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
      }
    }

    const store = getStore("photos");
    const uploadedFilenames = [];

    // Process all files concurrently
    await Promise.all(
      files.map(async (file) => {
        if (typeof file === 'string') return;
        const bytes = await file.arrayBuffer();
        
        const ext = file.name.split('.').pop() || 'jpg';
        const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
        
        await store.set(uniqueFilename, bytes);
        uploadedFilenames.push(uniqueFilename);
      })
    );

    // Add everything to the pool safely in one go
    if (uploadedFilenames.length > 0) {
      await addPhotosToPool(uploadedFilenames);
    }

    return NextResponse.json({ success: true, count: uploadedFilenames.length, filenames: uploadedFilenames });
  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
