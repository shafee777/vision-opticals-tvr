const Jimp = require('jimp');
const path = require('path');
const blobService = require('./blobService');

/**
 * Optimizes an uploaded image buffer, generates a thumbnail, and saves to Netlify Blobs & local storage.
 * @param {Buffer} buffer - File buffer from multer
 * @param {string} originalName - Original uploaded filename
 * @returns {Promise<{url: string, thumbnailUrl: string, filename: string}>}
 */
async function processAndSaveImage(buffer, originalName) {
  const timestamp = Date.now();
  const safeName = path.parse(originalName).name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const filename = `${safeName}_${timestamp}.jpg`;
  const thumbFilename = `thumb_${safeName}_${timestamp}.jpg`;

  try {
    const image = await Jimp.read(buffer);

    // 1. Optimize high-res version (max width 1200px)
    if (image.bitmap.width > 1200) {
      image.resize(1200, Jimp.AUTO);
    }
    image.quality(85);
    const optimizedBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);

    // 2. Generate square thumbnail (320x320 cover)
    const thumb = image.clone();
    thumb.cover(320, 320).quality(80);
    const thumbBuffer = await thumb.getBufferAsync(Jimp.MIME_JPEG);

    // 3. Save to Netlify Blobs & local disk
    await blobService.saveBlob(filename, optimizedBuffer, 'image/jpeg');
    await blobService.saveBlob(thumbFilename, thumbBuffer, 'image/jpeg');

    return {
      url: `uploads/${filename}`,
      thumbnailUrl: `uploads/${thumbFilename}`,
      filename
    };
  } catch (err) {
    console.warn('Image optimization warning, saving original buffer:', err.message);

    // Fallback: save original buffer directly to Netlify Blobs & local disk
    const fallbackFilename = `${safeName}_${timestamp}.jpg`;
    await blobService.saveBlob(fallbackFilename, buffer, 'image/jpeg');

    return {
      url: `uploads/${fallbackFilename}`,
      thumbnailUrl: `uploads/${fallbackFilename}`,
      filename: fallbackFilename
    };
  }
}

module.exports = {
  processAndSaveImage
};
