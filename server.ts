import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './src/server/routes/apiRouter.ts';
import { db } from './src/server/storage/dataStore.ts';
import { mailer } from './src/server/services/mailer.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API v1 Routers
  app.use('/api/v1', apiRouter);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      status: 'online',
      system: 'Consola TLM - Enterprise Fiscal Engine',
      version: '3.0.0',
      node: process.version
    });
  });

  if (!isProd) {
    // Development mode: Mount Vite dev server middleware without websocket HMR
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve built static files
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  // Espera a que los datos se carguen (JSON local o PostgreSQL) antes de atender peticiones
  await db.ready;

  const correo = await mailer.verify();
  console.log(`[Correo] ${correo.ok ? 'OK' : 'ATENCIÓN'}: ${correo.message}`);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Consola TLM] Servidor unificado ejecutándose en http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Error arrancando el servidor Consola TLM:", err);
  if (process.env.DATABASE_URL) {
    console.error("Revisa DATABASE_URL en .env: usuario, clave, host y que termine en ?sslmode=require (Neon).");
  }
  process.exit(1);
});
