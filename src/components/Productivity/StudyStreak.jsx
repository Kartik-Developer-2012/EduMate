import React, { useState, useEffect } from 'react';
import { Flame, Award, Target, TrendingUp } from 'lucide-react';

/**
 * Study Streak Manager
 * Tracks daily, weekly, and monthly study streaks
 */
class StreakManager {
  constructor() {
    this.streakData = JSON.parse(localStorage.getItem('study_streaks') || JSON.stringify({
      currentStreak: 0,
      bestStreak: 0,
      lastStudyDate: null,
      studyDates: [],
      dailyStudyTime: {},
      weeklyStats: [],
      monthlyStats: [],
      badges: [],
    }));
  }

  addStudySession(duration) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Initialize daily study time if needed
    if (!this.streakData.dailyStudyTime[today]) {
      this.streakData.dailyStudyTime[today] = 0;
    }

    this.streakData.dailyStudyTime[today] += duration;

    // Check if it's a new day with study
    if (!this.streakData.studyDates.includes(today)) {
      this.streakData.studyDates.push(today);

      // Update streak
      if (this.streakData.lastStudyDate === yesterday) {
        this.streakData.currentStreak++;
      } else if (this.streakData.lastStudyDate !== today) {
        this.streakData.currentStreak = 1;
      }

      this.streakData.lastStudyDate = today;

      // Update best streak
      if (this.streakData.currentStreak > this.streakData.bestStreak) {
        this.streakData.bestStreak = this.streakData.currentStreak;
      }

      // Check for badges
      this.checkBadges();
    }

    this.save();
  }

  checkBadges() {
    const badges = this.streakData.badges || [];
    const currentStreak = this.streakData.currentStreak;

    const badgeThresholds = [
      { days: 7, id: 'week-streak', name: '7-Day Streak', icon: '🥉', color: 'bronze' },
      { days: 15, id: 'two-week-streak', name: '15-Day Streak', icon: '🥈', color: 'silver' },
      { days: 30, id: 'month-streak', name: '30-Day Streak', icon: '🥇', color: 'gold' },
      { days: 100, id: 'century-streak', name: '100-Day Streak', icon: '💎', color: 'diamond' },
    ];

    badgeThresholds.forEach(badge => {
      if (currentStreak >= badge.days && !badges.find(b => b.id === badge.id)) {
        badges.push({
          id: badge.id,
          name: badge.name,
          icon: badge.icon,
          earnedAt: new Date().toISOString(),
        });
      }
    });

    this.streakData.badges = badges;
  }

  getTodayStudyTime() {
    const today = new Date().toISOString().split('T')[0];
    return this.streakData.dailyStudyTime[today] || 0;
  }

  save() {
    localStorage.setItem('study_streaks', JSON.stringify(this.streakData));
  }

  getData() {
    return this.streakData;
  }
}

export default function StudyStreak() {
  const [streakData, setStreakData] = useState(null);
  const [newBadges, setNewBadges] = useState([]);
  const [showBadges, setShowBadges] = useState(false);

  useEffect(() => {
    const manager = new StreakManager();
    setStreakData(manager.getData());
  }, []);

  if (!streakData) {
    return <div className="text-center py-4 text-[var(--color-text-muted)]">Loading streak...</div>;
  }

  const dailyStudyMinutes = Math.floor((streakData.dailyStudyTime[new Date().toISOString().split('T')[0]] || 0) / 60);

  const getStreakColor = () => {
    if (streakData.currentStreak >= 100) return 'from-purple-600 to-pink-600';
    if (streakData.currentStreak >= 30) return 'from-yellow-500 to-orange-600';
    if (streakData.currentStreak >= 15) return 'from-slate-500 to-slate-700';
    if (streakData.currentStreak >= 7) return 'from-amber-600 to-amber-700';
    return 'from-red-500 to-orange-600';
  };

  return (
    <div className="w-full space-y-4">
      {/* Main Streak Display */}
      <div className={`bg-gradient-to-br ${getStreakColor()} p-6 rounded-lg text-white shadow-lg`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm opacity-90 mb-1">Current Streak</p>
            <div className="flex items-center gap-2">
              <Flame size={28} />
              <span className="text-4xl font-bold">{streakData.currentStreak}</span>
              <span className="text-sm opacity-75">Days</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-75 mb-1">Personal Best</p>
            <p className="text-2xl font-bold">{streakData.bestStreak}</p>
          </div>
        </div>

        {/* Progress to next milestone */}
        <div className="space-y-2">
          <p className="text-xs opacity-75">Next Milestone:</p>
          <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
            <div
              className="bg-white h-full transition-all duration-500"
              style={{
                width: `${Math.min((streakData.currentStreak / 30) * 100, 100)}%`,
              }}
            />
          </div>
          <p className="text-xs opacity-90">
            {Math.max(0, 30 - streakData.currentStreak)} days until 30-day milestone! 🎯
          </p>
        </div>
      </div>

      {/* Daily Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">Today's Study</p>
          <p className="text-2xl font-bold text-[var(--color-primary)]">
            {dailyStudyMinutes}m
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">1h+ = streak saved</p>
        </div>

        <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">This Week</p>
          <p className="text-2xl font-bold text-[var(--color-secondary)]">
            {streakData.currentStreak}/7
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Days studied</p>
        </div>

        <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">Total Hours</p>
          <p className="text-2xl font-bold text-[var(--color-accent)]">
            {Math.floor(Object.values(streakData.dailyStudyTime).reduce((a, b) => a + b, 0) / 3600)}h
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">All time</p>
        </div>
      </div>

      {/* Badges */}
      <div>
        <button
          onClick={() => setShowBadges(!showBadges)}
          className="w-full flex items-center justify-between p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Award size={18} className="text-[var(--color-accent)]" />
            <span className="font-medium text-[var(--color-text-primary)]">Achievements</span>
            <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-accent)]/20 text-[var(--color-accent)] font-medium">
              {streakData.badges.length}
            </span>
          </div>
          <span className="text-[var(--color-text-muted)]">{showBadges ? '▼' : '▶'}</span>
        </button>

        {showBadges && (
          <div className="mt-2 p-4 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] space-y-2">
            {streakData.badges.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] text-center py-4">
                Keep studying to earn badges! 🎯
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {streakData.badges.map((badge) => (
                  <div
                    key={badge.id}
                    className="p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-center"
                  >
                    <p className="text-2xl mb-1">{badge.icon}</p>
                    <p className="text-xs font-medium text-[var(--color-text-primary)]">{badge.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      {new Date(badge.earnedAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Weekly breakdown */}
      <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
        <h3 className="font-medium text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
          <TrendingUp size={16} />
          This Week
        </h3>
        <div className="space-y-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
            const today = new Date();
            const dayDate = new Date(today.getTime() - (today.getDay() - idx) * 86400000)
              .toISOString()
              .split('T')[0];
            const studyTime = streakData.dailyStudyTime[dayDate] || 0;
            const studied = studyTime > 0;

            return (
              <div key={day} className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-muted)]">{day}</span>
                <div className="flex items-center gap-2 flex-1 ml-4">
                  <div className="flex-1 h-2 rounded-full bg-[var(--color-bg)] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        studied ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)]' : 'bg-[var(--color-border)]'
                      }`}
                      style={{
                        width: `${Math.min((studyTime / 3600) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-[var(--color-text-muted)] min-w-fit">
                    {studied ? `${Math.floor(studyTime / 60)}m` : '-'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Motivational message */}
      <div className="p-4 rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30">
        <p className="text-sm font-medium text-[var(--color-primary)]">
          {streakData.currentStreak === 0
            ? "🚀 Start your first study session today!"
            : streakData.currentStreak < 7
            ? `🔥 ${7 - streakData.currentStreak} more days until your first badge!`
            : streakData.currentStreak < 30
            ? `💪 Keep going! ${30 - streakData.currentStreak} days until 30-day milestone!`
            : "🏆 You're a study legend! Keep the momentum!"}
        </p>
      </div>
    </div>
  );
}

export { StreakManager };
