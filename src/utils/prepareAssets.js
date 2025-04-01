const scripts = [
  {
    name: 'pdfjsLib',
    src: 'https://unpkg.com/pdfjs-dist@2.3.200/build/pdf.min.js',
  },
  {
    name: 'PDFLib',
    src: 'https://unpkg.com/pdf-lib@1.4.0/dist/pdf-lib.min.js',
  },
  {
    name: 'download',
    src: 'https://unpkg.com/downloadjs@1.4.7',
  },
  { name: 'makeTextPDF', src: '/makeTextPDF.js' },
];

const assets = {};
export function getAsset(name) {
  if (assets[name]) return assets[name];
  const script = scripts.find((s) => s.name === name);
  if (!script) throw new Error(`Script ${name} not exists.`);
  return prepareAsset(script);
}

export function prepareAsset({ name, src }) {
  if (assets[name]) return assets[name];
  assets[name] = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => {
      if (!window[name]) {
        const error = `${name} loaded but not available in window scope.`;
        console.error(error);
        reject(error);
        return;
      }
      console.log(`${name} is loaded successfully.`);
      resolve(window[name]);
    };
    script.onerror = (error) => {
      const errorMsg = `The script ${name} didn't load correctly: ${error}`;
      console.error(errorMsg);
      reject(errorMsg);
      alert(`Some scripts did not load correctly (${name}). Please check console for details and reload.`);
    };
    document.body.appendChild(script);
  });
  return assets[name];
}

export default function prepareAssets() {
  console.log('Preparing assets...');
  const promises = scripts.map(prepareAsset);
  
  // Add a global check after all assets are loaded
  Promise.all(promises)
    .then(() => {
      console.log('All scripts loaded successfully');
      // Verify critical dependencies
      if (window.PDFLib && typeof window.PDFLib.PDFDocument === 'function') {
        console.log('PDFLib is working correctly');
      } else {
        console.error('PDFLib is not working correctly');
      }
      
      if (window.download && typeof window.download === 'function') {
        console.log('Download function is available');
      } else {
        console.error('Download function is not available');
      }
    })
    .catch(error => {
      console.error('Failed to load all scripts:', error);
    });
  
  return promises;
}

// out of the box fonts
const fonts = {
  Courier: {
    correction(size, lineHeight) {
      return (size * lineHeight - size) / 2 + size / 6;
    },
  },
  Helvetica: {
    correction(size, lineHeight) {
      return (size * lineHeight - size) / 2 + size / 10;
    },
  },
  "Times-Roman": {
    correction(size, lineHeight) {
      return (size * lineHeight - size) / 2 + size / 7;
    },
  },
};
// Available fonts
export const Fonts = {
  ...fonts,
};

export function fetchFont(name) {
  if (fonts[name]) return fonts[name];
  const font = Fonts[name];
  if (!font) throw new Error(`Font '${name}' not exists.`);
  fonts[name] = fetch(font.src)
    .then((r) => r.arrayBuffer())
    .then((fontBuffer) => {
      const fontFace = new FontFace(name, fontBuffer);
      fontFace.display = "swap";
      fontFace.load().then(() => document.fonts.add(fontFace));
      return {
        ...font,
        buffer: fontBuffer,
      };
    });
  return fonts[name];
}
