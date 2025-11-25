import { Hono } from 'hono';
import { showRoutes } from 'hono/dev';
import { Glob } from 'bun';

import { supabaseMiddleware } from '../lib/auth';
import { healthRouter } from './health';

const app = new Hono();

// Apply Supabase middleware globally
app.use('*', supabaseMiddleware());

// Health check routes (must be before auth routes)
app.route('/', healthRouter);

app.get('/api/hello', (c) => {
  return c.text('hello vehicle-service');
});

async function loadRoutes() {
  // **Auto-import and register routes with + (inspired by svelte)**
  const glob = new Glob('./**/+routes.*.ts');
  const files = glob.scanSync('./src');

  // Scans the current working directory and each of its sub-directories recursively
  for (const file of files) {
    console.log(`Registering routes from ${file.replace('./', 'src/')}`);

    const module = await import(file);

    if (module.router && module.basePath) {
      app.route(module.basePath, module.router);
    }
  }
}

await loadRoutes();

showRoutes(app);

export default app;
