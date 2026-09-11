import { apiFetch } from "@/lib/api-client";
import type {
  ApiAppSettings,
  ApiStoreStatus,
  UpdateApiAppSettingsPayload,
} from "@/types/settings";

export interface SettingsService {
  getAppSettings(): Promise<ApiAppSettings>;
  updateAppSettings(payload: UpdateApiAppSettingsPayload): Promise<ApiAppSettings>;
  /** `POST /v1/settings/logo` — siempre reemplaza el logo actual, sin restricción de dimensiones (solo tipo jpeg/png/webp y máx. 5MB, validado por la API). */
  uploadLogo(file: File): Promise<ApiAppSettings>;
  /** Público — lo mismo que ve el comprador en la tienda ahora mismo. Útil para confirmar que un cambio de `closedDays` ya surtió efecto. */
  getStoreStatus(): Promise<ApiStoreStatus>;
}

export class RestSettingsService implements SettingsService {
  async getAppSettings(): Promise<ApiAppSettings> {
    return apiFetch<ApiAppSettings>("/v1/settings");
  }

  async updateAppSettings(
    payload: UpdateApiAppSettingsPayload
  ): Promise<ApiAppSettings> {
    return apiFetch<ApiAppSettings>("/v1/settings", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  async uploadLogo(file: File): Promise<ApiAppSettings> {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch<ApiAppSettings>("/v1/settings/logo", {
      method: "POST",
      body: formData,
    });
  }

  async getStoreStatus(): Promise<ApiStoreStatus> {
    return apiFetch<ApiStoreStatus>("/v1/store/status");
  }
}

export const settingsService: SettingsService = new RestSettingsService();
