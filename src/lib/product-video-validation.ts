import { validateVideoFile, type VideoSpec, type VideoValidationResult } from "@/lib/video-validation";

export type { VideoValidationResult };

/**
 * Client-side gate for the product video spec the clienta asked for: MP4
 * (H.264 + AAC), max 10s, max 1080p, ~2-4 Mbps. The API (`POST
 * /products/:sku/video`) only checks container type (MP4/WebM, by magic
 * bytes) and a 50MB size cap, so this is the only place that spec is
 * enforced. The checks themselves (and why codec/bitrate are validated the
 * way they are) live in `video-validation.ts`, shared with the hero video.
 */
export const PRODUCT_VIDEO_MAX_DURATION_SECONDS = 10;
export const PRODUCT_VIDEO_MAX_WIDTH = 1920;
export const PRODUCT_VIDEO_MAX_HEIGHT = 1080;
export const PRODUCT_VIDEO_MAX_BITRATE_MBPS = 4.5;

const PRODUCT_VIDEO_SPEC: VideoSpec = {
  maxDurationSeconds: PRODUCT_VIDEO_MAX_DURATION_SECONDS,
  maxLongSide: PRODUCT_VIDEO_MAX_WIDTH,
  maxShortSide: PRODUCT_VIDEO_MAX_HEIGHT,
  maxResolutionLabel: "1080p (1920×1080)",
  maxBitrateMbps: PRODUCT_VIDEO_MAX_BITRATE_MBPS,
  hint: "Vuelve a exportar en MP4 (H.264 + AAC), máximo 1080p, ~2-4 Mbps, 10s.",
};

export function validateProductVideoFile(file: File): Promise<VideoValidationResult> {
  return validateVideoFile(file, PRODUCT_VIDEO_SPEC);
}
