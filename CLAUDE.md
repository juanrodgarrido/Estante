@AGENTS.md

# Estante

PWA para iPhone (se instala desde Safari) para registrar lecturas: estanterías personales, perfiles y chat con amigos. Alternativa a Goodreads con una interfaz cuidada.

El plan completo, el modelo de datos y el estado de cada fase están en `docs/PLAN.md`. Léelo al empezar cada sesión y trabaja solo en la sesión indicada.

# Stack
- Next.js 16 (App Router) + React + TypeScript estricto, con React Compiler y Cache Components activados (usa `"use cache"` para cachear; no uses `useMemo`/`useCallback` salvo que haga falta)
- Tailwind CSS + shadcn/ui
- MongoDB Atlas con el driver oficial `mongodb` (sin Mongoose) + Zod para validar
- Better Auth (email/contraseña) con `@better-auth/mongo-adapter`
- Libros: Google Books API (principal) + Open Library (respaldo). Caché en la colección `books`
- Tiempo real del chat: Pusher Channels. Los mensajes se guardan en MongoDB
- Despliegue: Vercel

# Comandos
- `npm run dev` — servidor de desarrollo
- `npm run lint` — ESLint
- `npm run typecheck` — `tsc --noEmit`
- `npm run build` — build de producción

# Reglas
- IMPORTANT: al terminar cada cambio ejecuta `npm run typecheck`, `npm run lint` y `npm run build`, y corrige los errores antes de dar la tarea por hecha.
- Diseño mobile-first pensado para iPhone (390 px de ancho). Respeta las safe areas (`env(safe-area-inset-*)`) y usa objetivos táctiles de al menos 44 px.
- Toda la interfaz en español.
- Las llamadas a APIs externas y a la base de datos se hacen solo en el servidor (Server Components, Server Actions o Route Handlers). Nunca expongas claves en el cliente.
- Valida con Zod toda entrada del usuario en el servidor.
- Comprueba la sesión y los permisos en el servidor en cada acción que lea o modifique datos de un usuario. El perfil y la estantería de un usuario solo los ven él y sus amigos.
- Conexión a MongoDB: un único cliente reutilizado en `lib/db.ts` (patrón de caché global para desarrollo y serverless).
- Variables de entorno: documenta cada nueva en `.env.example`. Nunca hagas commit de `.env.local`.
- Estructura: rutas en `app/`, componentes en `components/`, lógica de servidor en `lib/` y `server/`, tipos compartidos en `types/`.
- No añadas dependencias nuevas sin justificarlo en el resumen final.
- IMPORTANT: nunca ejecutes `git commit`, `git push` ni ningún comando que modifique el historial o el remoto de git. Cuando haya un punto bueno para hacer commit, avísame y propón el mensaje; los commits y los push los hago yo.
- Al terminar una sesión: marca la casilla correspondiente en `docs/PLAN.md` y anota ahí cualquier decisión que afecte a sesiones posteriores.
