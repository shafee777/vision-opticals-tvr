const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const { initSchema } = require('./db/database');
const blobService = require('./services/blobService');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve static files from public directory if running as standalone server
app.use(express.static(config.PUBLIC_DIR));

// Serve Netlify Blobs / disk uploads directly at /uploads/:filename
app.get('/uploads/:filename', async (req, res, next) => {
  try {
    const filename = path.basename(req.params.filename);
    const blob = await blobService.getBlob(filename);
    if (blob && blob.buffer) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.send(blob.buffer);
    }
  } catch (_) {}
  next();
});

// Explicit route for /admin and any sub-path -> serves admin.html
app.get(/^\/admin(\/.*)?$/, (req, res) => {
  res.sendFile(path.join(config.PUBLIC_DIR, 'admin.html'));
});

// API Router
const apiRouter = express.Router();
apiRouter.use('/auth', require('./routes/auth.routes'));
apiRouter.use('/products', require('./routes/products.routes'));
apiRouter.use('/categories', require('./routes/categories.routes'));
apiRouter.use('/inventory', require('./routes/inventory.routes'));
apiRouter.use('/offers', require('./routes/offers.routes'));
apiRouter.use('/content', require('./routes/content.routes'));
apiRouter.use('/settings', require('./routes/settings.routes'));
apiRouter.use('/upload', require('./routes/upload.routes'));
apiRouter.use('/bulk', require('./routes/bulk.routes'));
apiRouter.use('/appointments', require('./routes/appointments.routes'));
apiRouter.use('/orders', require('./routes/orders.routes'));
apiRouter.use('/components', require('./routes/components.routes'));

apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    store: 'Vision Opticals',
    engine: 'Netlify Server / Node.js',
    timestamp: new Date().toISOString()
  });
});

// Mount API router at both /api (standard) and / (fail-safe for Netlify function redirects)
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Server for local dev or traditional hosting
async function startServer() {
  await initSchema();
  return new Promise((resolve) => {
    const server = app.listen(config.PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 Vision Opticals Server Running on port ${config.PORT}`);
      console.log(`🌐 Customer Website: http://localhost:${config.PORT}/`);
      console.log(`👑 Admin Dashboard:  http://localhost:${config.PORT}/admin`);
      console.log(`======================================================\n`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
