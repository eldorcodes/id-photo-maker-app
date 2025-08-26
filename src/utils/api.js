import Constants from 'expo-constants';

export const API_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:8080';

// Force fast path (use "0" to allow AI)
export const FORCE_FAST =
  process.env.EXPO_PUBLIC_FORCE_FAST === '1' ||
  (Constants.expoConfig?.extra?.EXPO_PUBLIC_FORCE_FAST === '1');

const cleanB64 = (s) => String(s || '').replace(/^data:image\/\w+;base64,/, '');

async function request(
  path,
  { method = 'GET', body, headers = {}, timeoutMs = 30000 } = {}
) {
  const url = `${API_URL}${path}`;
  const size = body ? JSON.stringify(body).length : 0;
  console.log('REQUEST →', { url, timeoutMs, size });

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });

    const ct = res.headers.get('content-type') || '';
    const isJson = ct.includes('application/json');

    if (!res.ok) {
      const errText = isJson
        ? JSON.stringify(await res.json()).slice(0, 500)
        : (await res.text()).slice(0, 500);
      throw new Error(`${path} failed: ${res.status}${errText ? ` - ${errText}` : ''}`);
    }

    return isJson ? res.json() : res.text();
  } catch (e) {
    console.log('REQUEST ERROR ←', {
      name: e?.name,
      message: e?.message,
      url,
      timeoutMs,
    });
    if (e?.name === 'AbortError') {
      throw new Error(`AbortError: timed out after ${timeoutMs}ms`);
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

/** Replace background to an arbitrary hex color (e.g. "#2D6AE3") */
export async function bgReplaceColor(imageBase64, hex = '#ffffff') {
  const useFast = FORCE_FAST;
  const timeoutMs = useFast ? 30000 : 120000;

  try {
    return await request('/bg-remove', {
      method: 'POST',
      timeoutMs,
      body: useFast
        ? {
            imageBase64: cleanB64(imageBase64),
            format: 'png',
            quality: 'fast',
            bgColor: hex,
            transparent_background: false,
          }
        : {
            imageBase64: cleanB64(imageBase64),
            format: 'png',
            quality: 'ai',
            transparent_background: false,
            final_bg: hex,   // backend also honors bgColor
            bgColor: hex,
          },
    });
  } catch (_e) {
    // fallback to fast path
    return request('/bg-remove', {
      method: 'POST',
      timeoutMs: 30000,
      body: {
        imageBase64: cleanB64(imageBase64),
        format: 'png',
        quality: 'fast',
        bgColor: hex,
        transparent_background: false,
      },
    });
  }
}

/** Convenience wrapper for white */
export async function bgReplaceWhite(imageBase64) {
  return bgReplaceColor(imageBase64, '#ffffff');
}

/** Generic remover (kept for other flows) */
export async function bgRemove(
  imageBase64,
  format = 'png',
  quality = FORCE_FAST ? 'fast' : 'ai',
  bgColor = '#ffffff',
  transparent = false
) {
  const body = {
    imageBase64: cleanB64(imageBase64),
    format,
    quality,
    bgColor,
    transparent_background: transparent,
  };

  try {
    return await request('/bg-remove', { method: 'POST', body });
  } catch (e) {
    const msg = String(e?.message || '');
    const aiDown =
      msg.includes('502') ||
      msg.includes('ai_unavailable') ||
      msg.includes('REPLICATE_API_TOKEN');

    if (aiDown && !transparent) {
      return request('/bg-remove', {
        method: 'POST',
        body: { ...body, quality: 'fast', transparent_background: false },
      });
    }
    throw e;
  }
}

export async function refineMask(imageBase64, opts = {}) {
  return request('/refine-mask', {
    method: 'POST',
    body: { imageBase64: cleanB64(imageBase64), ...opts },
  });
}

export async function composePdf(
  items,
  sheet = { type: 'A4', dpi: 300 },
  margins = { mm: 5 },
  cutGuides = true,
  fill = true
) {
  const cleanItems = items.map((it) => ({
    imageBase64: cleanB64(it.imageBase64),
    pxW: it.pxW, pxH: it.pxH, mmW: it.mmW, mmH: it.mmH,
  }));
  return request('/compose-pdf', { method: 'POST', body: { items: cleanItems, sheet, margins, cutGuides, fill } });
}

export async function composeFinal(payload) {
  return request('/api/compose', { method: 'POST', body: payload, timeoutMs: 60000 });
}

export async function fetchSizes() {
  return request('/sizes');
}