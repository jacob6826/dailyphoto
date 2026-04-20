'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

const compressImage = async (file, maxWidth = 1920, quality = 0.80) => {
  return new Promise((resolve) => {
    // Failsafe is extremely generous (20s) because massive ~24MP JPEGs can take 6-10s to resize securely on canvas
    const timeout = setTimeout(() => {
      console.warn("Compression timed out manually. Continuing with original file.");
      resolve(file);
    }, 20000);
    
    const safeResolve = (val) => { clearTimeout(timeout); resolve(val); };

    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(file.name);
    
    if (!isImage || file.size < 3000000) {
      return safeResolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxWidth) {
            const ratio = Math.min(maxWidth / width, maxWidth / height);
            width = width * ratio;
            height = height * ratio;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert the canvas drawing into an optimized JPEG blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
                const compressedFile = new File([blob], newName, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                safeResolve(compressedFile);
              } else {
                safeResolve(file); 
              }
            },
            'image/jpeg',
            quality
          );
        } catch (e) {
          console.error("Canvas Compression Error:", e);
          safeResolve(file);
        }
      };
      
      img.onerror = () => safeResolve(file); // fallback on load error
      img.src = event.target.result; // SET LAST
    };
    reader.onerror = () => safeResolve(file); // fallback on read error
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
        let currentFile = files[i];
        
        // Massive safeguard: Apple AirDrop famously strips the MIME type and falsely renames pure HEIC binaries to .JPG.
        // Javascript Canvas engines violently crash on "fake" JPGs. We run it securely through a native HEIC decoder first!
        if (currentFile.size > 2000000) {
          try {
            const heic2any = (await import('heic2any')).default;
            const convertedBlob = await heic2any({ blob: currentFile, toType: "image/jpeg" });
            const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
            console.log("Successfully decoded deceptive HEIC binary natively!");
            currentFile = new File([finalBlob], currentFile.name, { type: 'image/jpeg' });
          } catch(e) {
            // Decider strictly rejected it. It is a genuine JPEG/PNG structure natively!
          }
        }

        let optimizedFile = await compressImage(currentFile);
        
        let attempts = 0;
        while (optimizedFile.size > 4400000 && attempts < 2) {
           console.log(`File still too large (${optimizedFile.size}). Re-compressing...`);
           optimizedFile = await compressImage(optimizedFile, 1080, 0.65);
           attempts++;
        }
        
        const formData = new FormData();
        formData.append('photos', optimizedFile);

        try {
          // Absolute hard limit for Netlify Serverless payloads to avoid raw 500 crashes
          if (optimizedFile.size > 4400000) {
            throw new Error(`File compressed to ${(optimizedFile.size / 1000000).toFixed(2)}MB which still exceeds Netlify's absolute 4.4MB limit. Please crop or shrink it manually.`);
          }

          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`[${res.status}] ${errText.slice(0, 50)}`);
          }
          
          successfulCount++;
          setUploadedCount(successfulCount);
        } catch (e) {
          console.log('Upload error message:', e.message);
          failedFiles.push(`${currentFile.name} - ${e.message}`);
        }
      }
      
      if (failedFiles.length > 0) {
        setStatus(`error:${failedFiles.join(', ')}`);
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

  const isEndState = status === 'success' || status.startsWith('partial:') || status.startsWith('error:');

  return (
    <main className="upload-container" onDragEnter={handleDrag}>
      <h1>Add Photos</h1>
      <p>Upload new images to the daily rotation pool. Bulk uploads supported.</p>
      
      {isEndState ? (
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
          
          <h2>{status === 'success' ? 'Upload Complete!' : status.startsWith('partial:') ? 'Upload Partial Success' : 'Upload Failed'}</h2>
          
          {status !== 'error' && !status.startsWith('error:') && (
            <p style={{ margin: '10px 0 0 0' }}>{uploadedCount} photo{uploadedCount !== 1 ? 's have' : ' has'} been added to the pool.</p>
          )}
          
          {(status.startsWith('partial:') || status.startsWith('error:')) && (
            <div style={{ color: '#fca5a5', marginTop: '15px', fontSize: '14px', maxWidth: '400px', textAlign: 'left', background: 'rgba(255,0,0,0.1)', padding: '10px', borderRadius: '8px' }}>
              <strong>Error Details:</strong>
              <p style={{ marginTop: '5px' }}>{status.split(':')[1] || status}</p>
            </div>
          )}

          <button 
            className="btn" 
            style={{ marginTop: '30px' }}
            onClick={resetState}
          >
            Try Again
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
      
      <div>
        <a href="/" className="back-link">Back to Gallery</a>
      </div>
    </main>
  );
}
