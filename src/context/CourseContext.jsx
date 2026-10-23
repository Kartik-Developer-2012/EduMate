import React, { createContext, useContext, useState, useEffect } from 'react';

import {
  getStoredPwUser,
  isPwMasterActive,
  checkPwMasterStatus,
  fetchPwAboutMe,
  pwLogout
} from '../services/pwApi';

const CourseContext = createContext();

export function CourseProvider({ children }) {
  // Provider Selection: 'all' | 'pw' | 'nt'
  const [activeProvider, setActiveProvider] = useState(() => {
    return localStorage.getItem('edumate_active_provider') || localStorage.getItem('studybee_active_provider') || 'all';
  });

  // PW Authentication State & Master Lifetime Session
  const [pwUser, setPwUserState] = useState(() => getStoredPwUser());
  const [masterActive, setMasterActive] = useState(() => isPwMasterActive());

  useEffect(() => {
    checkPwMasterStatus().then((res) => {
      if (res?.isMasterActive) {
        setMasterActive(true);
      }
    }).catch(() => {});

    const onAuthChanged = () => {
      setPwUserState(getStoredPwUser());
      setMasterActive(isPwMasterActive());
    };
    window.addEventListener('pwAuthChanged', onAuthChanged);
    return () => window.removeEventListener('pwAuthChanged', onAuthChanged);
  }, []);

  // Enrolled Batches (Unified, handles both NT numbers and PW strings)
  const [enrolledBatches, setEnrolledBatches] = useState(() => {
    try {
      const saved = localStorage.getItem('edumate_enrolled_batches') || localStorage.getItem('studybee_enrolled_batches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Completed Lectures
  const [completedLectures, setCompletedLectures] = useState(() => {
    try {
      const saved = localStorage.getItem('edumate_completed_lectures') || localStorage.getItem('studybee_completed_lectures');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Test Results History
  const [testResults, setTestResults] = useState(() => {
    try {
      const saved = localStorage.getItem('edumate_test_results') || localStorage.getItem('studybee_test_results');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Bookmarks
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const saved = localStorage.getItem('edumate_bookmarks') || localStorage.getItem('studybee_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync active provider
  useEffect(() => {
    localStorage.setItem('edumate_active_provider', activeProvider);
  }, [activeProvider]);

  // Sync enrolled batches
  useEffect(() => {
    localStorage.setItem('edumate_enrolled_batches', JSON.stringify(enrolledBatches));
  }, [enrolledBatches]);

  // Sync completed lectures
  useEffect(() => {
    localStorage.setItem('edumate_completed_lectures', JSON.stringify(completedLectures));
  }, [completedLectures]);

  // Sync test results
  useEffect(() => {
    localStorage.setItem('edumate_test_results', JSON.stringify(testResults));
  }, [testResults]);

  // Sync bookmarks
  useEffect(() => {
    localStorage.setItem('edumate_bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  // If PW user is logged in, sync enrolled batches dynamically from live API
  useEffect(() => {
    if (pwUser) {
      fetchPwAboutMe().then((liveBatches) => {
        if (Array.isArray(liveBatches) && liveBatches.length > 0) {
          setEnrolledBatches((prev) => {
            const currentSet = new Set(prev.map(String));
            liveBatches.forEach(b => {
              const id = String(b.batchId || b._id);
              if (id) currentSet.add(id);
            });
            return Array.from(currentSet);
          });
        }
      }).catch(() => {});
    }
  }, [pwUser]);

  const setPwUser = (user) => {
    setPwUserState(user);
    if (user) {
      localStorage.setItem('PW_USER_DATA', JSON.stringify(user));
    } else {
      pwLogout();
    }
  };

  const logoutPwUser = () => {
    setPwUserState(null);
    pwLogout();
  };

  const toggleEnroll = (batchId) => {
    const idStr = String(batchId);
    setEnrolledBatches((prev) => {
      const exists = prev.some(id => String(id) === idStr);
      if (exists) {
        return prev.filter(id => String(id) !== idStr);
      } else {
        return [...prev, batchId];
      }
    });
  };

  const isEnrolled = (batchId) => {
    const idStr = String(batchId);
    return enrolledBatches.some(id => String(id) === idStr);
  };

  const toggleLectureComplete = (lectureId) => {
    const idStr = String(lectureId);
    setCompletedLectures((prev) => {
      const exists = prev.some(id => String(id) === idStr);
      if (exists) {
        return prev.filter(id => String(id) !== idStr);
      } else {
        return [...prev, lectureId];
      }
    });
  };

  const isLectureCompleted = (lectureId) => {
    const idStr = String(lectureId);
    return completedLectures.some(id => String(id) === idStr);
  };

  const saveTestResult = (testId, resultData) => {
    setTestResults((prev) => ({
      ...prev,
      [testId]: {
        ...resultData,
        attemptedAt: new Date().toISOString()
      }
    }));
  };

  const toggleBookmark = (item) => {
    const itemId = String(item.id || item.entity_id || item._id);
    setBookmarks((prev) => {
      const exists = prev.some(b => String(b.id || b.entity_id || b._id) === itemId);
      if (exists) {
        return prev.filter(b => String(b.id || b.entity_id || b._id) !== itemId);
      } else {
        return [...prev, item];
      }
    });
  };

  const isBookmarked = (itemOrId) => {
    const targetId = String(typeof itemOrId === 'object' ? (itemOrId.id || itemOrId.entity_id || itemOrId._id) : itemOrId);
    return bookmarks.some(b => String(b.id || b.entity_id || b._id) === targetId);
  };

  return (
    <CourseContext.Provider
      value={{
        activeProvider,
        setActiveProvider,
        pwUser,
        setPwUser,
        logoutPwUser,
        masterActive,
        setMasterActive,
        enrolledBatches,
        toggleEnroll,
        isEnrolled,
        completedLectures,
        toggleLectureComplete,
        isLectureCompleted,
        testResults,
        saveTestResult,
        bookmarks,
        toggleBookmark,
        isBookmarked
      }}
    >
      {children}
    </CourseContext.Provider>
  );
}

export function useCourse() {
  const context = useContext(CourseContext);
  if (!context) {
    throw new Error('useCourse must be used within a CourseProvider');
  }
  return context;
}
