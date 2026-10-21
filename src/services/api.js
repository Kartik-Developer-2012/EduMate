// Live API service to fetch Next Toppers and EduMate data dynamically

const PRIMARY_PROXY = '/api/nts';
const DIRECT_API = 'https://nt.studyace.in/api/nig';

function getCacheBuster() {
  return `&_t=${Date.now()}`;
}

// In-memory cache for course overview and folder contents (prevents 429 rate limit spam)
const ntsCache = new Map();

// Fetch helper with fallback across proxy and direct active API
async function fetchWithFallback(queryString, options = {}) {
  const cacheKey = queryString.replace(/&_t=\d+/, '');
  if (!options.method || options.method === 'GET') {
    const cached = ntsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < 120000)) { // 2 minute cache
      return cached.data;
    }
  }

  // 1. Try local proxy /api/nts
  try {
    const res = await fetch(`${PRIMARY_PROXY}${queryString}`, options);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      ntsCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    }
  } catch {
    // continue to direct API fallback
  }

  // 2. Direct fallback to live Next Toppers endpoint (CORS enabled)
  try {
    const fallbackRes = await fetch(`${DIRECT_API}${queryString}`, options);
    if (fallbackRes.ok) {
      const data = await fallbackRes.json();
      ntsCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    }
  } catch {
    // ignore
  }

  const stale = ntsCache.get(cacheKey);
  if (stale) return stale.data;
  return { success: false, data: [] };
}

// 1. Fetch all batches dynamically from catalog (instant local catalog first)
export async function fetchBatches() {
  try {
    const res = await fetch('/batches.json');
    if (res.ok) {
      const data = await res.json();
      return [...(data.new || []), ...(data.old || [])];
    }
  } catch (err) {
    console.warn('Local /batches.json fetch notice:', err.message);
  }

  try {
    const liveRes = await fetch('/api/studybee/batches.json');
    if (liveRes.ok) {
      const liveData = await liveRes.json();
      return [...(liveData.new || []), ...(liveData.old || [])];
    }
  } catch {
    // ignore
  }

  return [];
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
  const vdcId = data.vdc_id || item.vdc_id || null;

  // Check if it's a YouTube video
  const lowerFileUrl = fileUrl.toLowerCase();
  if (lowerFileUrl.includes('youtube.com') || lowerFileUrl.includes('youtu.be') || thumbnail.includes('i.ytimg.com/vi/')) {
    let ytId = '';
    const ytMatch = fileUrl.match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*)/);
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

  // If item has a VideoCrypt ID, it is a protected stream that requires resolving to master .m3u8
  if (vdcId) {
    return {
      type: 'hls',
      url: '',
      needsResolution: true,
      vdcId,
      title: item.title || item.topic,
      thumbnail,
      duration: data.duration || 0,
      qualities: []
    };
  }

  // Parse download_urls JSON array if available (e.g. 240, 360, 480, 720) for non-VideoCrypt items
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

// Helper to resolve VideoCrypt streams directly
async function resolveViaVideoCrypt(vdcId) {
  if (!vdcId || vdcId === 'null') return null;
  try {
    const res = await fetch(`/api/vc/${vdcId}`);
    if (res.ok) {
      const json = await res.json();
      const link = json.data?.data?.link || json.data?.link || json.link || {};
      const finalUrl = link.file_url || json.file_url || '';
      if (finalUrl) {
        const isHls = finalUrl.toLowerCase().includes('.m3u8');
        return {
          success: true,
          url: finalUrl,
          streamUrl: finalUrl,
          type: isHls ? 'hls' : 'mp4',
          token: link.token || null
        };
      }
    }
  } catch (e) {
    console.warn(`VideoCrypt resolution via /api/vc/${vdcId} notice:`, e.message);
  }
  return null;
}

// Helper to resolve media/notes details directly via StudyBee/NextToppers /vc/media
async function resolveViaVcMedia(courseId, contentId) {
  if (!courseId || !contentId) return null;
  try {
    const res = await fetch(`/api/vc/media?course_id=${courseId}&content_id=${contentId}`);
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

      // If it's a DRM video with vdc_id
      if (vdcId) {
        const vcResult = await resolveViaVideoCrypt(vdcId);
        if (vcResult) return vcResult;
      }
    }
  } catch (e) {
    console.warn(`VC media resolution notice:`, e.message);
  }
  return null;
}

// 6. Asynchronously resolve media (VideoCrypt HLS .m3u8, direct PDF, or DRM)
export async function resolveMediaContent(courseId, contentId, options = {}) {
  if (!courseId && !contentId && !options) {
    return { success: false, message: 'Missing parameters' };
  }

  const vdcId = (typeof options === 'string' ? options : options?.vdcId) ||
                options?.item?.data?.vdc_id ||
                options?.item?.vdc_id ||
                options?.item?.data?.vdcId || null;
  const folderId = options?.folderId || options?.item?.parent_id;

  // 1. Direct VideoCrypt resolution if vdcId is present
  if (vdcId) {
    const vcResult = await resolveViaVideoCrypt(vdcId);
    if (vcResult) return vcResult;
  }

  // 2. Direct /vc/media resolution for notes, documents & dynamic items
  if (courseId && contentId) {
    const vcMediaResult = await resolveViaVcMedia(courseId, contentId);
    if (vcMediaResult) return vcMediaResult;
  }

  // 3. Try backend/serverless resolver (/api/resolve-media)
  try {
    const res = await fetch('/api/resolve-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, contentId, vdcId, folderId })
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.url) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Backend resolve-media fetch failed:', err);
  }

  // 4. Fallback: Query catalog to discover vdc_id if not known
  if (courseId && contentId) {
    try {
      const catalogEndpoints = [
        folderId ? `${PRIMARY_PROXY}?content=${courseId}&folder=${folderId}` : null,
        `${PRIMARY_PROXY}?content=${courseId}`,
        folderId ? `${DIRECT_WORKER}/?content=${courseId}&folder=${folderId}` : null,
        `${DIRECT_WORKER}/?content=${courseId}`
      ].filter(Boolean);

      for (const ep of catalogEndpoints) {
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
                if (vcResult) return vcResult;
              }
              const directUrl = match.data?.file_url || match.file_url;
              if (directUrl) {
                const lower = directUrl.toLowerCase();
                const isHls = lower.includes('.m3u8');
                return {
                  success: true,
                  url: directUrl,
                  streamUrl: directUrl,
                  type: isHls ? 'hls' : 'mp4'
                };
              }
            }
          }
        } catch {
          // ignore endpoint error and continue fallback
        }
      }
    } catch {
      // ignore catalog error
    }
  }

  return { success: false, message: 'Could not contact media server' };
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
    } catch {
      // ignore parse error
    }
  }

  // If already a direct PDF URL
  if (directUrl && (directUrl.includes('.pdf') || directUrl.includes('cloudfront.net'))) {
    return {
      success: true,
      url: directUrl,
      streamUrl: `/api/stream/pdf?url=${encodeURIComponent(directUrl)}`
    };
  }

  const effectiveCourseId = courseId || item.course_id || item.data?.course_id;
  const contentId = item.entity_id || item.id || item.data?.id;
  const folderId = item.parent_id || item.data?.parent_id;

  // 1. Direct resolution via VC media (instant for ACP notes and documents)
  if (effectiveCourseId && contentId) {
    const vcMediaResult = await resolveViaVcMedia(effectiveCourseId, contentId);
    if (vcMediaResult && vcMediaResult.success && vcMediaResult.url) {
      return {
        success: true,
        url: vcMediaResult.url,
        streamUrl: vcMediaResult.streamUrl || `/api/stream/pdf?url=${encodeURIComponent(vcMediaResult.url)}`
      };
    }
  }

  // 2. General resolveMediaContent fallback with folderId and item
  const res = await resolveMediaContent(effectiveCourseId, contentId, { folderId, item });
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

// 6. Comprehensive Teacher & Faculty Resolver for Next Toppers / StudyBee content
export function getTeacherForContent(item, folderHistory = [], batchTitle = '') {
  // If item already has a pre-resolved teacher name, honor it immediately
  if (item?.teacherName) return item.teacherName;
  if (item?.faculty) return item.faculty;
  if (item?.facultyName) return item.facultyName;
  if (item?.data?.faculty_name) return item.data.faculty_name;
  if (item?.data?.teacher_name) return item.data.teacher_name;
  if (item?.data?.instructor) return item.data.instructor;
  if (item?.data?.author) return item.data.author;
  if (item?.byName) return item.byName;

  const itemTitle = (item?.title || item?.name || item?.data?.title || '').toLowerCase();
  
  // Extract immediate folder (e.g. Chapter title or Sub-subject)
  const currentFolder = folderHistory && folderHistory.length > 0 
    ? (folderHistory[folderHistory.length - 1]?.title || '').toLowerCase() 
    : '';

  // Extract all ancestor folders
  const parentFolders = Array.isArray(folderHistory)
    ? folderHistory.map((f) => (f?.title || '').toLowerCase()).join(' ')
    : '';

  const batchStr = (batchTitle || item?.batchTitle || item?.courseTitle || '').toLowerCase();

  // Immediate context prioritizes the lecture title and the immediate chapter folder
  const immediateContext = `${itemTitle} ${currentFolder}`;
  
  // Full context incorporates the entire directory tree and batch name
  const fullContext = `${immediateContext} ${parentFolders} ${batchStr}`;

  // ----------------------------------------------------
  // 1. HIGHEST PRIORITY: Explicit Teacher Names in Text
  // ----------------------------------------------------
  if (fullContext.includes('prashant kirad') || fullContext.includes('prashant sir') || fullContext.includes('pk sir') || fullContext.includes('prashant bhaiya')) {
    return 'Prashant Kirad Sir';
  }
  if (fullContext.includes('digraj') || fullContext.includes('dsr sir') || fullContext.includes('digraj sir')) {
    return 'Digraj Singh Rajput Sir';
  }
  if (fullContext.includes('shobhit nirwan') || fullContext.includes('shobhit bhaiya') || fullContext.includes('shobhit sir')) {
    return 'Shobhit Nirwan Bhaiya';
  }
  if (fullContext.includes('kunal sir') || fullContext.includes('kunal bhaiya')) {
    return 'Kunal Sir (Maths Faculty)';
  }
  if (fullContext.includes('apeksha') || fullContext.includes('apeksha ma\'am') || fullContext.includes('apeksha mam')) {
    return 'Apeksha Ma\'am (Biology)';
  }
  if (fullContext.includes('tapur') || fullContext.includes('tapur ma\'am') || fullContext.includes('tapur mam')) {
    return 'Tapur Ma\'am (Chemistry)';
  }
  if (fullContext.includes('ravi sir')) {
    return 'Ravi Sir (Physics)';
  }
  if (fullContext.includes('sourabh sir')) {
    return 'Sourabh Sir (Chemistry)';
  }
  if (fullContext.includes('kuldeep sir')) {
    return 'Kuldeep Sir (Maths)';
  }
  if (fullContext.includes('samridhi') || fullContext.includes('samriddhi')) {
    return 'Samridhi Ma\'am (Biology)';
  }
  if (fullContext.includes('taniya')) {
    return 'Taniya Ma\'am (English)';
  }
  if (fullContext.includes('mansi')) {
    return 'Mansi Ma\'am (English)';
  }
  if (fullContext.includes('aarushi')) {
    return 'Aarushi Ma\'am (Biology)';
  }
  if (fullContext.includes('ashu sir') || fullContext.includes('ashu ghai')) {
    return 'Ashu Sir (Science)';
  }

  // ----------------------------------------------------
  // 2. ROOT SUBJECT DIRECTORY CHECK (Folder-level absolute truth)
  // When browsing inside a subject tree (like Maths or SST), all lectures inside are for that subject!
  // ----------------------------------------------------
  const folderNamesList = Array.isArray(folderHistory)
    ? folderHistory.map((f) => (f?.title || '').toLowerCase())
    : [];

  // A. MATHEMATICS FOLDER
  const isInsideMaths = folderNamesList.some((f) => 
    /\b(maths?|mathematics|algebra|geometry)\b/i.test(f)
  );
  if (isInsideMaths) {
    if (fullContext.includes('shobhit')) return 'Shobhit Nirwan Bhaiya (Mathematics)';
    return 'Kunal Sir (Maths Faculty)';
  }

  // B. SOCIAL SCIENCE / SST FOLDER
  const isInsideSst = folderNamesList.some((f) => 
    /\b(social science|sst|history|geography|civics|economics|political science|democratic politics)\b/i.test(f)
  );
  if (isInsideSst) {
    return 'Digraj Singh Rajput Sir (Social Science Legend)';
  }

  // C. ENGLISH FOLDER
  const isInsideEnglish = folderNamesList.some((f) => /\benglish\b/i.test(f));
  if (isInsideEnglish) {
    return 'Taniya Ma\'am (English Faculty)';
  }

  // D. HINDI FOLDER
  const isInsideHindi = folderNamesList.some((f) => /\b(hindi|हिंदी)\b/i.test(f));
  if (isInsideHindi) {
    return 'Hindi Star Faculty';
  }

  // E. IT & AI FOLDER
  const isInsideItAi = folderNamesList.some((f) => 
    /\b(information technology|artificial intelligence|code 402|code 417)\b/i.test(f)
  );
  if (isInsideItAi) {
    return 'IT & AI Faculty';
  }

  // F. DIRECT SUB-DISCIPLINE FOLDERS (e.g. Inside Science or Class 11/12)
  const isInsideBioFolder = folderNamesList.some((f) => /\b(biology|botany|zoology)\b/i.test(f));
  if (isInsideBioFolder) {
    return 'Apeksha Ma\'am (Biology Specialist)';
  }

  const isInsideChemFolder = folderNamesList.some((f) => /\b(chemistry|organic chemistry|inorganic chemistry)\b/i.test(f));
  if (isInsideChemFolder) {
    return 'Tapur Ma\'am (Chemistry Specialist)';
  }

  const isInsidePhysicsFolder = folderNamesList.some((f) => /\b(physics)\b/i.test(f));
  if (isInsidePhysicsFolder) {
    const isSeniorClass = batchStr.includes('11') || batchStr.includes('12');
    return isSeniorClass ? 'Ravi Sir (Physics Faculty)' : 'Prashant Kirad Sir (Physics Specialist)';
  }

  // ----------------------------------------------------
  // 3. CHAPTER & TOPIC MATCHING (Checks immediate chapter title and lecture title)
  // ----------------------------------------------------

  // A. MATHEMATICS CHAPTERS & TOPICS (Checked first to prevent accidental physics matches)
  const mathsKeywords = [
    'math', 'maths', 'mathematics', 'algebra', 'geometry', 'mensuration', 'trigonometry', 'calculus', 'arithmetic',
    'real numbers', 'polynomial', 'polynomials', 'linear equation', 'linear equations', 'quadratic equation', 'quadratic equations',
    'arithmetic progression', 'triangles', 'coordinate geometry', 'circles', 'constructions',
    'perimeter and area', 'measuring space', 'surface area', 'surface areas', 'areas related to circles',
    'statistics', 'probability', 'number system', 'number systems', 'lines and angles',
    'quadrilateral', 'quadrilaterals', 'heron', 'heron\'s formula', 'differentiation', 'integration',
    'sets, relations', 'matrices', 'determinants'
  ];
  if (mathsKeywords.some((kw) => immediateContext.includes(kw))) {
    if (fullContext.includes('shobhit')) return 'Shobhit Nirwan Bhaiya (Mathematics)';
    return 'Kunal Sir (Maths Faculty)';
  }

  // B. BIOLOGY CHAPTERS & TOPICS
  const biologyKeywords = [
    'biology', 'botany', 'zoology',
    // Class 10 Biology Chapters
    'life process', 'life processes', 'nutrition in organisms', 'respiration in organisms',
    'control and coordination', 'control & coordination', 'nervous system', 'reflex arc', 'hormones',
    'how do organisms reproduce', 'reproduction', 'reproduce', 'asexual reproduction', 'sexual reproduction',
    'heredity and evolution', 'heredity', 'genetics', 'mendel',
    'our environment', 'ecosystem', 'trophic level', 'food chain', 'ozone layer',
    'management of natural resources', 'natural resources',
    // Class 9 Biology Chapters
    'fundamental unit of life', 'cell', 'cells', 'plasma membrane', 'mitochondria', 'cell organelle',
    'tissue', 'tissues', 'xylem', 'phloem', 'parenchyma', 'epithelial',
    'diversity in living', 'living organism', 'monera', 'protista', 'animalia', 'plantae',
    'why do we fall ill', 'fall ill', 'health and disease', 'infectious disease',
    'improvement in food', 'food resources', 'crop production', 'animal husbandry',
    // Class 11 & 12 Biology Chapters
    'living world', 'biological classification', 'plant kingdom', 'animal kingdom',
    'morphology of flowering', 'anatomy of flowering', 'cell cycle', 'biomolecules',
    'respiration in plants', 'plant growth', 'breathing and exchange', 'body fluids', 'excretory products',
    'locomotion and movement', 'neural control', 'chemical coordination', 'reproductive health',
    'human reproduction', 'molecular basis of inheritance', 'principles of inheritance',
    'human health and disease', 'biotechnology', 'microbes in human', 'biodiversity'
  ];
  if (biologyKeywords.some((kw) => immediateContext.includes(kw))) {
    return 'Apeksha Ma\'am (Biology Specialist)';
  }

  // C. CHEMISTRY CHAPTERS & TOPICS
  const chemistryKeywords = [
    'chemistry',
    // Class 10 Chemistry Chapters
    'chemical reaction', 'chemical reactions', 'chemical equation', 'types of chemical reactions', 'corrosion', 'rancidity',
    'acids, bases', 'acids and bases', 'acid base', 'ph scale', 'salts', 'bleaching powder', 'baking soda',
    'metals and non-metals', 'metals and non metals', 'metallurgy', 'reactivity series',
    'carbon and its compounds', 'covalent bond', 'hydrocarbon', 'hydrocarbons', 'soaps and detergents',
    'periodic classification', 'periodic table',
    // Class 9 Chemistry Chapters
    'matter in our surroundings', 'states of matter', 'evaporation', 'latent heat',
    'is matter around us pure', 'matter around us pure', 'pure substance', 'colloid', 'suspension',
    'atoms and molecules', 'mole concept', 'chemical formula',
    'structure of the atom', 'structure of atom', 'atomic structure', 'valency', 'isotopes', 'isobars',
    // Class 11 & 12 Chemistry
    'basic concepts of chemistry', 'chemical bonding', 'thermodynamics', 'equilibrium', 'redox',
    'organic chemistry', 'haloalkanes', 'alcohols', 'phenols', 'aldehydes', 'ketones', 'amines',
    'coordination compounds', 'solutions', 'electrochemistry', 'chemical kinetics', 'd-and-f block'
  ];
  if (chemistryKeywords.some((kw) => immediateContext.includes(kw))) {
    return 'Tapur Ma\'am (Chemistry Specialist)';
  }

  // D. PHYSICS CHAPTERS & TOPICS (Safe keywords only; no raw substrings like 'ac' or 'emi')
  const physicsKeywords = [
    'physics',
    // Class 10 Physics Chapters
    'light - reflection', 'light reflection', 'reflection and refraction', 'refraction', 'spherical mirror', 'lenses', 'ray optics',
    'human eye', 'colourful world', 'prism', 'dispersion', 'atmospheric refraction',
    'electricity', 'electric current', 'electric potential', 'ohm\'s law', 'resistance', 'joule\'s heating',
    'magnetic effects', 'magnetic effect', 'magnetic field', 'electromagnet', 'solenoid', 'fleming', 'electromagnetic induction',
    'sources of energy', 'energy sources',
    // Class 9 Physics Chapters
    'motion', 'speed and velocity', 'acceleration', 'distance-time', 'equations of motion',
    'force and laws', 'force & laws', 'laws of motion', 'newton\'s laws', 'inertia', 'momentum',
    'gravitation', 'gravity', 'universal law of gravitation', 'free fall', 'thrust and pressure', 'archimedes principle',
    'work and energy', 'work & energy', 'kinetic energy', 'potential energy', 'law of conservation of energy',
    'sound', 'propagation of sound', 'echo', 'sonar', 'ultrasound',
    // Class 11 & 12 Physics Chapters
    'kinematics', 'rotational motion', 'oscillations', 'waves', 'electrostatics', 'current electricity',
    'alternating current', 'wave optics', 'semiconductor', 'modern physics'
  ];
  if (physicsKeywords.some((kw) => immediateContext.includes(kw))) {
    const isSeniorClass = batchStr.includes('11') || batchStr.includes('12');
    return isSeniorClass ? 'Ravi Sir (Physics Faculty)' : 'Prashant Kirad Sir (Physics Specialist)';
  }

  // E. SOCIAL SCIENCE / SST CHAPTERS & TOPICS
  const sstKeywords = [
    'social science', 'social studies', 'sst', 'history', 'geography', 'civics', 'political science', 'economics',
    'democratic politics', 'contemporary india', 'india and the contemporary world', 'understanding economic development',
    'nationalism', 'french revolution', 'russian revolution', 'nazism', 'hitler', 'print culture', 'global world',
    'resources and development', 'forest and wildlife', 'water resources', 'agriculture', 'minerals and energy', 'manufacturing industries',
    'power sharing', 'federalism', 'gender religion', 'political parties', 'outcomes of democracy', 'democracy',
    'development', 'sectors of the indian economy', 'money and credit', 'globalisation', 'consumer rights',
    'palampur', 'people as resource', 'poverty as a challenge', 'food security', 'drainage', 'climate', 'population'
  ];
  if (sstKeywords.some((kw) => immediateContext.includes(kw) || fullContext.includes(kw))) {
    return 'Digraj Singh Rajput Sir (Social Science Legend)';
  }

  // F. ENGLISH
  const englishKeywords = [
    'english', 'first flight', 'footprints without feet', 'beehive', 'moments', 'flamingo', 'vistas',
    'grammar', 'tenses', 'modals', 'reported speech', 'writing skills', 'letter writing', 'analytical paragraph'
  ];
  if (englishKeywords.some((kw) => immediateContext.includes(kw) || fullContext.includes(kw))) {
    return 'Taniya Ma\'am (English Faculty)';
  }

  // G. HINDI
  const hindiKeywords = [
    'hindi', 'हिंदी', 'क्षितिज', 'कृतिका', 'स्पर्श', 'संचयन', 'व्याकरण',
    'kshitij', 'kritika', 'sparsh', 'sanchayan', 'vyakaran'
  ];
  if (hindiKeywords.some((kw) => immediateContext.includes(kw) || fullContext.includes(kw))) {
    return 'Hindi Star Faculty';
  }

  // H. IT & AI
  const itAiKeywords = [
    'artificial intelligence', 'ai', 'information technology', 'it', 'computer', 'python', 'code 402', 'code 417'
  ];
  if (itAiKeywords.some((kw) => immediateContext.includes(kw) || fullContext.includes(kw))) {
    return 'IT & AI Faculty';
  }

  // I. COMMERCE
  const commerceKeywords = [
    'commerce', 'accountancy', 'accounts', 'business studies', 'bst', 'microeconomics', 'macroeconomics'
  ];
  if (commerceKeywords.some((kw) => immediateContext.includes(kw) || fullContext.includes(kw))) {
    return 'Commerce Faculty';
  }

  // J. HUMANITIES
  const humanitiesKeywords = [
    'humanities', 'sociology', 'psychology'
  ];
  if (humanitiesKeywords.some((kw) => immediateContext.includes(kw) || fullContext.includes(kw))) {
    return 'Digraj Singh Rajput Sir (Humanities)';
  }

  // ----------------------------------------------------
  // 4. GENERAL FALLBACKS (When inside high-level folders)
  // ----------------------------------------------------
  if (fullContext.includes('science')) {
    const isSeniorClass = batchStr.includes('11') || batchStr.includes('12');
    return isSeniorClass ? 'Next Toppers Science Faculty' : 'Prashant Kirad Sir (Science Specialist)';
  }

  if (batchStr.includes('nirmaan')) {
    return 'Prashant Kirad Sir (Foundation Mentor)';
  }

  if (batchStr.includes('aarambh')) {
    return 'Next Toppers Star Faculty';
  }

  return 'Next Toppers Faculty';
}
