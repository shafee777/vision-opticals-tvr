const express = require('express');
const router = express.Router();
const path = require('path');
const { requireAuth } = require('../middleware/auth');
const { uploadImages } = require('../middleware/upload');
const { processAndSaveImage } = require('../services/imageService');
const blobService = require('../services/blobService');

// POST /api/upload — Single or multi-file upload
router.post('/', requireAuth, uploadImages.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No image files provided.' });
    }

    const savedImages = [];
    for (const file of req.files) {
      const result = await processAndSaveImage(file.buffer, file.originalname);
      savedImages.push(result);
    }

    res.json({
      success: true,
      message: `Successfully uploaded and saved ${savedImages.length} image(s)!`,
      images: savedImages,
      files: savedImages,
      url: savedImages[0].url,
      thumbnailUrl: savedImages[0].thumbnailUrl
    });
  } catch (err) {
    console.error('Upload processing error:', err);
    res.status(500).json({ success: false, message: 'Upload failed: ' + err.message });
  }
});

// GET /api/upload/raw/:filename — Serve image from Netlify Blobs or disk
router.get('/raw/:filename', async (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const blob = await blobService.getBlob(filename);

    if (!blob || !blob.buffer) {
      return res.status(404).json({ success: false, message: 'Image not found.' });
    }

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(blob.buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/upload/library — Photo library listing
router.get('/library', requireAuth, async (req, res) => {
  try {
    const allImages = await blobService.listBlobs();

    res.json({
      success: true,
      count: allImages.length,
      images: allImages,
      files: allImages
    });
  } catch (err) {
    console.error('Error fetching image library:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/upload — Delete an uploaded image file
router.delete('/', requireAuth, async (req, res) => {
  try {
    const rawTarget = req.body.url || req.body.filename;
    if (!rawTarget) {
      return res.status(400).json({ success: false, message: 'Image URL or filename is required.' });
    }

    const filename = path.basename(rawTarget);
    await blobService.deleteBlob(filename);

    res.json({ success: true, message: 'Photo deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
