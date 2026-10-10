import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc } from 'firebase/firestore'
import { getAuth, signInAnonymously } from 'firebase/auth'

// In-memory key caching to ensure uninterrupted, ad-free streaming
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

// Custom Vite plugin to handle video streaming and PDF embedding seamlessly
function mediaStreamPlugin() {
  return {
    name: 'edumate-media-streamer',
    configureServer(server) {
      // 1. Video streaming endpoint: rewrites octet-stream to video/mp4 with range support
      server.middlewares.use('/api/stream/video', async (req, res) => {
        try {
          const reqUrl = new URL(req.url, 'http://localhost');
          const targetUrl = reqUrl.searchParams.get('url');

          if (!targetUrl) {
            res.statusCode = 400;
            res.end('Missing "url" query parameter');
            return;
          }

          // Handle CORS preflight
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          const fetchHeaders = {
            'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            'Accept': '*/*',
          };

          if (req.headers.range) {
            fetchHeaders['Range'] = req.headers.range;
          }

          const upstreamRes = await fetch(targetUrl, {
            method: req.method === 'HEAD' ? 'HEAD' : 'GET',
            headers: fetchHeaders,
          });

          // Forward status code (200 or 206 Partial Content)
          res.statusCode = upstreamRes.status;

          // Force inline MP4 video streaming headers to prevent browser downloads
          res.setHeader('Content-Type', 'video/mp4');
          res.setHeader('Content-Disposition', 'inline');
          res.setHeader('Accept-Ranges', 'bytes');

          const contentLength = upstreamRes.headers.get('content-length');
          if (contentLength) {
            res.setHeader('Content-Length', contentLength);
          }

          const contentRange = upstreamRes.headers.get('content-range');
          if (contentRange) {
            res.setHeader('Content-Range', contentRange);
          }

          if (req.method === 'HEAD' || !upstreamRes.body) {
            res.end();
            return;
          }

          // Stream upstream response chunks to client
          const reader = upstreamRes.body.getReader();
          req.on('close', () => {
            reader.cancel().catch(() => {});
          });

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(Buffer.from(value));
          }
          res.end();
        } catch (err) {
          console.error('Video stream proxy error:', err);
          if (!res.headersSent) {
            res.statusCode = 502;
            res.end('Failed to proxy video stream');
          } else {
            res.end();
          }
        }
      });

      // 2. PDF streaming endpoint: allows inline embedding in iframe/object
      server.middlewares.use('/api/stream/pdf', async (req, res) => {
        try {
          const reqUrl = new URL(req.url, 'http://localhost');
          const targetUrl = reqUrl.searchParams.get('url');
          const isDownload = reqUrl.searchParams.get('download') === 'true';
          const filename = reqUrl.searchParams.get('name') || 'document.pdf';

          if (!targetUrl) {
            res.statusCode = 400;
            res.end('Missing "url" query parameter');
            return;
          }

          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          const upstreamRes = await fetch(targetUrl, {
            method: req.method === 'HEAD' ? 'HEAD' : 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
              'Accept': 'application/pdf, */*',
            },
          });

          res.statusCode = upstreamRes.status;
          res.setHeader('Content-Type', 'application/pdf');

          if (isDownload) {
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
          } else {
            res.setHeader('Content-Disposition', 'inline');
          }

          // Strip restrictive framing headers so PDF can be rendered in an iframe
          res.removeHeader('X-Frame-Options');
          res.removeHeader('Content-Security-Policy');

          const contentLength = upstreamRes.headers.get('content-length');
          if (contentLength) {
            res.setHeader('Content-Length', contentLength);
          }

          if (req.method === 'HEAD' || !upstreamRes.body) {
            res.end();
            return;
          }

          const reader = upstreamRes.body.getReader();
          req.on('close', () => {
            reader.cancel().catch(() => {});
          });

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(Buffer.from(value));
          }
          res.end();
        } catch (err) {
          console.error('PDF stream proxy error:', err);
          if (!res.headersSent) {
            res.statusCode = 502;
            res.end('Failed to proxy PDF document');
          } else {
            res.end();
          }
        }
      });

      // 3. Document / Media resolver: resolves direct HLS .m3u8 and PDF streams without ads or manual keys
      server.middlewares.use('/api/resolve-media', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('POST required');
          return;
        }

        let bodyRaw = '';
        req.on('data', chunk => { bodyRaw += chunk; });
        req.on('end', async () => {
          try {
            const body = JSON.parse(bodyRaw || '{}');
            const { courseId, contentId } = body;

            if (!contentId || !courseId) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'courseId and contentId are required' }));
              return;
            }

            // Auto-acquire active premium session
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

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');

            if (finalUrl) {
              res.end(JSON.stringify({
                success: true,
                url: finalUrl,
                streamUrl: isPdf ? `/api/stream/pdf?url=${encodeURIComponent(finalUrl)}` : finalUrl,
                type: isPdf ? 'pdf' : (isHls ? 'hls' : (isYouTube ? 'youtube' : 'mp4')),
                mediaData,
                drmToken: foyJson.drm_details?.data?.link?.token || null
              }));
            } else {
              res.end(JSON.stringify({
                success: false,
                message: foyJson.reason || 'Media stream not found'
              }));
            }
          } catch (err) {
            console.error('Resolve media error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    mediaStreamPlugin(),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api/pw': {
        target: 'https://physicswallah.studybeepro.site',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: 'localhost',
        cookiePathRewrite: '/',
        rewrite: (path) => path.replace(/^\/api\/pw/, '/api'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            proxyReq.setHeader('Origin', 'https://physicswallah.studybeepro.site');
            proxyReq.setHeader('Referer', 'https://physicswallah.studybeepro.site/');
          });
          proxy.on('proxyRes', (proxyRes) => {
            const cookies = proxyRes.headers['set-cookie'];
            if (cookies) {
              proxyRes.headers['set-cookie'] = (Array.isArray(cookies) ? cookies : [cookies]).map((c) =>
                c.replace(/;\s*Secure/gi, '').replace(/;\s*SameSite=None/gi, '; SameSite=Lax')
              );
            }
          });
        }
      },
      '/api/nts': {
        target: 'https://nts.khatikgaurav38.workers.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nts/, ''),
      },
      '/api/studybee': {
        target: 'https://nt.studybeepro.site',
        changeOrigin: true,
      }
    }
  }
})
