// Client-side media optimization run BEFORE anything is uploaded to storage.
//
// Goals (from the client request):
//   • Images an admin uploads are transcoded to WebP in the browser so they're
//     tiny and render instantly in gameplay. The heavy original (JPG/PNG/HEIC…)
//     is never uploaded — only the WebP blob leaves the device.
//   • Videos get a WebP "poster" frame grabbed from the first frame so the media
//     box shows an image INSTANTLY while the (streamed, preload=metadata) video
//     loads in the background. The original video is kept as-is (browsers can't
//     re-encode video without a heavyweight ffmpeg.wasm dependency).
//
// Everything degrades gracefully: if a conversion fails for any reason we fall
// back to the original file so an upload is never blocked.

const IMAGE_MAX_DIM = 1600; // px — plenty for the on-screen media box (600×320)
const IMAGE_QUALITY = 0.82;
const POSTER_MAX_DIM = 1280;
const POSTER_QUALITY = 0.8;

// Swap a filename's extension (keeps the original stem for readability).
function rename(name, ext) {
  return `${name.replace(/\.[^.]+$/, '')}.${ext}`;
}

// Canvas → File(webp). Falls back to JPEG if the browser somehow lacks WebP.
function canvasToWebpFile(canvas, baseName, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Canvas export failed'));
        const isWebp = blob.type === 'image/webp';
        resolve(new File([blob], rename(baseName, isWebp ? 'webp' : 'jpg'), { type: blob.type }));
      },
      'image/webp',
      quality
    );
  });
}

// Scale (w,h) so the longest edge is <= maxDim, never enlarging.
function fitDimensions(w, h, maxDim) {
  const scale = Math.min(1, maxDim / Math.max(w, h));
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

/**
 * Transcode an uploaded image File to a downscaled WebP File.
 * Returns the original File untouched on any failure (or if already WebP+small).
 */
export async function imageToWebp(file) {
  if (!file || !file.type?.startsWith('image/')) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const { w, h } = fitDimensions(bitmap.width, bitmap.height, IMAGE_MAX_DIM);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const webp = await canvasToWebpFile(canvas, file.name, IMAGE_QUALITY);
    // Only keep the conversion if it actually saved space.
    return webp.size < file.size ? webp : file;
  } catch (e) {
    console.warn('imageToWebp failed, using original:', e.message);
    return file;
  }
}

/**
 * Grab the first frame of a video as a WebP poster File so the media area can
 * paint instantly while the real video streams in. Returns null on failure
 * (caller then just shows the video with no poster).
 */
export function videoPoster(file) {
  return new Promise((resolve) => {
    if (!file || !file.type?.startsWith('video/')) return resolve(null);
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    const cleanup = () => URL.revokeObjectURL(url);
    const fail = (e) => {
      console.warn('videoPoster failed:', e?.message || e);
      cleanup();
      resolve(null);
    };

    video.onloadeddata = () => {
      // Seek a hair past 0 so we land on a real, non-black frame.
      try {
        video.currentTime = Math.min(0.1, (video.duration || 1) / 2);
      } catch {
        fail('seek');
      }
    };
    video.onseeked = async () => {
      try {
        const { w, h } = fitDimensions(video.videoWidth, video.videoHeight, POSTER_MAX_DIM);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(video, 0, 0, w, h);
        const poster = await canvasToWebpFile(canvas, rename(file.name, 'poster'), POSTER_QUALITY);
        cleanup();
        resolve(poster);
      } catch (e) {
        fail(e);
      }
    };
    video.onerror = fail;
  });
}
