// src/utils/validators.js
export function validateDvLottery({
  finalWidth,
  finalHeight,
  headTop,
  headBottom,
  eyeLineY,       // average of both eyes Y in final image pixels
  sampledBgRGB,   // optional: [r,g,b] near corners
}) {
  const errors = [];
  const notes = [];

  // Basic guards
  const W = Number(finalWidth);
  const H = Number(finalHeight);
  const ht = Number(headTop);
  const hb = Number(headBottom);

  if (!Number.isFinite(W) || !Number.isFinite(H) || W <= 0 || H <= 0) {
    return { valid: false, errors: ["Invalid final size."], notes, meta: {} };
  }

  // 1) Size & square
  if (W !== H) errors.push("Image must be square.");
  if (W < 600 || W > 1200) errors.push("Image must be 600–1200 px on each side.");

  // 2) Head height: 50%–69% of total height
  const hasHeadBox = Number.isFinite(ht) && Number.isFinite(hb) && hb > ht;
  const headH = hasHeadBox ? (hb - ht) : NaN;
  const minHead = 0.50 * H;
  const maxHead = 0.69 * H;

  if (!hasHeadBox) {
    // Don’t block export if you don’t have a real head box; just warn.
    notes.push("Head box not provided — skipping head size check.");
  } else if (headH < minHead || headH > maxHead) {
    errors.push(`Head must be 50%–69% of image height (${Math.round(minHead)}–${Math.round(maxHead)} px).`);
  } else {
    notes.push(`Head OK: ${Math.round((headH / H) * 100)}%`);
  }

  // 3) Eye line: 56%–69% from BOTTOM — only if we actually have an eye line
  const hasEyes = Number.isFinite(eyeLineY);
  const minEyeFromBottom = 0.56 * H;
  const maxEyeFromBottom = 0.69 * H;

  if (hasEyes) {
    const eyeFromBottom = H - eyeLineY;
    if (eyeFromBottom < minEyeFromBottom || eyeFromBottom > maxEyeFromBottom) {
      errors.push(
        `Eyes must be 56%–69% from the bottom (${Math.round(minEyeFromBottom)}–${Math.round(maxEyeFromBottom)} px).`
      );
    } else {
      notes.push(`Eyes OK: ${Math.round((eyeFromBottom / H) * 100)}% from bottom`);
    }
  } else {
    notes.push("Eye line not provided — skipping eye position check.");
  }

  // 4) Background heuristic (optional if you can sample)
  if (Array.isArray(sampledBgRGB) && sampledBgRGB.length === 3) {
    const [r, g, b] = sampledBgRGB.map(Number);
    if ([r, g, b].every(Number.isFinite)) {
      const avg = (r + g + b) / 3;
      const maxDelta = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
      const isLight = avg >= 235;
      const isLowColorCast = maxDelta <= 20;
      if (!isLight || !isLowColorCast) {
        errors.push("Background must be plain white or off‑white (no color cast).");
      } else {
        notes.push("Background OK.");
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    notes,
    meta: {
      required: {
        sizePx: { min: 600, max: 1200 },
        headPx: { min: Math.round(minHead), max: Math.round(maxHead) },
        eyesFromBottomPx: { min: Math.round(minEyeFromBottom), max: Math.round(maxEyeFromBottom) },
      },
      measured: {
        width: W,
        height: H,
        headTop: hasHeadBox ? ht : null,
        headBottom: hasHeadBox ? hb : null,
        headHeight: hasHeadBox ? headH : null,
        eyeLineY: hasEyes ? eyeLineY : null,
      },
    },
  };
}

/** Fallback if you don’t have eye landmarks */
export function estimateEyeY(headTop, headBottom) {
  const ht = Number(headTop);
  const hb = Number(headBottom);
  if (!Number.isFinite(ht) || !Number.isFinite(hb) || hb <= ht) return null;
  const headH = hb - ht;
  return Math.round(ht + 0.40 * headH);
}