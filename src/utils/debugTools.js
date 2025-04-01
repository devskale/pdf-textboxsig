/**
 * Utility to debug PDF rendering and download issues
 */

// Check if PDF elements are rendering properly
export function debugBoxRendering(boxElements) {
  console.group('Debug Box Rendering');
  
  if (!boxElements || boxElements.length === 0) {
    console.error('No box elements found for rendering');
    console.groupEnd();
    return false;
  }
  
  console.log(`Found ${boxElements.length} box elements to render`);
  
  // Check if boxes have proper dimensions and positioning
  boxElements.forEach((box, index) => {
    console.log(`Box ${index}:`, {
      width: box.width || box.style?.width,
      height: box.height || box.style?.height,
      x: box.x || box.style?.left,
      y: box.y || box.style?.top,
      visible: box.style?.display !== 'none',
      content: box.textContent || box.innerText
    });
  });
  
  console.groupEnd();
  return true;
}

// Debug download functionality
export function debugDownload(pdfData, filename) {
  console.group('Debug Download');
  
  if (!window.download) {
    console.error('Download function is not available');
    console.groupEnd();
    return false;
  }
  
  if (!pdfData) {
    console.error('No PDF data available for download');
    console.groupEnd();
    return false;
  }
  
  console.log('PDF data size:', pdfData.length || pdfData.byteLength || 'unknown');
  console.log('Filename:', filename);
  
  // Check if PDF data is valid
  const isPDFHeader = (pdfData.indexOf && pdfData.indexOf('%PDF-') === 0) || 
                      (pdfData.byteLength && new Uint8Array(pdfData).slice(0, 5).toString() === '%PDF-');
  
  if (!isPDFHeader) {
    console.warn('PDF data may not be valid (missing %PDF- header)');
  }
  
  console.groupEnd();
  return true;
}

// Monitor PDF library initialization
export function monitorPDFLibs() {
  console.group('PDF Libraries Check');
  
  // Check PDFLib
  if (window.PDFLib) {
    console.log('PDFLib loaded:', {
      PDFDocument: typeof window.PDFLib.PDFDocument === 'function',
      rgb: typeof window.PDFLib.rgb === 'function',
      StandardFonts: !!window.PDFLib.StandardFonts
    });
  } else {
    console.error('PDFLib not loaded');
  }
  
  // Check pdfjsLib
  if (window.pdfjsLib) {
    console.log('pdfjsLib loaded:', {
      getDocument: typeof window.pdfjsLib.getDocument === 'function',
      version: window.pdfjsLib.version
    });
  } else {
    console.error('pdfjsLib not loaded');
  }
  
  console.groupEnd();
  
  return {
    pdfLibOk: window.PDFLib && typeof window.PDFLib.PDFDocument === 'function',
    pdfjsLibOk: window.pdfjsLib && typeof window.pdfjsLib.getDocument === 'function',
    downloadOk: typeof window.download === 'function'
  };
}
