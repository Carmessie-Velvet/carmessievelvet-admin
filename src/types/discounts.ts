export interface ApiDiscountProduct {
  id: string;
  name: string;
}

export interface ApiProductDiscount {
  id: string;
  name?: string;
  percentage: number;
  startsAt?: string;
  endsAt?: string;
  enabled: boolean;
  products: ApiDiscountProduct[];
  isCurrentlyValid: boolean;
}

/** `endsAt` and `durationHours` are mutually exclusive — the API 400s if both are set. */
export interface CreateProductDiscountPayload {
  name?: string;
  percentage: number;
  startsAt?: string;
  endsAt?: string;
  durationHours?: number;
  enabled?: boolean;
  productIds: string[];
}

export interface UpdateProductDiscountPayload {
  name?: string;
  percentage?: number;
  startsAt?: string;
  endsAt?: string;
  durationHours?: number;
  enabled?: boolean;
  productIds?: string[];
}
