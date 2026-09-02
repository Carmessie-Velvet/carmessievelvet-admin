export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";

export interface ApiCoupon {
  id: string;
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  startsAt?: string;
  endsAt?: string;
  maxUses?: number;
  usedCount: number;
  enabled: boolean;
  isCurrentlyValid: boolean;
}

export interface CreateCouponPayload {
  /** Optional — the API auto-generates an 8-char code if omitted. */
  code?: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  startsAt?: string;
  endsAt?: string;
  maxUses?: number;
  enabled?: boolean;
}

/** `code` is immutable once created — not part of the update payload. */
export interface UpdateCouponPayload {
  description?: string;
  discountType?: DiscountType;
  discountValue?: number;
  startsAt?: string;
  endsAt?: string;
  maxUses?: number;
  enabled?: boolean;
}
