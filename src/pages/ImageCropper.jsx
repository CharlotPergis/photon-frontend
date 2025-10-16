// src/pages/ImageCropper.jsx
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './ImageCropper.css';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

const ImageCropper = ({ image, onCropComplete, onCancel }) => {
  const [isCropping, setIsCropping] = useState(false);
  
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const cropBoxRef = useRef(null);
  
  // Use refs for all dynamic values to avoid React re-renders during drag
  const cropRef = useRef({ x: 100, y: 100, width: 300, height: 200 });
  const isDraggingRef = useRef(false);
  const activeHandleRef = useRef(null);
  const startRef = useRef({ x: 0, y: 0, crop: null });
  const rafIdRef = useRef(null);

  // Initialize crop box position
  useEffect(() => {
    if (containerRef.current && cropBoxRef.current) {
      updateCropBoxStyle();
    }
  }, []);

  // Update the visual crop box without React re-renders
  const updateCropBoxStyle = () => {
    if (!cropBoxRef.current) return;
    
    const crop = cropRef.current;
    cropBoxRef.current.style.left = `${crop.x}px`;
    cropBoxRef.current.style.top = `${crop.y}px`;
    cropBoxRef.current.style.width = `${crop.width}px`;
    cropBoxRef.current.style.height = `${crop.height}px`;
  };

  // Main movement handler - optimized for performance
  const handleMove = (clientX, clientY) => {
    if (!isDraggingRef.current || !startRef.current.crop || !containerRef.current) return;
    
    // Cancel any pending animation frame
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    
    // Use requestAnimationFrame for smooth 60fps updates
    rafIdRef.current = requestAnimationFrame(() => {
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      
      // Get position relative to container
      const currentX = clientX - rect.left;
      const currentY = clientY - rect.top;
      
      const deltaX = currentX - startRef.current.x;
      const deltaY = currentY - startRef.current.y;
      
      const startCrop = startRef.current.crop;
      const newCrop = { ...startCrop };

      // Ultra-simple drag logic - minimal calculations
      switch (activeHandleRef.current) {
        case 'move':
          newCrop.x = startCrop.x + deltaX;
          newCrop.y = startCrop.y + deltaY;
          break;
        case 'nw':
          newCrop.x = startCrop.x + deltaX;
          newCrop.y = startCrop.y + deltaY;
          newCrop.width = startCrop.width - deltaX;
          newCrop.height = startCrop.height - deltaY;
          break;
        case 'ne':
          newCrop.y = startCrop.y + deltaY;
          newCrop.width = startCrop.width + deltaX;
          newCrop.height = startCrop.height - deltaY;
          break;
        case 'sw':
          newCrop.x = startCrop.x + deltaX;
          newCrop.width = startCrop.width - deltaX;
          newCrop.height = startCrop.height + deltaY;
          break;
        case 'se':
          newCrop.width = startCrop.width + deltaX;
          newCrop.height = startCrop.height + deltaY;
          break;
        case 'n':
          newCrop.y = startCrop.y + deltaY;
          newCrop.height = startCrop.height - deltaY;
          break;
        case 's':
          newCrop.height = startCrop.height + deltaY;
          break;
        case 'w':
          newCrop.x = startCrop.x + deltaX;
          newCrop.width = startCrop.width - deltaX;
          break;
        case 'e':
          newCrop.width = startCrop.width + deltaX;
          break;
        default:
          return;
      }

      // Simple bounds checking
      const maxX = rect.width - newCrop.width;
      const maxY = rect.height - newCrop.height;
      
      newCrop.x = newCrop.x < 0 ? 0 : newCrop.x > maxX ? maxX : newCrop.x;
      newCrop.y = newCrop.y < 0 ? 0 : newCrop.y > maxY ? maxY : newCrop.y;
      newCrop.width = newCrop.width < 50 ? 50 : newCrop.width;
      newCrop.height = newCrop.height < 50 ? 50 : newCrop.height;

      // Update ref and visual style directly - no React state!
      cropRef.current = newCrop;
      updateCropBoxStyle();
    });
  };

  // Event handlers setup
  useEffect(() => {
    const handleMouseMove = (e) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleEnd = () => {
      isDraggingRef.current = false;
      activeHandleRef.current = null;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('touchcancel', handleEnd);

    return () => {
      // Cleanup
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('touchcancel', handleEnd);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Start dragging
  const handleStart = (clientX, clientY, handleType) => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const startX = clientX - rect.left;
    const startY = clientY - rect.top;
    
    isDraggingRef.current = true;
    activeHandleRef.current = handleType;
    startRef.current = {
      x: startX,
      y: startY,
      crop: { ...cropRef.current }
    };
  };

  // Mouse handlers
  const handleMouseDown = (e, handleType) => {
    e.preventDefault();
    e.stopPropagation();
    handleStart(e.clientX, e.clientY, handleType);
  };

  // Touch handlers
  const handleTouchStart = (e, handleType) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.touches.length === 1) {
      handleStart(e.touches[0].clientX, e.touches[0].clientY, handleType);
    }
  };

  const handleCrop = async () => {
    if (!image || !imageRef.current) return;
    
    setIsCropping(true);
    try {
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const img = imageRef.current;
      
      const scaleX = img.naturalWidth / rect.width;
      const scaleY = img.naturalHeight / rect.height;
      
      const imageCrop = {
        x: Math.round(cropRef.current.x * scaleX),
        y: Math.round(cropRef.current.y * scaleY),
        width: Math.round(cropRef.current.width * scaleX),
        height: Math.round(cropRef.current.height * scaleY)
      };

      const formData = new FormData();
      formData.append('image', image);
      formData.append('x', imageCrop.x);
      formData.append('y', imageCrop.y);
      formData.append('width', imageCrop.width);
      formData.append('height', imageCrop.height);
      
      const response = await axios.post(`${BASE_URL}/crop_image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success && onCropComplete) {
        onCropComplete(response.data);
      }
    } catch (error) {
      console.error('Crop failed:', error);
      alert('Crop failed. Please try again.');
    } finally {
      setIsCropping(false);
    }
  };

  if (!image) return null;

  return (
    <div className="image-cropper-overlay">
      <div className="image-cropper-modal">
        <div className="cropper-header">
          <h3>✂️ Crop Image</h3>
          <button className="btn ghost" onClick={onCancel}>✕</button>
        </div>
        
        <div className="cropper-content">
          <div className="crop-instructions">
            <p>🎯 <strong>Drag the box</strong> to move</p>
            <p>📐 <strong>Drag the circles</strong> to resize</p>
          </div>
          
          <div className="crop-preview-container">
            <div className="crop-preview" ref={containerRef}>
              <img
                ref={imageRef}
                src={URL.createObjectURL(image)}
                alt="Crop preview"
              />
              
              {/* Crop Box - using ref for direct DOM manipulation */}
              <div 
                ref={cropBoxRef}
                className="crop-box"
                onMouseDown={(e) => handleMouseDown(e, 'move')}
                onTouchStart={(e) => handleTouchStart(e, 'move')}
              >
                {/* Corner Handles */}
                <div 
                  className="crop-handle handle-nw" 
                  onMouseDown={(e) => handleMouseDown(e, 'nw')}
                  onTouchStart={(e) => handleTouchStart(e, 'nw')}
                />
                <div 
                  className="crop-handle handle-ne" 
                  onMouseDown={(e) => handleMouseDown(e, 'ne')}
                  onTouchStart={(e) => handleTouchStart(e, 'ne')}
                />
                <div 
                  className="crop-handle handle-sw" 
                  onMouseDown={(e) => handleMouseDown(e, 'sw')}
                  onTouchStart={(e) => handleTouchStart(e, 'sw')}
                />
                <div 
                  className="crop-handle handle-se" 
                  onMouseDown={(e) => handleMouseDown(e, 'se')}
                  onTouchStart={(e) => handleTouchStart(e, 'se')}
                />
                
                {/* Side Handles */}
                <div 
                  className="crop-handle handle-n" 
                  onMouseDown={(e) => handleMouseDown(e, 'n')}
                  onTouchStart={(e) => handleTouchStart(e, 'n')}
                />
                <div 
                  className="crop-handle handle-s" 
                  onMouseDown={(e) => handleMouseDown(e, 's')}
                  onTouchStart={(e) => handleTouchStart(e, 's')}
                />
                <div 
                  className="crop-handle handle-w" 
                  onMouseDown={(e) => handleMouseDown(e, 'w')}
                  onTouchStart={(e) => handleTouchStart(e, 'w')}
                />
                <div 
                  className="crop-handle handle-e" 
                  onMouseDown={(e) => handleMouseDown(e, 'e')}
                  onTouchStart={(e) => handleTouchStart(e, 'e')}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="cropper-actions">
          <button className="btn ghost" onClick={onCancel}>
            Cancel
          </button>
          <button 
            className="btn primary" 
            onClick={handleCrop}
            disabled={isCropping}
          >
            {isCropping ? 'Cropping...' : 'Crop Image'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;