import { NextResponse } from 'next/server';
import { addPhotoToPool } from '@/lib/state';
import { getStore } from '@netlify/blobs';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('photo');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();

    // Generate unique filename to avoid collisions
    const ext = file.name.split('.').pop() || 'jpg';
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

    // Upload to Netlify Blobs 'photos' store
    const store = getStore("photos");
    await store.set(uniqueFilename, bytes);

    // Add to pool
    await addPhotoToPool(uniqueFilename);

    return NextResponse.json({ success: true, filename: uniqueFilename });
  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
