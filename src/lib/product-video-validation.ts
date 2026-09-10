/**
 * Client-side gate for the product video spec the clienta asked for: MP4
 * (H.264 + AAC), max 10s, max 1080p, ~2-4 Mbps. The API (`POST
 * /products/:sku/video`) only checks container type (MP4/WebM, by magic
 * bytes) and a 50MB size cap — it has no opinion on duration, resolution or
 * bitrate, so without this check a shopper on a slow connection could end up
 * downloading an oversized or overlong video. This is the only place that
 * spec is enforced.
 *
 * Codec can't be inspected directly from a `File` in the browser without a
 * parsing library (e.g. mp4box.js) we don't otherwise need — instead this
 * relies on the `<video>` element's own decode: Chrome/Safari/Firefox only
 * play H.264+AAC (or VP8/9+Opus, which we reject by extension before this
 * point) inside an MP4 container, so a codec mismatch surfaces as the
 * `error` event or metadata that never loads, both treated as rejection
 * below. This is a reasonable proxy, not a byte-level guarantee.
 *
 * Bitrate only has a ceiling, not a floor: tested against a real ffmpeg
 * encode, a mostly-static product shot (clothing barely moving, plain
 * background — typical of these videos) compresses to well under 1 Mbps at
 * a 3 Mbps target rate, and that's a perfectly fine, "functional" file, not
 * a broken one. The actual risk the clienta described is a bloated video
 * that's slow to load on the storefront, which only an upper bound guards
 * against.
 */
export const PRODUCT_VIDEO_MAX_DURATION_SECONDS = 10;
export const PRODUCT_VIDEO_MAX_WIDTH = 1920;
export const PRODUCT_VIDEO_MAX_HEIGHT = 1080;
export const PRODUCT_VIDEO_MAX_BITRATE_MBPS = 4.5;

export interface VideoValidationResult {
  ok: boolean;
  reason?: string;
}

const SPEC_HINT =
  "Vuelve a exportar en MP4 (H.264 + AAC), máximo 1080p, ~2-4 Mbps, 10s.";

export function validateProductVideoFile(file: File): Promise<VideoValidationResult> {
  return new Promise((resolve) => {
    const looksLikeMp4 =
      file.type === "video/mp4" || /\.mp4$/i.test(file.name);
    if (!looksLikeMp4) {
      resolve({ ok: false, reason: `Solo se acepta MP4. ${SPEC_HINT}` });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;

    let settled = false;
    function finish(result: VideoValidationResult) {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(objectUrl);
      resolve(result);
    }

    video.onloadedmetadata = () => {
      const { duration, videoWidth, videoHeight } = video;

      if (!Number.isFinite(duration) || duration <= 0) {
        finish({ ok: false, reason: `No se pudo leer la duración del video. ${SPEC_HINT}` });
        return;
      }

      if (duration > PRODUCT_VIDEO_MAX_DURATION_SECONDS + 0.5) {
        finish({
          ok: false,
          reason: `Dura ${duration.toFixed(1)}s — el máximo es ${PRODUCT_VIDEO_MAX_DURATION_SECONDS}s.`,
        });
        return;
      }

      const longSide = Math.max(videoWidth, videoHeight);
      const shortSide = Math.min(videoWidth, videoHeight);
      if (longSide > PRODUCT_VIDEO_MAX_WIDTH || shortSide > PRODUCT_VIDEO_MAX_HEIGHT) {
        finish({
          ok: false,
          reason: `Resolución ${videoWidth}×${videoHeight} — el máximo es 1080p (1920×1080).`,
        });
        return;
      }

      const bitrateMbps = (file.size * 8) / duration / 1_000_000;
      if (bitrateMbps > PRODUCT_VIDEO_MAX_BITRATE_MBPS) {
        finish({
          ok: false,
          reason: `Bitrate aproximado ${bitrateMbps.toFixed(1)} Mbps — el máximo es ${PRODUCT_VIDEO_MAX_BITRATE_MBPS} Mbps. ${SPEC_HINT}`,
        });
        return;
      }

      finish({ ok: true });
    };

    video.onerror = () => {
      finish({
        ok: false,
        reason: `Formato no compatible — debe ser H.264 (video) + AAC (audio) dentro de MP4. ${SPEC_HINT}`,
      });
    };

    video.src = objectUrl;
  });
}
