'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function ManagePage() {
  const [data, setData] = useState({ currentPhoto: null, unshownPhotos: [], shownPhotos: [] });
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState('');

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/photos');
      const result = await res.json();
      if (result.success) {
        setData({
          currentPhoto: result.currentPhoto,
          unshownPhotos: result.unshownPhotos || [],
          shownPhotos: result.shownPhotos || []
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  const handleDelete = async (filename) => {
    if (!filename || !confirm('Are you strictly sure you want to permanently delete this photo? It will be removed from your database.')) return;
    
    setDeleting(filename);
    try {
      const res = await fetch(`/api/photos?filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchPhotos(); // Refresh beautifully
      } else {
        alert('Failed to delete photo.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error while deleting.');
    } finally {
      setDeleting('');
    }
  };

  const PhotoCard = ({ filename, badgeText, badgeColor }) => (
    <div className="manage-card">
      <div className="manage-image-wrapper">
        <Image 
          src={`/api/image/${filename}`} 
          alt={filename} 
          fill 
          sizes="(max-width: 768px) 100vw, 33vw"
          className="manage-image" 
          unoptimized // Prevents Netlify optimization crashes on large binary streams
        />
        {badgeText && (
          <span className="manage-badge" style={{ backgroundColor: badgeColor }}>
            {badgeText}
          </span>
        )}
        <button 
          className="delete-button" 
          onClick={() => handleDelete(filename)}
          disabled={deleting === filename}
        >
          {deleting === filename ? '...' : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          )}
        </button>
      </div>
      <div className="manage-card-footer">
        {filename}
      </div>
    </div>
  );

  return (
    <main className="container" style={{ maxWidth: '1000px', paddingBottom: '50px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ marginBottom: '5px' }}>File Manager</h1>
          <p style={{ margin: 0, opacity: 0.8 }}>Organize and safely monitor the photo rotation pipeline.</p>
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
          <a href="/upload" className="btn">Add Photos</a>
          <a href="/" className="btn outline">View Frame</a>
        </div>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', opacity: 0.5 }}>Loading Database...</div>
      ) : (
        <div className="manage-sections">
          {data.currentPhoto && (
            <section className="manage-section">
              <h2 className="section-title">Currently Displayed</h2>
              <div className="manage-grid">
                <PhotoCard 
                  filename={data.currentPhoto} 
                  badgeText="Live Now" 
                  badgeColor="#22c55e" 
                />
              </div>
            </section>
          )}

          <section className="manage-section">
            <h2 className="section-title">Up Next (Queue) <span className="count-pill">{data.unshownPhotos.length}</span></h2>
            {data.unshownPhotos.length === 0 ? (
              <p className="empty-state">No photos in the queue. You should upload some more!</p>
            ) : (
              <div className="manage-grid">
                {data.unshownPhotos.map(filename => (
                  <PhotoCard key={filename} filename={filename} badgeText="Queued" badgeColor="#3b82f6" />
                ))}
              </div>
            )}
          </section>

          <section className="manage-section" style={{ opacity: 0.85 }}>
            <h2 className="section-title">History (Already Shown) <span className="count-pill">{data.shownPhotos.length}</span></h2>
            {data.shownPhotos.length === 0 ? (
              <p className="empty-state">No photo history generated yet.</p>
            ) : (
              <div className="manage-grid">
                {data.shownPhotos.map(filename => (
                  <PhotoCard key={filename} filename={filename} badgeText="History" badgeColor="#6b7280" />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
