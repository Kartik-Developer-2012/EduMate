import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const UPSTREAM_PW_BASE = 'https://physicswallah.studybeepro.site/api';
const MASTER_DOC_ID = 'SB-PWM0-SESS';

let cachedMasterSession = null;
let lastCacheFetchTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

const firebaseConfig = {
  apiKey: "AIzaSyAzxBCRdwK4NIyGwkzBrV9ev_53MJIfsOM",
  authDomain: "smexgod.firebaseapp.com",
  projectId: "smexgod",
  storageBucket: "smexgod.firebasestorage.app",
  messagingSenderId: "34615632505",
  appId: "1:34615632505:web:6e7b5c39e847854ded6aa8"
};

function getFirebaseDb() {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig, "vercelPwProxyApp_" + Date.now());
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
    if (!auth.currentUser) await signInAnonymously(auth);

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
    console.warn('[vercel-pw-proxy] Failed to fetch master session:', err.message);
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
    if (!auth.currentUser) await signInAnonymously(auth);

    const docRef = doc(db, 'valid_keys', MASTER_DOC_ID);
    const serialized = JSON.stringify(sessionData);

    await setDoc(docRef, {
      createdAt: Date.now(),
      expiresAt: Date.now() + (48 * 60 * 60 * 1000),
      status: 'active',
      createdBy: 'user_generate',
      maxDevices: 1,
      registeredDevices: [serialized]
    }, { merge: true });
  } catch (err) {
    console.error('[vercel-pw-proxy] Error saving Master session:', err);
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-pw-session, x-pw-cookie, x-pw-master, Range, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const endpointQuery = req.query.endpoint || req.query.splat || '';
  let endpoint = typeof endpointQuery === 'string' ? endpointQuery : (Array.isArray(endpointQuery) ? endpointQuery.join('/') : '');
  
  if (!endpoint) {
    const rawPath = req.url || '';
    const parsed = new URL(rawPath, 'http://localhost');
    endpoint = parsed.pathname.replace(/^\/api\/pw-proxy\/?/, '').replace(/^\/api\/pw\/?/, '');
  }

  if (!endpoint.startsWith('/')) {
    endpoint = '/' + endpoint;
  }

  // Preserve other query parameters
  const extraParams = { ...req.query };
  delete extraParams.endpoint;
  delete extraParams.splat;
  const qs = new URLSearchParams(extraParams).toString();
  if (qs) {
    endpoint += (endpoint.includes('?') ? '&' : '?') + qs;
  }

  if (endpoint.startsWith('/master-session-status')) {
    const master = await getMasterSession();
    return res.status(200).json({
      success: true,
      isMasterActive: Boolean(master?.cookieHeader),
      user: master?.user || null,
      updatedAt: master?.updatedAt || null
    });
  }

  const upstreamUrl = `${UPSTREAM_PW_BASE}${endpoint}`;
  const master = await getMasterSession();

  const incomingCookieHeader = req.headers['cookie'] || '';
  const customSessionHeader = req.headers['x-pw-session'] || '';

  const mergedCookies = {
    ...parseCookieHeader(incomingCookieHeader ? incomingCookieHeader.split(';') : [])
  };

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

  if (!mergedCookies['accessToken'] && master?.cookieHeader) {
    const masterCookies = parseCookieHeader(master.cookieHeader.split(';'));
    Object.assign(mergedCookies, masterCookies);
  }

  const outgoingCookieString = buildCookieString(mergedCookies);

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

  const fetchOptions = {
    method: req.method,
    headers: upstreamHeaders
  };

  if (req.body && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
    upstreamHeaders['Content-Type'] = 'application/json';
    fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }

  try {
    const upstreamRes = await fetch(upstreamUrl, fetchOptions);
    const contentType = upstreamRes.headers.get('content-type') || '';

    let rawSetCookies = [];
    if (typeof upstreamRes.headers.getSetCookie === 'function') {
      rawSetCookies = upstreamRes.headers.getSetCookie();
    } else {
      const single = upstreamRes.headers.get('set-cookie');
      if (single) rawSetCookies = [single];
    }

    const responseCookiesMap = parseCookieHeader(rawSetCookies);
    const isVerifyOtp = endpoint.includes('/auth/verify-otp');

    if (contentType.includes('application/json')) {
      const data = await upstreamRes.json();
      if (isVerifyOtp && upstreamRes.ok && data && data.success !== false) {
        const fullMasterCookies = {
          ...mergedCookies,
          ...responseCookiesMap
        };
        const masterCookieString = buildCookieString(fullMasterCookies);
        await saveMasterSession(masterCookieString, data.user);
        data.isMasterSessionSaved = true;
        data.masterSession = {
          cookieHeader: masterCookieString,
          user: data.user || null
        };
      } else if (responseCookiesMap['accessToken']) {
        const updated = { ...mergedCookies, ...responseCookiesMap };
        await saveMasterSession(buildCookieString(updated), master?.user);
      }
      return res.status(upstreamRes.status).json(data);
    }

    const textData = await upstreamRes.text();
    return res.status(upstreamRes.status).send(textData);
  } catch (err) {
    console.error(`[vercel-pw-proxy] Fetch error:`, err);
    return res.status(502).json({
      success: false,
      message: `Physics Wallah proxy error: ${err.message}`
    });
  }
}
