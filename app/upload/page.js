'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

export default function UploadPage() {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [fileCount, setFileCount] = useState(0);
  const fileInputRef = useRef(null);

  const processFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    setFileCount(files.length);

    // Set preview to the first file
    const objectUrl = URL.createObjectURL(files[0]);
    setPreviewSrc(objectUrl);
    setLoading(true);
    setStatus('');

    const formData = new FormData();
    // Append all selected files to 'photos'
    files.forEach(f => formData.append('photos', f));

    try {
      // Add artificial delay for the smooth spinning loader effect
      await new Promise(r => setTimeout(r, 600));

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      
      const data = await res.json();
      setStatus('success');
    } catch (err) {
      console.error(err);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    processFiles(e.target.files);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      if (!loading && status !== 'success') setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (loading || status === 'success') return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  return (
    <main className="upload-container" onDragEnter={handleDrag}>
      <h1>Add Photos</h1>
      <p>Upload new images to the daily rotation pool. Bulk uploads supported.</p>
      
      {status === 'success' ? (
        <div className="success-state">
          <div className="success-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h2>Upload Complete!</h2>
          <p style={{ margin: '10px 0 0 0' }}>{fileCount} photo{fileCount !== 1 ? 's have' : ' has'} been added to the pool.</p>
          <button 
            className="btn" 
            style={{ marginTop: '30px' }}
            onClick={() => {
              setStatus('');
              setPreviewSrc(null);
              setFileCount(0);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          >
            Upload More
          </button>
        </div>
      ) : (
        <div 
          className={`upload-box ${dragActive ? 'drag-active' : ''}`} 
          onClick={() => !loading && fileInputRef.current?.click()}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {previewSrc ? (
            <div className="preview-container">
              <Image src={previewSrc} alt="Preview" fill className="preview-image" />
              {loading && (
                <div className="uploading-overlay" style={{ flexDirection: 'column' }}>
                  <div className="spinner"></div>
                  {fileCount > 1 && (
                    <div style={{ marginTop: '15px', color: 'white', fontWeight: 'bold' }}>
                      Uploading {fileCount} photos...
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              <svg className="upload-icon" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <span>{dragActive ? 'Drop images here' : 'Click or drag images to upload'}</span>
            </>
          )}
        </div>
      )}
      
      <input 
        type="file" 
        accept="image/*" 
        multiple
        className="file-input" 
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={loading}
      />

      {status === 'error' && (
        <div className="status error">
          Error uploading files. Please try again.
        </div>
      )}

      <div>
        <a href="/" className="back-link">Back to Gallery</a>
      </div>
    </main>
  );
}
