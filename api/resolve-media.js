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
    const { courseId, contentId, vdcId: rawVdcId, vdc_id, folderId, folder_id } = body;
    const vdcId = rawVdcId || vdc_id;
    const folder = folderId || folder_id;

    if (!contentId && !vdcId) {
      return res.status(400).json({ success: false, message: 'contentId or vdcId is required' });
    }

    // A. If vdcId was provided, resolve immediately
    if (vdcId) {
      const vcResult = await resolveViaVideoCrypt(vdcId);
      if (vcResult) {
        return res.status(200).json(vcResult);
      }
    }

    // B. Query /vc/media for direct content resolution (e.g. ACP notes, PDFs, documents)
    if (courseId && contentId) {
      const vcMediaResult = await resolveViaVcMedia(courseId, contentId);
      if (vcMediaResult) {
        return res.status(200).json(vcMediaResult);
      }
    }

    // B. Lookup item in catalog
    if (courseId && contentId) {
      try {
        const endpoints = [
          folder ? `${NTS_WORKER}?content=${courseId}&folder=${folder}` : null,
          `${NTS_WORKER}?content=${courseId}`
        ].filter(Boolean);

        for (const ep of endpoints) {
          try {
            const catRes = await fetch(ep);
            if (catRes.ok) {
              const json = await catRes.json();
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
                    return res.status(200).json(vcResult);
                  }
                }

                const directUrl = match.data?.file_url || match.file_url;
                if (directUrl) {
                  const lower = directUrl.toLowerCase();
                  const isPdf = match.data?.file_type === 1 || lower.includes('.pdf');
                  const isHls = lower.includes('.m3u8');
                  const isYt = match.data?.video_type === 1 || lower.includes('youtube.com') || lower.includes('youtu.be');
                  return res.status(200).json({
                    success: true,
                    url: directUrl,
                    streamUrl: isPdf ? `/api/stream/pdf?url=${encodeURIComponent(directUrl)}` : directUrl,
                    type: isPdf ? 'pdf' : (isHls ? 'hls' : (isYt ? 'youtube' : 'mp4')),
                    mediaData: match.data || match
                  });
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

    return res.status(200).json({
      success: false,
      message: 'Media stream source currently unavailable'
    });
  } catch (err) {
    console.error('Resolve media error:', err);
    return res.status(200).json({ success: false, message: err.message || 'Resolve media failed' });
  }
}
