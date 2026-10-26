import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './src/server/routes/apiRouter.ts';
import tlmRouter from './src/server/routes/tlmRouter.ts';
import { EmpresaStorageService } from './src/server/services/empresaStorageService.ts';
import { ExcelService } from './src/server/services/excelService.ts';
import { CloudSqlService } from './src/server/services/cloudSqlService.ts';
import { db } from './src/server/storage/dataStore.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Inicializar conexión en línea a Google Cloud SQL (PostgreSQL)
  try {
    await CloudSqlService.initAndSeed();
    await CloudSqlService.syncCloudSqlToDataStore(db);
    console.log(`[Consola TLM] Conexión en línea con Google Cloud SQL sincronizada y activa.`);
  } catch (err) {
    console.warn(`[Consola TLM] Aviso al inicializar Cloud SQL:`, err);
  }

  // Almacenamiento documental por empresa (Drive / unidad compartida / local)
  try {
    await EmpresaStorageService.inicializar();
    const cred = EmpresaStorageService.credenciales();
    console.log(`[Consola TLM] Almacenamiento por empresa listo. Google Drive: ${cred.modo ? `${cred.modo} (${cred.cuenta})` : 'sin credenciales, se usa almacenamiento local'}.`);
  } catch (err) {
    console.warn(`[Consola TLM] Aviso al inicializar el almacenamiento por empresa:`, err);
  }

  // Generar base de datos en formato Excel (.xlsx) maestra al iniciar
  try {
    const { filePathPublic } = ExcelService.generarLibroCompleto(db);
    console.log(`[Consola TLM] Base de datos Excel generada exitosamente en ${filePathPublic}`);
  } catch (err) {
    console.warn(`[Consola TLM] Advertencia generando Excel al inicio:`, err);
  }

  // Servir archivos estáticos de /public (para descarga directa de Excel y recursos)
  app.use(express.static(path.resolve(__dirname, 'public')));

  // API v1 Routers
  app.use('/api/v1', tlmRouter);
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Consola TLM] Servidor unificado ejecutándose en http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Error arrancando el servidor Consola TLM:", err);
  process.exit(1);
});
