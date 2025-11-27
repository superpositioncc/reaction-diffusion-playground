//==============================================================
//  EXPORT
//  - Functions to export images or other data from the
//    simulation.
//==============================================================

import parameterValues from './parameterValues';
import JSZip from 'jszip';

export function exportImage() {
  const link = document.createElement('a');
  link.download = 'reaction-diffusion-' + Date.now() + '.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// Capture a single frame and store it for later ZIP export
export function captureFrame(frameNumber, prefix = 'frame_') {
  return new Promise((resolve) => {
    const paddedNumber = String(frameNumber).padStart(5, '0');
    const filename = `${prefix}${paddedNumber}.png`;
    
    // Get the canvas data as a blob
    canvas.toBlob((blob) => {
      resolve({ filename, blob });
    }, 'image/png');
  });
}

// Create and download ZIP file with all captured frames
export function downloadZip(frames, prefix = 'reaction-diffusion') {
  const zip = new JSZip();
  
  // Add each frame to the ZIP
  frames.forEach((frame) => {
    zip.file(frame.filename, frame.blob);
  });
  
  // Generate and download the ZIP
  zip.generateAsync({ type: 'blob' }).then((content) => {
    const link = document.createElement('a');
    link.download = `${prefix}-${Date.now()}.zip`;
    link.href = URL.createObjectURL(content);
    link.click();
    URL.revokeObjectURL(link.href);
  });
}