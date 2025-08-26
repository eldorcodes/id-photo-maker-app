// src/config/outputPolicy.js
import { SIZE_CATALOG } from "../utils/sizes"; // adjust path if needed

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

export const OUTPUT_POLICY = {
  "US:dv-lottery": {
    enforceSquare: true,
    enforceJPEG: true,
    enforceNoAlpha: true,
    defaultSize() {
      const d = SIZE_CATALOG["US:dv-lottery"]?.px?.digital?.default;
      return d || { w: 600, h: 600 };
    },
    minSize() {
      return SIZE_CATALOG["US:dv-lottery"]?.px?.digital?.min || { w: 600, h: 600 };
    },
    maxSize() {
      return SIZE_CATALOG["US:dv-lottery"]?.px?.digital?.max || { w: 1200, h: 1200 };
    },
    clampSize({ w, h }) {
      const min = this.minSize();
      const max = this.maxSize();

      let W = w, H = h;
      if (!W || !H || W !== H) {
        const def = this.defaultSize();
        W = def.w;
        H = def.h;
      }
      W = clamp(W, min.w, max.w);
      return { w: W, h: W }; // square
    },
  },
};