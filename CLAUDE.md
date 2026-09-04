@AGENTS.md

# Carmessie Velvet — Admin

Panel de administración de Carmessie Velvet (Next.js + Tailwind CSS + shadcn/ui). Es un proyecto **hermano** de [carmessievelvet-web](../carmessievelvet-web) (el storefront), pero un repo completamente aparte — sin dependencias compartidas entre ambos. El backend lo construye otro equipo, así que —igual que en el storefront— todo el consumo de datos pasa por una capa de servicios simulada (mock) en TypeScript, lista para swapear por una API REST real sin tocar la UI.

## Relación con carmessievelvet-web

- Ambos proyectos modelan el mismo dominio (productos, categorías) pero **cada uno tiene su propia copia de `types/`, `mocks/` y `services/`** — no hay paquete compartido todavía. Si el dominio crece y la duplicación empieza a doler, considerar extraer un paquete compartido (monorepo/workspace) en ese momento, no antes.
- Las categorías (`Corsets`, `Sets`) y los talles (`XS/S/M/L`) se mantienen iguales en ambos proyectos a propósito, para que los productos creados acá tengan sentido en la tienda. Catálogo real de la clienta: solo esas dos categorías (corset suelto vs. corset + falda/pantalón a juego).
- El logo real vive en `public/brand/` (mismo asset que en `carmessievelvet-web`, extraído del PDF de la clienta) — `carmessie-mark-white.png` para la sidebar oscura, `carmessie-mark-ink.png` si se necesita sobre fondo claro.

## Arquitectura de datos: mock-data-service

Mismo patrón que en `carmessievelvet-web`:
- `types/` — modelos de dominio en TypeScript puro, sin lógica.
- `services/` — interfaz (`ProductService`) + implementación mock (`MockProductService`). Los métodos de escritura (`createProduct`, etc.) hacen `console.log` del payload que se enviaría, simulan latencia de red y devuelven una respuesta falsa — así el formulario ya queda funcionalmente completo y el equipo de backend solo tiene que reemplazar el cuerpo del método por el `fetch`/`POST` real, sin tocar componentes.
- `mocks/` — datos de ejemplo (productos, categorías, colores). Nunca se importan directamente desde componentes, solo desde `services/`.

## Integración con la API real (`carmessievelvet-api`)

El backend real (`../carmessievelvet-api`, NestJS + TypeORM + Postgres + S3) ya existe. **Auth, catálogo, crear producto (con imágenes, SKU y color) están conectados a la API real.**

- **Color es un campo libre por producto, no por variante/talla** (`Product.color`, texto libre, nullable) — si el mismo diseño viene en dos colores, son dos productos/SKUs distintos en el catálogo, no una variante del mismo producto. El form de admin lo refleja como un solo input de texto ("Color") en "Información general", separado de "Stock por talla" (que sigue siendo solo `XS`/`S`/`M`/`L`, sin eje de color — nunca lo tuvo del lado del backend).
- **SKU pasó a ser el identificador de ruta** para cualquier endpoint de un solo producto — `GET/PATCH/DELETE /products/:sku` (ya no `:id`), igual en `/products/:sku/stock` y `/products/:sku/images`, y en el storefront público `/store/products/:sku`. Los listados (`GET /products`, `GET /store/products`) no cambiaron de forma. `catalogService.uploadProductImages(sku, files)` usa el `sku` del producto recién creado, no su `id` — ojo si se agrega algún otro endpoint de un solo producto, hay que seguir el mismo patrón.
- SKU es opcional al crear (`CreateApiProductPayload.sku`) — si se omite, la API genera uno (`SKU-XXXXXXXX`); si se manda, debe ser `[A-Za-z0-9-]{3,50}` (la API lo normaliza a mayúsculas). El form de admin tiene un input "SKU (opcional)" con esa misma validación en el cliente, para dar feedback antes del round-trip.
- Todo el mock original se eliminó: `services/product-service.ts`, `services/category-service.ts`, `mocks/products.ts`, `mocks/categories.ts`, `mocks/colors.ts`, y `types/product.ts` (`Category`/`Color`/`Product`/`ProductVariant`/`CreateProductPayload`). El color real es texto libre, no un catálogo predefinido, así que el mock de colores no tenía nada que aportar una vez conectada la API. Todo el dominio de producto vive ahora en `types/catalog.ts`.

Documentación completa de contratos: `../carmessievelvet-api/docs/API-FRONTEND.md` (mantenida por el equipo de backend, incluye ejemplos de request/response de cada endpoint, tabla de errores, y una sección de "limitaciones" a propósito para no asumir que algo existe cuando no).

- `src/lib/api-client.ts` — wrapper de `fetch` sobre `NEXT_PUBLIC_API_URL` (ver `.env.local`, gitignored — apunta hoy al despliegue temporal de pruebas `https://api-carmessie.spyrocode.tech/api`, va a cambiar). Desenvuelve el envelope `{success, message, data, timestamp}` / `{success:false, message, error, statusCode}` de la API y lanza `ApiError`; `message` puede venir como `string[]` (errores de validación) y se normaliza a un string. Detecta `body instanceof FormData` para no forzar `Content-Type: application/json` en la subida de imágenes (el navegador necesita poner su propio boundary de multipart).
- `src/lib/auth-store.ts` — store externo (`useSyncExternalStore`, mismo patrón que el cart de `carmessievelvet-web`) que persiste `{user, tokens}` en `localStorage` bajo `carmessie-admin-auth`.
- `src/services/auth-service.ts` (`RestAuthService`, sin mock — nunca hubo login que simular) y `src/services/catalog-service.ts` (`RestCatalogService`: `getProducts`, `getCategories`, `createProduct`, `uploadProductImages`) — todos requieren rol `ADMIN`/`SUPER_ADMIN`; `auth-context.tsx` rechaza el login client-side si el usuario no tiene ninguno de esos roles.
- `src/context/auth-context.tsx` (`AuthProvider`/`useAuth`) envuelve toda la app en `layout.tsx`. `src/components/auth/AuthGuard.tsx` protege el route group `src/app/(dashboard)/` (redirige a `/login` si no hay sesión) — `src/app/login/` vive fuera de ese grupo, sin sidebar.
- `/productos` y `/productos/nuevo` son client components (no server components) porque el JWT vive en `localStorage`, inaccesible desde el servidor sin migrar a cookies — decisión consciente para no complicar el alcance de esta integración.
- **Creación de producto** (`productos/nuevo`): `POST /api/v1/products` ya **no acepta `images` en el body** (breaking change del backend) — se crea el producto primero (nombre, precio, descripción, categoría, variantes por talla) y después, si hay imágenes, se suben aparte con `POST /api/v1/products/:id/images` (`multipart/form-data`, campo `files`, modo `append` por default). Si la creación tiene éxito pero la subida de imágenes falla, el producto queda creado sin imágenes — no hay rollback (aceptado, es un caso raro y el admin puede subir imágenes después vía Swagger/otra pantalla cuando exista).
- Las miniaturas de producto real (`/productos`) usan `<img>` plano, no `next/image` — la API puede devolver cualquier host (S3 en prod, `via.placeholder.com` de fallback), y ya nos mordió exactamente este bug con `next/image`+host no configurado en `carmessievelvet-web`.
- CORS: el backend agregó su propio `app.enableCors()` (variable `CORS_ORIGINS`, plural) — si no está seteada en el entorno, acepta cualquier origen (con warning en el log del backend). No depende de qué puerto use el dev server de este proyecto.
- Bug de Base UI encontrado y arreglado en el camino (`AppHeader.tsx`): `Menu.GroupLabel` (`DropdownMenuLabel`) exige estar dentro de `Menu.Group` (`DropdownMenuGroup`), y el item de "Cerrar sesión" usaba `onSelect` (API de Radix) en vez de `onClick` (API real de Base UI) — TypeScript no lo marcó porque `onSelect` también existe como evento nativo de `<div>`, así que compilaba pero nunca se disparaba.
- Verificado extremo a extremo contra el despliegue de pruebas real: login con credenciales reales, creación de un producto con imagen (subida y confirmada en S3), aparición en el listado, y borrado de limpieza — sin datos de prueba dejados en la instancia compartida.
- **Editar producto** (`productos/[sku]/page.tsx`): un ícono de lápiz por fila en `productos/page.tsx` lleva a esta ruta dinámica. Trae el producto (`GET /products/:sku`) y lo edita con `PATCH /products/:sku` (nombre, precio, descripción, categoría, color, SKU, estado activo/inactivo y stock por talla) — mismo form que "Nuevo producto" pero sin el campo de imágenes (esas se gestionan aparte). Si el SKU cambia al guardar, la API lo trata como una identidad nueva de ruta; la página lo detecta (`updated.sku !== currentSku`) y hace `router.replace` a la nueva URL, guardando el SKU "actual" en un state separado del param de la URL para que un segundo guardado sin recargar siga pegándole al SKU correcto.
- **Gestión de imágenes existentes** (`ExistingImagesManager.tsx`, usado solo en la página de editar): a diferencia de `ImageUploader.tsx` (que solo acumula `File[]` para subir cuando se cree el producto), acá cada acción — agregar, borrar, mover — llama a la API al instante (`POST`/`DELETE`/`PATCH /products/:sku/images`), no hay un botón de "guardar" para imágenes. Reordenar es mover-izquierda/mover-derecha (sin drag-and-drop); la primera imagen siempre es la portada.
- Bug de Base UI repetido (mismo patrón que ya nos había pasado con el `Select` de categoría): el `Select` de "Estado" (activo/inactivo) mostraba el string crudo `"true"`/`"false"` en vez de "Activo"/"Inactivo" — `SelectValue` de Base UI no resuelve la etiqueta sola, siempre hay que pasarle una función `children` que mapee el valor a su label. Cualquier `Select` nuevo en este proyecto necesita ese mismo patrón, no asumir que se resuelve solo.
- **Eliminar producto**: botón destructivo en `productos/[sku]`, `DELETE /products/:sku` (soft-delete). Confirmación con `window.confirm` nativo — no hay componente de diálogo en `ui/` todavía, se optó por el nativo del navegador en vez de instalar uno para una sola acción.

## Módulos adicionales: tags, cupones, descuentos, órdenes

Construidos para cubrir todo lo que la API ya soporta y que un admin real necesita día a día (pedido explícito del usuario: "admin robusto"). Todos siguen el estándar de diseño de arriba (tarjeta de sección con ícono, estados carga/vacío/error, badges de estado).

- **Tags** (`/tags`, `catalogService.getTags/createTag/updateTag/deleteTag`): CRUD simple de una sola página, sin ruta dinámica — crear arriba, renombrar/borrar inline por fila. `TagPicker.tsx` (chips toggle, mismo patrón visual que el viejo selector de color) se conecta en los forms de crear/editar producto vía `tagIds` — ya viaja en `CreateApiProductPayload`/`UpdateApiProductPayload`.
- **Cupones** (`/cupones`, `coupon-service.ts`) y **Descuentos de producto** (`/descuentos`, `discount-service.ts`): mismo patrón CRUD — una tarjeta de formulario que alterna entre "crear" y "editar" (`editingId` en state, sin ruta dinámica separada porque no tienen una URL pública que lo justifique, a diferencia de los productos), lista debajo con botón habilitar/deshabilitar + editar + eliminar. `code` de un cupón es inmutable una vez creado (input deshabilitado en modo edición). Los descuentos tienen selector de productos con checkboxes + filtro de texto (`endsAt` y `durationHours` son mutuamente excluyentes, validado con `.refine()` en el zod schema, igual que en el backend).
- **Órdenes** (`/ordenes` listado, `/ordenes/[id]` detalle, `order-service.ts`): el listado trae hasta 100 órdenes y filtra client-side (estado + texto), mismo patrón que el catálogo de productos. El detalle replica la máquina de estados del backend (`ALLOWED_TRANSITIONS` ∩ `MANUAL_STATUSES` en `order-status.util.ts` del API) como `NEXT_MANUAL_STATUS` en `types/orders.ts` — como el backend nunca permite saltarse un estado, en la práctica solo hay **un** botón de "siguiente estado manual" posible a la vez, nunca una lista. Cancelar pide motivo con `window.prompt` (igual que eliminar producto, sin componente de diálogo instalado). Verificado con las 2 órdenes reales de prueba que ya existían en la instancia — no se tocó su estado, son de otra sesión.
- Todas las acciones destructivas o irreversibles (eliminar tag/cupón/descuento/producto, cancelar orden) usan `window.confirm`/`window.prompt` nativos del navegador — funcionan en el navegador real, pero no son "clickeables" por herramientas de automatización que auto-descartan diálogos nativos (una limitación conocida de ese tipo de herramientas, no del código). Si en algún momento se agrega un componente `Dialog`/`AlertDialog` a `ui/`, migrar estas confirmaciones ahí en vez de seguir con las nativas.

## Productos sobre pedido y métodos de envío

La clienta pidió que las prendas se vendan **sobre pedido** en vez de por stock fijo; el backend ya lo implementó (migración `MadeToOrderProducts`) junto con un catálogo editable de métodos de envío (migraciones `ShippingMethodCatalog`/`ShippingMethodsEditable`) — checkout ahora exige elegir uno. Lo de abajo es lo que se conectó en este admin.

- **`Product.madeToOrder`** (`ApiProduct.madeToOrder`, `types/catalog.ts`): checkbox "Vender sobre pedido (sin inventario)" en la card "Stock por talla" de `productos/nuevo` y `productos/[sku]` — se manda siempre explícito en `CreateApiProductPayload`/`UpdateApiProductPayload` (nunca se depende de la inferencia por `stock` omitido que hace la API cuando el campo no viene). Cuando está activo, los inputs de stock por talla se deshabilitan (`VariantManager`'s prop `madeToOrder`) pero **no se ocultan ni se borran** — el valor se sigue guardando por si algún día vuelve a venderse con inventario real, igual que decidió el backend al no quitar la columna `stock`.
- **`ProductVariant.soldOut`** (`ApiProductVariant.soldOut`): override manual independiente del stock, uno por talla — checkbox "Agotado" junto a cada input de stock en `VariantManager.tsx`. Se administra como parte del `PATCH /products/:sku` normal (mandando `variants[].soldOut` en el array que ya reemplaza el set completo), **no** se conectó el endpoint dedicado `PATCH /products/:sku/sold-out` — hubiera sido una segunda forma de escribir el mismo dato sin aportar nada nuevo a esta UI, ya que el form de editar producto ya reescribe `variants` completo en cada guardado.
- **Listado de productos** (`productos/page.tsx`): columna "Stock" ahora muestra `Badge` "Sobre pedido" (`secondary`) cuando `madeToOrder`, o "Agotado" (`destructive`) cuando todas las variantes tienen `soldOut: true` — esta última chequea independiente de `madeToOrder` y de `totalStock`, porque un producto sobre pedido nunca tiene `totalStock` bajo (siempre es `null`).
- **`ApiProduct.totalStock`** pasó de `number` a `number | null` — la API devuelve `null` para un producto sobre pedido (no hay inventario que sumar). El listado ya no puede comparar `=== 0` como único criterio de "agotado" (ver punto anterior).
- **Métodos de envío** (`/metodos-envio`, `shipping-method-service.ts`, `types/shipping.ts`): CRUD simple de una sola página, mismo patrón visual que `/tags` — crear arriba (código + costo en MXN + descripción opcional), editar solo el costo inline por fila, eliminar (soft-delete). `code` es inmutable una vez creado (la API no tiene endpoint para cambiarlo — `ShippingMethodService` de la API solo tiene `create`/`updatePrice`, no `update`), así que no hay UI para editarlo, ni siquiera en un modo "editar". `priceMinor` viaja en centavos (iguial que Stripe); el form lo pide/muestra en pesos y convierte con `Math.round(pesos * 100)` al guardar.
- **Órdenes**: `ApiOrder` ahora trae `shippingMethod` (código elegido) y `shippingMethodDescription` (snapshot de la descripción al momento de la compra, puede no coincidir con la del catálogo actual si se editó después) — se muestran en la card "Cliente y envío" de `ordenes/[id]`. `OrderItem.madeToOrder` (snapshot de si el producto era sobre pedido al comprarse) se muestra como un `Badge` "Sobre pedido" junto al nombre del artículo en la tabla de esa misma página.
- **Checkbox nuevo en `ui/`**: `components/ui/checkbox.tsx`, wrapper de `@base-ui/react/checkbox` (mismo patrón que `select.tsx`) — se usa para `madeToOrder` y `soldOut`. Sigue el mismo criterio de estilo que el resto de `ui/` (tokens de `globals.css`, sin valores nuevos).

## Bug pre-existente encontrado (no de este cambio): descripción vacía bloquea guardar

Al probar el toggle de `soldOut` contra un producto real se encontró que **cualquier producto cuya `description` haya quedado vacía en la API no se puede editar desde este admin** — `productFieldsSchema` (`product-schema.ts`) exige `description.min(10)` en ambos forms (crear y editar), pero `valuesFromProduct` rellena el campo con `product.description ?? ""` cuando la API no tiene descripción guardada, así que el form arranca ya inválido y cualquier intento de `Guardar cambios` falla la validación de zod sin dar pista de por qué (el error solo aparece bajo el textarea, fácil de no notar si se scrollea de más). No se tocó en esta sesión por estar fuera de alcance del pedido — hay que decidir si `description` deja de ser obligatoria en el form de edición (la API sí la trata como opcional) o si se exige rellenarla al vuelo la primera vez que se edita un producto legado sin ella.

## Lo que le falta a la API para un admin realmente completo

Encontrado mientras se construía lo de arriba — no es responsabilidad de este repo arreglarlo, pero vale la pena pedirlo al equipo de backend:

**Alto impacto (bloquean operación diaria real):**
1. **Notificaciones al cliente** (al menos email): confirmación de orden, pago confirmado, envío con tracking, cancelación/reembolso. Hoy no se manda nada — ya está documentado como límite conocido en `API-FRONTEND.md`, pero sigue siendo el gap más grande para operar de verdad.
2. **Gestión de clientes para el admin**: no hay `GET /users` ni nada similar — el admin solo ve nombre/email dentro de cada orden, no un perfil de cliente ni su historial agregado de compras.
3. **Limpieza de órdenes `PENDING` abandonadas**: ya vimos 2 reales en la instancia de pruebas (nunca se completó el pago). No hay barrido automático ni un endpoint para cancelarlas en bulk — se acumulan para siempre salvo que un admin las cancele una por una.
4. **Cálculo de envío real**: `shippingTotal` siempre es `0` — no hay forma de cobrarlo.
5. **Reportes/analítica**: no hay ningún endpoint de ventas por período, productos más vendidos, etc. — el dashboard del admin solo puede mostrar conteos del catálogo (productos/categorías), nunca métricas de negocio, por más que se rediseñe el frontend.

**Impacto medio:**
6. **Auditoría de órdenes expuesta**: `order_status_history` existe en la base de datos pero no hay endpoint para leerlo — el admin no puede ver quién cambió un estado y cuándo.
7. **Categorías editables**: hoy son solo seed (`Corset`, `Sets`) — si la clienta pide una tercera categoría, se necesita una migración de backend, no hay `POST /categories`.
8. **Reembolsos parciales**: `POST /orders/:id/cancel` siempre reembolsa el 100%, documentado como decisión de v1.
9. ~~Preview de cupón sin comprar~~ — **resuelto**: `POST /api/v1/store/coupons/validate` (público) ya existe. Sigue sin ser una función de admin (es para el carrito del storefront), pero queda anotado en la sección de abajo.
10. **Import/export masivo de productos** (CSV): cargar o actualizar el catálogo hoy es producto por producto.

**Bajo impacto / a futuro:**
11. Umbral configurable de "stock bajo" (hoy el dashboard solo distingue 0 contra más de 0, no hay forma de avisar "quedan 2").
12. CDN/optimización de imágenes (hoy son URLs directas de S3, sin transformar).
13. Reseñas de producto — sigue sin existir. La lista de deseos ya no aplica: ver módulo de wishlist abajo.

**No es un gap de backend, es una decisión nuestra**: la API sí tiene `/api/v1/roles` completo (crear/editar roles, asignar roles a usuarios, `SUPER_ADMIN` únicamente) pero no se construyó pantalla para eso en el admin — quedó fuera a propósito por ser una función sensible y poco usada. Se puede agregar después si hace falta promover admins desde la UI en vez de por base de datos.

## Cambios de la API revisados y no aplicados a este admin (a propósito)

Una tanda de cambios agregó wishlist, preview de cupón y rate-limiting de login. Revisados uno por uno:

- **Wishlist** (`/api/v1/me/wishlist`, `@Roles(UserRole.USER)`) — función de cliente final (guardar productos favoritos en el storefront), no existe ningún endpoint admin-facing sobre esto (ej. "productos más deseados"). No hay nada que agregar acá; es 100% para `carmessievelvet-web`.
- **Preview de cupón** (`POST /api/v1/store/coupons/validate`, público) — pensado para el carrito del storefront ("este cupón te da $X de descuento" antes de pagar). Se podría agregar un botón "Probar cupón" en `/cupones`, pero requeriría armar un carrito de prueba (`productId`+`size`+`quantity`) solo para validar un código — la fricción no vale la pena hoy; el admin ya ve `isCurrentlyValid` en cada cupón, que es la parte que sí importa para administrar. Reconsiderar si algún día hace falta simular carritos reales desde el admin.
- **Rate limiting de login** — sí aplica directo: `POST /auth/login` ahora cuenta intentos fallidos (nunca los exitosos) y bloquea con `429` tras 5 fallos por IP o 10 por email en 15 minutos, por otros 15 minutos. `ApiError` (`api-client.ts`) ahora carga `retryAfter` (segundos) cuando el body del error lo trae, y `login/page.tsx` lo muestra en español ("Probá de nuevo en N minutos") en vez del mensaje genérico. **No se probó disparando el límite de verdad** — el bloqueo es por IP, así que hubiera tumbado el login real por 15 minutos en la instancia compartida; se verificó por build/tipos únicamente.
- El refactor de `ProductFilterQueryDto` (filtros de catálogo compartidos entre admin/storefront/wishlist) es reorganización interna del backend — no cambia la forma de `GET /api/v1/products` que ya consume `catalogService`, no hizo falta tocar nada acá.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4, scaffolded con `create-next-app`.
- **shadcn/ui** (preset `base-nova`, librería `@base-ui/react`, no Radix) — componentes en `src/components/ui/`. El componente `form.tsx` (integración con `react-hook-form`) se escribió a mano siguiendo el patrón estándar de shadcn porque el registro no lo entregó vía CLI en esta versión; usa `React.cloneElement` en `FormControl` en vez de un `Slot` de Radix/Base UI.
- `react-hook-form` + `zod` (`@hookform/resolvers`) para el formulario de productos.
- `AGENTS.md` (generado y mantenido por `next dev`) advierte que esta versión de Next.js tiene cambios importantes respecto a versiones anteriores — antes de escribir código, revisar `node_modules/next/dist/docs/` o usar `find-docs`/`context7` en vez de asumir por memoria. Lo mismo aplica a shadcn/Base UI: son APIs recientes, verificar con `context7` antes de asumir la forma de una prop.

## Estándar de diseño

Regla general: **toda pantalla o componente nuevo sigue estos patrones** — son los mismos que ya usan `page.tsx` (dashboard), `productos/page.tsx` y `productos/nuevo/page.tsx`. Si una pantalla nueva necesita algo que no está aquí, extender el sistema (mismos tokens, misma lógica de composición) en vez de inventar uno paralelo, y si el patrón es reutilizable, agregarlo a esta lista.

- **Audiencia**: equipo interno (no clientas), tono **funcional y profesional**, no editorial — a diferencia del storefront, acá no se usa la tipografía serif itálica ni el mobile-first estricto. Es **desktop-first pero responsive**.

### Tokens (no inventar valores nuevos — están en `src/app/globals.css`)

- **Color de marca**: `--primary` / `--ring` / `--sidebar-primary` = `#3f1029` (velvet). Es el único acento — no introducir un segundo color de marca.
- **Neutros**: el resto de la paleta (`--background`, `--card`, `--muted`, `--border`, etc.) son grises `oklch` de shadcn — no hardcodear hex, usar las clases (`bg-muted`, `text-muted-foreground`, `border-border`, `bg-destructive/10 text-destructive`, etc.).
- **Radios**: `--radius: 0.5rem` como base; `rounded-md` para badges/íconos pequeños, `rounded-lg` para inputs/botones/tablas, `rounded-xl` (default de `Card`) para tarjetas. No usar `rounded-full` salvo círculos reales (avatares, badges de ícono redondos).
- **Sidebar**: oscura y fija (`Sidebar collapsible="icon"`), independiente de la paleta clara del contenido — no cambiar sus tokens (`--sidebar-*`) para que combinen con el contenido; es intencional el contraste.

### Tipografía y jerarquía

- **Título de página**: `text-2xl font-semibold tracking-tight` + subtítulo `mt-1 text-sm text-muted-foreground`. Siempre este par, sin ícono al lado del `h1` — el ícono va en las tarjetas de sección, no en el título de página (ver abajo).
- **Título de tarjeta/sección**: `CardTitle` (ya trae `text-base font-medium`) + `CardDescription` (`text-sm text-muted-foreground`) debajo.
- **Texto de apoyo/nota**: `text-xs text-muted-foreground` para aclaraciones al pie de una pantalla (ver el pie del dashboard o del form de producto).
- Una sola familia tipográfica (Geist / `font-sans`) en toda la app — no introducir una segunda sin que lo pida el negocio.

### Iconografía

- Solo `lucide-react`, estilo stroke, nunca emoji ni glifos decorativos.
- Tamaño `size-4` dentro de botones/badges; `size-5` en estados vacíos/carga; `size-9` es el tamaño del contenedor de ícono de sección (ver "tarjeta de sección" abajo), con el ícono en `size-4` adentro.

### Patrones de composición (copiar la forma, no solo el resultado)

- **Encabezado de página**: `<div className="flex items-center justify-between">` con el título+subtítulo a la izquierda y la acción primaria (`Link`/`Button`) a la derecha. Ejemplo: `productos/page.tsx`.
- **Tarjeta de sección con ícono** (dashboard y cada `Card` del form de producto): dentro de `CardHeader`, un `<span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="size-4" /></span>` seguido de `CardTitle`/`CardDescription`. Es el mismo bloque en los tres lugares que lo usan — copiarlo literal, no reinventar el spacing.
- **Tarjeta de estadística** (`StatCard` en `page.tsx`, el dashboard): mismo ícono-contenedor de arriba pero con el valor grande (`text-2xl font-semibold`) como "título". Usar `tone="warning"` (fondo/texto `destructive`) solo para métricas que de verdad requieren atención (ej. sin stock), nunca decorativo. **Nunca inventar una métrica que no venga de una llamada real a `catalogService`** — si el dato no existe todavía (ventas, pedidos), no se muestra, no se pone en 0 falso ni se simula: se documenta como pendiente (ver el pie de página del dashboard).
- **Tabla de listado** (`productos/page.tsx`): thumbnail 40px (`size-10 rounded-md bg-muted overflow-hidden`, `<img>` plano — ver regla de imágenes abajo), nombre en `font-medium` con el identificador secundario (SKU) debajo en `text-xs text-muted-foreground`, columnas descriptivas en `text-muted-foreground`, estado como `Badge`.
- **Búsqueda de tabla**: `Input` con ícono `Search` absoluto a la izquierda (`pl-8` en el input, ícono en `absolute left-2.5 top-1/2 -translate-y-1/2`), filtro client-side sobre los datos ya cargados — no agregar un endpoint de búsqueda mientras el catálogo quepa en una sola página (`limit=100`).
- **Estados de carga/vacío/error** (mismo trío en cualquier pantalla que lea de la API):
  - Cargando: `<Loader2 className="size-5 animate-spin" />` centrado, con texto de apoyo en el subtítulo de la página ("Cargando... desde la API").
  - Vacío (sin datos todavía, no por filtro): caja `border border-dashed border-border` con ícono en círculo muted, mensaje + CTA si aplica.
  - Vacío por filtro (búsqueda sin resultados): misma caja punteada pero sin ícono/CTA, solo el texto "Ningún... coincide con...".
  - Error: `rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive`.
- **Badges de estado**: `Badge` con `variant="default"` (activo/ok), `variant="secondary"` (inactivo/neutral), `variant="destructive"` (agotado/atención) — nunca texto suelto en rojo (`text-destructive`) para indicar estado cuando existe el badge; el texto suelto se reserva para mensajes de error de formulario/página.
- **Formularios largos**: una `Card` por sección lógica (ver `productos/nuevo`), cada una con su tarjeta-de-sección-con-ícono como header, campos cortos en pareja (`grid grid-cols-1 gap-4 sm:grid-cols-2`), acciones (Cancelar/Guardar) alineadas a la derecha al final del form, nunca dentro de una `Card`.

### Reglas duras

- **Imágenes que vienen de la API**: siempre `<img>` plano, nunca `next/image` — la API puede devolver cualquier host (S3, o su placeholder `via.placeholder.com`) y `next/image` corta la app con un host no configurado en `remotePatterns`. Esto ya rompió `carmessievelvet-web` una vez; no repetirlo acá.
- **`CardHeader` es un CSS grid, no un flex** (`display: grid` en `card.tsx`) — `items-center` ahí solo centra verticalmente (`align-items`). Para centrar horizontalmente un ítem (ej. un logo en un header centrado, como en `login/page.tsx`) hace falta `justify-items-center` explícito además de `items-center text-center`, porque un elemento con tamaño intrínseco (una `<img>`) no estira su celda y `text-align` no lo mueve. Este bug ya pasó una vez (logo pegado a la izquierda pese a `items-center text-center`) — revisar esto antes de asumir que un header está centrado.
- **No fabricar datos**: ninguna pantalla muestra números, gráficas o listas inventadas. Si el dato real no existe todavía (backend sin ese módulo), se omite o se marca explícitamente como pendiente en texto, nunca con un placeholder que parezca un valor real.
- Todo tweak de layout/color pasa por las clases de Tailwind y los tokens de `globals.css` — no `style={{ color: '#...' }}` inline salvo casos ya existentes justificados (ej. el swatch de color de un producto, si algún día se agrega).

## Skills disponibles en este proyecto

Instaladas en `.agents/skills/` (symlink a Claude Code), las mismas que en `carmessievelvet-web`:
- `frontend-design` (Anthropic) — criterio de diseño/UX de alta calidad.
- `storefront-best-practices` (Medusa) — patrones de e-commerce, útil acá para modelar productos/variantes/categorías correctamente aunque la UI sea de admin, no de storefront.
- `react-nextjs-development` (tercero) — prácticas generales de React/Next.js.

Skills globales a usar durante el desarrollo:
- `find-docs` / regla `context7` — consultar documentación actualizada de Next.js, shadcn/ui, Base UI, react-hook-form, zod, etc. en vez de asumir por memoria (particularmente importante acá por lo reciente del stack de shadcn).
- `run` — levantar el dev server y verificar visualmente cada pantalla antes de dar una feature por terminada.
- `code-review` / `simplify` — pasadas de calidad sobre la capa de servicios y componentes.
- `security-review` — antes de dar por shippeable cualquier formulario, aunque el backend sea de otro equipo.
