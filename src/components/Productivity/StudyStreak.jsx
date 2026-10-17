import React, { useState, useEffect, useCallback } from 'react';
import { Flame, Award, Target, TrendingUp, Sparkles, Trophy, Calendar } from 'lucide-react';

/**
 * Study Streak Manager
 * Tracks daily, weekly, and monthly study streaks
 */
export class StreakManager {
  constructor() {
    let raw = null;
    try {
      raw = JSON.parse(localStorage.getItem('study_streaks') || 'null');
    } catch {
      raw = null;
    }

    this.streakData = raw || {
      currentStreak: 0,
      bestStreak: 0,
      lastStudyDate: null,
      studyDates: [],
      dailyStudyTime: {},
      weeklyStats: [],
      monthlyStats: [],
      badges: [],
    };

    this.streakData.dailyStudyTime = this.streakData.dailyStudyTime || {};
    this.streakData.badges = this.streakData.badges || [];
    this.streakData.studyDates = this.streakData.studyDates || [];
  }

  addStudySession(durationInSeconds) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (!this.streakData.dailyStudyTime[today]) {
      this.streakData.dailyStudyTime[today] = 0;
    }
    this.streakData.dailyStudyTime[today] += durationInSeconds;

    if (!this.streakData.studyDates.includes(today)) {
      this.streakData.studyDates.push(today);

      if (this.streakData.lastStudyDate === yesterday) {
        this.streakData.currentStreak += 1;
      } else if (this.streakData.lastStudyDate !== today) {
        this.streakData.currentStreak = 1;
      }

      this.streakData.lastStudyDate = today;

      if (this.streakData.currentStreak > this.streakData.bestStreak) {
        this.streakData.bestStreak = this.streakData.currentStreak;
      }

      this.checkBadges();
    }

    this.save();
    return this.streakData;
  }

  checkBadges() {
    const badges = this.streakData.badges || [];
    const currentStreak = this.streakData.currentStreak || 0;

    const badgeThresholds = [
      { days: 7, id: 'week-streak', name: '7-Day Streak', icon: '🥉', desc: '1 week of disciplined study' },
      { days: 15, id: 'two-week-streak', name: '15-Day Streak', icon: '🥈', desc: 'Half-month consistency champion' },
      { days: 30, id: 'month-streak', name: '30-Day Streak', icon: '🥇', desc: '1 full month uninterrupted focus' },
      { days: 100, id: 'century-streak', name: '100-Day Streak', icon: '💎', desc: 'Century Master Scholar' },
    ];

    badgeThresholds.forEach((badge) => {
      if (currentStreak >= badge.days && !badges.find((b) => b.id === badge.id)) {
        badges.push({
          id: badge.id,
          name: badge.name,
          icon: badge.icon,
          desc: badge.desc,
          earnedAt: new Date().toISOString(),
        });
      }
    });

    this.streakData.badges = badges;
  }

  save() {
    try {
      localStorage.setItem('study_streaks', JSON.stringify(this.streakData));
    } catch (e) {
      console.warn('Failed to save study streaks:', e);
    }
  }

  getData() {
    return this.streakData;
  }
}

export default function StudyStreak() {
  const [streakData, setStreakData] = useState(null);
  const [showBadges, setShowBadges] = useState(true);

  const refreshStreak = useCallback(() => {
    const manager = new StreakManager();
    setStreakData({ ...manager.getData() });
  }, []);

  useEffect(() => {
    refreshStreak();

    const handleUpdate = () => refreshStreak();
    window.addEventListener('study-streak-updated', handleUpdate);
    return () => {
      window.removeEventListener('study-streak-updated', handleUpdate);
    };
  }, [refreshStreak]);

  if (!streakData) {
    return (
      <div className="text-center py-8 text-[var(--color-text-muted)]">
        Loading study streaks...
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySeconds = (streakData.dailyStudyTime && streakData.dailyStudyTime[todayStr]) || 0;
  const todayMinutes = Math.floor(todaySeconds / 60);

  const allStudySeconds = Object.values(streakData.dailyStudyTime || {}).reduce((a, b) => a + b, 0);
  const totalHours = (allStudySeconds / 3600).toFixed(1);

  // Milestone targets: 7 -> 15 -> 30 -> 100
  const currentStreak = streakData.currentStreak || 0;
  const nextMilestone = currentStreak < 7 ? 7 : currentStreak < 15 ? 15 : currentStreak < 30 ? 30 : 100;
  const milestoneProgress = Math.min(100, Math.round((currentStreak / nextMilestone) * 100));

  const ALL_MILESTONE_BADGES = [
    { days: 7, id: 'week-streak', name: '7-Day Streak', icon: '🥉', desc: '1 week uninterrupted' },
    { days: 15, id: 'two-week-streak', name: '15-Day Streak', icon: '🥈', desc: '15 days consistency' },
    { days: 30, id: 'month-streak', name: '30-Day Streak', icon: '🥇', desc: '30 days scholar' },
    { days: 100, id: 'century-streak', name: '100-Day Streak', icon: '💎', desc: '100 days master' },
  ];

  return (
    <div className="w-full space-y-5">
      {/* Main Hero Streak Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-purple-800 p-6 sm:p-7 text-white shadow-lg">
        <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-amber-200 font-bold mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Current Study Streak</span>
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-4xl sm:text-5xl font-mono font-extrabold tracking-tight drop-shadow-md">
                {currentStreak}
              </span>
              <span className="text-base sm:text-lg font-bold text-amber-100 flex items-center gap-1">
                <span>Days</span>
                <Flame className="w-6 h-6 text-yellow-300 fill-yellow-400 animate-pulse" />
              </span>
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-white/15 text-left sm:text-right">
            <p className="text-[10px] text-amber-200/80 font-bold uppercase tracking-wider">
              Personal Best
            </p>
            <p className="text-xl font-bold font-mono text-white">
              {streakData.bestStreak || currentStreak} Days
            </p>
          </div>
        </div>

        {/* Milestone Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-white/90">
            <span>Next Milestone: {nextMilestone} Days</span>
            <span>{milestoneProgress}%</span>
          </div>
          <div className="w-full bg-black/25 rounded-full h-2.5 overflow-hidden p-0.5 border border-white/10">
            <div
              className="bg-gradient-to-r from-yellow-300 to-amber-200 h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${milestoneProgress}%` }}
            />
          </div>
          <p className="text-[11px] text-amber-100/85">
            {currentStreak >= nextMilestone
              ? '🎉 Milestone completed! You are on an incredible roll!'
              : `🎯 Only ${nextMilestone - currentStreak} more day${nextMilestone - currentStreak === 1 ? '' : 's'} to unlock the ${nextMilestone}-Day badge!`}
          </p>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
          <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">
            Today's Focus Time
          </p>
          <p className="text-2xl font-bold font-mono text-[#06B6D4] mt-1">
            {todayMinutes}m
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
            {todayMinutes >= 25 ? '✅ Daily streak preserved' : '25m Pomodoro saves streak'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
          <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">
            Active Study Days
          </p>
          <p className="text-2xl font-bold font-mono text-[#10B981] mt-1">
            {(streakData.studyDates || []).length}
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
            Total days recorded
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
          <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">
            Total Hours Studied
          </p>
          <p className="text-2xl font-bold font-mono text-purple-400 mt-1">
            {totalHours}h
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
            All-time cumulative focus
          </p>
        </div>
      </div>

      {/* Weekly Breakdown Chart */}
      <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#06B6D4]" />
            <span>Weekly Study Chart</span>
          </h3>
          <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Last 7 Days</span>
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2 pt-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
            const today = new Date();
            // Get dates for this week
            const currentDayOfWeek = today.getDay(); // 0 is Sun, 1 is Mon...
            const offset = (idx + 1) - (currentDayOfWeek === 0 ? 7 : currentDayOfWeek);
            const targetDate = new Date(today.getTime() + offset * 86400000);
            const dateStr = targetDate.toISOString().split('T')[0];

            const sec = (streakData.dailyStudyTime && streakData.dailyStudyTime[dateStr]) || 0;
            const mins = Math.floor(sec / 60);
            const heightPercent = Math.min(100, Math.max(8, (mins / 60) * 100));
            const isToday = dateStr === todayStr;

            return (
              <div key={day} className="flex flex-col items-center gap-2">
                <div className="text-[10px] text-[var(--color-text-muted)] font-mono">
                  {mins > 0 ? `${mins}m` : '-'}
                </div>
                <div className="w-full h-24 bg-[var(--color-bg)] rounded-lg p-1 flex items-end justify-center border border-[var(--color-border)]">
                  <div
                    className={`w-full rounded-md transition-all duration-500 ${
                      mins > 0
                        ? isToday
                          ? 'bg-gradient-to-t from-[#5B21B6] to-[#06B6D4]'
                          : 'bg-[#06B6D4]/80'
                        : 'bg-transparent'
                    }`}
                    style={{ height: `${mins > 0 ? heightPercent : 4}%` }}
                  />
                </div>
                <span
                  className={`text-[11px] font-bold ${
                    isToday ? 'text-[#06B6D4]' : 'text-[var(--color-text-muted)]'
                  }`}
                >
                  {day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badges & Achievements */}
      <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
              Milestone Badges
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300">
              {(streakData.badges || []).length} / {ALL_MILESTONE_BADGES.length} Unlocked
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowBadges(!showBadges)}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          >
            {showBadges ? 'Collapse' : 'Expand'}
          </button>
        </div>

        {showBadges && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {ALL_MILESTONE_BADGES.map((b) => {
              const isEarned = (streakData.badges || []).some((eb) => eb.id === b.id || currentStreak >= b.days);

              return (
                <div
                  key={b.id}
                  className={`p-3.5 rounded-xl border text-center transition-all ${
                    isEarned
                      ? 'bg-gradient-to-b from-[var(--color-surface-hover)] to-[var(--color-bg)] border-amber-400/40 shadow-sm'
                      : 'bg-[var(--color-bg)]/40 border-[var(--color-border)] opacity-50 grayscale'
                  }`}
                >
                  <div className="text-2xl mb-1.5">{b.icon}</div>
                  <p className="text-xs font-bold text-[var(--color-text-primary)]">{b.name}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{b.desc}</p>
                  <span
                    className={`inline-block mt-2 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      isEarned
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-[var(--color-border)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    {isEarned ? 'Unlocked' : `${b.days} Days`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Motivational Message Card */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-[#5B21B6]/15 via-[var(--color-surface)] to-[#06B6D4]/15 border border-[#06B6D4]/30 text-center">
        <p className="text-xs sm:text-sm font-semibold text-[var(--color-text-primary)] leading-relaxed">
          {currentStreak === 0
            ? "🚀 Every master was once a beginner. Start a 25-minute Pomodoro timer today and ignite your study streak!"
            : currentStreak < 7
            ? `🔥 Outstanding momentum! Complete ${7 - currentStreak} more day${7 - currentStreak === 1 ? '' : 's'} to earn your Bronze 7-Day Badge!`
            : currentStreak < 30
            ? `💪 Consistency beats talent! ${30 - currentStreak} days until you enter the 30-Day Gold Scholar Circle!`
            : "🏆 Legend status achieved! Keep learning every day and inspire your peers!"}
        </p>
      </div>
    </div>
  );
}
