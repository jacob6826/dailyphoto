import { NextResponse } from 'next/server';
import { getStore } from '@netlify/blobs';

export async function GET(request, { params }) {
  const { filename } = await params;

  try {
    const store = getStore("photos");
    const imageBlob = await store.get(filename, { type: 'blob' });

    if (!imageBlob) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const headers = new Headers();
    headers.set('Content-Type', imageBlob.type || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new NextResponse(imageBlob, { status: 200, headers });
  } catch (error) {
    console.error('Image fetch error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
