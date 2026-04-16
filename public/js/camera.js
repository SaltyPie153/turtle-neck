const token = localStorage.getItem('token');

if (!token) {
  window.location.replace('/login.html');
}

const cameraPreview = document.getElementById('cameraPreview');
const videoPlaceholder = document.getElementById('videoPlaceholder');
const startCameraBtn = document.getElementById('startCameraBtn');
const stopCameraBtn = document.getElementById('stopCameraBtn');
const cameraState = document.getElementById('cameraState');
const cameraResolution = document.getElementById('cameraResolution');
const previewTime = document.getElementById('previewTime');
const cameraMessage = document.getElementById('cameraMessage');

let stream = null;
let previewTimer = null;
let previewStartedAt = null;

function setMessage(text, type = 'info') {
  cameraMessage.textContent = text;
  cameraMessage.className = `message ${type}`;
}

function setIdleState() {
  cameraState.textContent = 'Idle';
  cameraResolution.textContent = '-';
  previewTime.textContent = '-';
  videoPlaceholder.style.display = 'grid';
  cameraPreview.style.display = 'none';
  startCameraBtn.disabled = false;
  stopCameraBtn.disabled = true;
}

function clearPreviewTimer() {
  if (previewTimer) {
    clearInterval(previewTimer);
    previewTimer = null;
  }
}

function updatePreviewTime() {
  if (!previewStartedAt) {
    previewTime.textContent = '-';
    return;
  }

  const elapsedSeconds = Math.floor((Date.now() - previewStartedAt) / 1000);
  previewTime.textContent = `${elapsedSeconds}s`;
}

function stopStreamTracks() {
  if (!stream) {
    return;
  }

  stream.getTracks().forEach((track) => track.stop());
  stream = null;
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    setMessage('This browser does not support getUserMedia.', 'error');
    return;
  }

  try {
    stopStreamTracks();

    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    cameraPreview.srcObject = stream;
    await cameraPreview.play();

    const settings = stream.getVideoTracks()[0]?.getSettings() || {};

    videoPlaceholder.style.display = 'none';
    cameraPreview.style.display = 'block';
    cameraState.textContent = 'Running';
    cameraResolution.textContent =
      settings.width && settings.height
        ? `${settings.width} x ${settings.height}`
        : 'Detected';
    startCameraBtn.disabled = true;
    stopCameraBtn.disabled = false;

    previewStartedAt = Date.now();
    updatePreviewTime();
    clearPreviewTimer();
    previewTimer = setInterval(updatePreviewTime, 1000);

    setMessage('Camera is live. This page is ready for posture status integration.', 'success');
  } catch (error) {
    stopStreamTracks();
    clearPreviewTimer();
    previewStartedAt = null;
    setIdleState();
    setMessage(
      error?.name === 'NotAllowedError'
        ? 'Camera permission was denied. Allow access and try again.'
        : 'Failed to start the camera preview.',
      'error'
    );
  }
}

function stopCamera() {
  stopStreamTracks();
  clearPreviewTimer();
  previewStartedAt = null;
  cameraPreview.srcObject = null;
  setIdleState();
  setMessage('Camera preview stopped.', 'info');
}

startCameraBtn.addEventListener('click', startCamera);
stopCameraBtn.addEventListener('click', stopCamera);

window.addEventListener('beforeunload', stopStreamTracks);

setIdleState();
