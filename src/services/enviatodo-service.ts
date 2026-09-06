import { apiFetch } from "@/lib/api-client";
import type {
  ApiEnviatodoPackage,
  ApiShippingOrigin,
  CreateApiEnviatodoPackagePayload,
  MxState,
} from "@/types/shipping";

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
    return apiFetch<ApiEnviatodoPackage[]>("/v1/shipping/packages");
  }

  async createPackage(
    payload: CreateApiEnviatodoPackagePayload
  ): Promise<ApiEnviatodoPackage> {
    return apiFetch<ApiEnviatodoPackage>("/v1/shipping/packages", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async deletePackage(id: string): Promise<void> {
    await apiFetch<void>(`/v1/shipping/packages/${id}`, { method: "DELETE" });
  }
}

export const enviatodoService: EnviatodoService = new RestEnviatodoService();
