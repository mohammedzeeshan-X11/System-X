import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  BookOpen,
  Sparkles,
  Zap,
  HelpCircle,
  RotateCcw,
  MessageSquare,
  Clock,
  Download,
  Share2,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Check,
  Flame,
  Award,
} from 'lucide-react';
import { MicroLearningMistake } from '../types';

interface MicroLearningMistakesReviewProps {
  mistakes: MicroLearningMistake[];
  totalQuestions: number;
  documentTitle: string;
  onRetestQuestion?: (questionIndex: number) => void;
  onAskAiTutor?: (question: string, mistake: MicroLearningMistake) => void;
  onRetakeFullQuiz?: () => void;
}

export const MicroLearningMistakesReview: React.FC<MicroLearningMistakesReviewProps> = ({
  mistakes,
  totalQuestions,
  documentTitle,
  onAskAiTutor,
  onRetakeFullQuiz,
}) => {
  // Track interactive in-place flash retest states
  const [remediedQuestions, setRemediedQuestions] = useState<Record<number, boolean>>({});
  const [activeRetestIndex, setActiveRetestIndex] = useState<number | null>(null);
  const [selectedRetestOption, setSelectedRetestOption] = useState<Record<number, number>>({});
  const [retestFeedback, setRetestFeedback] = useState<Record<number, { isCorrect: boolean; message: string }>>({});
  const [activeFilter, setActiveFilter] = useState<'all' | 'unresolved' | 'remedied'>('all');
  const [expandedMistakes, setExpandedMistakes] = useState<Record<number, boolean>>(() => {
    // Expand all by default
    const init: Record<number, boolean> = {};
    mistakes.forEach((m) => {
      init[m.questionIndex] = true;
    });
    return init;
  });

  const toggleExpand = (qIndex: number) => {
    setExpandedMistakes((prev) => ({
      ...prev,
      [qIndex]: !prev[qIndex],
    }));
  };

  const handleFlashRetestOption = (mistake: MicroLearningMistake, optionIdx: number) => {
    setSelectedRetestOption((prev) => ({
      ...prev,
      [mistake.questionIndex]: optionIdx,
    }));

    if (optionIdx === mistake.correctAnswerIndex) {
      setRemediedQuestions((prev) => ({
        ...prev,
        [mistake.questionIndex]: true,
      }));
      setRetestFeedback((prev) => ({
        ...prev,
        [mistake.questionIndex]: {
          isCorrect: true,
          message: 'Excellent! You identified the correct statutory principle. Concept successfully remedied.',
        },
      }));
    } else {
      setRetestFeedback((prev) => ({
        ...prev,
        [mistake.questionIndex]: {
          isCorrect: false,
          message: 'Not quite. Check the 60-Second Micro-Lesson and Rule of Thumb above, then try again.',
        },
      }));
    }
  };

  const handleDownloadStudyNotes = () => {
    const lines = [
      `========================================================================`,
      `MoSPI / iGOT KARMAYOGI - MICRO-LEARNING REMEDIAL MISTAKES DOSSIER`,
      `========================================================================`,
      `Document: ${documentTitle}`,
      `Date Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
      `Total Assessment Questions: ${totalQuestions}`,
      `Mistakes Identified: ${mistakes.length}`,
      `Accuracy: ${Math.round(((totalQuestions - mistakes.length) / totalQuestions) * 100)}%`,
      `\n------------------------------------------------------------------------\n`,
    ];

    mistakes.forEach((m, i) => {
      lines.push(`MISTAKE #${i + 1}: Question ${m.questionIndex + 1} [Competency: ${m.competencyTag}]`);
      lines.push(`Question: ${m.question}`);
      lines.push(`Your Answer (Incorrect): ${m.userAnswerText}`);
      lines.push(`Correct Standard: ${m.correctAnswerText}`);
      lines.push(`\n[WHY THIS MISTAKE HAPPENED (Cognitive Trap)]:`);
      lines.push(`${m.cognitiveTrap}`);
      lines.push(`\n[60-SECOND MICRO-LESSON]:`);
      lines.push(`${m.microLesson}`);
      lines.push(`\n[GOLDEN RULE OF THUMB]:`);
      lines.push(`${m.ruleOfThumb}`);
      lines.push(`\n[MoSPI FIELD / OPERATIONAL APPLICATION]:`);
      lines.push(`${m.mospiApplication}`);
      lines.push(`\nRecommended Micro-Module: ${m.igotMicroModuleTitle || 'iGOT Statistical Capsule'}`);
      lines.push(`------------------------------------------------------------------------\n`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MoSPI_Remedial_Micro_Notes_${documentTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const remediedCount = Object.values(remediedQuestions).filter(Boolean).length;
  const filteredMistakes = mistakes.filter((m) => {
    const isRemedied = !!remediedQuestions[m.questionIndex];
    if (activeFilter === 'unresolved') return !isRemedied;
    if (activeFilter === 'remedied') return isRemedied;
    return true;
  });

  // Zero mistakes scenario (100% Score)
  if (mistakes.length === 0) {
    return (
      <div className="bg-white border border-emerald-300 rounded-xs p-6 shadow-xs space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xs bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-xs border border-emerald-300">
                Flawless Execution
              </span>
              <span className="text-[11px] font-mono text-slate-500">100% Accuracy</span>
            </div>
            <h3 className="font-serif text-lg font-bold text-slate-900 mt-0.5">
              Zero Mistakes Identified in This Assessment
            </h3>
          </div>
        </div>

        <p className="text-xs text-slate-600 font-sans leading-relaxed">
          You demonstrated full conceptual adherence to <strong className="text-slate-900">{documentTitle}</strong>. 
          No remedial micro-lessons are necessary for this module. You can proceed to test another reference document or export your accredited score to your official ledger.
        </p>

        <div className="pt-2 flex items-center space-x-3">
          <button
            type="button"
            onClick={onRetakeFullQuiz}
            className="px-4 py-2 bg-black hover:bg-slate-800 text-white text-xs font-mono font-medium rounded-xs transition-colors cursor-pointer shadow-xs"
          >
            Assess Another Document
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-300 rounded-xs p-6 shadow-xs space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-700" />
              Micro-Learning Forensics
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              {mistakes.length} {mistakes.length === 1 ? 'Deficit' : 'Deficits'} Analyzed
            </span>
          </div>
          <h3 className="font-serif text-xl font-bold text-slate-900">
            Deconstructing Your Assessment Mistakes
          </h3>
          <p className="text-xs text-slate-600 font-sans max-w-2xl leading-relaxed">
            Instead of simply showing what was wrong, each mistake is unpacked below into the 
            <strong> Cognitive Trap</strong> (why officers miss it), a <strong>60-Second Micro-Lesson</strong>, 
            the <strong>Golden Rule of Thumb</strong>, and a <strong>1-Click Flash Retest</strong>.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={handleDownloadStudyNotes}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xs border border-slate-300 text-xs font-mono font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
            title="Download formatted text revision notes"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Study Notes</span>
          </button>
        </div>
      </div>

      {/* Analytics & Progress Ticker */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xs">
          <div className="text-[10px] font-mono text-slate-500 uppercase">Total Questions</div>
          <div className="font-serif text-lg font-bold text-slate-900">{totalQuestions}</div>
        </div>
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xs">
          <div className="text-[10px] font-mono text-rose-700 uppercase">Mistakes Made</div>
          <div className="font-serif text-lg font-bold text-rose-900">{mistakes.length}</div>
        </div>
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xs">
          <div className="text-[10px] font-mono text-emerald-700 uppercase">Flash Remedied</div>
          <div className="font-serif text-lg font-bold text-emerald-900">
            {remediedCount} / {mistakes.length}
          </div>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xs">
          <div className="text-[10px] font-mono text-slate-500 uppercase">Est. Micro-Read</div>
          <div className="font-serif text-lg font-bold text-slate-900">
            ~{mistakes.length * 2} mins
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between pt-1 border-b border-slate-200 pb-3 text-xs font-mono">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 py-1 rounded-xs transition-colors cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-black text-white font-bold'
                : 'text-slate-600 hover:text-black bg-slate-100'
            }`}
          >
            All Mistakes ({mistakes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('unresolved')}
            className={`px-2.5 py-1 rounded-xs transition-colors cursor-pointer ${
              activeFilter === 'unresolved'
                ? 'bg-rose-700 text-white font-bold'
                : 'text-slate-600 hover:text-black bg-slate-100'
            }`}
          >
            Needs Review ({mistakes.length - remediedCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('remedied')}
            className={`px-2.5 py-1 rounded-xs transition-colors cursor-pointer ${
              activeFilter === 'remedied'
                ? 'bg-emerald-700 text-white font-bold'
                : 'text-slate-600 hover:text-black bg-slate-100'
            }`}
          >
            Remedied ({remediedCount})
          </button>
        </div>

        <div className="text-[11px] text-slate-500 hidden sm:block">
          Click any card to toggle expanded insights
        </div>
      </div>

      {/* Mistakes Cards List */}
      <div className="space-y-4">
        {filteredMistakes.map((mistake, idx) => {
          const isRemedied = !!remediedQuestions[mistake.questionIndex];
          const isExpanded = expandedMistakes[mistake.questionIndex] !== false;
          const isRetesting = activeRetestIndex === mistake.questionIndex;
          const feedback = retestFeedback[mistake.questionIndex];

          return (
            <div
              key={mistake.questionIndex}
              className={`border rounded-xs transition-all overflow-hidden ${
                isRemedied
                  ? 'border-emerald-300 bg-emerald-50/20'
                  : 'border-slate-300 bg-white hover:border-slate-400'
              }`}
            >
              {/* Card Header */}
              <div
                onClick={() => toggleExpand(mistake.questionIndex)}
                className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-6 h-6 rounded-xs flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                      isRemedied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    {mistake.questionIndex + 1}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600">
                        Competency: {mistake.competencyTag}
                      </span>
                      {isRemedied ? (
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-mono font-bold rounded-xs flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" /> Concept Remedied
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 text-[9px] font-mono font-bold rounded-xs">
                          Deficit Identified
                        </span>
                      )}
                    </div>
                    <div className="font-serif text-sm font-bold text-slate-900 mt-0.5 line-clamp-1">
                      {mistake.question}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-slate-500">
                  <span className="text-[11px] font-mono flex items-center gap-1 hidden sm:flex">
                    <Clock className="w-3 h-3" />
                    {mistake.remedyReadMinutes || 2}m read
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-700" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-700" />
                  )}
                </div>
              </div>

              {/* Card Body */}
              {isExpanded && (
                <div className="p-5 space-y-5">
                  {/* Full Question Text */}
                  <div>
                    <h4 className="font-serif text-sm sm:text-base font-bold text-slate-900 leading-snug">
                      {mistake.question}
                    </h4>
                  </div>

                  {/* Answer Divergence Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xs space-y-1">
                      <div className="flex items-center space-x-1.5 text-rose-800 font-mono text-[11px] font-bold uppercase">
                        <XCircle className="w-4 h-4 text-rose-600" />
                        <span>What You Answered:</span>
                      </div>
                      <div className="text-xs text-rose-950 font-medium font-sans">
                        {mistake.userAnswerText}
                      </div>
                    </div>

                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xs space-y-1">
                      <div className="flex items-center space-x-1.5 text-emerald-800 font-mono text-[11px] font-bold uppercase">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Official Statutory Standard:</span>
                      </div>
                      <div className="text-xs text-emerald-950 font-bold font-sans">
                        {mistake.correctAnswerText}
                      </div>
                    </div>
                  </div>

                  {/* Micro-Learning Pillar: Cognitive Trap */}
                  <div className="p-3.5 bg-amber-50/70 border-l-3 border-amber-500 rounded-r-xs space-y-1">
                    <div className="flex items-center space-x-1.5 text-amber-900 font-mono text-[11px] font-bold uppercase tracking-wider">
                      <Zap className="w-3.5 h-3.5 text-amber-700" />
                      <span>The Cognitive Trap (Why this mistake is commonly made):</span>
                    </div>
                    <p className="text-xs text-amber-950 leading-relaxed font-sans">
                      {mistake.cognitiveTrap}
                    </p>
                  </div>

                  {/* Micro-Learning Pillar: 60-Second Micro-Lesson */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xs space-y-2">
                    <div className="flex items-center space-x-1.5 text-slate-800 font-mono text-[11px] font-bold uppercase tracking-wider">
                      <BookOpen className="w-3.5 h-3.5 text-black" />
                      <span>60-Second Core Concept Micro-Lesson:</span>
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                      {mistake.microLesson}
                    </p>
                  </div>

                  {/* Micro-Learning Pillar: Rule of Thumb & Field Application */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 bg-slate-900 text-white rounded-xs space-y-1 shadow-xs">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-1">
                        <Flame className="w-3 h-3 text-amber-400" />
                        <span>Golden Rule of Thumb:</span>
                      </div>
                      <p className="text-xs font-serif italic text-slate-100 leading-snug">
                        "{mistake.ruleOfThumb}"
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xs space-y-1">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-slate-600 font-bold flex items-center gap-1">
                        <Bookmark className="w-3 h-3 text-black" />
                        <span>MoSPI Field / Tabulation Impact:</span>
                      </div>
                      <p className="text-xs text-slate-700 font-sans leading-relaxed">
                        {mistake.mospiApplication}
                      </p>
                    </div>
                  </div>

                  {/* INTERACTIVE 1-CLICK FLASH RETEST */}
                  <div className="pt-2 border-t border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1">
                          <RotateCcw className="w-3.5 h-3.5 text-black" />
                          Interactive Flash Retest
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          (Select the correct statutory principle to clear this mistake)
                        </span>
                      </div>

                      {onAskAiTutor && (
                        <button
                          type="button"
                          onClick={() => onAskAiTutor(mistake.question, mistake)}
                          className="px-2.5 py-1 text-slate-700 hover:text-black bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xs text-[10px] font-mono font-medium flex items-center space-x-1 cursor-pointer transition-colors"
                          title="Ask the AI Document Tutor to coach you on this question"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Ask AI Tutor</span>
                        </button>
                      )}
                    </div>

                    {/* Retest Options */}
                    <div className="space-y-1.5">
                      {mistake.options.map((opt, optIdx) => {
                        const isChosenInRetest = selectedRetestOption[mistake.questionIndex] === optIdx;
                        const isOriginalMistake = optIdx === mistake.userAnswerIndex;
                        const isCorrectAnswer = optIdx === mistake.correctAnswerIndex;

                        let optBtnStyle = 'bg-white border-slate-200 hover:border-black text-slate-800';

                        if (selectedRetestOption[mistake.questionIndex] !== undefined) {
                          if (isCorrectAnswer) {
                            optBtnStyle = 'bg-emerald-50 border-emerald-600 text-emerald-950 font-semibold';
                          } else if (isChosenInRetest && !isCorrectAnswer) {
                            optBtnStyle = 'bg-rose-50 border-rose-600 text-rose-950';
                          } else {
                            optBtnStyle = 'bg-slate-50 border-slate-200 text-slate-400 opacity-60';
                          }
                        } else if (isOriginalMistake) {
                          optBtnStyle = 'bg-rose-50/50 border-rose-200 text-rose-900';
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => handleFlashRetestOption(mistake, optIdx)}
                            className={`w-full text-left p-2.5 rounded-xs border text-xs font-sans flex items-start space-x-2.5 transition-colors cursor-pointer ${optBtnStyle}`}
                          >
                            <span className="w-4 h-4 rounded-xs bg-slate-100 border border-slate-300 text-[9px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="flex-1 leading-snug">{opt}</span>
                            {selectedRetestOption[mistake.questionIndex] !== undefined && isCorrectAnswer && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                            )}
                            {selectedRetestOption[mistake.questionIndex] === optIdx && !isCorrectAnswer && (
                              <XCircle className="w-3.5 h-3.5 text-rose-700 shrink-0 mt-0.5" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Retest Instant Feedback */}
                    {feedback && (
                      <div
                        className={`p-3 rounded-xs text-xs font-sans flex items-center space-x-2 ${
                          feedback.isCorrect
                            ? 'bg-emerald-100/70 border border-emerald-300 text-emerald-950 font-medium'
                            : 'bg-rose-100/70 border border-rose-300 text-rose-950'
                        }`}
                      >
                        {feedback.isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                        )}
                        <span>{feedback.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Completion Footnote */}
      <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-600 font-mono">
        <div>
          Remediation Status: <strong className="text-slate-900">{remediedCount} of {mistakes.length}</strong> concepts verified in flash retest.
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleDownloadStudyNotes}
            className="text-slate-700 hover:text-black underline cursor-pointer"
          >
            Export Offline Dossier (.txt)
          </button>
        </div>
      </div>
    </div>
  );
};
