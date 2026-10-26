# Consola TLM v4 — Funciones contables y almacenamiento por empresa

Este documento resume lo que se agregó para replicar las funciones de la consola de referencia
y separar la información contable de cada empresa en su propia carpeta o unidad compartida.

## 1. Almacenamiento por empresa

**Dónde se configura:** *Admin Usuarios & Cloud → Carpetas por Empresa (Drive)* y
*Base de Datos & Cloud → Almacenamiento por Empresa* (mismo panel en los dos módulos).

Cada empresa elige un destino:

| Destino | Qué se indica | Uso típico |
| --- | --- | --- |
| Servidor de la consola | Nada (automático) | Pruebas o instalaciones sin Google |
| Carpeta de Google Drive | URL o ID de la carpeta | Una carpeta por cliente |
| Unidad compartida | URL o ID de la unidad compartida | Una unidad por cliente, o una sola con subcarpeta "NIT - Nombre" por empresa |

Al guardar, la consola verifica el acceso y crea esta estructura dentro del espacio de la empresa:

```
<NIT - Nombre>/
  01_Facturas_XML/AAAA-MM/      ZIP y XML originales cargados
  02_Soportes_PDF/AAAA-MM/      ZIP de representaciones gráficas
  03_Auditoria/AAAA-MM/         Auditoria_TLM_*.xlsx
  04_Exportes_ERP/AAAA-MM/      Comprobantes_Contables_*.xlsx (plantilla Siigo)
  05_Conciliaciones/AAAA-MM/    Auxiliar, extracto, reporte y plano de ajustes
  06_Cerebro_Contable/AAAA-MM/  Catálogo PUC y balances de prueba
  07_Respaldos/AAAA-MM/         Respaldo JSON de los datos de la empresa
```

- Cada categoría se puede activar o desactivar ("Archivar automáticamente").
- Un mismo archivo no se duplica si se vuelve a cargar.
- Si el almacenamiento falla, la función contable igual se completa y la interfaz avisa que no se guardó.
- Solo Administrador o Desarrollador cambia el destino; un usuario solo ve y descarga archivos de las
  empresas que tiene asignadas (`empresas_ids`).
- Registro de archivos: tablas `empresa_almacenamiento` y `archivos_empresa` en PostgreSQL
  (se crean solas), con copia en `data/almacenamiento_empresas.json`.

### Credenciales de Google (una sola vez en el servidor)

Opción A — cuenta de servicio (recomendada para unidades compartidas):
1. En Google Cloud, habilite la **Google Drive API** y cree una cuenta de servicio con su clave JSON.
2. Defina `GOOGLE_SERVICE_ACCOUNT_JSON` con el JSON (o `GOOGLE_APPLICATION_CREDENTIALS` con la ruta).
3. Comparta cada unidad compartida con el correo de la cuenta de servicio como **Administrador de contenido**
   (o cada carpeta como **Editor**).
4. Importante: una cuenta de servicio no tiene cuota en "Mi unidad". Use carpetas dentro de una unidad
   compartida, o defina `GOOGLE_DRIVE_IMPERSONATE` (Google Workspace con delegación de dominio), o use la opción B.

Opción B — OAuth de un usuario: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`,
`GOOGLE_OAUTH_REFRESH_TOKEN` (alcance `https://www.googleapis.com/auth/drive`).

## 2. Cargue y Auditoría

- **Subir Archivos**: ZIP (incluso ZIP dentro de ZIP) y XML UBL 2.1 / AttachedDocument.
  Lee todas las líneas, emisor y adquiriente completos. Si el NIT emisor es el de la empresa activa
  la factura es **Venta**; si no, **Compra**. Deduplica por CUFE dentro de cada empresa.
- **Auditoría Excel**: hojas *Consolidado Gerencial* (una fila por factura) y *Detalle Línea a Línea*.
- **Exportar ERP**: plantilla de importación de comprobantes de Siigo (24 columnas). Cada factura es
  un comprobante de partida doble (ingreso/gasto por línea, IVA, retenciones y contrapartida cliente,
  proveedor o banco asignado). Se valida el cuadre antes de descargar; las cuentas de contrapartida
  son editables en el modal.
- **Soportes PDF**: representación gráfica por factura (`n_FACTURA_TERCERO.pdf`) en un ZIP.
- **Asignación masiva**: banco Siigo y ReteFuente sobre las facturas seleccionadas o filtradas.
- Las exportaciones actúan sobre la selección; si no hay selección, sobre lo filtrado; si no hay filtros, sobre todo.

## 3. Conciliación bancaria (por empresa)

- Entradas: auxiliar de la cuenta bancaria exportado de Siigo (Excel/CSV) y extracto (PDF con texto,
  Excel o CSV). Las columnas se detectan por encabezado; el banco se detecta automáticamente.
- Cruce: misma fecha y |valor libros − valor banco| ≤ tolerancia, uno a uno y con el mismo signo.
  "Días de holgura" permite una segunda pasada con fechas cercanas.
- Resultado: tarjetas de saldos (con validación saldo inicial + neto = saldo final), control de descuadre
  y tres listas: conciliadas, faltan en libros, faltan en banco.
- **Crear archivo plano**: comprobantes de ajuste para Siigo. Salidas de dinero → gasto / GMF / IVA;
  entradas → cuenta de ingresos (o rendimientos); los reintegros de 4×1000 reversan el GMF.
- **Descargar Reporte Excel** y **Convertir PDF a Excel**.

## 4. Dashboard y Cerebro Contable

- Dashboard: Ingresos (ventas), Gastos (compras), Margen bruto, ReteFuente F350; evolución por
  Día / Quincena / Mes y Top 5 de proveedores por gasto.
- Cerebro Contable: *Sincronizar Cuentas* (PUC) y *Sincronizar Saldos* (balance) desde Excel/CSV;
  reemplazan los datos de la empresa activa y archivan el archivo original.

## API nueva (prefijo `/api/v1`)

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/almacenamiento/credenciales` | Estado de credenciales de Google |
| GET | `/almacenamiento/resumen` | Destino, estado y archivos de cada empresa |
| GET / PUT | `/empresas/:id/almacenamiento` | Ver / configurar destino (PUT: admin) |
| POST | `/empresas/:id/almacenamiento/inicializar` | Verificar y crear carpetas (admin) |
| POST | `/empresas/:id/almacenamiento/respaldo` | Respaldo JSON a 07_Respaldos |
| GET | `/empresas/:id/archivos` | Listar archivos (`?categoria=`) |
| GET / DELETE | `/empresas/:id/archivos/:archivoId[/descargar]` | Descargar / eliminar (admin) |
| GET | `/empresas/:id/facturas/auditoria-excel` | Auditoría (`?ids=`) |
| POST | `/empresas/:id/facturas/exportar-erp` | Plano Siigo |
| GET | `/empresas/:id/facturas/soportes-pdf` | ZIP de PDFs (`?ids=`) |
| GET | `/empresas/:id/facturas/:facturaId/pdf` | PDF individual |
| PATCH | `/empresas/:id/facturas/masivo` | Asignación masiva |
| GET | `/empresas/:id/dashboard` | KPIs y series (`?agrupacion=dia\|quincena\|mes`) |
| GET | `/empresas/:id/conciliacion` | Última conciliación |
| POST | `/empresas/:id/conciliacion/ejecutar` | Cruce (multipart: auxiliar, extracto) |
| GET | `/empresas/:id/conciliacion/reporte-excel` | Reporte |
| POST | `/empresas/:id/conciliacion/extracto-a-excel` | PDF → Excel |
| POST | `/empresas/:id/conciliacion/plano-ajustes` | Plano de ajustes Siigo |
| POST / DELETE | `/empresas/:id/cerebro/puc` · `/cerebro/balance` | Sincronizar / eliminar |

Las rutas aceptan el encabezado `x-tlm-user-id` para aplicar permisos por empresa.
