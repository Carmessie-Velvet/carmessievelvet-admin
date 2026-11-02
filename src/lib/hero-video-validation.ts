import { validateVideoFile, type VideoSpec, type VideoValidationResult } from "@/lib/video-validation";
import type { HeroImageVariant } from "@/types/hero";

/**
 * Spec of the optional looping video of a hero/banner, one per viewport — the
 * same two crops as the images (desktop 16:9, mobile 4:5, same tolerance as
 * `heroConfig` in the API), because a 16:9 clip cropped into a phone screen is
 * exactly the problem the separate mobile image exists to avoid.
 *
 * It downloads on the storefront's first paint, straight from S3 with no CDN,
 * so the ceilings are tighter than the product video: 15s, 4 Mbps, 10MB (the
 * same cap `HERO_VIDEO_MAX_SIZE_MB` enforces in the API — checked here only to
 * fail before the upload). The API validates the container and that size cap
 * and nothing else; this is the only place the rest is enforced. No audio is
 * asked for (the storefront plays it muted), but it can't be checked from the
 * browser, so it only shows up in the hint.
 */
export const HERO_VIDEO_MAX_SIZE_BYTES = 10 * 1024 * 1024;

const COMMON = {
  maxDurationSeconds: 15,
  maxLongSide: 1920,
  maxShortSide: 1080,
  maxResolutionLabel: "1080p",
  maxBitrateMbps: 4,
  maxSizeBytes: HERO_VIDEO_MAX_SIZE_BYTES,
} as const;

export const HERO_VIDEO_SPECS: Record<HeroImageVariant, VideoSpec & { summary: string }> = {
  desktop: {
    ...COMMON,
    minWidth: 1280,
    minHeight: 720,
    aspect: { ratio: 16 / 9, tolerance: 0.05, label: "16:9 (por ejemplo 1920×1080)" },
    hint: "Exporta en MP4 (H.264), 16:9, sin audio, máximo 1080p, 15s y 10 MB.",
    summary: "MP4 (H.264), 16:9 — por ejemplo 1920×1080 —, sin audio, máx. 15 s y 10 MB.",
  },
  mobile: {
    ...COMMON,
    minWidth: 720,
    minHeight: 900,
    aspect: { ratio: 4 / 5, tolerance: 0.05, label: "4:5 vertical (por ejemplo 1080×1350)" },
    hint: "Exporta en MP4 (H.264), 4:5 vertical, sin audio, máximo 1080 de ancho, 15s y 10 MB.",
    summary: "MP4 (H.264), 4:5 vertical — por ejemplo 1080×1350 —, sin audio, máx. 15 s y 10 MB.",
  },
};

export function validateHeroVideoFile(
  file: File,
  variant: HeroImageVariant
): Promise<VideoValidationResult> {
  return validateVideoFile(file, HERO_VIDEO_SPECS[variant]);
}
