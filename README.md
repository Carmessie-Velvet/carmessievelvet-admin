# Carmessie Velvet — Admin

Panel de administración interno de **Carmessie Velvet**. Desde aquí el equipo de la tienda gestiona el catálogo de productos, órdenes, devoluciones, cupones, descuentos, métodos de envío y la generación automática de guías de paquetería, además de ver un dashboard con las estadísticas de ventas del negocio.

Este panel es de uso **interno** (equipo de la tienda), no lo ven las personas que compran — para eso existe el sitio público, [carmessievelvet-web](../carmessievelvet-web), que es un proyecto aparte.

- **Producción:** https://admin.carmessievelvet.com.mx
- **Staging (pruebas antes de producción):** ver sección [Ambientes y despliegue](#ambientes-y-despliegue)

## Funcionalidades

- **Catálogo de productos** — crear, editar, eliminar; imágenes, SKU, color, stock por talla, venta sobre pedido.
- **Órdenes** — seguimiento del ciclo de vida completo (pagada → en proceso → enviada → entregada), cancelaciones con reembolso total o parcial.
- **Devoluciones** — cola de solicitudes de devolución hechas por compradores, aprobar (con reembolso) o rechazar.
- **Cupones y descuentos** — códigos de descuento y promociones por producto.
- **Tags** — etiquetas para organizar el catálogo.
- **Métodos de envío** — catálogo de opciones de envío y su costo.
- **Envíos automatizados** — generación de guías de paquetería (Estafeta vía Enviatodo) para envíos exprés, dirección de origen y paquetes disponibles.
- **Dashboard** — ventas, órdenes, envíos, pagos, clientes y cupones, con gráficas y filtros por periodo.

## Stack técnico

- [Next.js](https://nextjs.org) 16 (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com) v4
- [shadcn/ui](https://ui.shadcn.com) sobre [Base UI](https://base-ui.com)
- [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) para formularios
- Consume la API de [carmessievelvet-api](../carmessievelvet-api) (backend, repo aparte)

## Requisitos

- Node.js 20 o superior
- Acceso a una instancia de `carmessievelvet-api` corriendo (local, staging o producción)

## Cómo levantarlo en local

```bash
npm install
cp .env.example .env.local
```

Edita `.env.local` y define la URL de la API contra la que quieres trabajar (ver [`.env.example`](.env.example) para el formato esperado).

```bash
npm run dev
```

El panel queda disponible en [http://localhost:3001](http://localhost:3001).

### Scripts disponibles

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta el servidor de desarrollo (puerto 3001) |
| `npm run build` | Compila la app para producción |
| `npm start` | Sirve el build de producción |
| `npm run lint` | Corre ESLint |

## Ambientes y despliegue

El proyecto se despliega en [Vercel](https://vercel.com) y sigue un flujo de dos pasos, para nunca mandar un cambio directo a producción sin probarlo antes:

```
feature/mi-cambio → Pull Request → develop (staging) → probar en vivo → Pull Request → main (producción)
```

| Rama | Ambiente | URL |
|---|---|---|
| `main` | Producción | https://admin.carmessievelvet.com.mx |
| `develop` | Staging (pruebas) | dominio de staging asignado en Vercel a la rama `develop` |

Ambas ramas (`main` y `develop`) están protegidas en GitHub: no se puede hacer `git push` directo a ninguna de las dos, todo cambio entra por Pull Request.

**Flujo normal de trabajo:**

1. Crear una rama a partir de `develop` para el cambio (`feature/...`, `fix/...`).
2. Abrir un Pull Request hacia `develop`.
3. Una vez fusionado, Vercel despliega automáticamente a staging — probar ahí antes de continuar.
4. Cuando staging esté verificado y listo, abrir un Pull Request de `develop` hacia `main`.

**Antes de fusionar `develop` → `main` (checklist de promoción a producción):**

- [ ] La funcionalidad ya se probó en vivo en el dominio de staging (no solo en local).
- [ ] `npm run lint` y `npm run build` corren sin errores sobre `develop`.
- [ ] Si el cambio depende de algo nuevo en el backend, confirmar que ya está desplegado en el `carmessievelvet-api` de **producción** (no solo en el de pruebas del backend).
- [ ] Revisar el diff completo del Pull Request, no solo el título.
- [ ] No quedan datos de prueba creados durante las pruebas de staging (productos, cupones, órdenes de prueba, etc.).
- [ ] Usar merge normal (no squash) para conservar el historial de commits.

Después de fusionar a `main`, confirmar el despliegue en el dashboard de Vercel y hacer una verificación rápida en producción (login + lo que haya cambiado) antes de dar por cerrado el cambio.

## Estructura del proyecto

```
src/
├── app/
│   ├── login/              # Pantalla de login (fuera del layout con sidebar)
│   └── (dashboard)/        # Todas las pantallas del panel, protegidas por sesión
│       ├── productos/
│       ├── ordenes/
│       ├── devoluciones/
│       ├── cupones/
│       ├── descuentos/
│       ├── tags/
│       ├── metodos-envio/
│       └── envios-automatizados/
├── components/             # Componentes de UI, por dominio y compartidos (ui/)
├── context/                # Contexto de autenticación
├── hooks/                  # Hooks compartidos
├── lib/                    # Cliente HTTP de la API, utilidades
├── services/                # Una interfaz + implementación por dominio (habla con la API real)
└── types/                  # Modelos de datos (TypeScript)
```

## Documentación técnica adicional

Para el detalle técnico de decisiones de arquitectura, contratos de la API consumida, y el historial de cambios de diseño de cada pantalla, ver [`CLAUDE.md`](CLAUDE.md) — pensado para quien continúe el desarrollo de este proyecto.

Los contratos completos de la API (`carmessievelvet-api`) están documentados en `../carmessievelvet-api/docs/API-FRONTEND.md`.
