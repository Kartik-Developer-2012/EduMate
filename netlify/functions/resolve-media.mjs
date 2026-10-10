import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

let cachedKey = null;
let cachedKeyExpiresAt = 0;
let cachedDevId = null;

async function getOrGenerateKey() {
  if (cachedKey && Date.now() < cachedKeyExpiresAt) {
    return { keyName: cachedKey, devId: cachedDevId };
  }

  const firebaseConfig = {
    apiKey: "AIzaSyAzxBCRdwK4NIyGwkzBrV9ev_53MJIfsOM",
    authDomain: "smexgod.firebaseapp.com",
    projectId: "smexgod",
    storageBucket: "smexgod.firebasestorage.app",
    messagingSenderId: "34615632505",
    appId: "1:34615632505:web:6e7b5c39e847854ded6aa8"
  };

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig, "netlifyResolverApp_" + Date.now());
  const db = getFirestore(app);
  const auth = getAuth(app);
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }

  const keyName = 'SB-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  const devId = 'dev_' + Math.random().toString(36).substr(2, 9);
  const expiresAt = Date.now() + (48 * 60 * 60 * 1000);

  await setDoc(doc(db, 'valid_keys', keyName), {
    createdAt: Date.now(),
    expiresAt: expiresAt,
    status: 'active',
    createdBy: 'user_generate',
    maxDevices: 1,
    registeredDevices: []
  });

  cachedKey = keyName;
  cachedKeyExpiresAt = expiresAt - (60 * 1000);
  cachedDevId = devId;

  return { keyName, devId };
}

async function resolveMediaLogic(courseId, contentId) {
  if (!contentId || !courseId) {
    return { status: 400, data: { success: false, error: 'courseId and contentId are required' } };
  }

  const { keyName, devId } = await getOrGenerateKey();
  const foyUrl = `https://nt.studybeepro.site/api/foy?content_id=${contentId}&course_id=${courseId}&key=${keyName}&device_id=${devId}`;
  const foyRes = await fetch(foyUrl);
  const foyJson = await foyRes.json();

  const mediaData = foyJson.decryptedData || foyJson.data || {};
  const finalUrl = foyJson.drm_details?.data?.link?.file_url || mediaData.file_url || '';
  const lowerUrl = finalUrl.toLowerCase();
  const isPdf = mediaData.file_type === 1 || lowerUrl.includes('.pdf');
  const isHls = lowerUrl.includes('.m3u8');
  const isYouTube = mediaData.video_type === 1 || lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be');

  if (finalUrl) {
    return {
      status: 200,
      data: {
        success: true,
        url: finalUrl,
        streamUrl: isPdf ? `/api/stream/pdf?url=${encodeURIComponent(finalUrl)}` : finalUrl,
        type: isPdf ? 'pdf' : (isHls ? 'hls' : (isYouTube ? 'youtube' : 'mp4')),
        mediaData,
        drmToken: foyJson.drm_details?.data?.link?.token || null
      }
    };
  }

  return {
    status: 200,
    data: {
      success: false,
      message: foyJson.reason || 'Media stream not found'
    }
  };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Content-Type': 'application/json'
};

// Netlify Functions v2 handler
export default async (req, context) => {
  if (req && !req.json && (req.httpMethod || req.rawUrl)) {
    return handler(req, context);
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: CORS_HEADERS
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { status, data } = await resolveMediaLogic(body.courseId, body.contentId);
    return new Response(JSON.stringify(data), {
      status,
      headers: CORS_HEADERS
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: CORS_HEADERS
    });
  }
};

// Netlify Functions v1 handler
export async function handler(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { status, data } = await resolveMediaLogic(body.courseId, body.contentId);
    return {
      statusCode: status,
      headers: CORS_HEADERS,
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
}
