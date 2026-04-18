import { NextResponse } from 'next/server';
import { updateDailyPhoto } from '@/lib/state';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const state = await updateDailyPhoto();
    return NextResponse.json(state);
  } catch (error) {
    console.error('Error in GET /api/photo:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
