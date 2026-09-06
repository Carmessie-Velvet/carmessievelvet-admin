import { apiFetch } from "@/lib/api-client";
import type {
  ApiEnviatodoPackage,
  ApiShippingOrigin,
  CreateApiEnviatodoPackagePayload,
  MxState,
} from "@/types/shipping";

/**
 * `GET /shipping/packages` (lista) resultó devolver `[]` de forma
 * consistente contra el sandbox real, incluso con paquetes verificables
 * uno por uno vía `GET /shipping/packages/:id` — un bug del proveedor
 * (Enviatodo), no de este admin ni de nuestro backend (ver CLAUDE.md). Como
 * parche de nuestro lado: cada vez que este navegador crea un paquete se
 * recuerda su id en localStorage, y `getPackages()` (abajo) siempre
 * verifica esos ids por separado además de pedir la lista — así un paquete
 * ya creado no desaparece del selector solo porque la lista del proveedor
 * esté rota. No es un catálogo alterno inventado: cada id recordado se
 * revalida en vivo contra `get_package_by_id` en cada llamada, así que
 * nunca muestra un paquete que ya no exista.
 */
const KNOWN_PACKAGE_IDS_KEY = "carmessie-admin-known-package-ids";

function readKnownPackageIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KNOWN_PACKAGE_IDS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeKnownPackageIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KNOWN_PACKAGE_IDS_KEY, JSON.stringify(ids));
  } catch {
    // localStorage puede fallar (modo privado, cuota llena) — el catálogo
    // sigue funcionando con lo que la API sí devuelva, solo sin este respaldo.
  }
}

function rememberPackageId(id: string | undefined): void {
  if (!id) return;
  const ids = readKnownPackageIds();
  if (!ids.includes(id)) writeKnownPackageIds([...ids, id]);
}

function forgetPackageId(id: string): void {
  writeKnownPackageIds(readKnownPackageIds().filter((existing) => existing !== id));
}

/**
 * La parte de la integración Enviatodo/Estafeta que es configuración, no
 * por-orden: dirección de origen (bodega) y catálogo de paquetes. La
 * generación de la guía en sí (`POST/GET /orders/:id/shipment*`) vive en
 * `order-service.ts`, ya que es una acción sobre una orden puntual.
 */
export interface EnviatodoService {
  getMxStates(): Promise<MxState[]>;
  getShippingOrigin(): Promise<ApiShippingOrigin | null>;
  updateShippingOrigin(
    payload: ApiShippingOrigin
  ): Promise<ApiShippingOrigin>;
  getPackages(): Promise<ApiEnviatodoPackage[]>;
  getPackageById(id: string): Promise<ApiEnviatodoPackage>;
  createPackage(
    payload: CreateApiEnviatodoPackagePayload
  ): Promise<ApiEnviatodoPackage>;
  /** No hay `PATCH` — "editar" es crear uno nuevo y borrar este. */
  deletePackage(id: string): Promise<void>;
}

export class RestEnviatodoService implements EnviatodoService {
  async getMxStates(): Promise<MxState[]> {
    return apiFetch<MxState[]>("/v1/store/mx-states", { auth: false });
  }

  async getShippingOrigin(): Promise<ApiShippingOrigin | null> {
    return apiFetch<ApiShippingOrigin | null>("/v1/settings/shipping-origin");
  }

  async updateShippingOrigin(
    payload: ApiShippingOrigin
  ): Promise<ApiShippingOrigin> {
    return apiFetch<ApiShippingOrigin>("/v1/settings/shipping-origin", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  async getPackages(): Promise<ApiEnviatodoPackage[]> {
    const [listed, remembered] = await Promise.all([
      apiFetch<ApiEnviatodoPackage[]>("/v1/shipping/packages").catch(() => []),
      this.fetchRememberedPackages(),
    ]);

    const byId = new Map<string, ApiEnviatodoPackage>();
    for (const pkg of listed) if (pkg.id) byId.set(pkg.id, pkg);
    for (const pkg of remembered) if (pkg.id) byId.set(pkg.id, pkg);
    return Array.from(byId.values());
  }

  /** Revalida en vivo cada id recordado — nunca confía en el localStorage a ciegas. */
  private async fetchRememberedPackages(): Promise<ApiEnviatodoPackage[]> {
    const ids = readKnownPackageIds();
    if (ids.length === 0) return [];

    const results = await Promise.all(
      ids.map((id) => this.getPackageById(id).catch(() => null))
    );

    const stillValid: string[] = [];
    const packages: ApiEnviatodoPackage[] = [];
    results.forEach((pkg, i) => {
      if (pkg) {
        stillValid.push(ids[i]);
        packages.push(pkg);
      }
    });
    if (stillValid.length !== ids.length) writeKnownPackageIds(stillValid);
    return packages;
  }

  async getPackageById(id: string): Promise<ApiEnviatodoPackage> {
    return apiFetch<ApiEnviatodoPackage>(`/v1/shipping/packages/${id}`);
  }

  async createPackage(
    payload: CreateApiEnviatodoPackagePayload
  ): Promise<ApiEnviatodoPackage> {
    const created = await apiFetch<ApiEnviatodoPackage>("/v1/shipping/packages", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    rememberPackageId(created.id);
    return created;
  }

  async deletePackage(id: string): Promise<void> {
    await apiFetch<void>(`/v1/shipping/packages/${id}`, { method: "DELETE" });
    forgetPackageId(id);
  }
}

export const enviatodoService: EnviatodoService = new RestEnviatodoService();
