const serverless = require('serverless-http');
const { app } = require('../../server/index');
const { initSchema } = require('../../server/db/database');

let initialized = false;

const serverlessHandler = serverless(app);

exports.handler = async (event, context) => {
  // Allow Lambda to finish immediately when response is sent
  context.callbackWaitsForEmptyEventLoop = false;

  // Initialize Netlify Managed PostgreSQL schema on first cold start
  if (!initialized) {
    try {
      await initSchema();
      initialized = true;
    } catch (err) {
      console.error('Netlify function init error:', err);
    }
  }

  // Normalize path if Netlify function was called directly
  if (event.path && event.path.startsWith('/.netlify/functions/api')) {
    event.path = event.path.replace(/^\/\.netlify\/functions\/api/, '') || '/';
  }

  return await serverlessHandler(event, context);
};
