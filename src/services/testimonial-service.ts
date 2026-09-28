import { apiFetch } from "@/lib/api-client";
import type { PaginatedResult } from "@/types/catalog";
import type {
  ApiTestimonial,
  CreateApiTestimonialPayload,
  TestimonialQuery,
  UpdateApiTestimonialPayload,
} from "@/types/testimonials";

export interface TestimonialService {
  getTestimonials(query?: TestimonialQuery): Promise<PaginatedResult<ApiTestimonial>>;
  createTestimonial(payload: CreateApiTestimonialPayload): Promise<ApiTestimonial>;
  updateTestimonial(id: string, payload: UpdateApiTestimonialPayload): Promise<ApiTestimonial>;
  setVisibility(id: string, visible: boolean): Promise<ApiTestimonial>;
  deleteTestimonial(id: string): Promise<boolean>;
}

export class RestTestimonialService implements TestimonialService {
  async getTestimonials(
    query: TestimonialQuery = {}
  ): Promise<PaginatedResult<ApiTestimonial>> {
    const params = new URLSearchParams();
    params.set("page", String(query.page ?? 1));
    params.set("limit", String(query.limit ?? 50));
    if (query.search) params.set("search", query.search);
    if (query.rating) params.set("rating", String(query.rating));
    if (query.visible !== undefined) params.set("visible", String(query.visible));
    return apiFetch<PaginatedResult<ApiTestimonial>>(`/v1/testimonials?${params.toString()}`);
  }

  async createTestimonial(payload: CreateApiTestimonialPayload): Promise<ApiTestimonial> {
    return apiFetch<ApiTestimonial>("/v1/testimonials", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async updateTestimonial(
    id: string,
    payload: UpdateApiTestimonialPayload
  ): Promise<ApiTestimonial> {
    return apiFetch<ApiTestimonial>(`/v1/testimonials/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  async setVisibility(id: string, visible: boolean): Promise<ApiTestimonial> {
    return apiFetch<ApiTestimonial>(`/v1/testimonials/${id}/visibility`, {
      method: "PATCH",
      body: JSON.stringify({ visible }),
    });
  }

  async deleteTestimonial(id: string): Promise<boolean> {
    return apiFetch<boolean>(`/v1/testimonials/${id}`, { method: "DELETE" });
  }
}

export const testimonialService: TestimonialService = new RestTestimonialService();
