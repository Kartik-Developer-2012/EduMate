// Live Physics Wallah API service for EduMate Platform
// 100% Dynamic - Directly interfaces with Physics Wallah microservices

const PW_API_PREFIX = '/api/pw';
const DIRECT_PW_ORIGIN = 'https://physicswallah.studybeepro.site';

// Helper to make live requests to PW backend with credentials (cookies)
async function pwFetch(endpoint, options = {}) {
  let customSession = null;
  try {
    customSession = localStorage.getItem('PW_MASTER_SESSION');
  } catch {}

  const fetchOptions = {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(customSession ? { 'x-pw-session': customSession } : {}),
      ...(options.headers || {})
    }
  };

  try {
    const res = await fetch(`${PW_API_PREFIX}${endpoint}`, fetchOptions);
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) {
        const error = new Error(data.message || `HTTP ${res.status}`);
        error.status = res.status;
        error.response = data;
        throw error;
      }
      return data;
    }
    if (!res.ok) {
      const error = new Error(`HTTP ${res.status}`);
      error.status = res.status;
      throw error;
    }
    return await res.text();
  } catch (proxyErr) {
    // If not a network failure but 401, bubble up immediately
    if (proxyErr.status === 401) {
      throw proxyErr;
    }

    // Direct fallback to live origin if proxy fails
    try {
      const directUrl = `${DIRECT_PW_ORIGIN}/api${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
      const directRes = await fetch(directUrl, fetchOptions);
      const data2 = await directRes.json();
      if (!directRes.ok) {
        const error2 = new Error(data2.message || `HTTP ${directRes.status}`);
        error2.status = directRes.status;
        error2.response = data2;
        throw error2;
      }
      return data2;
    } catch (directErr) {
      console.warn(`[pwApi] Endpoint ${endpoint} failed:`, directErr.message);
      throw directErr;
    }
  }
}

// Utility: Strip raw HTML, scripts, styles, and decode HTML entities from text/descriptions
export function stripHtml(input) {
  if (!input || typeof input !== 'string') return '';
  let text = input
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/(p|div|tr|li|h[1-6]|section|article)>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&bull;/gi, '•')
    .replace(/\s+/g, ' ')
    .trim();

  // If the extracted text still contains CSS rule remnants (e.g., .desc-container { ... }), discard it
  if (text.includes('{') && text.includes('}') && text.includes(':')) {
    return '';
  }
  return text;
}

// 1. Dynamically fetch all PW batches (with search & pagination)
export async function fetchPwBatches(page = 1, searchQuery = '') {
  try {
    const q = searchQuery.trim();
    const endpoint = q 
      ? `/searchBatch?name=${encodeURIComponent(q)}&page=${page}`
      : `/AllBatches?page=${page}`;

    const res = await pwFetch(endpoint);
    const rawBatches = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);

    const formatted = rawBatches.map((item) => {
      const id = item.batchId || item._id;
      return {
        id: id,
        batchId: id,
        provider: 'pw',
        title: item.batchName || item.name || 'Physics Wallah Batch',
        batchName: item.batchName || item.name,
        thumbnail: item.batchImage || item.previewImage?.baseUrl || item.iosPreviewImageUrl || 'https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/2cd05c71-3897-4e88-9c73-3e307e0dde03.jpg',
        batchImage: item.batchImage || item.previewImage?.baseUrl,
        description: stripHtml(item.batchDescription || item.description || ''),
        rawDescription: item.batchDescription || item.description || '',
        language: item.language || 'Hinglish',
        startDate: item.startDate,
        endDate: item.endDate,
        price: typeof item.batchPrice === 'number' ? item.batchPrice : (item.feeId?.total || 0),
        byName: item.byName || 'PW Star Faculty',
        template: item.template || 'NORMAL',
        raw: item
      };
    });

    return {
      success: true,
      batches: formatted,
      currentPage: res.currentPage || page,
      totalPages: res.totalPages || 1,
      totalCount: res.totalCount || formatted.length,
      unauthorized: false
    };
  } catch (err) {
    if (err.status === 401 || (err.message && err.message.toLowerCase().includes('unauthorized'))) {
      return {
        success: false,
        batches: [],
        unauthorized: true,
        message: 'Please login with your mobile number to access all live Physics Wallah batches.'
      };
    }
    console.error('[pwApi] fetchPwBatches error:', err);
    return {
      success: false,
      batches: [],
      error: err.message
    };
  }
}

// 2. Dynamically fetch Batch Details & Subjects
export async function fetchPwBatchDetails(batchId) {
  if (!batchId) return null;
  try {
    const res = await pwFetch(`/BatchInfo?BatchId=${batchId}&Type=details`);
    if (res && (res.data || res.success)) {
      const data = res.data || res;
      return {
        id: batchId,
        batchId: batchId,
        provider: 'pw',
        title: data.batchName || data.name || 'Physics Wallah Batch',
        batchName: data.batchName || data.name,
        thumbnail: data.batchImage || data.previewImage?.baseUrl || data.iosPreviewImageUrl || 'https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/2cd05c71-3897-4e88-9c73-3e307e0dde03.jpg',
        batchImage: data.batchImage || data.previewImage?.baseUrl,
        description: stripHtml(data.batchDescription || data.description || ''),
        rawDescription: data.batchDescription || data.description || '',
        language: data.language || 'Hinglish',
        startDate: data.startDate,
        endDate: data.endDate,
        price: typeof data.batchPrice === 'number' ? data.batchPrice : (data.feeId?.total || 0),
        byName: data.byName || 'Physics Wallah Faculty',
        subjects: Array.isArray(data.subjects) ? data.subjects : (Array.isArray(data.subjectDetails) ? data.subjectDetails : []),
        raw: data
      };
    }
  } catch (err) {
    console.error('[pwApi] fetchPwBatchDetails failed:', err);
  }
  return null;
}

// 3. Dynamically fetch Subject Chapters/Topics
export async function fetchPwSubjectInfo(batchId, subjectId, page = 1) {
  if (!batchId || !subjectId) return [];
  try {
    const res = await pwFetch(`/SubjectInfo?BatchId=${batchId}&SubjectId=${subjectId}&page=${page}`);
    if (res && res.data) {
      return Array.isArray(res.data) ? res.data : [];
    }
    if (Array.isArray(res)) return res;
  } catch (err) {
    console.error('[pwApi] fetchPwSubjectInfo error:', err);
  }
  return [];
}

// 4. Dynamically fetch Topic / Chapter Contents (Videos, Notes, DPPs)
// contentType: 'videos' | 'notes' | 'dppNotes' | 'dppVideos'
export async function fetchPwTopicContent(batchId, subjectId, topicId, contentType = 'videos', page = 1) {
  if (!batchId || !subjectId || !topicId) return [];
  try {
    const res = await pwFetch(`/TopicInfo?BatchId=${batchId}&SubjectId=${subjectId}&TopicId=${topicId}&ContentType=${contentType}&page=${page}`);
    if (res && res.data) {
      return Array.isArray(res.data) ? res.data : [];
    }
    if (Array.isArray(res)) return res;
  } catch (err) {
    console.error(`[pwApi] fetchPwTopicContent (${contentType}) error:`, err);
  }
  return [];
}

// 5. Dynamically fetch PDF document stream URL
export async function fetchPwPdf(batchId, subjectId, pdfId) {
  if (!batchId || !subjectId || !pdfId) return null;
  try {
    const res = await pwFetch(`/GetPdf?BatchId=${batchId}&SubjectId=${subjectId}&PdfId=${pdfId}`);
    if (res && (res.url || res.data?.url)) {
      return res.url || res.data.url;
    }
  } catch (err) {
    console.error('[pwApi] fetchPwPdf error:', err);
  }
  return null;
}

// 6. Dynamically fetch Student's Enrolled Batches
export async function fetchPwAboutMe() {
  try {
    const res = await pwFetch('/AboutMe');
    if (res && Array.isArray(res.enrolledBatches)) {
      return res.enrolledBatches;
    }
  } catch (err) {
    console.warn('[pwApi] fetchPwAboutMe error:', err.message);
  }
  return [];
}

// 7. Dynamically enroll / unenroll in a batch
export async function pwEnrollBatch(batchId, name) {
  return await pwFetch('/enrollBatch', {
    method: 'POST',
    body: JSON.stringify({ batchId, name })
  });
}

export async function pwUnenrollBatch(batchId, name) {
  return await pwFetch('/UnenrollBatch', {
    method: 'POST',
    body: JSON.stringify({ batchId, name })
  });
}

// 8. Dynamically fetch today's class schedule
export async function fetchPwSchedule(batchId) {
  if (!batchId) return [];
  try {
    const res = await pwFetch('/todays-schedule', {
      method: 'POST',
      body: JSON.stringify({ batchId })
    });
    if (res && Array.isArray(res.data)) {
      return res.data;
    }
  } catch (err) {
    console.warn('[pwApi] fetchPwSchedule error:', err.message);
  }
  return [];
}

// 9. Live OTP Authentication (WhatsApp / SMS)
export async function pwSendOtp(phoneNumber, smsType = '1') {
  const cleanPhone = String(phoneNumber).trim().replace(/\D/g, '');
  if (!cleanPhone || cleanPhone.length !== 10) {
    throw new Error('Please enter a valid 10-digit mobile number.');
  }

  return await pwFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      phoneNumber: cleanPhone,
      smsType: smsType, // '1' = WhatsApp, '0' = SMS
      fallback: 'false'
    })
  });
}

export async function pwVerifyOtp(phoneNumber, otp) {
  const cleanPhone = String(phoneNumber).trim().replace(/\D/g, '');
  const cleanOtp = String(otp).trim().replace(/\D/g, '');

  if (!cleanOtp || cleanOtp.length < 4) {
    throw new Error('Please enter the complete OTP code.');
  }

  const res = await pwFetch('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({
      phoneNumber: cleanPhone,
      otp: cleanOtp
    })
  });

  if (res.user) {
    localStorage.setItem('PW_USER_DATA', JSON.stringify(res.user));
  }

  // If master session was saved by proxy, cache it locally too
  if (res.masterSession || res.sessionData) {
    localStorage.setItem('PW_MASTER_SESSION', JSON.stringify(res.masterSession || res.sessionData));
  } else if (res.user) {
    localStorage.setItem('PW_MASTER_SESSION', JSON.stringify({ user: res.user, updatedAt: Date.now() }));
  }

  window.dispatchEvent(new Event('pwAuthChanged'));
  return res;
}

export async function checkPwMasterStatus() {
  try {
    const res = await pwFetch('/master-session-status');
    if (res && res.isMasterActive) {
      if (!localStorage.getItem('PW_MASTER_SESSION')) {
        localStorage.setItem('PW_MASTER_SESSION', JSON.stringify({
          active: true,
          user: res.user,
          updatedAt: res.updatedAt
        }));
      }
      return res;
    }
  } catch (err) {
    console.debug('[pwApi] Master status check returned:', err.message);
  }

  const stored = getStoredPwMasterSession();
  return {
    isMasterActive: Boolean(stored),
    user: stored?.user || null
  };
}

export function getStoredPwMasterSession() {
  try {
    const raw = localStorage.getItem('PW_MASTER_SESSION');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isPwMasterActive() {
  return Boolean(getStoredPwMasterSession());
}

export async function pwResendOtp(phoneNumber, smsType = '1') {
  const cleanPhone = String(phoneNumber).trim().replace(/\D/g, '');
  return await pwFetch('/auth/resend-otp', {
    method: 'POST',
    body: JSON.stringify({
      phoneNumber: cleanPhone,
      smsType: smsType,
      fallback: 'false'
    })
  });
}

export async function fetchPwServerInfo() {
  try {
    return await pwFetch('/auth/serverInfo');
  } catch {
    return null;
  }
}

export async function pwLogout(keepMaster = true) {
  localStorage.removeItem('PW_USER_DATA');
  if (!keepMaster) {
    localStorage.removeItem('PW_MASTER_SESSION');
  }
  try {
    await pwFetch('/logout', { method: 'POST' });
  } catch {}
  window.dispatchEvent(new Event('pwAuthChanged'));
}

export function getStoredPwUser() {
  try {
    const raw = localStorage.getItem('PW_USER_DATA');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// 10. Teacher name resolver for PW content
export function getPwTeacherName(item, subject = '') {
  const title = (item?.title || item?.name || item?.topic || '').toLowerCase();
  const subj = (subject || '').toLowerCase();
  const text = `${title} ${subj}`;

  if (text.includes('rajwant')) return 'Rajwant Singh Sir (Physics)';
  if (text.includes('mr sir') || text.includes('manish raj')) return 'MR Sir (Physics Specialist)';
  if (text.includes('alakh')) return 'Alakh Pandey Sir (Physics Wallah)';
  if (text.includes('sachin')) return 'Sachin Jakhar Sir (Mathematics)';
  if (text.includes('faisal')) return 'Faisal Sir (Chemistry)';
  if (text.includes('pankaj')) return 'Pankaj Sijairya Sir (Organic Chem)';
  if (text.includes('sudhanshu')) return 'Sudhanshu Tomar Sir (Physical Chem)';
  if (text.includes('tarun')) return 'Tarun Kumar Sir (Botany)';
  if (text.includes('saleem')) return 'Saleem Ahmed Sir (Physics)';
  if (text.includes('nomesh')) return 'Nomesh Sir (Zoology)';
  if (text.includes('rakshak')) return 'Rakshak Sir (Physics)';
  if (text.includes('ritik')) return 'Ritik Sir (Mathematics)';
  if (text.includes('sunil')) return 'Sunil Sir (Chemistry)';
  if (text.includes('asif')) return 'Asif Sir (Social Science)';
  if (text.includes('samridhi')) return 'Samridhi Ma\'am (Biology)';

  if (subj.includes('phys')) return 'Physics Wallah Faculty';
  if (subj.includes('chem')) return 'Chemistry Faculty';
  if (subj.includes('math')) return 'Mathematics Faculty';
  if (subj.includes('bio') || subj.includes('botan') || subj.includes('zool')) return 'Biology Faculty';

  return item?.faculty || 'Physics Wallah Star Faculty';
}
