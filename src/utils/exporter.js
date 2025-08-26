// src/utils/exporter.js
import { OUTPUT_POLICY } from "../config/outputPolicy";
import { bgRemove } from "../utils/api";

/**
 * Returns a PNG cutout with alpha (subject only).
 * Final flattening/encoding (e.g., DV JPEG) is done by composeFinal() on the backend.
 *
 * NOTE: bgColor is passed so the fast fallback (if AI unavailable) can still
 * flatten onto the chosen color when needed in the pipeline.
 */
export async function exportFinalImage({
  templateKey,
  inputBase64,          // cropped image (base64; with or without data: prefix)
  desiredSize,          // { w, h }
  bgColor = "#ffffff",  // <-- use selected color (white or blue)
}) {
  const policy = OUTPUT_POLICY?.[templateKey];

  // 1) Decide final size (policy may enforce square for DV)
  let outW = desiredSize?.w || 600;
  let outH = desiredSize?.h || 600;
  if (policy?.clampSize) {
    const s = policy.clampSize({ w: outW, h: outH });
    outW = s.w;
    outH = s.h;
  }

  const cleanBase64 = String(inputBase64).replace(/^data:image\/\w+;base64,/, "");

  // 2) ALWAYS cut subject to PNG with alpha first
  let cut;
  try {
    cut = await bgRemove(
      cleanBase64,
      "png",
      "ai",
      bgColor,
      true            // transparent_background -> keep alpha (subject only)
    );
  } catch (e) {
    // Fallback: fast mode (server-side). When transparent=true, the server may not
    // support it via fast path; in that case your bgRemove will already handle or throw.
    // If your server can't return transparent in fast mode, you can drop to
    // transparent=false and immediately flatten to bgColor — but that loses alpha.
    cut = await bgRemove(
      cleanBase64,
      "png",
      "fast",
      bgColor,
      true
    );
  }

  return {
    stage: "cutout",
    base64: cut.imageBase64,      // PNG with alpha (subject only)
    w: outW,
    h: outH,
    target: policy?.enforceJPEG ? "jpg" : "png",
    bgColor,
    meta: {
      mode: cut.mode,             // 'ai-local' | 'fast' if backend returns it
      ms: cut.ms,                 // processing time, if provided
      templateKey,
    },
  };
}