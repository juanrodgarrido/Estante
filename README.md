# Estante

Aplicación web progresiva (PWA) para registrar tus lecturas y compartirlas con tus amigos. Se instala en el iPhone desde Safari y funciona como una app nativa.

## Funcionalidades

- Registro e inicio de sesión con email o nombre de usuario
- Búsqueda de libros (Google Books, con Open Library como respaldo)
- Estanterías personales: **Leyendo**, **Pendientes** y **Leídos**, con progreso de páginas y valoración
- Perfil con estadísticas de lectura
- Amigos: solicitudes, perfiles y actividad de lectura
- Chat 1 a 1 en tiempo real entre amigos
- Instalable en iOS, con modo claro y oscuro

## Stack

| Parte | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router), React, TypeScript |
| Estilos | Tailwind CSS, shadcn/ui |
| Base de datos | MongoDB Atlas (driver oficial) |
| Autenticación | Better Auth |
| Libros | Google Books API, Open Library API |
| Tiempo real | Pusher Channels |
| Despliegue | Vercel |

## Puesta en marcha en local

Requisitos: Node.js 20.9 o superior y una cuenta en MongoDB Atlas, Google Cloud (Books API) y Pusher.

```bash
git clone <url-del-repo>
cd estante
npm install
cp .env.example .env.local   # y rellena los valores
npm run dev
```

Abre `http://localhost:3000`.

## Variables de entorno

| Variable | Descripción |
|---|---|
| `MONGODB_URI` | Cadena de conexión de MongoDB Atlas |
| `MONGODB_DB` | Nombre de la base de datos (`estante`) |
| `BETTER_AUTH_SECRET` | Secreto aleatorio (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | URL base de la app (`http://localhost:3000` en local) |
| `GOOGLE_BOOKS_API_KEY` | API key de Google Books |
| `PUSHER_APP_ID` | ID de la app de Pusher |
| `PUSHER_SECRET` | Secreto de Pusher (solo servidor) |
| `NEXT_PUBLIC_PUSHER_KEY` | Clave pública de Pusher |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Cluster de Pusher (`eu`) |

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | Comprobación de tipos |

## Estructura

```
app/          rutas y páginas (App Router)
components/   componentes de interfaz
lib/          utilidades y conexión a la base de datos
server/       lógica de servidor (libros, estantería, amigos, chat)
types/        tipos compartidos
docs/         plan de trabajo y decisiones
```

## Instalar en el iPhone

1. Abre la URL de la app en **Safari**.
2. Pulsa **Compartir** y luego **Añadir a pantalla de inicio**.
3. Abre la app desde el icono.

## Cómo se desarrolla este proyecto

El código lo escribe Claude Code siguiendo `CLAUDE.md` (reglas del proyecto) y `docs/PLAN.md` (fases, prompts y modelo de datos). Cada fase se hace en una sesión con nombre propio:

```bash
claude -n base          # nueva sesión
claude --resume base    # retomar una sesión
```

## Despliegue

La app se despliega en [Vercel](https://vercel.com). Cada `git push` a `main` genera un despliegue de producción; el resto de ramas generan previews.

### Antes de empezar

- El código está subido a GitHub (`origin/main`).
- En MongoDB Atlas, *Network Access* incluye `0.0.0.0/0` (Vercel no tiene IPs fijas).
- Tienes a mano la cadena de conexión de Atlas (`MONGODB_URI`).

### Pasos

1. Entra en [vercel.com/new](https://vercel.com/new) con tu cuenta de GitHub.
2. En *Import Git Repository* elige `Estante`. Si no aparece, pulsa *Adjust GitHub App Permissions* y da acceso al repositorio.
3. Vercel detecta Next.js solo. Deja *Framework Preset* en `Next.js` y no cambies los comandos de build ni el directorio de salida.
4. Antes de pulsar *Deploy*, abre *Environment Variables* y añade las variables de la tabla siguiente (marca *Production*, *Preview* y *Development*, salvo donde se indique).
5. Pulsa **Deploy** y espera a que termine (1-2 minutos). Vercel te dará una URL del tipo `https://estante-xxxx.vercel.app`.
6. Ajusta `BETTER_AUTH_URL` con la URL de producción real:
   1. En *Settings → Environment Variables*, edita `BETTER_AUTH_URL` y pon esa URL, **sin barra final** (por ejemplo `https://estante-xxxx.vercel.app`).
   2. Ve a *Deployments*, abre el menú `…` del último despliegue y pulsa **Redeploy**. Las variables nuevas solo se aplican a los despliegues posteriores.
   3. Si quieres una URL más corta, cámbiala en *Settings → Domains* y actualiza `BETTER_AUTH_URL` con la nueva.
7. Comprueba que funciona: abre `https://<tu-url>/api/health`. Debe responder `{"status":"ok","db":"up"}`. Si devuelve 503, revisa `MONGODB_URI` y *Network Access* en Atlas (los logs están en *Logs* del proyecto).
8. En el iPhone, abre la URL en Safari, pulsa **Compartir → Añadir a pantalla de inicio** y ábrela desde el icono: debe verse a pantalla completa, sin la barra de Safari.

### Variables de entorno en Vercel

| Variable | Valor en producción | Cuándo hace falta |
|---|---|---|
| `MONGODB_URI` | Cadena de conexión de Atlas | Ya (`/api/health`) |
| `MONGODB_DB` | `estante` | Ya |
| `BETTER_AUTH_SECRET` | Un secreto **distinto del local**: `openssl rand -base64 32` | Sesión 3 (auth). Puedes ponerla ya |
| `BETTER_AUTH_URL` | URL de producción, sin barra final (paso 6) | Sesión 3. Puedes ponerla ya |
| `GOOGLE_BOOKS_API_KEY` | API key de Google Books | Sesión 4 (libros) |
| `PUSHER_APP_ID` | ID de la app de Pusher | Sesión 8 (chat) |
| `PUSHER_SECRET` | Secreto de Pusher | Sesión 8 |
| `NEXT_PUBLIC_PUSHER_KEY` | Clave pública de Pusher | Sesión 8 |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | `eu` | Sesión 8 |

Notas:

- Las variables vacías no hace falta crearlas: añade cada una cuando llegue la sesión que la usa.
- Las variables `NEXT_PUBLIC_*` se incrustan en el código durante el build: si las cambias, haz un nuevo despliegue.
- `BETTER_AUTH_URL` es la URL de **producción**. Las URLs de preview (`*-git-<rama>-*.vercel.app`) tienen otro dominio y el login no funcionará en ellas con esa configuración; prueba en la URL de producción.
- Nunca subas `.env.local` al repositorio ni pegues secretos en el código: solo van en *Environment Variables*.
