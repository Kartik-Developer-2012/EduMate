import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const UPSTREAM_PW_BASE = 'https://physicswallah.studybeepro.site/api';
const MASTER_DOC_ID = 'SB-PWM0-SESS';

// In-memory master session cache for hot serverless lambdas
let cachedMasterSession = null;
let lastCacheFetchTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes in-memory refresh

const firebaseConfig = {
  apiKey: "AIzaSyAzxBCRdwK4NIyGwkzBrV9ev_53MJIfsOM",
  authDomain: "smexgod.firebaseapp.com",
  projectId: "smexgod",
  storageBucket: "smexgod.firebasestorage.app",
  messagingSenderId: "34615632505",
  appId: "1:34615632505:web:6e7b5c39e847854ded6aa8"
};

function getFirebaseDb() {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig, "pwProxyApp_" + Date.now());
  const auth = getAuth(app);
  const db = getFirestore(app);
  return { app, auth, db };
}

async function getMasterSession() {
  const now = Date.now();
  if (cachedMasterSession && (now - lastCacheFetchTime < CACHE_TTL_MS)) {
    return cachedMasterSession;
  }

  try {
    const { auth, db } = getFirebaseDb();
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }

    const snap = await getDoc(doc(db, 'valid_keys', MASTER_DOC_ID));
    if (snap.exists()) {
      const data = snap.data();
      const rawStored = data?.registeredDevices?.[0];
      if (rawStored) {
        try {
          const parsed = typeof rawStored === 'string' ? JSON.parse(rawStored) : rawStored;
          cachedMasterSession = parsed;
          lastCacheFetchTime = now;
          return parsed;
        } catch {
          if (typeof rawStored === 'string' && rawStored.includes('=')) {
            cachedMasterSession = { cookieHeader: rawStored, user: null, updatedAt: now };
            lastCacheFetchTime = now;
            return cachedMasterSession;
          }
        }
      }
    }
  } catch (err) {
    console.warn('[pw-proxy] Failed to fetch master session from Firestore:', err.message);
  }

  return cachedMasterSession;
}

async function saveMasterSession(cookieHeader, user = null) {
  const sessionData = {
    cookieHeader: cookieHeader || '',
    user: user || null,
    updatedAt: Date.now()
  };

  cachedMasterSession = sessionData;
  lastCacheFetchTime = Date.now();

  try {
    const { auth, db } = getFirebaseDb();
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }

    const docRef = doc(db, 'valid_keys', MASTER_DOC_ID);
    const serialized = JSON.stringify(sessionData);

    // Save with the exact security-compliant valid_keys schema
    await setDoc(docRef, {
      createdAt: Date.now(),
      expiresAt: Date.now() + (48 * 60 * 60 * 1000),
      status: 'active',
      createdBy: 'user_generate',
      maxDevices: 1,
      registeredDevices: [serialized]
    }, { merge: true });

    console.log('[pw-proxy] Successfully saved Master Lifetime PW session to Firestore');
  } catch (err) {
    console.error('[pw-proxy] Error saving Master session to Firestore:', err);
  }

  return sessionData;
}

function parseCookieHeader(cookieArray) {
  const map = {};
  if (!cookieArray) return map;

  const arr = Array.isArray(cookieArray) ? cookieArray : [cookieArray];
  for (const item of arr) {
    if (!item) continue;
    const parts = item.split(';');
    if (parts.length > 0) {
      const first = parts[0].trim();
      const eqIdx = first.indexOf('=');
      if (eqIdx > 0) {
        const name = first.substring(0, eqIdx).trim();
        const val = first.substring(eqIdx + 1).trim();
        if (name) map[name] = val;
      }
    }
  }
  return map;
}

function buildCookieString(cookieMap) {
  return Object.entries(cookieMap)
    .filter(([_, v]) => typeof v === 'string' && v.length > 0)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

function extractEndpointFromUrl(rawUrl, rawPath, queryParams) {
  let endpoint = '';
  let queryString = '';

  try {
    const u = new URL(rawUrl || 'http://localhost');
    endpoint = u.pathname;
    queryString = u.search || '';
  } catch {
    endpoint = rawPath || '';
  }

  if (queryParams && typeof queryParams === 'object') {
    const sp = new URLSearchParams(queryParams);
    const qs = sp.toString();
    if (qs && !queryString) {
      queryString = '?' + qs;
    }
  }

  // Strip prefixes
  endpoint = endpoint
    .replace(/^\/\.netlify\/functions\/pw-proxy\/?/, '')
    .replace(/^\/api\/pw\/?/, '')
    .replace(/^\/api\/?/, '');

  if (!endpoint.startsWith('/')) {
    endpoint = '/' + endpoint;
  }

  return endpoint + queryString;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-pw-session, x-pw-cookie, x-pw-master, Range, X-Requested-With',
  'Access-Control-Allow-Credentials': 'true'
};

// Core request handler
async function handlePwProxyRequest({ method, url, path, headers, bodyRaw, queryParams }) {
  if (method === 'OPTIONS') {
    return {
      status: 204,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  const endpoint = extractEndpointFromUrl(url, path, queryParams);

  // Status endpoint for checking lifetime master session status
  if (endpoint.startsWith('/master-session-status')) {
    const master = await getMasterSession();
    return {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        isMasterActive: Boolean(master?.cookieHeader),
        user: master?.user || null,
        updatedAt: master?.updatedAt || null
      })
    };
  }

  const upstreamUrl = `${UPSTREAM_PW_BASE}${endpoint}`;
  const master = await getMasterSession();

  // Extract cookies from incoming request or headers
  const incomingCookieHeader = headers['cookie'] || headers['Cookie'] || '';
  const customSessionHeader = headers['x-pw-session'] || headers['X-Pw-Session'] || '';

  const mergedCookies = {
    ...parseCookieHeader(incomingCookieHeader ? incomingCookieHeader.split(';') : [])
  };

  // If custom session header is passed, merge it
  if (customSessionHeader) {
    try {
      const parsedCustom = JSON.parse(customSessionHeader);
      if (parsedCustom.cookieHeader) {
        Object.assign(mergedCookies, parseCookieHeader(parsedCustom.cookieHeader.split(';')));
      }
    } catch {
      Object.assign(mergedCookies, parseCookieHeader(customSessionHeader.split(';')));
    }
  }

  // If client does not have accessToken, automatically inject Master Lifetime Session!
  if (!mergedCookies['accessToken'] && master?.cookieHeader) {
    const masterCookies = parseCookieHeader(master.cookieHeader.split(';'));
    Object.assign(mergedCookies, masterCookies);
  }

  const outgoingCookieString = buildCookieString(mergedCookies);

  // Prepare upstream fetch headers
  const upstreamHeaders = {
    'Origin': 'https://physicswallah.studybeepro.site',
    'Referer': 'https://physicswallah.studybeepro.site/',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*'
  };

  if (outgoingCookieString) {
    upstreamHeaders['Cookie'] = outgoingCookieString;
  }

  if (mergedCookies['accessToken']) {
    upstreamHeaders['Authorization'] = `Bearer ${mergedCookies['accessToken']}`;
  }

  if (bodyRaw && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    upstreamHeaders['Content-Type'] = 'application/json';
  }

  const fetchOptions = {
    method,
    headers: upstreamHeaders
  };

  if (bodyRaw && method !== 'GET' && method !== 'HEAD') {
    fetchOptions.body = bodyRaw;
  }

  try {
    const upstreamRes = await fetch(upstreamUrl, fetchOptions);
    const contentType = upstreamRes.headers.get('content-type') || '';
    
    // Extract set-cookie from upstream response
    let rawSetCookies = [];
    if (typeof upstreamRes.headers.getSetCookie === 'function') {
      rawSetCookies = upstreamRes.headers.getSetCookie();
    } else {
      const single = upstreamRes.headers.get('set-cookie');
      if (single) rawSetCookies = [single];
    }

    const responseCookiesMap = parseCookieHeader(rawSetCookies);

    // If OTP verification succeeded, capture and permanently store Master Session
    const isVerifyOtp = endpoint.includes('/auth/verify-otp');
    let responseData = null;

    if (contentType.includes('application/json')) {
      responseData = await upstreamRes.json();

      if (isVerifyOtp && upstreamRes.ok && responseData && responseData.success !== false) {
        // Build complete master cookie header from response and merged cookies
        const fullMasterCookies = {
          ...mergedCookies,
          ...responseCookiesMap
        };
        const masterCookieString = buildCookieString(fullMasterCookies);

        // Save to Firebase & Memory
        await saveMasterSession(masterCookieString, responseData.user);

        responseData.isMasterSessionSaved = true;
        responseData.masterSession = {
          cookieHeader: masterCookieString,
          user: responseData.user || null
        };
      } else if (responseCookiesMap['accessToken']) {
        // Auto-refresh master session cookies if updated by upstream
        const updated = {
          ...mergedCookies,
          ...responseCookiesMap
        };
        const updatedStr = buildCookieString(updated);
        await saveMasterSession(updatedStr, master?.user);
      }
    } else {
      responseData = await upstreamRes.text();
    }

    const resHeaders = {
      ...CORS_HEADERS,
      'Content-Type': contentType || 'application/json'
    };

    // Format sanitized set-cookie headers for client
    if (rawSetCookies.length > 0) {
      const clientCookies = rawSetCookies.map(c => 
        c.replace(/;\s*Domain=[^;]+/gi, '')
         .replace(/;\s*Secure/gi, '')
         .replace(/;\s*SameSite=None/gi, '; SameSite=Lax')
      );
      resHeaders['Set-Cookie'] = clientCookies;
    }

    return {
      status: upstreamRes.status,
      headers: resHeaders,
      body: typeof responseData === 'string' ? responseData : JSON.stringify(responseData)
    };
  } catch (err) {
    console.error(`[pw-proxy] Upstream fetch to ${upstreamUrl} failed:`, err);
    return {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        message: `Physics Wallah proxy error: ${err.message}`,
        upstreamUrl
      })
    };
  }
}

// Netlify Functions v2 handler
export default async (req, context) => {
  if (req && !req.headers?.get && (req.httpMethod || req.rawUrl)) {
    return handler(req, context);
  }

  const method = req.method;
  const url = req.url;
  const headers = {};
  if (req.headers && typeof req.headers.forEach === 'function') {
    req.headers.forEach((val, key) => { headers[key.toLowerCase()] = val; });
  }

  let bodyRaw = null;
  if (method !== 'GET' && method !== 'HEAD') {
    bodyRaw = await req.text().catch(() => null);
  }

  const result = await handlePwProxyRequest({
    method,
    url,
    path: '',
    headers,
    bodyRaw,
    queryParams: null
  });

  const responseHeaders = new Headers();
  Object.entries(result.headers).forEach(([k, v]) => {
    if (k.toLowerCase() === 'set-cookie' && Array.isArray(v)) {
      v.forEach(cookieStr => responseHeaders.append('Set-Cookie', cookieStr));
    } else if (Array.isArray(v)) {
      responseHeaders.set(k, v.join(', '));
    } else {
      responseHeaders.set(k, String(v));
    }
  });

  return new Response(result.body, {
    status: result.status,
    headers: responseHeaders
  });
};

// Netlify Functions v1 handler
export async function handler(event, context) {
  const method = event.httpMethod || 'GET';
  const path = event.path || '';
  const headers = event.headers || {};
  const queryParams = event.queryStringParameters || {};
  const bodyRaw = event.body || null;

  const result = await handlePwProxyRequest({
    method,
    url: event.rawUrl || '',
    path,
    headers,
    bodyRaw,
    queryParams
  });

  const responseObj = {
    statusCode: result.status,
    headers: result.headers,
    body: result.body
  };

  if (Array.isArray(result.headers['Set-Cookie'])) {
    responseObj.multiValueHeaders = {
      'Set-Cookie': result.headers['Set-Cookie']
    };
  }

  return responseObj;
}
