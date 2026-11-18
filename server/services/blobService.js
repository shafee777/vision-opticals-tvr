const path = require('path');
const fs = require('fs');
const config = require('../config');

let getStoreFn;
try {
  const blobs = require('@netlify/blobs');
  getStoreFn = blobs.getStore;
} catch (_) {}

function getStore(name = 'uploads') {
  if (typeof getStoreFn !== 'function') return null;
  try {
    // If in Netlify environment or configured with NETLIFY_BLOBS_CONTEXT
    return getStoreFn(name);
  } catch (e) {
    return null;
  }
}

/**
 * Save an image buffer to Netlify Blobs and local disk
 */
async function saveBlob(filename, buffer, mimeType = 'image/jpeg') {
  let savedToBlob = false;

  const store = getStore('uploads');
  if (store) {
    try {
      await store.set(filename, buffer, {
        metadata: { contentType: mimeType, updatedAt: new Date().toISOString() }
      });
      savedToBlob = true;
    } catch (err) {
      console.warn('Netlify Blobs write warning:', err.message);
    }
  }

  // Also write to local disk if directory exists/writable
  try {
    if (!fs.existsSync(config.UPLOAD_DIR)) {
      fs.mkdirSync(config.UPLOAD_DIR, { recursive: true });
    }
    const filePath = path.join(config.UPLOAD_DIR, filename);
    fs.writeFileSync(filePath, buffer);
  } catch (_) {}

  return { savedToBlob, filename };
}

/**
 * Get an image buffer from local disk or Netlify Blobs
 */
async function getBlob(filename) {
  // 1. Try local disk first
  const localPath = path.join(config.UPLOAD_DIR, filename);
  if (fs.existsSync(localPath)) {
    return {
      buffer: fs.readFileSync(localPath),
      source: 'disk'
    };
  }

  // 2. Try Netlify Blobs
  const store = getStore('uploads');
  if (store) {
    try {
      const data = await store.get(filename, { type: 'arrayBuffer' });
      if (data) {
        return {
          buffer: Buffer.from(data),
          source: 'blob'
        };
      }
    } catch (err) {
      console.warn('Netlify Blobs read error:', err.message);
    }
  }

  return null;
}

/**
 * Delete a blob from Netlify Blobs and local disk
 */
async function deleteBlob(filename) {
  const store = getStore('uploads');
  if (store) {
    try {
      await store.delete(filename);
      await store.delete('thumb_' + filename);
    } catch (_) {}
  }

  try {
    const filePath = path.join(config.UPLOAD_DIR, filename);
    const thumbPath = path.join(config.UPLOAD_DIR, 'thumb_' + filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
  } catch (_) {}
}

/**
 * List all items in the media library (merging Netlify Blobs and local disk)
 */
async function listBlobs() {
  const itemsMap = new Map();

  // 1. Check local disk
  try {
    const listDir = (dir, prefix) => {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      files.filter(f => /\.(jpe?g|png|webp|gif)$/i.test(f) && !f.startsWith('thumb_')).forEach(f => {
        const full = path.join(dir, f);
        const st = fs.statSync(full);
        itemsMap.set(f, {
          name: f,
          url: `${prefix}/${f}`,
          size: st.size,
          updatedAt: st.mtime
        });
      });
    };
    listDir(path.join(config.PUBLIC_DIR, 'images'), 'images');
    listDir(config.UPLOAD_DIR, 'uploads');
  } catch (_) {}

  // 2. Check Netlify Blobs
  const store = getStore('uploads');
  if (store) {
    try {
      const { blobs } = await store.list();
      if (Array.isArray(blobs)) {
        blobs.filter(b => !b.key.startsWith('thumb_')).forEach(b => {
          itemsMap.set(b.key, {
            name: b.key,
            url: `uploads/${b.key}`,
            size: b.size || 0,
            updatedAt: b.uploadedAt || new Date().toISOString()
          });
        });
      }
    } catch (_) {}
  }

  return Array.from(itemsMap.values()).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

module.exports = {
  saveBlob,
  getBlob,
  deleteBlob,
  listBlobs
};
