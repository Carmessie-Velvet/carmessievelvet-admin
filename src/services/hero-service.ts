import { apiFetch } from "@/lib/api-client";
import type {
  ApiHero,
  CreateApiHeroPayload,
  UpdateApiHeroPayload,
} from "@/types/hero";

/**
 * Portadas del inicio de la tienda (`/v1/heroes`). Una portada nace sin
 * imagen y `active: false` — solo se puede activar una vez que tiene imagen
 * (`setStatus`, la API 400s si no). El texto (`update`) y la imagen
 * (`uploadImage`/`deleteImage`) son endpoints separados, igual que las
 * imágenes/video de producto.
 */
export interface HeroService {
  getHeroes(): Promise<ApiHero[]>;
  createHero(payload: CreateApiHeroPayload): Promise<ApiHero>;
  updateHero(id: string, payload: UpdateApiHeroPayload): Promise<ApiHero>;
  setHeroStatus(id: string, active: boolean): Promise<ApiHero>;
  uploadHeroImage(id: string, file: File): Promise<ApiHero>;
  deleteHeroImage(id: string): Promise<ApiHero>;
  deleteHero(id: string): Promise<boolean>;
}

export class RestHeroService implements HeroService {
  async getHeroes(): Promise<ApiHero[]> {
    return apiFetch<ApiHero[]>("/v1/heroes");
  }

  async createHero(payload: CreateApiHeroPayload): Promise<ApiHero> {
    return apiFetch<ApiHero>("/v1/heroes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async updateHero(id: string, payload: UpdateApiHeroPayload): Promise<ApiHero> {
    return apiFetch<ApiHero>(`/v1/heroes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  async setHeroStatus(id: string, active: boolean): Promise<ApiHero> {
    return apiFetch<ApiHero>(`/v1/heroes/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ active }),
    });
  }

  async uploadHeroImage(id: string, file: File): Promise<ApiHero> {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch<ApiHero>(`/v1/heroes/${id}/image`, {
      method: "POST",
      body: formData,
    });
  }

  async deleteHeroImage(id: string): Promise<ApiHero> {
    return apiFetch<ApiHero>(`/v1/heroes/${id}/image`, { method: "DELETE" });
  }

  async deleteHero(id: string): Promise<boolean> {
    return apiFetch<boolean>(`/v1/heroes/${id}`, { method: "DELETE" });
  }
}

export const heroService: HeroService = new RestHeroService();
