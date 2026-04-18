import Image from 'next/image';
import { updateDailyPhoto } from '@/lib/state';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const state = await updateDailyPhoto();
  
  if (!state.currentPhoto) {
    return (
      <main className="empty-state">
        <h1>Welcome to Daily Photo</h1>
        <p style={{ color: '#94a3b8', marginBottom: '20px' }}>The pool is empty. Upload some photos to get started!</p>
        <a href="/upload" className="btn">Go to Upload</a>
      </main>
    );
  }

  return (
    <main className="photo-container">
      <div className="photo-wrapper">
        <Image 
          src={`/api/image/${state.currentPhoto}`} 
          alt="Photo of the Day"
          fill
          className="photo"
          priority
        />
      </div>
      <a href="/upload" className="minimal-upload-btn" title="Upload new photo">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </a>
    </main>
  );
}
