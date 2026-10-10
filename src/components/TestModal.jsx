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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-[#141419] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-[#141419] border-b border-white/[0.08] flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
              Mock Test
            </span>
            <h3 className="text-white text-xs sm:text-sm font-semibold truncate mt-1">
              {item.title}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {!isSubmitted && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-neutral-900 border border-white/10 text-amber-400 font-mono text-xs font-bold">
                <Clock className="w-3.5 h-3.5" />
                <span>{timerFormatted}</span>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-neutral-400">
            <Loader2 className="w-7 h-7 animate-spin text-amber-400 mb-2" />
            <p className="text-xs font-medium">Loading assessment questions...</p>
          </div>
        ) : isSubmitted ? (
          /* Result Summary */
          <div className="flex-1 p-6 sm:p-8 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
              <Award className="w-7 h-7 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Assessment Submitted</h3>
            <p className="text-xs text-neutral-400 mb-6">
              Your test responses have been evaluated.
            </p>

            <div className="grid grid-cols-3 gap-3 w-full max-w-sm mb-6">
              <div className="p-3 rounded-xl bg-neutral-900 border border-white/5">
                <div className="text-base font-bold text-white">{questions.length}</div>
                <div className="text-[10px] text-neutral-500 font-medium">Total</div>
              </div>
              <div className="p-3 rounded-xl bg-neutral-900 border border-white/5">
                <div className="text-base font-bold text-emerald-400">
                  {Object.keys(selectedAnswers).length}
                </div>
                <div className="text-[10px] text-neutral-500 font-medium">Answered</div>
              </div>
              <div className="p-3 rounded-xl bg-neutral-900 border border-white/5">
                <div className="text-base font-bold text-amber-400">
                  {questions.length - Object.keys(selectedAnswers).length}
                </div>
                <div className="text-[10px] text-neutral-500 font-medium">Skipped</div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-yellow-400 transition-colors btn-press"
            >
              Return to Course
            </button>
          </div>
        ) : questions.length === 0 ? (
          /* Instructions View */
          <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto">
            <div>
              <h4 className="text-sm font-bold text-white mb-2">Instructions</h4>
              <div
                className="text-xs text-neutral-300 leading-relaxed mb-6 space-y-2"
                dangerouslySetInnerHTML={{ __html: instructions }}
              />

              <div className="p-4 rounded-xl bg-neutral-900 border border-white/5 text-xs space-y-1.5 text-neutral-400">
                <p>• Carefully read each question before selecting your response.</p>
                <p>• You may review your answers before submitting.</p>
                <p>• Ad-free, distraction-free environment.</p>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/5">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-200 text-xs font-semibold hover:bg-neutral-700"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Question Form */
          <div className="flex-1 flex flex-col p-5 sm:p-6 overflow-y-auto">
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-4 pb-2 border-b border-white/[0.08]">
              <span className="font-semibold text-white">
                Question {currentIdx + 1} of {questions.length}
              </span>
              <span className="text-[11px] font-mono text-emerald-400">+4 / 0 Marks</span>
            </div>

            <div className="text-sm sm:text-base font-medium text-neutral-100 mb-6 leading-relaxed">
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
                    className={`w-full p-3 rounded-xl border text-left text-xs sm:text-sm font-medium transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'bg-amber-400/15 border-amber-400/60 text-white'
                        : 'bg-neutral-900 border-white/5 text-neutral-300 hover:bg-neutral-800 hover:text-white'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                      isSelected ? 'bg-amber-400 text-black' : 'bg-neutral-800 text-neutral-400'
                    }`}>
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="flex-1 leading-snug">{typeof opt === 'string' ? opt : opt.text}</span>
                  </button>
                );
              })}
            </div>

            {/* Navigation */}
            <div className="mt-auto pt-4 border-t border-white/[0.08] flex items-center justify-between gap-3">
              <button
                onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                disabled={currentIdx === 0}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-300 text-xs font-semibold flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <button
                onClick={handleSubmit}
                className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-yellow-400 text-black text-xs font-bold transition-colors btn-press"
              >
                Submit Test
              </button>

              <button
                onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                disabled={currentIdx === questions.length - 1}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-300 text-xs font-semibold flex items-center gap-1"
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
