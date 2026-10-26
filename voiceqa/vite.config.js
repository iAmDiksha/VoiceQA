import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { processReportGeneration } from './netlify/functions/generate-report.js';

export default defineConfig(({ mode }) => {
  // Load .env variables in local development
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      {
        name: 'netlify-functions-dev-proxy',
        configureServer(server) {
          server.middlewares.use('/.netlify/functions/generate-report', async (req, res) => {
            const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

            // Handle ping / health check
            if (req.method === 'GET' && req.url.includes('ping=true')) {
              const hasKey = Boolean(apiKey && apiKey.trim().length > 10);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  status: 'ok',
                  aiConfigured: hasKey,
                  defaultModel: 'gemini-1.5-flash',
                  availableModels: ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'],
                })
              );
              return;
            }

            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Method not allowed' }));
              return;
            }

            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', async () => {
              try {
                const parsedBody = body ? JSON.parse(body) : {};
                const result = await processReportGeneration(parsedBody, apiKey);
                res.statusCode = result.status;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(result.body));
              } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message || 'Server error' }));
              }
            });
          });
        },
      },
    ],
  };
});
