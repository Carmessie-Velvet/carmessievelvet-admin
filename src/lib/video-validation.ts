/**
 * Client-side gate shared by every video upload in the admin (product video,
 * hero/banner video). The API only checks the container (MP4/WebM, by magic
 * bytes) and a size cap — it has no opinion on duration, resolution, aspect
 * ratio or bitrate, so without this check a shopper on a slow connection
 * could end up downloading an oversized or overlong video. This is the only
 * place those specs are enforced; each caller passes its own `VideoSpec`.
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
 * encode, a mostly-static shot (clothing barely moving, plain background —
 * typical of these videos) compresses to well under 1 Mbps at a 3 Mbps
 * target rate, and that's a perfectly fine, "functional" file, not a broken
 * one. The actual risk is a bloated video that's slow to load on the
 * storefront, which only an upper bound guards against.
 */
export interface VideoSpec {
  maxDurationSeconds: number;
  /** Cap on the longer side, in px (1920 for "1080p"). */
  maxLongSide: number;
  /** Cap on the shorter side, in px (1080 for "1080p"). */
  maxShortSide: number;
  /** How the resolution cap reads in the error message, e.g. "1080p (1920×1080)". */
  maxResolutionLabel: string;
  maxBitrateMbps: number;
  /** File-size cap in bytes — only set where the API enforces one worth failing early on. */
  maxSizeBytes?: number;
  /** Smallest acceptable size, in px — below this the video looks soft on a full-bleed layout. */
  minWidth?: number;
  minHeight?: number;
  /** Expected width/height ratio, with an absolute tolerance — same idea as the hero image check in the API. */
  aspect?: { ratio: number; tolerance: number; label: string };
  /** Appended to most errors — what to re-export with. */
  hint: string;
}

export interface VideoValidationResult {
  ok: boolean;
  reason?: string;
}

export function validateVideoFile(file: File, spec: VideoSpec): Promise<VideoValidationResult> {
  return new Promise((resolve) => {
    const looksLikeMp4 = file.type === "video/mp4" || /\.mp4$/i.test(file.name);
    if (!looksLikeMp4) {
      resolve({ ok: false, reason: `Solo se acepta MP4. ${spec.hint}` });
      return;
    }

    if (spec.maxSizeBytes !== undefined && file.size > spec.maxSizeBytes) {
      resolve({
        ok: false,
        reason: `Pesa ${formatMegabytes(file.size)} — el máximo es ${formatMegabytes(spec.maxSizeBytes)}. ${spec.hint}`,
      });
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
        finish({ ok: false, reason: `No se pudo leer la duración del video. ${spec.hint}` });
        return;
      }

      if (duration > spec.maxDurationSeconds + 0.5) {
        finish({
          ok: false,
          reason: `Dura ${duration.toFixed(1)}s — el máximo es ${spec.maxDurationSeconds}s.`,
        });
        return;
      }

      const longSide = Math.max(videoWidth, videoHeight);
      const shortSide = Math.min(videoWidth, videoHeight);
      if (longSide > spec.maxLongSide || shortSide > spec.maxShortSide) {
        finish({
          ok: false,
          reason: `Resolución ${videoWidth}×${videoHeight} — el máximo es ${spec.maxResolutionLabel}.`,
        });
        return;
      }

      if (
        (spec.minWidth !== undefined && videoWidth < spec.minWidth) ||
        (spec.minHeight !== undefined && videoHeight < spec.minHeight)
      ) {
        finish({
          ok: false,
          reason: `Resolución ${videoWidth}×${videoHeight} — el mínimo es ${spec.minWidth ?? 0}×${spec.minHeight ?? 0}.`,
        });
        return;
      }

      if (spec.aspect) {
        const ratio = videoWidth / videoHeight;
        if (Math.abs(ratio - spec.aspect.ratio) > spec.aspect.tolerance) {
          finish({
            ok: false,
            reason: `Proporción ${videoWidth}×${videoHeight} — se espera ${spec.aspect.label}. ${spec.hint}`,
          });
          return;
        }
      }

      const bitrateMbps = (file.size * 8) / duration / 1_000_000;
      if (bitrateMbps > spec.maxBitrateMbps) {
        finish({
          ok: false,
          reason: `Bitrate aproximado ${bitrateMbps.toFixed(1)} Mbps — el máximo es ${spec.maxBitrateMbps} Mbps. ${spec.hint}`,
        });
        return;
      }

      finish({ ok: true });
    };

    video.onerror = () => {
      finish({
        ok: false,
        reason: `Formato no compatible — debe ser H.264 (video) + AAC (audio) dentro de MP4. ${spec.hint}`,
      });
    };

    video.src = objectUrl;
  });
}

function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
