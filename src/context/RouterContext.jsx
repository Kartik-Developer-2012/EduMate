import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const RouterContext = createContext(null);

// In-memory media cache to allow instant modal restoration on history navigation
const mediaCache = new Map();

// Helper to safely access sessionStorage
const storage = {
  get(key) {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, val) {
    try {
      sessionStorage.setItem(key, val);
    } catch {
      // quota or private mode
    }
  },
  remove(key) {
    try {
      sessionStorage.removeItem(key);
    } catch {}
  }
};

/**
 * Parses query parameters from window.location.search
 */
function parseUrl() {
  if (typeof window === 'undefined') {
    return {
      view: 'batches',
      batchId: null,
      provider: null,
      folderId: null,
      subjectId: null,
      chapterId: null,
      tab: null,
      pdfId: null,
      videoId: null,
      testId: null,
      searchQuery: '',
    };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    view: params.get('view') || 'batches',
    batchId: params.get('batch') || null,
    provider: params.get('provider') || null,
    folderId: params.get('folder') || null,
    subjectId: params.get('subject') || null,
    chapterId: params.get('chapter') || null,
    tab: params.get('tab') || null,
    pdfId: params.get('pdf') || null,
    videoId: params.get('video') || null,
    testId: params.get('test') || null,
    searchQuery: params.get('q') || '',
  };
}

/**
 * Serializes route object to query string
 */
function buildQueryString(route) {
  const params = new URLSearchParams();

  if (route.view && route.view !== 'batches') {
    params.set('view', route.view);
  }
  if (route.batchId) {
    params.set('batch', route.batchId);
  }
  if (route.provider) {
    params.set('provider', route.provider);
  }
  if (route.folderId && route.folderId !== '0') {
    params.set('folder', route.folderId);
  }
  if (route.subjectId) {
    params.set('subject', route.subjectId);
  }
  if (route.chapterId) {
    params.set('chapter', route.chapterId);
  }
  if (route.tab && route.tab !== 'videos' && route.tab !== 'all') {
    params.set('tab', route.tab);
  }
  if (route.pdfId) {
    params.set('pdf', route.pdfId);
  }
  if (route.videoId) {
    params.set('video', route.videoId);
  }
  if (route.testId) {
    params.set('test', route.testId);
  }
  if (route.searchQuery) {
    params.set('q', route.searchQuery);
  }

  const qs = params.toString();
  return qs ? `?${qs}` : window.location.pathname;
}

export function RouterProvider({ children }) {
  const [route, setRouteState] = useState(() => parseUrl());
  // Tracks how many modal states were pushed to window.history
  const modalHistoryDepthRef = useRef(0);

  // Listen to browser Back/Forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseUrl();
      setRouteState(parsed);
      // Decrement modal history depth if modal is no longer in URL
      if (!parsed.pdfId && !parsed.videoId && !parsed.testId) {
        modalHistoryDepthRef.current = 0;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  /**
   * Navigate to new route parameters
   * @param {Object} updates - Partial route updates
   * @param {Object} options - { replace?: boolean, push?: boolean }
   */
  const navigate = useCallback((updates, options = {}) => {
    const { replace = false } = options;

    setRouteState((prev) => {
      const next = { ...prev, ...updates };

      // If clearing batch, clear all sub-routes
      if (updates.batchId === null) {
        next.batchId = null;
        next.provider = null;
        next.folderId = null;
        next.subjectId = null;
        next.chapterId = null;
        next.tab = null;
        next.pdfId = null;
        next.videoId = null;
        next.testId = null;
      } else if (updates.batchId && updates.batchId !== prev.batchId) {
        // Changing batch resets sub-routes unless explicitly provided
        if (updates.folderId === undefined) next.folderId = null;
        if (updates.subjectId === undefined) next.subjectId = null;
        if (updates.chapterId === undefined) next.chapterId = null;
        if (updates.tab === undefined) next.tab = null;
        if (updates.pdfId === undefined) next.pdfId = null;
        if (updates.videoId === undefined) next.videoId = null;
        if (updates.testId === undefined) next.testId = null;
      }

      // If changing subject, clear chapter unless provided
      if (updates.subjectId && updates.subjectId !== prev.subjectId && updates.chapterId === undefined) {
        next.chapterId = null;
      }

      const newUrl = buildQueryString(next);
      const currentUrl = window.location.pathname + window.location.search;

      if (newUrl !== currentUrl) {
        if (replace) {
          window.history.replaceState({ route: next }, '', newUrl);
        } else {
          window.history.pushState({ route: next }, '', newUrl);
        }
      }

      return next;
    });
  }, []);

  /**
   * Cache media item for instant retrieval on back/reload
   */
  const cacheMediaItem = useCallback((item) => {
    if (!item) return;
    const id = String(item.id || item._id || item.entity_id || '');
    if (!id) return;
    mediaCache.set(id, item);
    try {
      storage.set(`edumate_media_${id}`, JSON.stringify(item));
    } catch {}
  }, []);

  /**
   * Retrieve cached media item by ID
   */
  const getCachedMediaItem = useCallback((id) => {
    if (!id) return null;
    const strId = String(id);
    if (mediaCache.has(strId)) {
      return mediaCache.get(strId);
    }
    const stored = storage.get(`edumate_media_${strId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        mediaCache.set(strId, parsed);
        return parsed;
      } catch {}
    }
    return null;
  }, []);

  /**
   * Open media/test modal with history state push
   * @param {'pdf' | 'video' | 'test'} type 
   * @param {Object} item 
   */
  const openModal = useCallback((type, item) => {
    if (!item) return;
    const id = String(item.id || item._id || item.entity_id || '');
    cacheMediaItem(item);

    modalHistoryDepthRef.current += 1;

    if (type === 'pdf') {
      navigate({ pdfId: id, videoId: null, testId: null }, { push: true });
    } else if (type === 'video') {
      navigate({ videoId: id, pdfId: null, testId: null }, { push: true });
    } else if (type === 'test') {
      navigate({ testId: id, pdfId: null, videoId: null }, { push: true });
    }
  }, [cacheMediaItem, navigate]);

  /**
   * Close media/test modal gracefully
   * If modal was pushed to history, use window.history.back() to pop smoothly.
   * Otherwise, replace URL without modal param.
   * @param {'pdf' | 'video' | 'test'} type 
   */
  const closeModal = useCallback((type) => {
    if (modalHistoryDepthRef.current > 0) {
      modalHistoryDepthRef.current = Math.max(0, modalHistoryDepthRef.current - 1);
      window.history.back();
    } else {
      // Direct link landing fallback
      const updates = {};
      if (type === 'pdf') updates.pdfId = null;
      if (type === 'video') updates.videoId = null;
      if (type === 'test') updates.testId = null;
      navigate(updates, { replace: true });
    }
  }, [navigate]);

  /**
   * Hierarchical intelligent Back navigation
   */
  const goBack = useCallback(() => {
    if (route.pdfId || route.videoId || route.testId) {
      closeModal(route.pdfId ? 'pdf' : route.videoId ? 'video' : 'test');
      return;
    }

    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback
      if (route.chapterId) {
        navigate({ chapterId: null }, { replace: true });
      } else if (route.subjectId) {
        navigate({ subjectId: null }, { replace: true });
      } else if (route.folderId) {
        navigate({ folderId: null }, { replace: true });
      } else if (route.batchId) {
        navigate({ batchId: null }, { replace: true });
      } else {
        navigate({ view: 'batches' }, { replace: true });
      }
    }
  }, [route, closeModal, navigate]);

  const value = {
    route,
    navigate,
    openModal,
    closeModal,
    goBack,
    cacheMediaItem,
    getCachedMediaItem,
  };

  return (
    <RouterContext.Provider value={value}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return ctx;
}
