// Live API service to fetch Next Toppers and EduMate data dynamically

const PRIMARY_PROXY = '/api/nts';
const DIRECT_WORKER = 'https://nts.khatikgaurav38.workers.dev';
const STUDYBEE_ORIGIN = 'https://nt.studybeepro.site';

function getCacheBuster() {
  return `&_t=${Date.now()}`;
}

// Fetch helper with fallback across proxy and direct Cloudflare worker
async function fetchWithFallback(queryString, options = {}) {
  try {
    const res = await fetch(`${PRIMARY_PROXY}${queryString}`, options);
    const contentType = res.headers.get('content-type');
    if (!res.ok || (contentType && contentType.includes('text/html'))) {
      throw new Error('Primary proxy returned non-JSON');
    }
    return await res.json();
  } catch (primaryErr) {
    const fallbackRes = await fetch(`${DIRECT_WORKER}${queryString}`, options);
    if (!fallbackRes.ok) {
      throw new Error(`API HTTP Error: ${fallbackRes.status}`);
    }
    return await fallbackRes.json();
  }
}

// 1. Fetch all batches dynamically from catalog
export async function fetchBatches() {
  try {
    const liveRes = await fetch('/api/studybee/batches.json');
    if (liveRes.ok) {
      const liveData = await liveRes.json();
      return [...(liveData.new || []), ...(liveData.old || [])];
    }
  } catch (err) {
    console.warn('Live proxy /api/studybee/batches.json failed:', err);
  }

  try {
    const directRes = await fetch(`${STUDYBEE_ORIGIN}/batches.json`);
    if (directRes.ok) {
      const liveData = await directRes.json();
      return [...(liveData.new || []), ...(liveData.old || [])];
    }
  } catch (err2) {
    console.warn('Direct STUDYBEE_ORIGIN fetch failed:', err2);
  }

  try {
    const res = await fetch('/batches.json');
    if (res.ok) {
      const data = await res.json();
      return [...(data.new || []), ...(data.old || [])];
    }
  } catch (err3) {
    console.error('Failed to load batches:', err3);
    return [];
  }
}

// 2. Fetch Course Overview & Banner details
export async function fetchCourseOverview(courseId) {
  const json = await fetchWithFallback(`?overview=${courseId}${getCacheBuster()}`);
  if (json.success && json.data) {
    const overviewTab = json.data.find((d) => d.type === 'overview');
    const detailsSection = overviewTab?.data?.find((l) => l.layout_type === 'details');
    return detailsSection?.layout_data?.[0] || null;
  }
  return null;
}

// 3. Fetch Folder Contents (Subjects, Chapters, Lectures, Notes, Tests)
export async function fetchFolderContent(courseId, folderId = 0) {
  const json = await fetchWithFallback(`?content=${courseId}&folder=${folderId}${getCacheBuster()}`);
  if (json.success && json.data) {
    return json.data;
  }
  return [];
}

// 4. Fetch Test Instructions & Test Data
export async function fetchTestDetails(testId) {
  try {
    const instructionsJson = await fetchWithFallback(`?test_instructions=${testId}${getCacheBuster()}`);
    return instructionsJson.data || null;
  } catch (err) {
    console.error('Failed to load test details:', err);
    return null;
  }
}

export async function fetchTestData(testId) {
  try {
    const testJson = await fetchWithFallback(`?test_data=${testId}${getCacheBuster()}`);
    return testJson.data || null;
  } catch (err) {
    console.error('Failed to load test questions:', err);
    return null;
  }
}

// Helper to wrap video URLs for inline streaming without download prompt
export function getStreamableVideoUrl(url) {
  if (!url) return '';
  if (url.startsWith('/api/stream/video')) return url;
  if (url.includes('.m3u8') || url.includes('youtube.com') || url.includes('youtu.be')) return url;
  return `/api/stream/video?url=${encodeURIComponent(url)}`;
}

// 5. Extract or Resolve Video/Media Stream URL
export function extractMediaInfo(item) {
  if (!item) return { type: 'unknown', url: '' };

  const data = item.data || item;
  const thumbnail = data.thumbnail || data.batchImage || data.previewImage || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80';
  let fileUrl = data.file_url || data.videoUrl || data.url || data.attachmentUrl || data.fileUrl || '';

  // Parse download_urls JSON array if available (e.g. 240, 360, 480, 720)
  let streamQualities = [];
  if (data.download_urls) {
    try {
      const parsed = typeof data.download_urls === 'string' ? JSON.parse(data.download_urls) : data.download_urls;
      if (Array.isArray(parsed) && parsed.length > 0) {
        streamQualities = parsed.map((q) => ({
          ...q,
          originalUrl: q.url,
          url: getStreamableVideoUrl(q.url),
        }));

        // Prioritize 720p or highest available stream
        const highest = streamQualities.find((s) => s.title === '720') ||
                        streamQualities.find((s) => s.title === '480') ||
                        streamQualities[streamQualities.length - 1];
        if (highest && highest.url) {
          fileUrl = highest.url;
        }
      }
    } catch (e) {
      console.warn('Could not parse download_urls:', e);
    }
  }

  // Check if it's a YouTube video
  const lowerFileUrl = fileUrl.toLowerCase();
  if (lowerFileUrl.includes('youtube.com') || lowerFileUrl.includes('youtu.be') || thumbnail.includes('i.ytimg.com/vi/')) {
    let ytId = '';
    const ytMatch = fileUrl.match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*)/);
    if (ytMatch && ytMatch[1]) {
      ytId = ytMatch[1];
    } else {
      const thumbMatch = thumbnail.match(/vi\/([a-zA-Z0-9_-]{11})/);
      if (thumbMatch && thumbMatch[1]) ytId = thumbMatch[1];
    }

    if (ytId) {
      return {
        type: 'youtube',
        youtubeId: ytId,
        url: `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`,
        thumbnail,
        title: item.title || item.topic,
        duration: data.duration || 0,
        qualities: []
      };
    }
  }

  // Check if fileUrl is an HLS (.m3u8) or direct video
  if (fileUrl) {
    const lower = fileUrl.toLowerCase();
    if (lower.includes('.pdf') || data.file_type === 1 || data.contentType === 'notes' || data.contentType === 'dppNotes') {
      return {
        type: 'pdf',
        url: fileUrl,
        streamUrl: `/api/stream/pdf?url=${encodeURIComponent(fileUrl)}`,
        title: item.title || item.topic,
        thumbnail,
        qualities: []
      };
    }
    if (lower.includes('.m3u8')) {
      return {
        type: 'hls',
        url: fileUrl,
        title: item.title || item.topic,
        thumbnail,
        duration: data.duration || 0,
        qualities: streamQualities
      };
    }

    // Default direct MP4 stream wrapped with video proxy
    const proxiedStreamUrl = getStreamableVideoUrl(fileUrl);
    return {
      type: 'mp4',
      url: proxiedStreamUrl,
      rawUrl: fileUrl,
      title: item.title || item.topic,
      thumbnail,
      duration: data.duration || 0,
      qualities: streamQualities
    };
  }

  // Fallback for PDF
  if (data.file_type === 1) {
    const rawPdf = fileUrl || data.download_urls?.[0]?.url || '';
    return {
      type: 'pdf',
      url: rawPdf,
      streamUrl: rawPdf ? `/api/stream/pdf?url=${encodeURIComponent(rawPdf)}` : '',
      title: item.title,
      thumbnail,
      qualities: []
    };
  }

  return {
    type: 'video',
    url: getStreamableVideoUrl(fileUrl),
    rawUrl: fileUrl,
    title: item.title,
    thumbnail,
    duration: data.duration || 0,
    qualities: streamQualities
  };
}

// 6. Asynchronously resolve media (HLS .m3u8, direct PDF, or DRM) without ads or keys
export async function resolveMediaContent(courseId, contentId) {
  if (!courseId || !contentId) return { success: false, message: 'Missing courseId or contentId' };

  try {
    const res = await fetch('/api/resolve-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, contentId })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('Resolve media API failed:', err);
  }
  return { success: false, message: 'Failed to connect to local media resolver' };
}

// 7. Asynchronously resolve direct PDF stream without external redirects
export async function resolvePdfDocument(courseId, item) {
  if (!item) return { success: false, message: 'Item is required' };

  const data = item.data || {};
  let directUrl = data.file_url || '';

  // Check download_urls if present
  if (!directUrl && data.download_urls) {
    try {
      const parsed = typeof data.download_urls === 'string' ? JSON.parse(data.download_urls) : data.download_urls;
      if (Array.isArray(parsed) && parsed[0]?.url) {
        directUrl = parsed[0].url;
      }
    } catch (e) {}
  }

  // If already a direct PDF URL
  if (directUrl && (directUrl.includes('.pdf') || directUrl.includes('cloudfront.net'))) {
    return {
      success: true,
      url: directUrl,
      streamUrl: `/api/stream/pdf?url=${encodeURIComponent(directUrl)}`
    };
  }

  // Call the server resolver
  const effectiveCourseId = courseId || item.course_id || item.data?.course_id;
  const res = await resolveMediaContent(effectiveCourseId, item.entity_id);
  if (res.success && res.url) {
    return {
      success: true,
      url: res.url,
      streamUrl: res.streamUrl || `/api/stream/pdf?url=${encodeURIComponent(res.url)}`
    };
  }

  // Fallback: If we had a partial directUrl, use it through the PDF stream proxy
  if (directUrl) {
    return {
      success: true,
      url: directUrl,
      streamUrl: `/api/stream/pdf?url=${encodeURIComponent(directUrl)}`
    };
  }

  return {
    success: false,
    message: res.message || 'Could not resolve document stream'
  };
}

// 6. Helper to detect and format teacher name
export function getTeacherForContent(item, folderHistory = [], batchTitle = '') {
  const itemTitle = (item?.title || '').toLowerCase();
  const folderNames = folderHistory.map((f) => (f.title || '').toLowerCase()).join(' ');
  const fullContext = `${itemTitle} ${folderNames} ${batchTitle.toLowerCase()}`;

  // Explicit teachers
  if (fullContext.includes('prashant') || fullContext.includes('science') || fullContext.includes('physics') || fullContext.includes('chemistry')) {
    return 'Prashant Kirad Sir';
  }
  if (fullContext.includes('digraj') || fullContext.includes('social science') || fullContext.includes('sst') || fullContext.includes('history') || fullContext.includes('civics') || fullContext.includes('geography')) {
    return 'Digraj Singh Rajput Sir';
  }
  if (fullContext.includes('maths') || fullContext.includes('mathematics') || fullContext.includes('algebra') || fullContext.includes('geometry') || fullContext.includes('kunal')) {
    return 'Kunal Sir (Maths Faculty)';
  }
  if (fullContext.includes('english')) {
    return 'English Faculty';
  }
  if (fullContext.includes('hindi') || fullContext.includes('हिंदी')) {
    return 'Hindi Faculty';
  }
  if (fullContext.includes('artificial intelligence') || fullContext.includes('ai') || fullContext.includes('information technology') || fullContext.includes('it')) {
    return 'IT & AI Faculty';
  }
  if (fullContext.includes('biology')) {
    return 'Biology Specialist';
  }

  return 'Next Toppers Faculty';
}
