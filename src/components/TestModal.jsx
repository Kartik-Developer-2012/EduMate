import React, { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  Award, 
  ChevronLeft, 
  ChevronRight, 
  Loader2 
} from 'lucide-react';
import { fetchTestData, fetchTestDetails } from '../services/api';
import { useCourse } from '../context/CourseContext';

export default function TestModal({ item, onClose }) {
  const { saveTestResult } = useCourse();

  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState(null);
  const [instructions, setInstructions] = useState('');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(1200);

  const testId = item?.entity_id || item?.id;

  useEffect(() => {
    async function loadTest() {
      setLoading(true);
      try {
        const [inst, data] = await Promise.all([
          fetchTestDetails(testId),
          fetchTestData(testId)
        ]);
        setInstructions(inst?.test_instructions || 'Complete all questions before submitting.');
        setTestData(data);
        if (data?.duration) {
          setTimeLeft(data.duration * 60);
        }
      } catch (err) {
        console.error('Failed to load test:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTest();
  }, [testId]);

  // Timer countdown
  useEffect(() => {
    if (isSubmitted || loading) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isSubmitted, loading]);

  const questions = testData?.questions || testData?.question_list || [];

  const handleSelectOption = (qId, optionIdx) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [qId]: optionIdx
    }));
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    let correctCount = 0;
    questions.forEach((q) => {
      const qId = q.question_id || q.id;
      if (selectedAnswers[qId] === q.correct_option || selectedAnswers[qId] === 1) {
        correctCount += 1;
      }
    });

    saveTestResult(testId, {
      testTitle: item.title,
      total: questions.length,
      correct: correctCount,
      score: correctCount * 4
    });
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timerFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const currentQuestion = questions[currentIdx];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold text-[#F1FAEE] uppercase tracking-widest px-2 py-0.5 rounded bg-[#1D3557] border border-[#457B9D]/40">
              Mock Test
            </span>
            <h3 className="text-[var(--color-text-primary)] text-xs sm:text-sm font-semibold truncate mt-1">
              {item.title}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {!isSubmitted && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[#A8DADC] font-mono text-xs font-bold">
                <Clock className="w-3.5 h-3.5 text-[#A8DADC]" />
                <span>{timerFormatted}</span>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-[var(--color-text-secondary)]">
            <Loader2 className="w-7 h-7 animate-spin text-[#A8DADC] mb-2" />
            <p className="text-xs font-medium">Loading assessment questions...</p>
          </div>
        ) : isSubmitted ? (
          /* Result Summary */
          <div className="flex-1 p-6 sm:p-8 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-full bg-[#1D3557] border border-[#457B9D]/40 flex items-center justify-center mb-3">
              <Award className="w-7 h-7 text-[#A8DADC]" />
            </div>
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">Assessment Submitted</h3>
            <p className="text-xs text-[var(--color-text-secondary)] mb-6">
              Your test responses have been evaluated.
            </p>

            <div className="grid grid-cols-3 gap-3 w-full max-w-sm mb-6">
              <div className="p-3 rounded-xl card-surface">
                <div className="text-base font-bold text-[var(--color-text-primary)]">{questions.length}</div>
                <div className="text-[10px] text-[var(--color-text-secondary)] font-medium">Total</div>
              </div>
              <div className="p-3 rounded-xl card-surface">
                <div className="text-base font-bold text-[#A8DADC]">
                  {Object.keys(selectedAnswers).length}
                </div>
                <div className="text-[10px] text-[var(--color-text-secondary)] font-medium">Answered</div>
              </div>
              <div className="p-3 rounded-xl card-surface">
                <div className="text-base font-bold text-[#D97706]">
                  {questions.length - Object.keys(selectedAnswers).length}
                </div>
                <div className="text-[10px] text-[var(--color-text-secondary)] font-medium">Skipped</div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[#457B9D] hover:bg-[#386684] text-[#F1FAEE] font-bold text-xs transition-colors btn-press shadow-sm"
            >
              Return to Course
            </button>
          </div>
        ) : questions.length === 0 ? (
          /* Instructions View */
          <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto">
            <div>
              <h4 className="text-sm font-bold text-[var(--color-text-primary)] mb-2">Instructions</h4>
              <div
                className="text-xs text-[var(--color-text-secondary)] leading-relaxed mb-6 space-y-2"
                dangerouslySetInnerHTML={{ __html: instructions }}
              />

              <div className="p-4 rounded-xl card-surface text-xs space-y-1.5 text-[var(--color-text-secondary)]">
                <p>• Carefully read each question before selecting your response.</p>
                <p>• You may review your answers before submitting.</p>
                <p>• Ad-free, distraction-free environment.</p>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-[var(--color-border)]">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-xs font-semibold hover:border-[#457B9D]"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Question Form */
          <div className="flex-1 flex flex-col p-5 sm:p-6 overflow-y-auto">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)] mb-4 pb-2 border-b border-[var(--color-border)]">
              <span className="font-semibold text-[var(--color-text-primary)]">
                Question {currentIdx + 1} of {questions.length}
              </span>
              <span className="text-[11px] font-mono text-[#A8DADC] font-bold">+4 / 0 Marks</span>
            </div>

            <div className="text-sm sm:text-base font-medium text-[var(--color-text-primary)] mb-6 leading-relaxed">
              {currentQuestion?.question_text || currentQuestion?.title || currentQuestion?.text || `Question ${currentIdx + 1}`}
            </div>

            {/* Options */}
            <div className="space-y-2 mb-6">
              {(currentQuestion?.options || ['Option A', 'Option B', 'Option C', 'Option D']).map((opt, optIdx) => {
                const qId = currentQuestion?.question_id || currentQuestion?.id || currentIdx;
                const isSelected = selectedAnswers[qId] === optIdx;

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelectOption(qId, optIdx)}
                    className={`w-full p-3 rounded-xl border text-left text-xs sm:text-sm font-medium transition-all flex items-center gap-3 btn-press ${
                      isSelected
                        ? 'bg-[#1D3557] border-[#457B9D] text-[#F1FAEE] shadow-sm font-semibold'
                        : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] hover:border-[#A8DADC]'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                      isSelected ? 'bg-[#457B9D] text-[#F1FAEE]' : 'bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[var(--color-text-secondary)]'
                    }`}>
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="flex-1 leading-snug">{typeof opt === 'string' ? opt : opt.text}</span>
                  </button>
                );
              })}
            </div>

            {/* Navigation */}
            <div className="mt-auto pt-4 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
              <button
                onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                disabled={currentIdx === 0}
                className="px-3 py-1.5 rounded-lg bg-[var(--color-surface-hover)] border border-[var(--color-border)] hover:bg-[var(--color-surface)] disabled:opacity-40 text-[var(--color-text-primary)] text-xs font-semibold flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <button
                onClick={handleSubmit}
                className="px-4 py-1.5 rounded-lg bg-[#457B9D] hover:bg-[#386684] text-[#F1FAEE] text-xs font-bold transition-colors btn-press shadow-sm"
              >
                Submit Test
              </button>

              <button
                onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                disabled={currentIdx === questions.length - 1}
                className="px-3 py-1.5 rounded-lg bg-[var(--color-surface-hover)] border border-[var(--color-border)] hover:bg-[var(--color-surface)] disabled:opacity-40 text-[var(--color-text-primary)] text-xs font-semibold flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
