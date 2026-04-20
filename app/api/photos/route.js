import { NextResponse } from 'next/server';
import { getState, removePhotoFromPool } from '@/lib/state';

export async function GET() {
  try {
    const state = await getState();
    return NextResponse.json({
      success: true,
      currentPhoto: state.currentPhoto,
      unshownPhotos: state.unshownPhotos || [],
      shownPhotos: state.shownPhotos || []
    });
  } catch (error) {
    console.error('Failed to get photos pool:', error);
    return NextResponse.json({ error: 'Failed to retrieve application state' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    await removePhotoFromPool(filename);

    return NextResponse.json({ success: true, message: `Photo ${filename} safely deleted from rotation and database.` });
  } catch (error) {
    console.error('Failed to delete photo:', error);
    return NextResponse.json({ error: 'Failed to execute deletion correctly' }, { status: 500 });
  }
}
