'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

const compressImage = async (file) => {
  return new Promise((resolve) => {
    // Only compress images that are dangerously large (e.g., >3MB)
    // 3000000 bytes = ~3MB
    if (!file.type.startsWith('image/') || file.size < 3000000) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 3000;
        const MAX_HEIGHT = 3000;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width = width * ratio;
          height = height * ratio;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert the canvas drawing into an optimized 85% JPEG blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Ensure the extension matches the new mime type 
              const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
              const compressedFile = new File([blob], newName, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file); // fallback if blob generation fails
            }
          },
          'image/jpeg',
          0.85
        );
      };
      img.onerror = () => resolve(file); // fallback on load error
    };
    reader.onerror = () => resolve(file); // fallback on read error
  });
};

export default function UploadPage() {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [fileCount, setFileCount] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);
  const fileInputRef = useRef(null);

  const processFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    setFileCount(files.length);
    setUploadedCount(0);

    const objectUrl = URL.createObjectURL(files[0]);
    setPreviewSrc(objectUrl);
    setLoading(true);
    setStatus('');

    try {
      const failedFiles = [];
      let successfulCount = 0;

      for (let i = 0; i < files.length; i++) {
        // Compress the image before generating FormData
        const optimizedFile = await compressImage(files[i]);
        
        const formData = new FormData();
        formData.append('photos', optimizedFile);

        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) throw new Error('failed');
          
          successfulCount++;
          setUploadedCount(successfulCount);
        } catch (e) {
          failedFiles.push(files[i].name);
        }
      }
      
      if (failedFiles.length > 0) {
        setStatus(successfulCount === 0 ? 'error' : `partial:${failedFiles.join(', ')}`);
      } else {
        setStatus('success');
      }
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
      if (!loading && status !== 'success' && !status.startsWith('partial:')) setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (loading || status === 'success' || status.startsWith('partial:')) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const resetState = () => {
    setStatus('');
    setPreviewSrc(null);
    setFileCount(0);
    setUploadedCount(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isSuccessState = status === 'success' || status.startsWith('partial:');

  return (
    <main className="upload-container" onDragEnter={handleDrag}>
      <h1>Add Photos</h1>
      <p>Upload new images to the daily rotation pool. Bulk uploads supported.</p>
      
      {isSuccessState ? (
        <div className="success-state">
          {status === 'success' ? (
            <div className="success-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
          ) : (
            <div className="success-icon" style={{ borderColor: '#fca5a5', color: '#fca5a5' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
          )}
          
          <h2>{status === 'success' ? 'Upload Complete!' : 'Upload Partial Success'}</h2>
          <p style={{ margin: '10px 0 0 0' }}>{uploadedCount} photo{uploadedCount !== 1 ? 's have' : ' has'} been added to the pool.</p>
          
          {status.startsWith('partial:') && (
            <p style={{ color: '#fca5a5', marginTop: '10px', fontSize: '14px', maxWidth: '300px' }}>
              Failed: {status.split(':')[1]}
            </p>
          )}

          <button 
            className="btn" 
            style={{ marginTop: '30px' }}
            onClick={resetState}
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
                      Uploading {Math.min(uploadedCount + 1, fileCount)} of {fileCount} photos...
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
