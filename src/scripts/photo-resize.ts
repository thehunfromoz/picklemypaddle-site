/**
 * Shrink a paddle photo in the browser before upload (SCRUM-66): at most 2560 px on the long
 * edge, JPEG at quality 0.85, upright (the camera's orientation applied). Phone photos drop from
 * several MB to a few hundred KB, so uploads are quick on a court-side mobile connection.
 *
 * Never blocks an order: if anything here fails (an old browser, an odd file), the original is
 * sent and the server's own limits and re-encoding still apply.
 */
import { MAX_PHOTO_EDGE } from '../lib/order';

export const RESIZE_QUALITY = 0.85;

export async function shrinkPhoto(file: File, maxEdge = MAX_PHOTO_EDGE, quality = RESIZE_QUALITY): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.fillStyle = '#ffffff'; // transparent PNG areas become white, as on the server
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    canvas.width = canvas.height = 0; // free the pixels now (iOS keeps canvas memory around)
    if (!blob || blob.size === 0) return file;
    // A photo that was already small: keep whichever file is smaller.
    if (scale === 1 && file.type === 'image/jpeg' && blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]*$/, '') || 'photo'}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
