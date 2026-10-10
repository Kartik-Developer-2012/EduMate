import { initializeApp } from 'firebase/app';
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

  const app = initializeApp(firebaseConfig, "mediaResolverApp_" + Date.now());
  const db = getFirestore(app);
  const auth = getAuth(app);
  await signInAnonymously(auth);

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { courseId, contentId } = body;

    if (!contentId || !courseId) {
      return res.status(400).json({ success: false, error: 'courseId and contentId are required' });
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
      return res.status(200).json({
        success: true,
        url: finalUrl,
        streamUrl: isPdf ? `/api/stream/pdf?url=${encodeURIComponent(finalUrl)}` : finalUrl,
        type: isPdf ? 'pdf' : (isHls ? 'hls' : (isYouTube ? 'youtube' : 'mp4')),
        mediaData,
        drmToken: foyJson.drm_details?.data?.link?.token || null
      });
    } else {
      return res.status(200).json({
        success: false,
        message: foyJson.reason || 'Media stream not found'
      });
    }
  } catch (err) {
    console.error('Resolve media error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
