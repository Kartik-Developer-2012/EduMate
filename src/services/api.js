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

// In-browser client fallback key caching and resolution
const CLIENT_STORAGE_KEY = 'edumate_sb_key';
let memoryKey = null;
let memoryKeyExpiresAt = 0;
let memoryDevId = null;

function getStoredKey() {
  if (memoryKey && Date.now() < memoryKeyExpiresAt) {
    return { keyName: memoryKey, devId: memoryDevId };
  }
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(CLIENT_STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.keyName && parsed.expiresAt > Date.now() + 60000) {
        memoryKey = parsed.keyName;
        memoryKeyExpiresAt = parsed.expiresAt;
        memoryDevId = parsed.devId;
        return { keyName: memoryKey, devId: memoryDevId };
      }
    }
  } catch (e) {}
  return null;
}

function saveStoredKey(keyName, devId, expiresAt) {
  memoryKey = keyName;
  memoryKeyExpiresAt = expiresAt - 60000;
  memoryDevId = devId;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify({ keyName, devId, expiresAt }));
    }
  } catch (e) {}
}

async function getOrGenerateClientKey() {
  const existing = getStoredKey();
  if (existing) {
    return existing;
  }

  const [{ initializeApp, getApps, getApp }, { getFirestore, doc, setDoc }, { getAuth, signInAnonymously }] = await Promise.all([
    import('firebase/app'),
    import('firebase/firestore'),
    import('firebase/auth')
  ]);

  const firebaseConfig = {
    apiKey: "AIzaSyAzxBCRdwK4NIyGwkzBrV9ev_53MJIfsOM",
    authDomain: "smexgod.firebaseapp.com",
    projectId: "smexgod",
    storageBucket: "smexgod.firebasestorage.app",
    messagingSenderId: "34615632505",
    appId: "1:34615632505:web:6e7b5c39e847854ded6aa8"
  };

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig, "clientMediaResolverApp");
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

  saveStoredKey(keyName, devId, expiresAt);
  return { keyName, devId };
}

async function directResolveMedia(courseId, contentId) {
  const { keyName, devId } = await getOrGenerateClientKey();

  let foyJson = null;
  const urlsToTry = [
    `/api/studybee/api/foy?content_id=${contentId}&course_id=${courseId}&key=${keyName}&device_id=${devId}`,
    `${STUDYBEE_ORIGIN}/api/foy?content_id=${contentId}&course_id=${courseId}&key=${keyName}&device_id=${devId}`
  ];

  for (const url of urlsToTry) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && (data.decryptedData || data.data || data.drm_details || data.success !== false)) {
          foyJson = data;
          break;
        }
      }
    } catch (e) {
      console.warn(`Fetch to ${url} failed:`, e);
    }
  }

  if (!foyJson) {
    return { success: false, message: 'Could not contact media server' };
  }

  const mediaData = foyJson.decryptedData || foyJson.data || {};
  const finalUrl = foyJson.drm_details?.data?.link?.file_url || mediaData.file_url || '';
  const lowerUrl = finalUrl.toLowerCase();
  const isPdf = mediaData.file_type === 1 || lowerUrl.includes('.pdf');
  const isHls = lowerUrl.includes('.m3u8');
  const isYouTube = mediaData.video_type === 1 || lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be');

  if (finalUrl) {
    return {
      success: true,
      url: finalUrl,
      streamUrl: isPdf ? `/api/stream/pdf?url=${encodeURIComponent(finalUrl)}` : finalUrl,
      type: isPdf ? 'pdf' : (isHls ? 'hls' : (isYouTube ? 'youtube' : 'mp4')),
      mediaData,
      drmToken: foyJson.drm_details?.data?.link?.token || null
    };
  }

  return {
    success: false,
    message: foyJson.reason || 'Media stream not found'
  };
}

// 6. Asynchronously resolve media (HLS .m3u8, direct PDF, or DRM) without ads or keys
export async function resolveMediaContent(courseId, contentId) {
  if (!courseId || !contentId) return { success: false, message: 'Missing courseId or contentId' };

  // 1. Try backend/serverless resolver (/api/resolve-media)
  try {
    const res = await fetch('/api/resolve-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, contentId })
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Backend resolve-media fetch failed:', err);
  }

  // 2. Resilient client-side fallback (solves 404 on Netlify / static hosts)
  try {
    const fallbackResult = await directResolveMedia(courseId, contentId);
    if (fallbackResult && fallbackResult.success) {
      return fallbackResult;
    }
    return fallbackResult;
  } catch (directErr) {
    console.error('Direct client-side media resolution failed:', directErr);
  }

  return { success: false, message: 'Failed to connect to media resolver' };
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
