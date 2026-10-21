const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Content-Type': 'application/json'
};

const NTS_WORKER = 'https://nt.studyace.in/api/nig';
const STUDYBEE_ORIGIN = 'https://nt.studyace.in';

// 1. Resolve stream directly via VideoCrypt endpoint
async function resolveViaVideoCrypt(vdcId) {
  if (!vdcId || vdcId === 'null') return null;
  try {
    const vcUrl = `${STUDYBEE_ORIGIN}/vc/${vdcId}`;
    const res = await fetch(vcUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    });

    if (res.ok) {
      const json = await res.json().catch(() => null);
      if (json && json.success) {
        const link = json.data?.data?.link || json.data?.link || json.link || {};
        const finalUrl = link.file_url || json.file_url || '';
        if (finalUrl) {
          const lower = finalUrl.toLowerCase();
          const isHls = lower.includes('.m3u8');
          const isPdf = lower.includes('.pdf');
          return {
            success: true,
            url: finalUrl,
            streamUrl: isPdf ? `/api/stream/pdf?url=${encodeURIComponent(finalUrl)}` : finalUrl,
            type: isPdf ? 'pdf' : (isHls ? 'hls' : 'mp4'),
            token: link.token || null
          };
        }
      }
    }
  } catch (err) {
    console.warn(`VideoCrypt resolution failed for ${vdcId}:`, err.message);
  }
  return null;
}

// Helper to resolve media details via NextToppers/StudyBee /vc/media
async function resolveViaVcMedia(courseId, contentId) {
  if (!courseId || !contentId) return null;
  const url = `${STUDYBEE_ORIGIN}/vc/media?course_id=${courseId}&content_id=${contentId}`;
  try {
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      const contentData = json.decryptedData || json.data || {};
      const fileUrl = contentData.file_url || '';
      const vdcId = contentData.vdc_id;
      const isPdf = contentData.file_type === 1 || fileUrl.toLowerCase().includes('.pdf');
      const isHls = fileUrl.toLowerCase().includes('.m3u8');

      if (fileUrl) {
        return {
          success: true,
          url: fileUrl,
          streamUrl: isPdf ? `/api/stream/pdf?url=${encodeURIComponent(fileUrl)}` : fileUrl,
          type: isPdf ? 'pdf' : (isHls ? 'hls' : 'mp4'),
          mediaData: contentData
        };
      }

      if (vdcId) {
        const vcResult = await resolveViaVideoCrypt(vdcId);
        if (vcResult) return vcResult;
      }
    }
  } catch (err) {
    console.warn(`VC media resolution failed for course ${courseId} content ${contentId}:`, err.message);
  }
  return null;
}

// 2. Main Media Resolver Logic
async function resolveMediaLogic(courseId, contentId, vdcId = null, folderId = null) {
  if (!contentId && !vdcId) {
    return { status: 400, data: { success: false, message: 'contentId or vdcId is required' } };
  }

  // A. If vdcId was provided directly, resolve immediately
  if (vdcId) {
    const vcResult = await resolveViaVideoCrypt(vdcId);
    if (vcResult) {
      return { status: 200, data: vcResult };
    }
  }

  // B. Query /vc/media for direct content resolution (e.g. ACP notes, PDFs, documents)
  if (courseId && contentId) {
    const vcMediaResult = await resolveViaVcMedia(courseId, contentId);
    if (vcMediaResult) {
      return { status: 200, data: vcMediaResult };
    }
  }

  // C. Query NextToppers catalog to locate content item and extract vdc_id or file_url
  if (courseId && contentId) {
    try {
      const endpoints = [
        folderId ? `${NTS_WORKER}?content=${courseId}&folder=${folderId}` : null,
        `${NTS_WORKER}?content=${courseId}`
      ].filter(Boolean);

      for (const ep of endpoints) {
        try {
          const res = await fetch(ep);
          if (res.ok) {
            const json = await res.json();
            const items = json.data || [];
            const match = items.find((it) => 
              String(it.entity_id) === String(contentId) || 
              String(it.data?.id) === String(contentId) ||
              String(it.id) === String(contentId)
            );

            if (match) {
              const itemVdc = match.data?.vdc_id || match.vdc_id;
              if (itemVdc) {
                const vcResult = await resolveViaVideoCrypt(itemVdc);
                if (vcResult) {
                  return { status: 200, data: vcResult };
                }
              }

              const directUrl = match.data?.file_url || match.file_url;
              if (directUrl) {
                const lower = directUrl.toLowerCase();
                const isPdf = match.data?.file_type === 1 || lower.includes('.pdf');
                const isHls = lower.includes('.m3u8');
                const isYt = match.data?.video_type === 1 || lower.includes('youtube.com') || lower.includes('youtu.be');
                return {
                  status: 200,
                  data: {
                    success: true,
                    url: directUrl,
                    streamUrl: isPdf ? `/api/stream/pdf?url=${encodeURIComponent(directUrl)}` : directUrl,
                    type: isPdf ? 'pdf' : (isHls ? 'hls' : (isYt ? 'youtube' : 'mp4')),
                    mediaData: match.data || match
                  }
                };
              }
            }
          }
        } catch (subErr) {
          console.warn(`Catalog lookup error on ${ep}:`, subErr.message);
        }
      }
    } catch (catErr) {
      console.warn('Catalog resolution failed:', catErr.message);
    }
  }

  return {
    status: 200,
    data: {
      success: false,
      message: 'Media stream source currently unavailable'
    }
  };
}

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
    const { status, data } = await resolveMediaLogic(
      body.courseId,
      body.contentId,
      body.vdcId || body.vdc_id,
      body.folderId || body.folder_id
    );
    return new Response(JSON.stringify(data), {
      status,
      headers: CORS_HEADERS
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: err.message || 'Resolver error' }), {
      status: 200,
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
    const { status, data } = await resolveMediaLogic(
      body.courseId,
      body.contentId,
      body.vdcId || body.vdc_id,
      body.folderId || body.folder_id
    );
    return {
      statusCode: status,
      headers: CORS_HEADERS,
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, message: err.message || 'Resolver error' })
    };
  }
}
