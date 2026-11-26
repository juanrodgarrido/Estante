# Plan de trabajo — Estante

Cada sesión es una conversación nueva de Claude Code con nombre propio (`claude -n <nombre>`). Al terminar una sesión, Claude marca su casilla y anota aquí las decisiones importantes.

## Estado

- [ ] Sesión 0 — Preparación (manual, sin Claude Code)
- [x] Sesión 1 — `base`: estructura, diseño y PWA
- [x] Sesión 2 — `deploy`: despliegue en Vercel (pasos en el README; el despliegue lo hace Juan a mano)
- [x] Sesión 3 — `auth`: registro, login y sesión
- [x] Sesión 4 — `libros`: búsqueda y ficha de libro
- [ ] Sesión 5 — `estanteria`: Leídos, Leyendo y Pendientes
- [ ] Sesión 6 — `perfil`: perfil propio y estadísticas
- [ ] Sesión 7 — `amigos`: solicitudes y perfiles de amigos
- [ ] Sesión 8 — `chat`: mensajes en tiempo real
- [ ] Sesión 9 — `pulido`: PWA offline, rendimiento y revisión final
- [ ] Sesión 10 (opcional) — `extras`: notificaciones push, reseñas, objetivo anual

## Decisiones tomadas

- Google Books como fuente principal porque tiene mejor cobertura de libros en español. Open Library como respaldo cuando Google no devuelve resultados o se agota la cuota.
- Los libros se guardan en la colección `books` la primera vez que alguien los consulta o los añade, para no repetir llamadas a la API.
- Vercel no mantiene conexiones WebSocket propias, así que el chat usa Pusher Channels para el tiempo real y MongoDB para el historial.
- Privacidad: el perfil y la estantería solo son visibles para el propio usuario y sus amigos aceptados.
- Los commits y los push los hace Juan a mano. Claude Code avisa cuando conviene hacer commit y propone el mensaje.
- La cuenta de Pusher se crea al llegar a la Sesión 8. Hasta entonces las variables PUSHER_* quedan vacías y ningún código debe depender de ellas.

### Decisiones de la Sesión 1 (`base`)

- Route groups: `app/(tabs)` (con barra inferior), `app/(full)` (pantallas sin barra, p. ej. `/chat/[conversationId]`, donde la Sesión 8 fija el input sobre el teclado) y `app/(auth)` (`/login`, `/registro`, sin barra). Las pestañas Perfil/Chat/Buscar se marcan también en sus subrutas (`/ajustes`, `/amigos`, `/u/*` → Perfil; `/libro/*` → Buscar).
- Con Cache Components, todo hook de ruta de cliente (`usePathname`, etc.) debe ir dentro de `<Suspense>`. La barra inferior se pinta ya con `TabBarView` (sin estado) y `TabBar` marca la pestaña activa al llegar la ruta. Tampoco se lee `params` fuera de `<Suspense>` en las rutas dinámicas.
- Los componentes de shadcn se añaden uno a uno (`npx shadcn@latest add <nombre>`). Solo hay `button`, ajustado a una única forma (píldora) y a un mínimo de 44 px de alto. shadcn usa `@base-ui/react` (no Radix) con el estilo `base-nova`.
- Dependencias nuevas: `mongodb` (driver), `server-only` (impide importar `lib/db.ts` desde el cliente), `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `tw-animate-css` y `shadcn` (las instala shadcn/ui; son la base de sus componentes).
- Iconos provisionales (una «E» hecha con tres lomos sobre terracota): `app/icon.svg`, `app/apple-icon.tsx` (180 px) y `app/icons/icon-{192,512,maskable}/route.tsx`, todos generados con `next/og` desde `lib/brand-icon.tsx`. Sustituir por el icono definitivo cuando exista.
- `lib/db.ts` exporta `getDb()`; lanza error solo al usarse sin `MONGODB_URI`, así que el build no necesita la variable. `/api/health` devuelve 200 `{status:"ok"}` o 503 sin detalles internos.
- iOS standalone: con `statusBarStyle: "black-translucent"` la ventana de la PWA medía 59 px menos que la pantalla (`innerHeight` 873 de 932 en un iPhone de 430×932) y esa franja no se podía dibujar, así que la barra inferior quedaba subida; no se arregla con CSS ni JS. Se usa `statusBarStyle: "black"` (barra de estado opaca, ventana a pantalla completa bajo ella). iOS lee este valor al instalar la app: tras cambiarlo hay que borrarla de la pantalla de inicio y volver a añadirla. La barra inferior mide 56 px más `--tabbar-pb` (safe area inferior menos 12 px). Afecta a la Sesión 8 (input del chat sobre el teclado) y a cualquier cosa `fixed`.
- ESLint ignora `.claude/**` (scripts de las skills). `.gitignore` versiona `.env.example` y ignora `.taste-skill/`.
- La skill `design-taste-frontend` está pensada para webs de empresa y su deal de paletas para `saas` solo ofrece fondos oscuros fríos, así que solo se aplicaron sus reglas de sistema (una escala de radios, un estilo de botón, contraste, objetivos de 44 px, sin violeta). La paleta y las fuentes son propias. Su checker/gate de páginas no se ejecuta en este proyecto.

### Decisiones de la Sesión 2 (`deploy`)

- Sin `vercel.json` ni cambios en `next.config.ts`: Vercel detecta Next.js solo. El build no necesita ninguna variable de entorno; `/api/health` (dinámico) solo necesita `MONGODB_URI` en ejecución.
- `BETTER_AUTH_URL` en Vercel es la URL de producción (sin barra final) y exige un redeploy tras cambiarla. Las URLs de preview tienen otro dominio, así que el login (Sesión 3) solo se probará en producción, salvo que se configure `trustedOrigins`/`baseURL` dinámico en Better Auth.
- `BETTER_AUTH_SECRET` de producción distinto del local. Las variables de cada sesión se añaden en Vercel cuando llega esa sesión (`NEXT_PUBLIC_*` requieren redeploy).

### Decisiones de la Sesión 3 (`auth`)

- **Helper del servidor** (`server/auth.ts`): `getCurrentUser()` devuelve `{ id, name, username, email, image }` (tipo `CurrentUser` en `types/user.ts`) y redirige a `/login` si no hay sesión; `getOptionalUser()` devuelve `null` en vez de redirigir. Se usan solo en el servidor (Server Components dentro de `<Suspense>`, Server Actions, Route Handlers) y cada acción que toque datos de usuario debe llamarlos ella misma. `user.id` es un string: en las colecciones propias se guarda como `new ObjectId(user.id)`. Hay una sola lectura de sesión por petición (`cache()` de React); no se usa `"use cache: private"` para que cerrar sesión surta efecto al instante.
- **Protección de rutas en dos capas**: `proxy.ts` (optimista: solo comprueba que exista la cookie y redirige a `/login`) y `AuthGate` (valida la sesión de verdad) en `app/(tabs)/layout.tsx` y `app/(full)/layout.tsx`. `RedirectIfSignedIn` en `app/(auth)/layout.tsx` manda a `/` si ya hay sesión (no se hace en el proxy para evitar bucles con cookies caducadas). Las rutas nuevas dentro de `(tabs)`/`(full)` quedan protegidas solas.
- **Sesión**: 60 días (`expiresIn`), renovada cada día; la cookie lleva `Max-Age`, así que sobrevive al cierre de la PWA en iOS. No usar `rememberMe: false`.
- **Rate limiting** activo con almacenamiento en MongoDB (colección `rateLimit`, porque la memoria no se comparte entre instancias de Vercel): 5 intentos por minuto en login y registro, 100 en el resto. Solo aplica a peticiones HTTP a `/api/auth/*`, por eso los formularios usan `authClient`.
- **Validación**: esquemas Zod en `lib/validation/auth.ts`, usados en el cliente (UX) y en un hook `before` de Better Auth (autoridad). El nombre de usuario se guarda en minúsculas en el campo `username` (plugin `username`; `displayUsername` queda vacío).
- **El usuario de MongoDB necesita permisos de lectura y escritura** sobre la base `estante` (en Atlas: *Database Access* → rol «Read and write to any database» o `readWrite` sobre `estante`). Better Auth crea las colecciones `user`, `session`, `account`, `verification` y `rateLimit` la primera vez que se usan.
- Dependencias nuevas: `better-auth` y `@better-auth/mongo-adapter` (el stack de auth), `zod` (validación; antes solo llegaba de forma transitiva) y los componentes shadcn `input` y `label`.
- Con `BETTER_AUTH_URL` fijo, el login solo funciona en ese dominio (no en las URLs de preview de Vercel).
- **Cliente de MongoDB cerrado en Vercel**: en producción apareció `MongoTopologyClosedError: Topology is closed` (digest `3914836991`) al leer la sesión con la cookie guardada; `/api/health` seguía en ok y borrar las cookies lo "arreglaba". Causa de fondo no confirmada. Mitigación en `server/auth.ts` (`readSession`): si la lectura de sesión falla con ese error, se descartan el cliente (`resetMongoClient` en `lib/db.ts`) y la instancia de Better Auth (`resetAuth` en `lib/auth.ts`) y se reintenta una vez; el resto de errores se propaga igual. No cubre `/api/auth/*` ni otras lecturas de Mongo. Si reaparece, mirar en los logs de Vercel el error anterior a «Topology is closed»; la alternativa es `attachDatabasePool` de `@vercel/functions`.

### Decisiones de la Sesión 4 (`libros`)

- **Servicio** en `server/books/`: `google.ts` y `openlibrary.ts` implementan `BookProvider` (`types.ts`) y normalizan al modelo `books`; `search.ts` (`searchBooks`) y `repository.ts` (`getBook`) son lo que usa el resto de la app. Los proveedores lanzan `ProviderError` ante red, cuota (403/429), 5xx o respuesta rara; Google solo está activo si hay `GOOGLE_BOOKS_API_KEY`, así que sin clave se usa Open Library directamente. Variable nueva: `OPENLIBRARY_CONTACT_EMAIL` (va en el `User-Agent` de Open Library; **añadirla también en Vercel**).
- **Id público del libro** en la URL: `g-<googleId>` o `ol-<OL…W>`; `getBook()` acepta además el `_id` de Mongo (24 hex). `Book.publicId` da el id público a partir de un libro ya guardado. **Sesión 5**: usa `getBook(id)` (alias `ensureBook`) para garantizar que el libro está en `books` y obtener su `_id` antes de crear el `userBook`; los enlaces desde la estantería pueden usar `/libro/${book.publicId}`. El hueco del botón de estantería está en `components/books/book-detail.tsx` (`data-slot="shelf-button"`).
- **Caché de `books`**: la ficha hace upsert por `source+sourceId`; con copia de menos de 30 días no se llama a la API, y si la API falla se sirve la copia caducada. Los índices del plan (`{source, sourceId}` único e `{isbn13}`) se crean solos la primera vez. Los resultados de búsqueda **no** se guardan en `books`, solo al abrir la ficha.
- **Caché de búsquedas**: `"use cache: remote"` + `cacheLife` (`days` con Google, `hours` con el respaldo para volver a probar Google pronto). En local usa el handler en memoria/disco de Next; en Vercel la caché remota la aporta la plataforma (comprobar que funciona en producción).
- **Búsqueda**: `GET /api/books/search?q=&page=` (Route Handler, sesión + Zod, 20 resultados por página, hasta 20 páginas). Con consulta en español (`language.ts`) se pide `langRestrict=es` a Google (y sin restricción si no hay nada). `search.ts` reordena dentro de cada página sin tocar el orden del proveedor salvo: título igual a la búsqueda primero, luego los que empiezan por ella, y los libros en español antes **solo si su título comparte palabras con la búsqueda**.
- **Open Library es lento e irregular** (de 0,5 a 15 s por petición). No se le pasa `lang=es` (lo hacía aún más lento y estropeaba la relevancia). Timeouts: Google 6 s, Open Library 12 s; en la ficha, la búsqueda por clave (autores, páginas, ISBN) es opcional (7 s) y, si falla, los autores se sacan de los registros de autor de la obra. Una ficha guardada en ese modo degradado conserva sin páginas/ISBN hasta que pasen 30 días. Si el registro de la obra tampoco responde, `error.tsx` de la ficha ofrece «Reintentar».
- **Descripciones**: se convierten a texto plano al normalizar (`htmlToText` en `server/books/normalize.ts`: HTML de Google y markdown de Open Library) y se pintan como `<p>`; no se usa `dangerouslySetInnerHTML` en ningún sitio.
- **Portadas**: `next/image` con `remotePatterns` (`books.google.com`, `books.googleusercontent.com`, `covers.openlibrary.org`, `**.archive.org`); siempre https; de Google se usa el tamaño más grande ofrecido (`extraLarge`…`thumbnail`) sin forzar `zoom` (subirlo a mano devuelve «imagen no disponible» en libros antiguos) y sin `edge=curl`. Sin portada (o si falla): cubierta tipográfica de `components/books/book-cover.tsx`. La optimización de imágenes de Vercel tiene cuota en el plan gratuito.
- Sin dependencias nuevas.

(Claude añade aquí las decisiones nuevas de cada sesión.)

---

## Modelo de datos (MongoDB)

Las colecciones de Better Auth (`user`, `session`, `account`, `verification`) las crea el adaptador. Se amplía `user` con los campos marcados.

```ts
// user (Better Auth) + campos propios
{
  _id, name, email, emailVerified, image, createdAt, updatedAt,
  username: string,        // único, en minúsculas, 3-20 caracteres
  bio?: string,            // máx. 160 caracteres
}

// books — caché de libros de las APIs externas
{
  _id,
  source: "google" | "openlibrary",
  sourceId: string,        // id de Google Books o clave de Open Library
  title: string,
  subtitle?: string,
  authors: string[],
  description?: string,
  coverUrl?: string,
  pageCount?: number,
  publishedDate?: string,
  isbn13?: string,
  isbn10?: string,
  categories?: string[],
  language?: string,
  fetchedAt: Date,
}
// índice único: { source, sourceId }; índice: { isbn13 }

// userBooks — un libro en la estantería de un usuario
{
  _id,
  userId: ObjectId,
  bookId: ObjectId,
  status: "read" | "reading" | "want",
  rating?: 1 | 2 | 3 | 4 | 5,
  currentPage?: number,
  startedAt?: Date,
  finishedAt?: Date,
  createdAt: Date,
  updatedAt: Date,
}
// índice único: { userId, bookId }; índice: { userId, status, updatedAt }

// friendships
{
  _id,
  requesterId: ObjectId,
  addresseeId: ObjectId,
  status: "pending" | "accepted",
  createdAt: Date,
  respondedAt?: Date,
}
// índice único: { requesterId, addresseeId }

// conversations — solo 1 a 1 entre amigos
{
  _id,
  participantIds: [ObjectId, ObjectId],  // ordenados
  lastMessage?: { text: string, senderId: ObjectId, createdAt: Date },
  lastReadAt: { [userId: string]: Date },
  updatedAt: Date,
}
// índice único: { participantIds }

// messages
{
  _id,
  conversationId: ObjectId,
  senderId: ObjectId,
  text: string,            // máx. 2000 caracteres
  createdAt: Date,
}
// índice: { conversationId, createdAt }
```

## Sistema de diseño

Dirección: **«papel y tinta»**. Una app de lectura cálida, con titulares en serif con carácter y una interfaz sobria para que las portadas sean las protagonistas. Los tokens viven en `app/globals.css` (`:root` y `@media (prefers-color-scheme: dark)`); el modo oscuro sigue al sistema, sin interruptor. Nunca se usa violeta.

**Color** (OKLCH en el CSS; hex aproximado entre paréntesis)

| Token | Claro | Oscuro («lectura nocturna») |
|---|---|---|
| `background` | papel crema (`#f8f2e4`) | marrón tostado (`#1d140d`) |
| `foreground` | tinta marrón (`#2a1b11`) | marfil (`#f1ebdc`) |
| `card` | crema más clara | marrón un punto más claro |
| `primary` | terracota (`#a24112`) | ámbar (`#e9a44e`) |
| `secondary` | verde musgo claro | verde musgo oscuro |
| `accent` | arena cálida | marrón cálido |
| `muted` / `muted-foreground` | crema apagada / marrón medio | marrón medio / marfil apagado |
| `border` | arena | marrón sutil |
| `destructive` | rojo ladrillo | coral suave |

`theme-color` del navegador: `#f8f2e4` (claro) y `#1d140d` (oscuro).

**Tipografía** (`next/font/google`)

- Titulares (`font-display`, `h1`–`h3`): **Fraunces**, serif variable con eje óptico.
- Interfaz y texto (`font-sans`): **Instrument Sans**.
- Campos de formulario siempre a 16 px o más (evita el zoom de iOS).

**Radios**: `--radius: 1rem` para tarjetas y paneles (`rounded-lg`/`xl`/`2xl` derivan de él); botones y pestañas en píldora (`rounded-full`); portadas casi rectas, `--radius-cover: 0.375rem` (`rounded-cover`).

**Espaciado y medidas**: escala de 4 px de Tailwind. Márgenes laterales de pantalla `--gutter: 1.25rem` (`px-gutter`). Objetivo táctil `--touch: 2.75rem` (44 px). Barra inferior `--tabbar-h: 4rem`, cabecera `--header-h: 3.5rem`. Contenido centrado con `max-w-xl`.

**Safe areas**: `--safe-top/right/bottom/left` (de `env(safe-area-inset-*)`) y utilidades `pt-safe`, `pb-safe` y `pb-tabbar` (barra + safe area inferior). La cabecera aplica `pt-safe` y la barra inferior `pb-safe`; el `body` respeta los laterales.

**Componentes base**: `components/app-shell/` (`TabBar`, `ScreenHeader`), `components/empty-state.tsx` y `components/ui/button.tsx`. Cada pantalla usa `ScreenHeader` + contenido; los estados vacíos usan `EmptyState` (lomos de libro + icono) con texto en español.

## Navegación de la app

Barra inferior fija con 4 pestañas:

1. **Inicio** (`/`): libros en "Leyendo" y actividad reciente de amigos
2. **Buscar** (`/buscar`): búsqueda de libros
3. **Chat** (`/chat`): conversaciones
4. **Perfil** (`/perfil`): mi perfil y mi estantería

Otras rutas: `/login`, `/registro`, `/libro/[id]`, `/u/[username]`, `/chat/[conversationId]`, `/amigos`, `/ajustes`.

---

## Sesión 0 — Preparación (la haces tú)

1. Crea el proyecto:
   ```bash
   npx create-next-app@latest estante
   ```
   Respuestas: TypeScript **Sí**, ESLint **Sí**, Tailwind **Sí**, carpeta `src/` **No**, App Router **Sí**, Turbopack **Sí**, alias de importación **No cambiar** (`@/*`).
2. Copia en la raíz del proyecto `CLAUDE.md` y `README.md`, y `PLAN.md` dentro de `docs/`.
3. Instala la skill de diseño (dentro de la carpeta del proyecto):
   ```bash
   npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend" --agent claude-code
   ```
4. Crea las cuentas y guarda las claves (todas tienen plan gratuito):
   - **MongoDB Atlas**: crea un cluster M0, un usuario de base de datos y copia la cadena de conexión. En *Network Access* añade `0.0.0.0/0`, porque Vercel no tiene IPs fijas.
   - **Google Cloud**: crea un proyecto, activa *Books API* y crea una API key.
   - **Pusher**: se deja para la Sesión 8 (chat).
   - **Vercel**: crea la cuenta con tu GitHub.
   - **GitHub**: crea un repositorio vacío llamado `estante`.
5. Crea `.env.local` en la raíz con lo que tengas (Claude creará `.env.example` con la lista completa):
   ```
   MONGODB_URI=
   MONGODB_DB=estante
   BETTER_AUTH_SECRET=        # genera uno con: openssl rand -base64 32
   BETTER_AUTH_URL=http://localhost:3000
   GOOGLE_BOOKS_API_KEY=
   PUSHER_APP_ID=
   PUSHER_SECRET=
   NEXT_PUBLIC_PUSHER_KEY=
   NEXT_PUBLIC_PUSHER_CLUSTER=eu
   ```
6. Primer commit y conexión con GitHub:
   ```bash
   git add . && git commit -m "Proyecto inicial"
   git remote add origin <url-del-repo>
   git push -u origin main
   ```

---

## Sesión 1 — `base`

**Modelo:** `opusplan` · **Empieza en modo plan** (`Shift+Tab`)

**Prompt:**

```
Lee CLAUDE.md y docs/PLAN.md. Vamos con la Sesión 1 (base).

Objetivo: dejar la estructura de la app, el sistema de diseño y la PWA instalable, sin lógica de negocio todavía.

1. Añade el script "typecheck" (tsc --noEmit) a package.json e instala y configura shadcn/ui.
2. Usa la skill design-taste-frontend para definir una dirección visual propia para una app de lectura: tipografía con personalidad, paleta cálida, modo claro y oscuro automático según el sistema. Nada de estética genérica de plantilla. Recoge los tokens de diseño (colores, tipografía, radios, espaciado) en el CSS global y en un apartado nuevo de docs/PLAN.md.
3. Crea el layout principal: barra inferior con las 4 pestañas del plan, cabecera por pantalla y respeto de safe areas. Crea las páginas vacías de todas las rutas del plan con un estado vacío decente.
4. PWA para iOS: app/manifest.ts (display standalone, colores, iconos 192 y 512, icono maskable), apple-touch-icon de 180 px, metadatos apple-mobile-web-app, viewport con viewport-fit=cover y theme-color para claro y oscuro. Genera iconos provisionales en SVG/PNG con la inicial de la app.
5. Crea lib/db.ts con el cliente de MongoDB reutilizable y un Route Handler /api/health que haga ping a la base de datos.
6. Crea .env.example con todas las variables del plan.

Hecho cuando: typecheck, lint y build pasan; /api/health devuelve ok; la navegación funciona a 390 px de ancho. Enséñame una lista de lo que has creado y marca la sesión en el plan.
```

**Comprobación tuya:** `npm run dev`, abre `http://localhost:3000` y usa la vista de móvil de las herramientas de desarrollo del navegador (iPhone 14/15). Si el diseño no te convence, díselo en la misma sesión antes de pasar a la siguiente: es el momento barato para cambiarlo.

---

## Sesión 2 — `deploy`

**Modelo:** `sonnet`

**Prompt:**

```
Lee CLAUDE.md y docs/PLAN.md. Vamos con la Sesión 2 (deploy).

Quiero desplegar en Vercel ya, para probar la PWA en mi iPhone durante todo el desarrollo.
1. Revisa que el proyecto está listo para producción (variables de entorno, build).
2. Dame los pasos exactos para importar el repo en Vercel y qué variables de entorno poner (BETTER_AUTH_URL debe ser la URL de producción).
3. Escribe en el README una sección "Despliegue" con esos pasos.
No hagas nada en Vercel tú; yo sigo los pasos.
```

**Comprobación tuya:** abre la URL de Vercel en Safari del iPhone, pulsa Compartir y luego *Añadir a pantalla de inicio*. Ábrela desde el icono: debe abrirse a pantalla completa, sin la barra de Safari, y `/api/health` debe responder ok. A partir de aquí, cada `git push` a `main` despliega solo.

---

## Sesión 3 — `auth`

**Modelo:** `opusplan` · **Empieza en modo plan**

**Prompt:**

```
Lee CLAUDE.md y docs/PLAN.md. Vamos con la Sesión 3 (auth).

Implementa la autenticación con Better Auth y el adaptador de MongoDB:
1. Registro con nombre, nombre de usuario (único, minúsculas, 3-20 caracteres, letras, números y guion bajo), email y contraseña (mínimo 8 caracteres). Login con email o nombre de usuario. Cierre de sesión.
2. Pantallas /registro y /login con el sistema de diseño de la Sesión 1, validación con mensajes claros en español y estados de carga.
3. Protege todas las rutas excepto /login y /registro: sin sesión, redirige a /login. Con sesión, /login y /registro redirigen a /.
4. La sesión debe mantenerse al cerrar y abrir la PWA en iOS (cookies persistentes, no de sesión).
5. Crea un helper en el servidor (por ejemplo getCurrentUser()) que usarán todas las sesiones siguientes, y documenta su uso en el plan.
6. Limita los intentos de login para evitar fuerza bruta (Better Auth tiene rate limiting; actívalo).

Hecho cuando: puedo registrarme, cerrar sesión y volver a entrar; un usuario o email repetido da un error claro; typecheck, lint y build pasan. Marca la sesión en el plan.
```

**Comprobación tuya:** prueba el registro y el login en local y, tras hacer push, en el iPhone. Cierra la PWA del todo y vuelve a abrirla: debes seguir con la sesión iniciada.

---

## Sesión 4 — `libros`

**Modelo:** `opusplan`

**Prompt:**

```
Lee CLAUDE.md y docs/PLAN.md. Vamos con la Sesión 4 (libros).

1. Crea un servicio en el servidor (server/books/) con una interfaz común y dos proveedores: Google Books (principal, con API key) y Open Library (respaldo si Google falla, agota cuota o no devuelve resultados). Open Library requiere cabecera User-Agent con nombre de la app y email de contacto. Normaliza ambos al modelo `books` del plan.
2. Caché: al ver o añadir un libro, guárdalo en `books` (upsert por source+sourceId). Si ya existe y tiene menos de 30 días, no llames a la API. Cachea también las búsquedas con la caché de Next.js para no gastar cuota con búsquedas repetidas.
3. Pantalla /buscar: input con debounce, resultados con portada, título, autor y año, scroll infinito o "cargar más", estados de carga, vacío y error. Prioriza resultados en español cuando la búsqueda esté en español.
4. Pantalla /libro/[id]: portada grande, título, autores, descripción (sin HTML crudo; sanea el contenido), páginas, fecha, categorías. Deja el hueco para el botón de estantería de la sesión siguiente.
5. Portadas: usa next/image con los dominios remotos configurados; fuerza https y pide la mejor resolución disponible. Placeholder elegante si no hay portada.

Hecho cuando: buscar "cien años de soledad", "dune" y "el nombre del viento" devuelve resultados correctos con portada; la ficha carga bien; si quito la API key de Google, la búsqueda sigue funcionando con Open Library. typecheck, lint y build pasan. Marca la sesión.
```

---

## Sesión 5 — `estanteria`

**Modelo:** `sonnet` (sube a `opus` si se atasca)

**Prompt:**

```
Lee CLAUDE.md y docs/PLAN.md. Vamos con la Sesión 5 (estanteria).

Implementa la estantería personal con la colección `userBooks`:
1. En /libro/[id], un botón/selector para añadir el libro a Leídos, Leyendo o Pendientes, cambiarlo de estado o quitarlo. Actualización optimista.
2. Reglas: al pasar a "Leyendo" se guarda startedAt; al pasar a "Leído" se guarda finishedAt y se pide valoración de 1 a 5 (opcional). En "Leyendo", el usuario puede actualizar la página actual y se muestra el porcentaje si hay pageCount.
3. En /perfil, las tres estanterías en pestañas (Leyendo, Pendientes, Leídos) con contador, en cuadrícula de portadas, ordenadas por última actualización. Desde una portada se abre la ficha.
4. En Inicio (/), sección "Leyendo ahora" con progreso y acceso rápido para actualizar la página.
5. Todas las acciones con Server Actions, validación con Zod y comprobación de que el userBook pertenece al usuario.

Hecho cuando: puedo añadir, mover y quitar libros y los cambios se ven en Perfil e Inicio sin recargar; typecheck, lint y build pasan. Marca la sesión.
```

---

## Sesión 6 — `perfil`

**Modelo:** `sonnet`

**Prompt:**

```
Lee CLAUDE.md y docs/PLAN.md. Vamos con la Sesión 6 (perfil).

1. /perfil: cabecera con avatar, nombre, @usuario, bio y estadísticas (libros leídos este año, total leídos, páginas leídas este año, valoración media).
2. /ajustes: editar nombre, bio y avatar, cambiar contraseña y cerrar sesión. Avatar: redimensiona la imagen en el cliente a 256x256 en WebP (máximo 100 KB), guárdala en una colección `avatars` separada (no dentro de `user`, para no inflar la sesión) y sírvela desde /api/avatar/[userId] con cabeceras de caché. No uses servicios externos de almacenamiento.
3. /u/[username]: la misma vista del perfil, pero de otro usuario. De momento muestra solo nombre y avatar y el mensaje "Agrega a esta persona como amiga para ver su estantería" (la lógica de amigos llega en la Sesión 7). Si es mi propio usuario, redirige a /perfil.
4. Extrae los componentes del perfil para reutilizarlos en /u/[username].

Hecho cuando: puedo editar mi perfil y las estadísticas son correctas con los datos de prueba; typecheck, lint y build pasan. Marca la sesión.
```

---

## Sesión 7 — `amigos`

**Modelo:** `opusplan` · **Empieza en modo plan**

**Prompt:**

```
Lee CLAUDE.md y docs/PLAN.md. Vamos con la Sesión 7 (amigos).

Implementa las amistades con la colección `friendships`:
1. /amigos: buscador de usuarios por @usuario o nombre, lista de amigos, solicitudes recibidas (aceptar/rechazar) y enviadas (cancelar).
2. En /u/[username]: botón según el estado (Añadir amigo, Solicitud enviada, Aceptar solicitud, Amigos, con opción de eliminar amistad).
3. Privacidad: crea una función areFriends(userA, userB) en el servidor y úsala en todas las consultas de perfil y estantería ajenas. Solo los amigos aceptados ven la estantería, estadísticas y actividad. Los no amigos solo ven nombre, @usuario y avatar.
4. En Inicio (/), sección "Actividad de amigos": últimos cambios de estantería de mis amigos (empezó a leer, terminó, valoró), paginada.
5. Evita duplicados: si A ya envió solicitud a B y B intenta enviársela a A, se acepta directamente.
6. Badge en la pestaña Perfil o en /amigos con el número de solicitudes pendientes.

Hecho cuando: con dos cuentas de prueba, la segunda no ve la estantería de la primera hasta aceptar la amistad; la actividad aparece en Inicio; typecheck, lint y build pasan. Marca la sesión.
```

**Comprobación tuya:** crea una segunda cuenta (en otro navegador o en modo incógnito) y prueba el flujo completo de amistad.

---

## Sesión 8 — `chat`

**Antes de empezar:** crea la cuenta de Pusher, una app de *Channels* con cluster `eu`, y rellena `PUSHER_APP_ID`, `PUSHER_SECRET` y `NEXT_PUBLIC_PUSHER_KEY` en `.env.local` y en las variables de entorno de Vercel.

**Modelo:** `opus` (es la parte más delicada) · **Empieza en modo plan**

**Prompt:**

```
Lee CLAUDE.md y docs/PLAN.md. Vamos con la Sesión 8 (chat).

Chat 1 a 1 solo entre amigos, con historial en MongoDB y tiempo real con Pusher Channels:
1. Servidor: Server Action para enviar mensaje (valida amistad, longitud máxima 2000, guarda en `messages`, actualiza `conversations.lastMessage` y publica el evento en Pusher). Usa canales privados por conversación (private-conversation-<id>) con un endpoint de autorización que compruebe que el usuario participa en ella.
2. /chat: lista de conversaciones ordenada por último mensaje, con avatar, nombre, extracto, hora y punto de no leído (calculado con lastReadAt). Botón para empezar conversación con un amigo.
3. /chat/[conversationId]: burbujas de mensaje, agrupadas por día, scroll al final, carga de mensajes anteriores al subir, input fijo encima del teclado de iOS (cuidado con el viewport cuando se abre el teclado y con las safe areas), envío optimista con estado de error y reintento.
4. Marcar como leído al abrir la conversación. Badge con el total de no leídos en la pestaña Chat, actualizado en tiempo real con un canal privado por usuario.
5. Desde /u/[username] de un amigo, botón "Enviar mensaje" que abre o crea la conversación.
6. Si Pusher no está disponible, el chat debe seguir funcionando al recargar (el historial viene de MongoDB).

Hecho cuando: con dos cuentas en dos navegadores, los mensajes llegan al otro lado sin recargar, el contador de no leídos funciona y alguien que no es amigo no puede abrir ni escribir en la conversación (pruébalo llamando al endpoint directamente). typecheck, lint y build pasan. Marca la sesión.
```

**Comprobación tuya:** prueba el chat en el iPhone, sobre todo que el teclado no tape el campo de texto.

---

## Sesión 9 — `pulido`

**Modelo:** `opusplan`

**Prompt:**

```
Lee CLAUDE.md y docs/PLAN.md. Vamos con la Sesión 9 (pulido).

1. Service worker con Serwist (o la opción recomendada para la versión instalada de Next.js): caché de la shell de la app, portadas y fuentes; página offline propia. No caches respuestas autenticadas de la API.
2. Revisa en todas las pantallas: estados de carga (skeletons), estados vacíos, errores (error.tsx y not-found.tsx con el diseño de la app), transiciones suaves, feedback táctil.
3. Revisa la experiencia iOS standalone: sin rebote raro en el scroll, sin zoom al enfocar inputs (font-size mínimo de 16 px), safe areas en todas las pantallas, gestos y botón atrás coherentes.
3b. Adaptación a pantallas grandes (ligera, no una versión de escritorio aparte): a partir de `md`, la barra inferior pasa a ser una barra lateral izquierda con las mismas 4 pestañas; el contenido sube a `max-w-3xl`; las cuadrículas de portadas añaden columnas (de 3 a 5 o 6); el chat muestra la lista de conversaciones junto a la conversación abierta. Safe areas y barra inferior solo en móvil.
4. Rendimiento: imágenes optimizadas, nada de "use client" innecesario, consultas con índices (crea los índices del plan con un script `npm run db:indexes` si no existen).
5. Seguridad: usa un subagente para revisar todas las Server Actions y Route Handlers buscando accesos sin comprobación de sesión o de amistad, inyecciones en consultas de MongoDB y datos sensibles enviados al cliente. Corrige lo que encuentre.

Hecho cuando: la app funciona sin conexión mostrando la página offline, el revisor no encuentra problemas de seguridad pendientes y typecheck, lint y build pasan. Marca la sesión.
```

---

## Sesión 10 (opcional) — `extras`

Ideas para después, una sesión por cada una:

- **Notificaciones push** de mensajes nuevos y solicitudes de amistad (funcionan en iOS 16.4 o superior solo con la PWA añadida a la pantalla de inicio). Requiere Web Push con claves VAPID.
- **Reseñas** de texto en los libros leídos, visibles para amigos.
- **Objetivo de lectura anual** con progreso en Inicio.
- **Escáner de código de barras** con la cámara para añadir libros por ISBN.
- **Importar desde Goodreads** con su exportación CSV.
