# Portal DeCA

Plataforma web para la creación y consulta de **Documentos electrónicos de Control Administrativo (DeCA)**, conforme a:

- Orden FOM/2861/2012 (documento de control administrativo de mercancías).
- Disposición Transitoria 8ª de la Ley 9/2025 de Movilidad Sostenible (digitalización obligatoria a partir del 5 de octubre de 2026).
- Resolución de la Subdirección General de Inspección de Transporte por Carretera y Ferrocarril sobre características de las aplicaciones, documentos, URL y firmas del DeCA.

> Nota de alcance: esta plataforma cubre el **DeCA de mercancías**. El eCMR (carta de porte) es un documento mercantil distinto y no obligatorio, por lo que no forma parte de este proyecto (ver aclaración en la sesión de diseño).

## Qué hace

- Login con usuario/contraseña y tres roles: **Cargador contractual**, **Transportista efectivo** y **Administrador**.
- Creación de DeCA con todos los campos a)-h) de la resolución, incluyendo **agrupación de varios envíos** en un mismo documento (Sexto de la resolución), **conductor** y **cuenta analítica/proyecto**.
- **Flota de vehículos y conductores reutilizable**: cada transportista efectivo da de alta su lista limitada de matrículas y conductores (panel "Flota y conductores"), y se seleccionan de un desplegable al crear/modificar un DeCA — no se escriben a mano.
- Generación de un **PDF nativo digital** (no escaneado) con metadatos de fecha/hora de creación y modificación, tamaño máximo 5MB, y **código QR** con la URL de descarga.
- **URL pública `/d/[docId]`** sin login, sin certificado ni botones — acceso inmediato para control en carretera (Tercero de la resolución). Se desactiva automáticamente a los 7 días naturales tras el fin del servicio, o manualmente desde el panel.
- **Modificación de datos** durante el servicio con las dos modalidades previstas (Quinto de la resolución): actualizar el PDF existente (misma URL/QR) o generar un PDF nuevo (nueva URL/QR). Se puede modificar cualquier dato, incluidos el cargador contractual y el transportista efectivo. Cada modificación exige un motivo y el sistema calcula automáticamente el **diff campo a campo** (p. ej. matrícula anterior → nueva); el **historial completo de todas las modificaciones** (no solo la última) se guarda y se incluye íntegro en el PDF descargado y en la pantalla de detalle.
- **Tres bloques de firma independientes** — Cargador contractual, Transportista efectivo y Destinatario — cada uno con firma electrónica avanzada/cualificada (eIDAS) opcional (Cuarto de la resolución).
- Panel de administración para crear entidades (cargadores/transportistas) y usuarios, y panel de flota/conductores (accesible también al rol Transportista para gestionar su propia flota).

## Stack

Next.js 14 (App Router, TypeScript) + Prisma/SQLite + Tailwind CSS. Autenticación propia con cookie de sesión firmada (JWT, librería `jose`) y contraseñas con `bcryptjs`. PDF con `pdf-lib`, QR con `qrcode`.

SQLite es la base de datos por defecto (fichero local `dev.db`), pensada para arrancar sin dependencias externas. Para producción, cambia `DATABASE_URL` en `.env` a Postgres/MySQL y ajusta `provider` en `prisma/schema.prisma` (los campos "enum" están modelados como `String` precisamente para ser compatibles con SQLite; en Postgres podrían convertirse a enums nativos si se desea).

## Primeros pasos

```bash
npm install
npx prisma generate
npx prisma db push
npm run seed      # crea usuarios y DeCA de demostración
npm run dev        # http://localhost:3000
```

Usuarios de demostración (creados por `npm run seed`):

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | admin@deca-portal.es | Admin1234! |
| Cargador contractual | cargador@deca-portal.es | Cargador1234! |
| Transportista efectivo | transportista@deca-portal.es | Transportista1234! |

**Cambia estas contraseñas y el valor de `AUTH_SECRET` en `.env` antes de usar la plataforma con datos reales.**

## Variables de entorno (`.env`)

- `DATABASE_URL`: cadena de conexión de la base de datos.
- `AUTH_SECRET`: secreto para firmar las cookies de sesión (mínimo 32 caracteres aleatorios).
- `NEXT_PUBLIC_BASE_URL`: URL pública base de la plataforma (se usa para construir la URL codificada en cada QR). **Debe ser HTTPS en producción.**
- `DECA_STORAGE_DIR`: carpeta donde se guardan los PDF generados (por defecto `./storage/deca`).

## Despliegue en producción — requisitos legales a cuidar

1. **HTTPS obligatorio con TLS 1.2 o superior** (Tercero de la resolución). Despliega detrás de un proxy/CDN con TLS termination (Vercel, Cloudflare, nginx con certificado válido, etc.) y actualiza `NEXT_PUBLIC_BASE_URL` a `https://tu-dominio.es`.
2. La ruta pública `/d/[docId]` **no debe protegerse** con autenticación, WAF con challenge interactivo, ni ningún mecanismo que exija interacción manual — debe servir el PDF directamente.
3. Conserva los PDF y sus metadatos **al menos 1 año** (`DECA_STORAGE_DIR` debe apuntar a almacenamiento persistente y respaldado; en despliegues serverless considera un bucket S3/R2 en lugar de disco local).
4. Revisa periódicamente (cron/job) los DeCA activos cuyo `serviceEndDate` + 7 días ya haya pasado para desactivarlos si no se ha hecho ya — el endpoint público ya aplica esta regla en cada petición, pero un job programado puede además liberar almacenamiento o generar informes.

## Estructura del proyecto

```
app/
  (app)/            páginas autenticadas: dashboard, deca (nuevo/detalle/modificar), admin/usuarios, admin/flota
  actions/          Server Actions (login, crear/modificar DeCA, admin, flota)
  d/[docId]/        endpoint público sin autenticación que sirve el PDF
  login/            página de login
lib/
  auth.ts           sesión JWT en cookie httpOnly, hashing de contraseñas
  deca.ts           lógica de negocio: creación, modificación (2 modalidades), diff campo a campo, ventana de 7 días
  pdf.ts            generación del PDF DeCA con QR embebido, 3 firmas e historial completo de modificaciones
  storage.ts         guardado/lectura de los PDF en disco
  constants.ts       roles, estados y demás valores controlados
prisma/
  schema.prisma      modelo de datos (incluye Vehiculo y Conductor, listas reutilizables por transportista)
  seed.ts            datos de demostración (incluye flota, conductores y una cadena de 2 modificaciones)
```

## Flujo recomendado al arrancar

1. Como Administrador (o Transportista), da de alta vehículos y conductores en **Flota y conductores** — son listas limitadas y reutilizables, no texto libre.
2. Al crear un DeCA, elige transportista efectivo primero: los desplegables de vehículo y conductor se filtran automáticamente a su flota.
3. Al modificar un DeCA, cualquier cambio de matrícula, conductor, cargador contractual o transportista efectivo queda registrado automáticamente en el historial (con el valor anterior y el nuevo), sin necesidad de anotarlo aparte.
