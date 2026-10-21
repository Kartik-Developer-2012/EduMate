import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore'
import { getAuth, signInAnonymously } from 'firebase/auth'

let devCachedMasterPwSession = null;
let devLastMasterFetch = 0;

async function getDevMasterSession() {
  const now = Date.now();
  if (devCachedMasterPwSession && (now - devLastMasterFetch < 5 * 60 * 1000)) {
    return devCachedMasterPwSession;
  }
  try {
    const firebaseConfig = {
      apiKey: "AIzaSyAzxBCRdwK4NIyGwkzBrV9ev_53MJIfsOM",
      authDomain: "smexgod.firebaseapp.com",
      projectId: "smexgod",
      storageBucket: "smexgod.firebasestorage.app",
      messagingSenderId: "34615632505",
      appId: "1:34615632505:web:6e7b5c39e847854ded6aa8"
    };
    const app = initializeApp(firebaseConfig, "devPwMaster_" + Date.now());
    const db = getFirestore(app);
    const auth = getAuth(app);
    await signInAnonymously(auth);
    const snap = await getDoc(doc(db, 'valid_keys', 'SB-PWM0-SESS'));
    if (snap.exists()) {
      const raw = snap.data()?.registeredDevices?.[0];
      if (raw) {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        devCachedMasterPwSession = parsed;
        devLastMasterFetch = now;
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[vite] Failed to load master session from firestore:', e.message);
  }
  return devCachedMasterPwSession;
}

async function saveDevMasterSession(cookieHeader, user) {
  const sessionData = {
    cookieHeader: cookieHeader || '',
    user: user || null,
    updatedAt: Date.now()
  };
  devCachedMasterPwSession = sessionData;
  devLastMasterFetch = Date.now();
  try {
    const firebaseConfig = {
      apiKey: "AIzaSyAzxBCRdwK4NIyGwkzBrV9ev_53MJIfsOM",
      authDomain: "smexgod.firebaseapp.com",
      projectId: "smexgod",
      storageBucket: "smexgod.firebasestorage.app",
      messagingSenderId: "34615632505",
      appId: "1:34615632505:web:6e7b5c39e847854ded6aa8"
    };
    const app = initializeApp(firebaseConfig, "devPwSaveMaster_" + Date.now());
    const db = getFirestore(app);
    const auth = getAuth(app);
    await signInAnonymously(auth);
    await setDoc(doc(db, 'valid_keys', 'SB-PWM0-SESS'), {
      createdAt: Date.now(),
      expiresAt: Date.now() + (48 * 60 * 60 * 1000),
      status: 'active',
      createdBy: 'user_generate',
      maxDevices: 1,
      registeredDevices: [JSON.stringify(sessionData)]
    }, { merge: true });
  } catch (e) {
    console.error('[vite] Failed to save master session to firestore:', e.message);
  }
  return sessionData;
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

          const fetchHeaders = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            'Accept': 'application/pdf, text/html, */*',
          };

          if (targetUrl.includes('cloudfront') || targetUrl.includes('studybeepro') || targetUrl.includes('nexttoppers')) {
            fetchHeaders['Referer'] = 'https://nt.studybeepro.site/';
            fetchHeaders['Origin'] = 'https://nt.studybeepro.site';
          }

          const upstreamRes = await fetch(targetUrl, {
            method: req.method === 'HEAD' ? 'HEAD' : 'GET',
            headers: fetchHeaders,
          });

          if (req.method === 'HEAD') {
            res.statusCode = upstreamRes.status;
            res.setHeader('Content-Type', 'application/pdf');
            res.end();
            return;
          }

          if (!upstreamRes.ok) {
            res.statusCode = upstreamRes.status;
            res.setHeader('Content-Type', 'text/plain');
            res.end(`Failed to fetch upstream PDF: HTTP ${upstreamRes.status}`);
            return;
          }

          const arrayBuffer = await upstreamRes.arrayBuffer();

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Length', String(arrayBuffer.byteLength));
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Cache-Control', 'public, max-age=86400');

          if (isDownload) {
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
          } else {
            res.setHeader('Content-Disposition', 'inline');
          }

          // Strip restrictive framing headers so PDF can be rendered in an iframe
          res.removeHeader('X-Frame-Options');
          res.removeHeader('Content-Security-Policy');

          res.end(Buffer.from(arrayBuffer));
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
            const { courseId, contentId, vdcId: rawVdcId, vdc_id, folderId, folder_id } = body;
            const vdcId = rawVdcId || vdc_id;
            const folder = folderId || folder_id;

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');

            // A. If vdcId was provided directly
            if (vdcId) {
              try {
                const vcRes = await fetch(`https://nt.studybeepro.site/vc/${vdcId}`);
                if (vcRes.ok) {
                  const vcJson = await vcRes.json();
                  const fileUrl = vcJson.data?.data?.link?.file_url || vcJson.data?.link?.file_url;
                  if (fileUrl) {
                    res.end(JSON.stringify({
                      success: true,
                      url: fileUrl,
                      streamUrl: fileUrl,
                      type: fileUrl.includes('.m3u8') ? 'hls' : 'mp4'
                    }));
                    return;
                  }
                }
              } catch {}
            }
            // B. Direct /vc/media resolution for notes, documents & dynamic items
            if (courseId && contentId) {
              try {
                const vcMediaRes = await fetch(`https://nt.studybeepro.site/vc/media?course_id=${courseId}&content_id=${contentId}`);
                if (vcMediaRes.ok) {
                  const json = await vcMediaRes.json();
                  const contentData = json.decryptedData || json.data || {};
                  const fileUrl = contentData.file_url || '';
                  const itemVdc = contentData.vdc_id;
                  const isPdf = contentData.file_type === 1 || fileUrl.toLowerCase().includes('.pdf');
                  const isHls = fileUrl.toLowerCase().includes('.m3u8');

                  if (fileUrl) {
                    res.end(JSON.stringify({
                      success: true,
                      url: fileUrl,
                      streamUrl: isPdf ? `/api/stream/pdf?url=${encodeURIComponent(fileUrl)}` : fileUrl,
                      type: isPdf ? 'pdf' : (isHls ? 'hls' : 'mp4'),
                      mediaData: contentData
                    }));
                    return;
                  }

                  if (itemVdc) {
                    const vcRes = await fetch(`https://nt.studybeepro.site/vc/${itemVdc}`);
                    if (vcRes.ok) {
                      const vcJson = await vcRes.json();
                      const vUrl = vcJson.data?.data?.link?.file_url || vcJson.data?.link?.file_url;
                      if (vUrl) {
                        res.end(JSON.stringify({
                          success: true,
                          url: vUrl,
                          streamUrl: vUrl,
                          type: vUrl.includes('.m3u8') ? 'hls' : 'mp4'
                        }));
                        return;
                      }
                    }
                  }
                }
              } catch {}
            }

            // C. Catalog lookup
            if (courseId && contentId) {
              const ep = folder ? `https://nts.khatikgaurav38.workers.dev/?content=${courseId}&folder=${folder}` : `https://nts.khatikgaurav38.workers.dev/?content=${courseId}`;
              try {
                const catRes = await fetch(ep);
                if (catRes.ok) {
                  const catJson = await catRes.json();
                  const match = (catJson.data || []).find(it => String(it.entity_id) === String(contentId) || String(it.data?.id) === String(contentId));
                  if (match) {
                    const itemVdc = match.data?.vdc_id || match.vdc_id;
                    if (itemVdc) {
                      const vcRes = await fetch(`https://nt.studybeepro.site/vc/${itemVdc}`);
                      if (vcRes.ok) {
                        const vcJson = await vcRes.json();
                        const fileUrl = vcJson.data?.data?.link?.file_url || vcJson.data?.link?.file_url;
                        if (fileUrl) {
                          res.end(JSON.stringify({
                            success: true,
                            url: fileUrl,
                            streamUrl: fileUrl,
                            type: fileUrl.includes('.m3u8') ? 'hls' : 'mp4'
                          }));
                          return;
                        }
                      }
                    }
                  }
                }
              } catch {}
            }

            res.end(JSON.stringify({
              success: false,
              message: 'Media stream not found'
            }));
          } catch (err) {
            console.error('Resolve media error:', err);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: err.message || 'Resolve media failed' }));
          }
        });
      });

      // 4. Master Session status endpoint
      server.middlewares.use('/api/pw/master-session-status', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        const master = await getDevMasterSession();
        res.end(JSON.stringify({
          success: true,
          isMasterActive: Boolean(master?.cookieHeader),
          user: master?.user || null,
          updatedAt: master?.updatedAt || null
        }));
      });

      // 5. Google OAuth token exchange proxy (prevents browser CORS errors)
      server.middlewares.use('/api/google-oauth/token', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const googleRes = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: body
            });
            const text = await googleRes.text();
            res.statusCode = googleRes.status;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(text);
          } catch (err) {
            console.error('Google OAuth proxy error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
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
          proxy.on('proxyReq', async (proxyReq, req) => {
            proxyReq.setHeader('Origin', 'https://physicswallah.studybeepro.site');
            proxyReq.setHeader('Referer', 'https://physicswallah.studybeepro.site/');

            const clientCookie = req.headers['cookie'] || '';
            const customSession = req.headers['x-pw-session'] || '';

            if (!clientCookie.includes('accessToken=')) {
              let sessionCookies = '';
              if (customSession) {
                try {
                  const parsed = JSON.parse(customSession);
                  sessionCookies = parsed.cookieHeader || '';
                } catch {
                  sessionCookies = customSession;
                }
              }
              if (!sessionCookies) {
                const master = await getDevMasterSession();
                sessionCookies = master?.cookieHeader || '';
              }
              if (sessionCookies) {
                proxyReq.setHeader('Cookie', sessionCookies);
              }
            }
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            const cookies = proxyRes.headers['set-cookie'];
            if (cookies) {
              proxyRes.headers['set-cookie'] = (Array.isArray(cookies) ? cookies : [cookies]).map((c) =>
                c.replace(/;\s*Secure/gi, '').replace(/;\s*SameSite=None/gi, '; SameSite=Lax')
              );
              if (req.url && req.url.includes('/auth/verify-otp') && proxyRes.statusCode === 200) {
                const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
                const parts = cookieArray.map(c => c.split(';')[0].trim()).join('; ');
                saveDevMasterSession(parts, null).catch(() => {});
              }
            }
          });
        }
      },
      '/api/nts': {
        target: 'https://nts.khatikgaurav38.workers.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nts/, ''),
      },
      '/api/vc': {
        target: 'https://nt.studybeepro.site',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/vc/, '/vc'),
      },
      '/api/studybee': {
        target: 'https://nt.studybeepro.site',
        changeOrigin: true,
      }
    }
  }
})
