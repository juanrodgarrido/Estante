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

(Se completa en la Sesión 2 del plan.)
