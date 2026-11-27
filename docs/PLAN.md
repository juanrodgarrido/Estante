# Plan de trabajo — Estante

Cada sesión es una conversación nueva de Claude Code con nombre propio (`claude -n <nombre>`). Al terminar una sesión, Claude marca su casilla y anota aquí las decisiones importantes.

## Estado

- [x] Sesión 0 — Preparación (manual, sin Claude Code)
- [x] Sesión 1 — `base`: estructura, diseño y PWA
- [x] Sesión 2 — `deploy`: despliegue en Vercel (pasos en el README; el despliegue lo hace Juan a mano)
- [x] Sesión 3 — `auth`: registro, login y sesión
- [x] Sesión 4 — `libros`: búsqueda y ficha de libro
- [x] Sesión 5 — `estanteria`: Leídos, Leyendo y Pendientes
- [x] Sesión 6 — `perfil`: perfil propio y estadísticas
- [x] Sesión 7 — `amigos`: solicitudes y perfiles de amigos
- [x] Sesión 8 — `chat`: mensajes en tiempo real
- [x] Sesión 9 — `pulido`: PWA offline, rendimiento, revisión final y pantallas grandes (punto 3b)
- [ ] Sesión 10a — `notificaciones`: push y número de no leídos en el icono
- [x] Sesión 10b — `resenas`: reseñas de libros para amigos
- [x] Sesión 10c — `objetivo`: reto de lectura anual

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

### Decisiones de la Sesión 5 (`estanteria`)

- **Datos**: `server/shelf/repository.ts` (`getUserBooks()` crea los índices del plan, `getShelfState`, `listShelf(userId, status?)` con `$lookup` a `books`, orden por `updatedAt` desc) y `server/shelf/actions.ts` (Server Actions: `setShelfStatusAction`, `setRatingAction`, `setProgressAction`, `removeFromShelfAction`). Esquemas Zod en `lib/validation/shelf.ts`. Cada acción llama a `getCurrentUser()` y filtra siempre por `userId` de la sesión, así que no se puede tocar el userBook de otro usuario.
- **Las acciones se identifican por `bookId`** (`_id` de `books`, 24 hex; `Book._id`), no por el `_id` del userBook: el índice único `{userId, bookId}` hace equivalente ambos y permite añadir sin conocer aún el id. La ficha ya garantiza que el libro está en `books` (`getBook`).
- **Reglas de estado**: a `reading` → `startedAt` (se conserva si ya leía), se borran `finishedAt` y `rating`; a `read` → `finishedAt`, `rating` opcional, se borra `currentPage`; a `want` → se borran fechas, nota y página. La nota solo se puede poner en `read` y la página solo en `reading` (y no puede superar `pageCount`).
- **Refresco**: tras cada acción `revalidatePath("/", "layout")`, así Perfil, Inicio y la ficha muestran los cambios sin recargar. La UI es optimista con `useOptimistic` (`ShelfControl`, `ReadingProgress`); si la acción falla, se revierte y se muestra el error.
- **UI**: `components/shelf/` — `ShelfControl` (ficha), `ReadingProgress` (barra + formulario de página, también en Inicio), `ShelfTabs` (pestañas con contador y cuadrícula de 3 columnas en `/perfil`), `ReadingNow` (Inicio). `percentOf` en `lib/shelf.ts`. Las estadísticas y el encabezado de perfil son de la Sesión 6: `/perfil` solo tiene por ahora la estantería.
- **Ajustes tras la primera prueba**: el selector de la ficha son tres botones con borde e icono (`shelf-icons.ts`), con el activo relleno; Inicio muestra «Leyendo ahora» (`ReadingCard`) más filas horizontales de Pendientes y Leídos recientes (`CoverRow`, máx. 12, `countShelf` para «Ver todos (N)»), que enlazan a `/perfil?estante=pendientes|leidos` (`ShelfTabs` acepta `initialTab`). «Lo he terminado» (Inicio y ficha) pasa el libro a Leídos con nota opcional (`StarRating`); guardar la última página (`onReachEnd` de `ReadingProgress`) abre ese panel en Inicio y pasa a Leído directamente en la ficha.
- Sin dependencias nuevas.

### Decisiones de la Sesión 6 (`perfil`)

- **`bio`** es un campo adicional de Better Auth (`additionalFields`, `input: false`): llega en la sesión, así que `CurrentUser` tiene ahora `bio` (cadena, vacía si no hay). Nombre y bio se escriben directamente en la colección `user` desde Server Actions (`server/profile/actions.ts`), filtrando por el id de la sesión. No hay caché de cookie de sesión, así que los cambios se ven al instante.
- **Avatar**: colección `avatars` con `_id` = id del usuario, `data` (Binary), `contentType`, `updatedAt`. `user.image` guarda solo la URL corta `/api/avatar/<id>?v=<timestamp>` (no inflar la sesión). `GET /api/avatar/[userId]` exige sesión, responde con `ETag`/304 y `Cache-Control: private` (inmutable de un año si la URL lleva `?v=`, 5 min si no). El cliente (`lib/avatar-client.ts`) recorta al centro a 256×256 y codifica en WebP ≤ 100 KB; **Safari/iOS puede no saber codificar WebP**, y entonces se usa JPEG (el servidor acepta ambos y comprueba los bytes mágicos y el tamaño, no las dimensiones). Se pinta con `next/image` `unoptimized`.
- **Estadísticas** (`getProfileStats`): «este año» es el año natural en UTC según `finishedAt`; páginas = `pageCount` de los libros terminados este año (los que no tienen `pageCount` suman 0); valoración media = media de todas las notas de leídos (`—` si no hay).
- **Componentes reutilizables** en `components/profile/`: `Avatar`, `ProfileHeader` (acepta `ProfileUser`), `ProfileStatsGrid`. `/u/[username]` usa `ProfileHeader` con la bio oculta para quien no es amigo; **Sesión 7**: tras `areFriends`, mostrar bio, `ProfileStatsGrid` (con `getProfileStats(profile.id)`) y la estantería de la otra persona. `getProfileByUsername` está en `server/profile/repository.ts`; un @usuario inexistente da `notFound()` y el propio redirige a `/perfil`.
- **Contraseña**: `authClient.changePassword` con `revokeOtherSessions: true`.
- Sin dependencias nuevas ni variables de entorno nuevas.

### Decisiones de la Sesión 7 (`amigos`)

- **`friendships` con `pairKey`** (`<idMenor>_<idMayor>`, índice único): un solo documento por pareja aunque A y B se envíen solicitud a la vez (el índice `{requesterId, addresseeId}` del plan no lo impide). Si B pide a A teniendo A una solicitud pendiente hacia B, se acepta directamente; ante la carrera (`E11000`) se relee y se acepta. Código en `server/friends/` (`repository.ts`, `actions.ts`); índices creados solos, como en `userBooks`.
- **Privacidad**: `areFriends(a, b)` (`server/friends/repository.ts`, con `cache()` de React) es la puerta. `getOtherProfile(viewerId, username)` (`server/profile/visibility.ts`) es el **único camino a datos de otra persona**: sin amistad solo devuelve nombre, @usuario y avatar; bio, estadísticas y estantería exigen `areFriends`. `getProfileByUsername` ya no devuelve la bio. La actividad se filtra por mis amigos aceptados en cada consulta, así que al eliminar una amistad desaparece al instante.
- **Sesión 8 (chat)**: validar la amistad con `areFriends` en cada acción y en el endpoint de autorización de Pusher. El botón «Enviar mensaje» va en `app/(tabs)/u/[username]/page.tsx`, junto a `FriendButton`, visible solo con `relation === "friends"`.
- **Actividad**: colección nueva `activities` `{ userId, bookId, type: "started" | "finished" | "rated", rating?, createdAt }`, índice `{ userId, createdAt: -1 }`. La escriben las acciones de estantería (`server/activity/repository.ts`: `recordActivity`, `clearRatingActivity`, `clearActivity`), sin romperlas si falla. Cambiar la nota en los 15 min siguientes a terminar/valorar actualiza la entrada en vez de crear otra; quitar la nota borra los «valoró»; quitar el libro borra su actividad. Lo anterior a esta sesión no genera actividad. Paginación por cursor `<ms>_<id>` (`GET /api/activity?cursor=`, 10 por página).
- **Búsqueda de personas**: `GET /api/users/search?q=` (2–40 caracteres, `@` inicial opcional): @usuario por prefijo o nombre que contiene, sin distinguir mayúsculas, con la cadena escapada para regex; máx. 20, sin incluirme.
- **UI**: `FriendButton` mantiene su propia relación (no `useOptimistic`, porque en los resultados de búsqueda la prop no se refresca con `revalidatePath`); en «Amigos», eliminar pide confirmación inline. `ShelfTabs` acepta `ownerName` para la estantería ajena (solo lectura, textos en tercera persona).
- **Badge** de solicitudes recibidas pendientes: sobre la pestaña Perfil (`TabBarWithBadges`, que lee el número en el servidor dentro del `<Suspense>` de la barra) y sobre el icono de Amistades en `/perfil` (`FriendsLink`). Se actualiza solo porque cada acción hace `revalidatePath("/", "layout")`.
- **Pruebas**: no hay Playwright. El flujo completo se probó llamando a las Server Actions por HTTP con el id de `.next/server/server-reference-manifest.json` y `POST` a una página que las referencie (`/` para estantería, `/amigos` para amistades; en otra ruta devuelve 409 «Server Action unavailable»). El registro tiene límite de 5 por minuto por IP.
- Sin dependencias ni variables de entorno nuevas.

### Decisiones de la Sesión 8 (`chat`)

- **Modelo**: el índice único `{participantIds}` del plan no valía (un índice único sobre un array impide que una persona esté en dos conversaciones), así que `conversations` lleva `pairKey` (como `friendships`). `messages` lleva `clientId` (uuid del cliente) con índice único por conversación: reintentar un envío que sí llegó devuelve el mismo mensaje en vez de duplicarlo. Índices creados solos.
- **Puerta de acceso**: `getConversationAccess(me, conversationId)` (`server/chat/repository.ts`) exige ser participante **y** `areFriends`. La usan la página (`notFound()`), `GET /api/chat/[id]/messages` (404), las acciones (`sendMessageAction`, `markConversationReadAction`) y `POST /api/pusher/auth` (403). Al eliminar una amistad, la conversación desaparece de la lista y deja de poder abrirse o escribirse (no se borra: vuelve si se recupera la amistad). Una suscripción de Pusher ya autorizada sigue hasta que el cliente se reconecta; no puede enviar nada.
- **Pusher**: canales `private-conversation-<id>` (evento `message`) y `private-user-<id>` (evento `unread-changed`, sin datos sensibles: el cliente vuelve a pedir `/api/chat/unread` o hace `router.refresh()`). `server/realtime/pusher.ts` devuelve `null` sin variables y `publish()` nunca lanza: el mensaje se guarda en MongoDB aunque Pusher falle. En el cliente, `lib/pusher-client.ts` carga `pusher-js` con `import()` solo si hay `NEXT_PUBLIC_PUSHER_KEY`; `useChannelEvent` comparte suscripciones y avisa al reconectar. Sin Pusher, la sala y el badge se ponen al día al volver a la app (`visibilitychange`) y al recargar.
- **No leídos**: el badge de Chat es el total de **mensajes** ajenos posteriores a mi `lastReadAt` en conversaciones con amigos (`countUnread`); el punto de la lista mira solo el último mensaje. Leído = `markConversationReadAction` al abrir, al recibir un mensaje con la app visible y al volver a ella. Escribir marca la conversación como leída para quien escribe.
- **Fechas** del chat en zona fija `Europe/Madrid` (`lib/chat-time.ts`) para que servidor y cliente pinten lo mismo; si hace falta otra zona, habrá que guardarla por usuario.
- **iOS**: la sala es un contenedor `fixed` que sigue el `visualViewport` (alto y `offsetTop`, `components/chat/use-visual-viewport.ts`); con el teclado abierto (`data-keyboard="open"`) el campo pierde el margen de la safe area. Enter envía solo con teclado físico. El botón de enviar no roba el foco (el teclado no se cierra). `interactiveWidget: "resizes-content"` en la página para Android. **Pendiente de probar en el iPhone.**
- **Rutas nuevas**: `/chat/nueva` (lista de amigos con «Escribir»). `openConversationAction` (form) crea o abre la conversación y redirige; la usan `/chat/nueva` y «Enviar mensaje» en `/u/[username]`. Las conversaciones sin mensajes no salen en la lista.
- **`<Activity>` de Next 16**: con Cache Components, al salir de una pantalla Next no la desmonta, la oculta y conserva su estado; al volver se ve igual que se dejó, y mientras estaba oculta sus efectos (suscripciones de Pusher incluidas) estaban parados. Fallo visto en el iPhone: al entrar de nuevo en una conversación no salía el mensaje recién llegado. Por eso `ChatRoom` y `LiveRefresh` se ponen al día cuando sus efectos se vuelven a montar (un `useRef` distingue el primer montaje de los siguientes), y `ChatRoom` mezcla los mensajes nuevos que lleguen por props. **Cualquier pantalla con estado de cliente sacado de datos del servidor debe tenerlo en cuenta** (ver `node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md`).
- **Paginación**: 30 mensajes por página, cursor `<ms>_<id>` (`?before=`), carga al acercarse arriba conservando la posición.
- **Dependencias nuevas**: `pusher` (servidor) y `pusher-js` (cliente), las oficiales. Sin variables nuevas (el servidor usa `NEXT_PUBLIC_PUSHER_CLUSTER`). **Añadir `PUSHER_APP_ID`, `PUSHER_SECRET`, `NEXT_PUBLIC_PUSHER_KEY` y `NEXT_PUBLIC_PUSHER_CLUSTER` en Vercel y redeploy.**
- **Pruebas** como en la Sesión 7: acciones por HTTP con el id del manifest, `POST` a `/chat/<id>` (envío y leído) o `/chat/nueva` (abrir). Para probar en otro puerto: `BETTER_AUTH_URL=http://localhost:3100 npx next start -p 3100` (Better Auth rechaza otros orígenes).

### Decisiones de la Sesión 9 (`pulido`)

- **Service worker propio** (`public/sw.js`, sin dependencias): `@serwist/next` no funciona con Turbopack y la alternativa añadía dependencias. Estrategia: precache de `/offline` e iconos; `/_next/static` (JS, CSS, fuentes) cache-first; portadas (`/_next/image` y dominios de portadas) stale-while-revalidate con tope de 200; navegaciones red primero y, sin red, `/offline`. **Nunca** guarda HTML de páginas, `/api/*`, RSC ni Server Actions. **Al cambiar `sw.js` hay que subir `VERSION`** (limpia las cachés antiguas). Se registra solo en producción (`components/pwa/register-sw.tsx`). `/sw.js` se sirve sin caché y `next.config.ts` añade cabeceras de seguridad globales. `/offline` es pública en `proxy.ts`.
- **`experimental.useOffline`** activado: navegaciones y Server Actions esperan a que vuelva la red en vez de fallar, y `OfflineBanner` (root layout) avisa. No se ha podido probar el modo avión en el iPhone: **pendiente de probar** (borrar la PWA y reinstalarla).
- **Pantallas**: `Skeleton` y `RowsSkeleton`/`ProfileSkeleton`/`FormSkeleton` (`components/ui/`); `app/not-found.tsx`, `not-found.tsx` de `/u/[username]` y de la sala de chat, `error.tsx` en `(tabs)` y `(full)`, `app/global-error.tsx`. `<ViewTransition>` (React, sin flag) en los layouts `(tabs)` y `(full)` con un fundido corto (`.page-fade` en `globals.css`); la barra inferior queda fuera. No se han añadido `transitionTypes` direccionales.
- **iOS**: `overscroll-behavior: none` en `html`, `overscroll-x-contain` en las filas de portadas, `-webkit-touch-callout: none` en botones y enlaces, safe areas en el esqueleto de la sala y en `(auth)`. `BackButton` usa `hasInAppHistory()` (`lib/in-app-nav.ts`: la barra inferior anota en `sessionStorage` que ha habido navegación dentro de la app) en vez de `history.length`; sin historial propio hace `router.replace(fallbackHref)`.
- **Índices**: `npm run db:indexes` (`scripts/db-indexes.mts`, Node 24 sin compilar, lee `.env.local`) crea los del plan más `user.username` único (Better Auth no lo crea); los de email, sesión y cuenta ya los crea Better Auth. Las especificaciones deben seguir coincidiendo con las de los repositorios de `server/`.
- **Rendimiento**: `priority` → `preload` en la portada grande; quitado `"use client"` de `label.tsx` y `star-rating.tsx`.
- **Seguridad** (revisión por subagente de todas las acciones y handlers; privacidad, IDOR, inyección NoSQL y datos al cliente estaban bien). Corregido: (1) `/api/auth/update-user` aceptaba `image` arbitraria y nombres sin límite, y el registro admitía campos extra → el hook `before` de `lib/auth.ts` solo admite `name` (validado) en `update-user` y rechaza campos extra en el registro; (2) la ficha de libro consultaba APIs externas antes de validar la sesión (el proxy solo mira que exista la cookie) → `getCurrentUser()` va primero; (3) límites de uso con `allowRequest` (`lib/rate-limit.ts`, colección `rateLimits` con TTL): 40 búsquedas/min de libros y de personas y 30 mensajes/min; (5) `decodeURIComponent` en `/u/[username]` daba error 500 con %-secuencias inválidas → 404. **Pendiente, bajo riesgo**: una suscripción de Pusher ya autorizada sigue recibiendo mensajes nuevos tras eliminar la amistad hasta que el cliente se reconecta (no puede enviar ni leer el historial); se arreglaría publicando un evento en el canal del usuario para que se desuscriba. Sin `Content-Security-Policy` (no hay HTML inyectado; defensa en profundidad para más adelante). Confirmar en producción que el rate limit de Better Auth toma la IP de `x-forwarded-for`.
- Sin dependencias ni variables de entorno nuevas.
- **Pantallas grandes (punto 3b)**: todo va con `md:` (48 rem) o `lg:`; por debajo de `md` el DOM y las medidas son los de antes. Tokens en `globals.css`: `--rail-w` (5,5 rem, barra lateral), `--chatlist-w` (20 rem) y `--chat-left` (safe-left + ambos, para lo `fixed`, que ignora el padding del `body`); utilidades `pl-rail`, `w-chatlist`. `.pb-tabbar` vale 0 desde `md`, así que las pantallas que lo usan no cambian. La barra (`TabBarView`) es la misma: `fixed` abajo en móvil y a la izquierda desde `md` (píldora vertical con la variable CSS `--tab`); un iPhone en horizontal en Safari también llega a `md` y verá la barra lateral (conserva `--safe-left`). `(tabs)/layout.tsx` desplaza el contenido con `md:pl-rail` y sube a `max-w-3xl`. Portadas: 3 → 5 (`md`) → 6 (`lg`) columnas en `ShelfTabs` y en `ProfileSkeleton` (12 piezas, ocultas por breakpoint para filas completas).
- **Chat en dos paneles**: `ChatListPane` (`components/chat/chat-list-pane.tsx`) es la pantalla `/chat` y, desde `md`, un panel `fixed` (`CHAT_LIST_PANE`) entre la barra y la sala. `/chat` muestra «Elige una conversación» a la derecha. Nuevo `app/(full)/chat/layout.tsx` (solo `/chat/[id]`, persiste al cambiar de conversación): monta, ocultos en móvil con `display: none`, la barra lateral y la lista. Para que en móvil no hagan trabajo extra, `TabBar` y `LiveRefresh` aceptan `media` (`useMediaQuery`, `lib/use-media-query.ts`) y fuera de ella no se suscriben a Pusher, no piden no leídos ni refrescan; el coste que queda es que el servidor calcula esa lista y esos badges aunque no se vean (en su `<Suspense>`, sin bloquear la sala). `ChatRoom` sigue `fixed` y siguiendo el `visualViewport` (sin cambios en móvil; solo `md:left-[var(--chat-left)]`, el padding de safe areas pasa de `style` a clases y `md:max-w-3xl`); «Volver» se oculta en `md`. `ConversationLink` marca la conversación abierta (`aria-current`). **Cualquier pantalla `fixed` nueva debe desplazarse con `md:left-…` para no quedar bajo la barra.** El banner offline no cambia (fijo arriba, ancho completo, `z-50`).
- **Pendiente de probar**: no se ha podido ver en un navegador (sin sesión de prueba); solo typecheck, lint y build. Revisar a 390, 768 y 1280 px y el teclado del chat en el iPhone.

### Decisiones de la Sesión 10b (`resenas`)

- **Datos**: `userBooks.review { text, hasSpoilers, createdAt, updatedAt }`, solo con `status: "read"`. Pasar a Leyendo/Pendiente (o quitar el libro) la borra. Sin índices nuevos: la consulta de amigos usa `{userId, bookId}`.
- **Acciones** (`server/shelf/actions.ts`): `setReviewAction` (crea/edita; actualización con pipeline para conservar `createdAt` de forma atómica y `$literal` para que un texto que empiece por «$» no se evalúe como expresión) y `deleteReviewAction`; ambas filtran por `userId` de la sesión y `status: "read"`. `setShelfStatusAction` acepta `review` opcional al pasar a Leído (panel de «Lo he terminado» de Inicio).
- **Confirmación al perder la reseña**: la exige también el servidor, no solo la UI. Sacar de Leídos o quitar de la estantería un libro con reseña devuelve error salvo que llegue `discardReview: true`. `ShelfControl` pide la confirmación inline antes de enviarlo. En la ficha, «Lo he terminado» y pasar de Pendiente a Leído siguen yendo directos (sin panel); la reseña se escribe después con «Escribir reseña».
- **Reseñas de amigos**: `listFriendReviews(me, bookId)` (`server/shelf/reviews.ts`) filtra por `listFriendIds(me)` en la propia consulta (como la actividad); incluye amigos con nota aunque no tengan texto, orden por fecha de la reseña (o de la nota), máx. 50. No hay ruta API de reseñas: solo la ficha (con sesión) y las acciones propias, así que quien no es amigo no puede obtenerlas. El texto de una reseña con spoilers sí viaja al cliente de un amigo (se difumina solo en pantalla).
- **Actividad**: tipo `reviewed`. La actividad **no guarda el texto**: el extracto (160 caracteres y 2 líneas, sin spoilers) se lee de la reseña actual al listar, así que editar dentro de los 15 min no crea otra entrada (`recordReviewActivity`) y un cambio posterior a «spoilers» deja de mostrar el extracto al instante. Una reseña sin cambios no genera actividad. Borrar la reseña o sacar el libro de Leídos borra los `reviewed` (`clearReviewActivity`); los `reviewed` cuya reseña ya no existe se omiten. La fusión de notas (`rated`) ahora solo mira `finished`/`rated` previos, no `reviewed`.
- **UI**: `components/reviews/` (`ReviewFields`, `ReviewEditor`, `MyReview`, `FriendReviews`, `ReviewMark`). La marca de reseña (`hasReview` en `ShelfEntry`; el texto no viaja en las listas) sale en las portadas de Leídos de `ShelfTabs` (propia y de amigos) y de `CoverRow`. «Leer más» aparece con más de 280 caracteres o 5 líneas; fechas de las reseñas en `Europe/Madrid`.
- **Pendiente de probar**: sin sesión de prueba, solo typecheck, lint y build. Comprobar con dos cuentas amigas: escribir/editar/borrar, la ficha del amigo, el extracto en Inicio y el difuminado con spoilers; y que una cuenta no amiga no ve nada.
- Sin dependencias ni variables de entorno nuevas.

### Decisiones de la Sesión 10c (`objetivo`)

- **Datos**: colección `readingGoals { userId, year, target (1–365), createdAt, updatedAt }`, índice único `{userId, year}` (creado solo y en `npm run db:indexes`). El progreso **no se guarda**: `countReadInYear` cuenta `userBooks` en `read` con `finishedAt` en `[1 ene, 1 ene siguiente)` en UTC (mismo año natural UTC que `getProfileStats`). Código en `server/goals/` (`repository.ts`, `actions.ts`); `setReadingGoalAction` (Zod en `lib/validation/goal.ts`, `getCurrentUser()`) solo toca el año en curso.
- **Ritmo** (`lib/goal.ts`): esperado = `objetivo × díaDelAño / díasDelAño` (el día en curso cuenta entero); la diferencia se trunca a libros enteros, así que menos de un libro de diferencia es «Vas al día». Se calcula en el servidor tras la sesión (no se congela en el build).
- **Inicio**: `YearGoal` arriba del todo → `GoalCard` (cliente). Sin objetivo, invitación «¿Cuántos libros quieres leer en 2026?»; ambas abren un panel inline (mismo patrón que «Lo he terminado», no hay componente de diálogo) con campo numérico y atajos 12/24/36/52. Al cumplirlo: «¡Reto cumplido!», anillo con ✓ y animación `goal-pop` (se desactiva con `prefers-reduced-motion`); sigue contando («34 de 30»).
- **Perfil**: `GoalSummary` bajo las estadísticas en `/perfil` y `/u/[username]`. En el de otra persona sale de `getOtherProfile` (`private.goal`), por lo que **solo llega a amigos**. «Retos anteriores» (`PastGoals`, `listPastGoals`) solo en `/perfil` y solo si hay años anteriores con objetivo; un año sin objetivo no aparece.
- **Actividad**: tipo `goal-completed` con `year` y `target` (sin `bookId`; `ActivityItem.book` ahora es opcional). `recordGoalCompleted` hace upsert por `{userId, type, year}` + índice único parcial `goalCompletedOncePerYear`, así que es una sola vez al año aunque haya carreras. Nunca se borra (`clearActivity` filtra por `bookId`). `syncGoalCompletion` se llama al pasar un libro a Leídos y al fijar/bajar el objetivo (bajarlo por debajo de lo ya leído también lo cumple). Subir luego el objetivo no genera otra entrada.
- **Limitaciones**: quitar libros o bajar de «cumplido» no revierte nada (a propósito). El objetivo de un año pasado no se puede editar. Si un libro se marca como leído con `finishedAt` de otro año por datos antiguos, cuenta en ese año.
- **Pendiente de probar**: sin sesión de prueba, solo typecheck, lint y build. Comprobar con dos cuentas: fijar objetivo, progreso y ritmo con tus libros, el amigo ve el reto, el no amigo no, y la actividad al cumplirlo. **Para probar el historial hay que insertar a mano un `readingGoals` de otro año.**
- Sin dependencias ni variables de entorno nuevas.

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
  review?: { text: string, hasSpoilers: boolean, createdAt: Date, updatedAt: Date },  // máx. 2000; solo con status "read"
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
  pairKey: string,         // "<idMenor>_<idMayor>": una sola amistad por pareja
  createdAt: Date,
  respondedAt?: Date,
}
// índices únicos: { pairKey } y { requesterId, addresseeId }; índice: { addresseeId, status }

// activities — cambios de estantería que ven los amigos
{
  _id,
  userId: ObjectId,
  bookId: ObjectId,
  type: "started" | "finished" | "rated" | "reviewed" | "goal-completed",
  rating?: 1 | 2 | 3 | 4 | 5,
  year?: number, target?: number,   // solo "goal-completed" (sin bookId)
  createdAt: Date,
}
// índices: { userId, createdAt: -1 }; único parcial { userId, year } para "goal-completed"

// readingGoals — objetivo anual (el progreso se calcula, no se guarda)
{ _id, userId: ObjectId, year: number, target: number /* 1-365 */, createdAt: Date, updatedAt: Date }
// índice único: { userId, year }

// conversations — solo 1 a 1 entre amigos
{
  _id,
  participantIds: [ObjectId, ObjectId],  // ordenados
  pairKey: string,         // "<idMenor>_<idMayor>": una sola conversación por pareja
  lastMessage?: { text: string, senderId: ObjectId, createdAt: Date },
  lastReadAt: { [userId: string]: Date },
  createdAt: Date,
  updatedAt: Date,
}
// índice único: { pairKey }; índice: { participantIds, "lastMessage.createdAt": -1 }

// messages
{
  _id,
  conversationId: ObjectId,
  senderId: ObjectId,
  text: string,            // máx. 2000 caracteres
  clientId: string,        // uuid del cliente: el reintento no duplica
  createdAt: Date,
}
// índice: { conversationId, createdAt: -1, _id: -1 }; índice único: { conversationId, clientId }
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

## Sesión 10a — `notificaciones`

**Modelo:** `opusplan` · **Empieza en modo plan**

**Antes de empezar:** nada. Claude generará las claves VAPID; tú solo tendrás que copiarlas en Vercel al final.

**Prompt:**

```
Lee CLAUDE.md y docs/PLAN.md (sobre todo las decisiones de las Sesiones 8 y 9). Vamos con la Sesión 10a (notificaciones).

Quiero notificaciones push y el número de no leídos sobre el icono de la app, en el iPhone (PWA añadida a la pantalla de inicio, iOS 16.4 o superior) y en el ordenador (Chrome, Edge, Firefox y Safari). Usa Web Push estándar con claves VAPID.

1. Claves y envío: genera las claves VAPID y añade a .env.example NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY y VAPID_SUBJECT (mailto: con OPENLIBRARY_CONTACT_EMAIL o similar). Escribe tú las claves en .env.local. Para enviar, usa la librería web-push (justifica la dependencia). Sin las variables, la app debe funcionar igual y simplemente no enviar nada.
2. Suscripciones: colección pushSubscriptions (userId, endpoint único, keys, etiqueta del dispositivo sacada del user agent, createdAt, lastUsedAt). Un usuario puede tener varios dispositivos. Si el servicio de push responde 404 o 410, borra esa suscripción. Al cerrar sesión, borra la suscripción de ese dispositivo.
3. Service worker: amplía public/sw.js (sube VERSION) con los eventos push y notificationclick. Al tocar la notificación, enfoca la ventana abierta de la app y navega a la URL del aviso, o abre una nueva si no hay ninguna. Al recibir un push, actualiza el número del icono con navigator.setAppBadge usando el total de no leídos que viene en el payload.
4. Qué se notifica y cuándo:
   - Mensaje nuevo: título con el nombre de quien escribe, cuerpo con el principio del mensaje, abre /chat/<id>. No se envía si el destinatario tiene esa conversación abierta y visible en ese momento. Comprueba si en iOS cada push tiene que mostrar una notificación obligatoriamente (Safari puede revocar la suscripción si no); si es así, esta decisión se toma en el servidor antes de enviar, no en el service worker. Propón cómo saber en el servidor que la conversación está abierta (por ejemplo, un latido mientras la sala está visible).
   - Solicitud de amistad recibida: abre /amigos.
   - Solicitud aceptada: abre /u/<username>.
   - Agrupa con la opción tag de las notificaciones para que varios mensajes seguidos de la misma conversación no llenen la pantalla de avisos.
   El envío no debe retrasar la respuesta de la acción (usa after() de Next.js si encaja) y nunca debe romperla si falla, igual que publish() de Pusher.
5. Número del icono: además del push, mantenlo sincronizado desde la app abierta. Donde hoy se actualiza el badge de la pestaña Chat (evento unread-changed y al volver a la app), llama también a setAppBadge o clearAppBadge con el total de no leídos. Comprueba siempre que la API existe antes de usarla.
6. Ajustes: apartado «Notificaciones» en /ajustes.
   - Botón «Activar en este dispositivo». El permiso solo se pide al tocar ese botón, nunca al abrir la app.
   - Si es un iPhone en Safari sin instalar (no standalone), en vez del botón explica cómo añadir la app a la pantalla de inicio.
   - Si el permiso está denegado, explica cómo activarlo en los ajustes del sistema.
   - Interruptores por tipo (mensajes, solicitudes, solicitudes aceptadas), guardados por usuario y respetados en el servidor al enviar.
   - Lista de dispositivos con notificaciones activas y opción de quitar cada uno.
7. Privacidad: ningún aviso a quien no sea amigo, comprobando areFriends al enviar los de chat, igual que en el resto del chat.

Hecho cuando: en local, con npm run build y npm start (el service worker solo se registra en producción), en Chrome de escritorio puedo activar las notificaciones, recibo un aviso al escribirme desde otra cuenta, el aviso me lleva a la conversación y no recibo nada si tengo esa conversación abierta. typecheck, lint y build pasan. Dime exactamente qué variables tengo que añadir en Vercel y qué tengo que probar en el iPhone. Marca la sesión en el plan y anota las decisiones.
```

**Comprobación tuya:**
1. Añade las tres variables VAPID en Vercel y haz redeploy.
2. En el iPhone, borra la app de la pantalla de inicio y vuelve a añadirla, para que coja el service worker nuevo.
3. Abre la app, ve a Ajustes y activa las notificaciones.
4. Bloquea el iPhone y escríbete desde otra cuenta. Debe llegar el aviso a la pantalla de bloqueo y aparecer el número sobre el icono.
5. Abre la conversación. El número debe desaparecer.

---

## Sesión 10b — `resenas`

**Modelo:** `sonnet` · modo automático

**Prompt:**

```
Lee CLAUDE.md y docs/PLAN.md (sobre todo las decisiones de las Sesiones 5, 7 y 9). Vamos con la Sesión 10b (resenas).

Reseñas de texto en los libros leídos, visibles solo para amigos:
1. Datos: añade a userBooks un campo review { text (máximo 2000 caracteres), hasSpoilers (boolean), createdAt, updatedAt }. Solo puede existir en libros con estado "read". Server Actions para guardar, editar y borrar la reseña, con Zod, getCurrentUser() y filtro por userId de la sesión, como el resto de acciones de la estantería.
2. Al sacar un libro de Leídos se perderían la nota y la reseña: si tiene reseña, pide confirmación antes de moverlo.
3. Escribir: en el panel que aparece al marcar un libro como leído (el de la valoración con estrellas), añade un campo opcional «Escribe tu reseña» y la casilla «Contiene spoilers». En la ficha del libro, si ya está en Leídos, un botón para escribir o editar la reseña.
4. Leer en la ficha del libro (/libro/[id]), debajo de la descripción:
   - «Tu reseña», con opción de editar o borrar.
   - «Lo que opinan tus amigos»: reseñas y notas de mis amigos aceptados que han leído ese libro, con avatar, nombre, estrellas y fecha, de la más reciente a la más antigua. Las que tienen spoilers aparecen difuminadas con un botón «Mostrar». Textos largos recortados con «Leer más».
   - El filtro por amistad se hace en la consulta, igual que la actividad.
5. Actividad: nuevo tipo "reviewed" en activities, con un extracto en Inicio («Marta ha reseñado Dune» y las primeras líneas, sin extracto si tiene spoilers). Editar la reseña en los 15 minutos siguientes actualiza la entrada en vez de crear otra, igual que con las notas. Borrar la reseña borra su actividad.
6. Perfil: en la pestaña Leídos, propia y de amigos, marca pequeña en las portadas de los libros con reseña.

Hecho cuando: puedo escribir, editar y borrar una reseña; un amigo la ve en la ficha y en su Inicio; alguien que no es amigo no la ve ni llamando a las rutas directamente. typecheck, lint y build pasan. Marca la sesión y anota las decisiones.
```

---

## Sesión 10c — `objetivo`

**Modelo:** `sonnet` · modo automático

**Prompt:**

```
Lee CLAUDE.md y docs/PLAN.md (sobre todo las decisiones de las Sesiones 5, 6 y 7). Vamos con la Sesión 10c (objetivo).

Objetivo de lectura anual:
1. Datos: colección readingGoals { userId, year, target (1 a 365), createdAt, updatedAt } con índice único { userId, year }. El progreso no se guarda: se calcula contando los userBooks con estado "read" y finishedAt dentro de ese año, con el mismo criterio de año que getProfileStats. Server Action para fijar o cambiar el objetivo del año actual, con Zod y getCurrentUser().
2. Inicio: tarjeta arriba del todo con el reto del año: «12 de 30 libros», anillo de progreso y ritmo («Vas 2 libros por delante», «Vas 1 libro por detrás» o «Vas al día»), comparando con lo esperado según el día del año. Al tocarla se abre un panel para cambiar el objetivo. Si no hay objetivo, en su lugar una invitación discreta («¿Cuántos libros quieres leer en 2026?») que abre ese mismo panel.
3. Al completarlo: la tarjeta cambia a estado «¡Reto cumplido!» con algo de celebración visual sobria, y deja seguir contando por encima del objetivo («34 de 30»).
4. Perfil: el progreso del reto junto a las estadísticas de la cabecera, tanto en /perfil como en /u/[username] para amigos (mediante getOtherProfile, nunca para quien no es amigo).
5. Historial: en /perfil, un apartado «Retos anteriores» con cada año, el objetivo y lo leído («2025: 28 de 30»), solo si hay años anteriores.
6. Actividad: nuevo tipo "goal-completed" que se registra una sola vez por año al alcanzar el objetivo («Marta ha cumplido su reto de 30 libros»). Si después baja de nuevo (por ejemplo, al quitar un libro), no se borra.

Hecho cuando: puedo fijar el objetivo, el progreso y el ritmo son correctos con mis libros, un amigo ve mi reto en mi perfil y alguien que no es amigo no lo ve. typecheck, lint y build pasan. Marca la sesión y anota las decisiones.
```

---

## Ideas para más adelante

- **Escáner de código de barras** con la cámara para añadir libros por ISBN.
- **Importar desde Goodreads** con su exportación CSV.
- **Desuscribir de Pusher al eliminar una amistad** (pendiente de bajo riesgo de la Sesión 9).
