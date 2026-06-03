import './style.css';

// --- State ---
let photos = []; // Array of { id, name, wish, imageUrl, date }
let currentStream = null;
let finalImageBase64 = null;

// --- Constants ---
// Define canvas resolution for portrait 3:4 (e.g. 1080x1440 or 1200x1600)
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 1600;

// --- DOM Elements ---
const views = {
  gallery: document.getElementById('view-gallery'),
  camera: document.getElementById('view-camera'),
  preview: document.getElementById('view-preview'),
  share: document.getElementById('view-share'),
};

const galleryEmpty = document.getElementById('gallery-empty');
const galleryGrid = document.getElementById('gallery-grid');

const videoEl = document.getElementById('video');
const cameraError = document.getElementById('camera-error');
const photoCanvas = document.getElementById('photo-canvas');
const previewImage = document.getElementById('preview-image');

// Buttons
const btnOpenCamera = document.getElementById('btn-open-camera');
const btnCloseCamera = document.getElementById('btn-close-camera');
const btnCapture = document.getElementById('btn-capture');
const btnRetake = document.getElementById('btn-retake');
const btnShare = document.getElementById('btn-share');
const btnDownload = document.getElementById('btn-download');
const btnBackGallery = document.getElementById('btn-back-gallery');

// Form
const postForm = document.getElementById('post-form');
const inputName = document.getElementById('guest-name');
const inputWish = document.getElementById('guest-wish');
const btnSubmit = document.getElementById('btn-submit');
const submitText = document.getElementById('submit-text');
const submitLoader = document.getElementById('submit-loader');

// Share
const shareModalContent = document.getElementById('share-modal-content');
const shareImagePreview = document.getElementById('share-image-preview');

// --- Navigation Utils ---
function showView(viewName) {
  // Hide all views
  Object.values(views).forEach(v => {
    v.classList.add('hidden');
    v.classList.remove('flex'); // remove flex if used
  });

  // Show target view
  const target = views[viewName];
  if (viewName === 'camera') {
    target.classList.remove('hidden');
    target.classList.add('flex');
  } else if (viewName === 'share') {
    target.classList.remove('hidden');
    target.classList.add('flex');
    // Animate modal content
    setTimeout(() => {
      shareModalContent.classList.remove('scale-95', 'opacity-0');
      shareModalContent.classList.add('scale-100', 'opacity-100');
    }, 10);
  } else {
    target.classList.remove('hidden');
    target.classList.add('view-enter-active');
  }
}

// --- Gallery Logic ---
function renderGallery() {
  if (photos.length === 0) {
    galleryEmpty.classList.remove('hidden');
    galleryEmpty.classList.add('flex');
    galleryGrid.classList.add('hidden');
  } else {
    galleryEmpty.classList.add('hidden');
    galleryEmpty.classList.remove('flex');
    galleryGrid.classList.remove('hidden');
    
    // Clear and render
    galleryGrid.innerHTML = '';
    
    // Sort newest first
    const sortedPhotos = [...photos].sort((a, b) => b.date - a.date);
    
    sortedPhotos.forEach(photo => {
      const item = document.createElement('div');
      item.className = 'masonry-item bg-white p-3 rounded-xl shadow-sm border border-brand-brown/10 flex flex-col gap-3 transition-transform hover:scale-[1.02] cursor-pointer';
      
      item.innerHTML = `
        <img src="${photo.imageUrl}" alt="Photo by ${photo.name}" class="w-full rounded-lg object-cover bg-gray-100" loading="lazy" />
        <div>
          <h3 class="font-serif font-bold text-sm text-brand-dark">${photo.name}</h3>
          <p class="text-xs text-brand-dark/70 mt-1 italic">"${photo.wish}"</p>
        </div>
      `;
      
      // Could add fullscreen view on click here
      galleryGrid.appendChild(item);
    });
  }
}

// --- Camera Logic ---
async function startCamera() {
  cameraError.classList.add('hidden');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user', // Front camera preferred
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    });
    
    currentStream = stream;
    videoEl.srcObject = stream;
    // Mirror front camera video via CSS class 'transform scale-x-[-1]' handled in HTML
  } catch (err) {
    console.error("Camera error:", err);
    cameraError.classList.remove('hidden');
    cameraError.textContent = "Camera access denied or unavailable. Please check permissions.";
  }
}

function stopCamera() {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
    currentStream = null;
  }
}

// --- Canvas Logic (Frame Composition) ---
function captureAndDrawFrame() {
  if (!currentStream) return;

  photoCanvas.width = CANVAS_WIDTH;
  photoCanvas.height = CANVAS_HEIGHT;
  const ctx = photoCanvas.getContext('2d');

  // 1. Calculate Crop to fit 3:4 aspect ratio
  const videoAspect = videoEl.videoWidth / videoEl.videoHeight;
  const canvasAspect = CANVAS_WIDTH / CANVAS_HEIGHT;
  
  let drawWidth, drawHeight, startX, startY;

  if (videoAspect > canvasAspect) {
    // Video is wider than canvas (landscape camera feed)
    drawHeight = videoEl.videoHeight;
    drawWidth = videoEl.videoHeight * canvasAspect;
    startX = (videoEl.videoWidth - drawWidth) / 2;
    startY = 0;
  } else {
    // Video is taller than canvas
    drawWidth = videoEl.videoWidth;
    drawHeight = videoEl.videoWidth / canvasAspect;
    startX = 0;
    startY = (videoEl.videoHeight - drawHeight) / 2;
  }

  // 2. Draw Video to Canvas
  ctx.save();
  // Mirror the canvas horizontally to match the preview
  ctx.translate(CANVAS_WIDTH, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(videoEl, startX, startY, drawWidth, drawHeight, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.restore();

  // 3. Draw Beautiful Frame Overlay (Using Canvas API instead of CORS-prone images)
  drawFrameOverlay(ctx);

  // 4. Export to Base64
  finalImageBase64 = photoCanvas.toDataURL('image/jpeg', 0.85);
  
  // 5. Update Preview UI
  previewImage.src = finalImageBase64;
  shareImagePreview.src = finalImageBase64;
  
  // Transition View
  stopCamera();
  showView('preview');
}

function drawFrameOverlay(ctx) {
  const padding = 60;
  
  // Draw Outer Border
  ctx.strokeStyle = "#FDFBF7";
  ctx.lineWidth = 40;
  ctx.strokeRect(20, 20, CANVAS_WIDTH - 40, CANVAS_HEIGHT - 40);
  
  // Draw Inner Border
  ctx.strokeStyle = "#8D6E63"; // brand-brown
  ctx.lineWidth = 6;
  ctx.strokeRect(padding, padding, CANVAS_WIDTH - padding * 2, CANVAS_HEIGHT - padding * 2);

  // Thin extra inner border
  ctx.strokeStyle = "#D4AF37"; // gold accent
  ctx.lineWidth = 2;
  ctx.strokeRect(padding + 15, padding + 15, CANVAS_WIDTH - (padding + 15) * 2, CANVAS_HEIGHT - (padding + 15) * 2);

  // Decorative Corner Ornaments
  const cornerSize = 120;
  ctx.strokeStyle = "#8D6E63";
  ctx.lineWidth = 4;
  
  function drawOrnateCorner(cx, cy, mx, my) {
    ctx.beginPath();
    // main L shape
    ctx.moveTo(cx + mx * cornerSize, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + my * cornerSize);
    ctx.stroke();
    
    // Diagonal
    ctx.beginPath();
    ctx.moveTo(cx + mx * 40, cy);
    ctx.lineTo(cx, cy + my * 40);
    ctx.stroke();

    // Circle at the very corner
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fillStyle = "#8D6E63";
    ctx.fill();
    
    // Small dots
    ctx.beginPath();
    ctx.arc(cx + mx * cornerSize, cy, 4, 0, Math.PI * 2);
    ctx.arc(cx, cy + my * cornerSize, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw 4 corners
  drawOrnateCorner(padding + 15, padding + 15, 1, 1); // Top Left
  drawOrnateCorner(CANVAS_WIDTH - padding - 15, padding + 15, -1, 1); // Top Right
  drawOrnateCorner(CANVAS_WIDTH - padding - 15, CANVAS_HEIGHT - padding - 15, -1, -1); // Bottom Right
  drawOrnateCorner(padding + 15, CANVAS_HEIGHT - padding - 15, 1, -1); // Bottom Left

  // Draw Bottom Banner Box
  const bannerHeight = 250;
  ctx.fillStyle = "#FDFBF7"; // Beige
  ctx.fillRect(0, CANVAS_HEIGHT - bannerHeight, CANVAS_WIDTH, bannerHeight);
  
  ctx.beginPath();
  ctx.moveTo(0, CANVAS_HEIGHT - bannerHeight);
  ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - bannerHeight);
  ctx.strokeStyle = "#8D6E63";
  ctx.lineWidth = 4;
  ctx.stroke();

  // Draw Text
  ctx.fillStyle = "#3E2723"; // Dark
  ctx.textAlign = "center";
  
  // Subtitle
  ctx.font = "300 36px Inter";
  ctx.fillText("THE WEDDING OF", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 170);
  
  // Names
  ctx.fillStyle = "#4A0E0E"; // Dark reddish color
  ctx.font = "italic 700 80px 'Playfair Display'";
  ctx.fillText("Asfiyah & Hasan", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 80);
  
  // Date
  ctx.font = "400 30px Inter";
  ctx.fillStyle = "#8D6E63";
  ctx.fillText("14.06.2026", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 40);
}

// --- Mock API API Logic ---
function submitPostMock(name, wish, base64Image) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newPost = {
        id: Date.now().toString(),
        name,
        wish,
        imageUrl: base64Image,
        date: new Date()
      };
      photos.push(newPost);
      resolve(newPost);
    }, 1500); // Simulate network delay
  });
}

// --- Event Listeners ---

// Gallery View
btnOpenCamera.addEventListener('click', () => {
  showView('camera');
  startCamera();
});

// Camera View
btnCloseCamera.addEventListener('click', () => {
  stopCamera();
  showView('gallery');
});

btnCapture.addEventListener('click', () => {
  captureAndDrawFrame();
});

// Preview View
btnRetake.addEventListener('click', () => {
  finalImageBase64 = null;
  postForm.reset();
  showView('camera');
  startCamera();
});

postForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = inputName.value.trim();
  const wish = inputWish.value.trim();
  
  if (!name || !wish || !finalImageBase64) return;

  // UI Loading state
  submitText.classList.add('hidden');
  submitLoader.classList.remove('hidden');
  btnSubmit.disabled = true;

  try {
    await submitPostMock(name, wish, finalImageBase64);
    
    // Success, show share view
    showView('share');
    renderGallery(); // Update gallery in background
  } catch (err) {
    alert("Failed to post moment. Try again.");
  } finally {
    submitText.classList.remove('hidden');
    submitLoader.classList.add('hidden');
    btnSubmit.disabled = false;
    postForm.reset();
  }
});

// Share View
btnBackGallery.addEventListener('click', () => {
  // Hide modal animation
  shareModalContent.classList.remove('scale-100', 'opacity-100');
  shareModalContent.classList.add('scale-95', 'opacity-0');
  
  setTimeout(() => {
    finalImageBase64 = null;
    showView('gallery');
  }, 300);
});

btnShare.addEventListener('click', async () => {
  if (!finalImageBase64) return;
  
  try {
    // Convert base64 to file
    const res = await fetch(finalImageBase64);
    const blob = await res.blob();
    const file = new File([blob], 'asfiyah-hasan-wedding.jpg', { type: 'image/jpeg' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: 'Asfiyah & Hasan Wedding',
        text: 'Sharing a moment from Asfiyah & Hasan\'s Wedding!',
        files: [file]
      });
    } else if (navigator.share) {
      // Fallback if file sharing not supported but text sharing is
      await navigator.share({
        title: 'Asfiyah & Hasan Wedding',
        text: 'Sharing a moment from Asfiyah & Hasan\'s Wedding!',
      });
    } else {
      // Final fallback to download
      triggerDownload();
    }
  } catch (error) {
    console.log('Error sharing', error);
  }
});

btnDownload.addEventListener('click', () => {
  triggerDownload();
});

function triggerDownload() {
  if (!finalImageBase64) return;
  const link = document.createElement('a');
  link.href = finalImageBase64;
  link.download = `Asfiyah_Hasan_Photobooth_${Date.now()}.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// --- Init ---
renderGallery();
