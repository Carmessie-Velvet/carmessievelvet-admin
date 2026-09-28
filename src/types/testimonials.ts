/**
 * `carmessievelvet-api`'s testimonial module (`/v1/testimonials`,
 * `ADMIN`/`SUPER_ADMIN` únicamente — ni `MARKETING` ni `SALES` entran, mismo
 * criterio que heroes/settings/stats). Reseñas de clientes que el admin
 * escribe a mano — no hay ruta para que el propio comprador mande la suya.
 */
export interface ApiTestimonial {
  id: string;
  customerName: string;
  comment: string;
  /**
   * 1-5 estrellas. ⚠️ La API siempre guarda un valor (default `5` si no se
   * manda uno en `POST`) — no existe hoy un testimonio "sin calificación".
   */
  rating: number;
  /** `'YYYY-MM-DD'` — un día calendario, no un momento puntual. */
  commentedAt: string;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
}

/** `POST /v1/testimonials` — `rating`/`commentedAt` opcionales (default 5 estrellas / hoy). */
export interface CreateApiTestimonialPayload {
  customerName: string;
  comment: string;
  rating?: number;
  commentedAt?: string;
}

export type UpdateApiTestimonialPayload = Partial<CreateApiTestimonialPayload>;

export interface TestimonialQuery {
  page?: number;
  limit?: number;
  search?: string;
  rating?: number;
  /** Omitir trae ambos (visibles y ocultos). */
  visible?: boolean;
}
