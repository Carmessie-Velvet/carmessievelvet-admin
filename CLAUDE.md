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

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4, scaffolded con `create-next-app`.
- **shadcn/ui** (preset `base-nova`, librería `@base-ui/react`, no Radix) — componentes en `src/components/ui/`. El componente `form.tsx` (integración con `react-hook-form`) se escribió a mano siguiendo el patrón estándar de shadcn porque el registro no lo entregó vía CLI en esta versión; usa `React.cloneElement` en `FormControl` en vez de un `Slot` de Radix/Base UI.
- `react-hook-form` + `zod` (`@hookform/resolvers`) para el formulario de productos.
- `AGENTS.md` (generado y mantenido por `next dev`) advierte que esta versión de Next.js tiene cambios importantes respecto a versiones anteriores — antes de escribir código, revisar `node_modules/next/dist/docs/` o usar `find-docs`/`context7` en vez de asumir por memoria. Lo mismo aplica a shadcn/Base UI: son APIs recientes, verificar con `context7` antes de asumir la forma de una prop.

## Guía de diseño

- **Audiencia**: equipo interno (no clientas), así que el tono es **funcional y profesional**, no editorial — a diferencia del storefront, acá no se usa la tipografía serif itálica ni el mobile-first estricto. Es **desktop-first pero responsive**.
- **Paleta**: base neutra de shadcn (`oklch` grises) con el acento "velvet" de la marca (`#3f1029`) en `--primary`, `--ring` y `--sidebar-primary` — conecta con `carmessievelvet-web` sin heredar su identidad editorial completa.
- **Shell**: sidebar oscura (fija, con navegación) + área de contenido clara — patrón estándar de dashboard, prioriza legibilidad de formularios y tablas sobre personalidad de marca.
- Espaciado generoso, jerarquía tipográfica clara, cero elementos decorativos — "minimalista, profesional, muy intuitivo" es el criterio de aceptación de cada pantalla.

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
