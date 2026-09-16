import React, { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Loader2,
  Award,
  BookOpen,
  FileCode,
  Clock,
  ChevronRight,
  Zap,
  MessageSquare,
  Bot,
  FileCheck2,
  Trash2,
} from 'lucide-react';
import { SAMPLE_DOCUMENTS } from '../data/seedData';
import { MicroLearningMistake, OfficialProfile, QuizAttempt, QuizQuestion } from '../types';
import { saveQuizAttempt } from '../services/storage';
import { AssessmentChatbot } from './AssessmentChatbot';
import { MicroLearningMistakesReview } from './MicroLearningMistakesReview';
import { analyzeQuizMistakes } from '../services/microLearningEngine';

export interface RecalibrationEvent {
  passed: boolean;
  competencyName: string;
  fromLevel: number;
  toLevel: number;
}

interface QuizGeneratorProps {
  profile: OfficialProfile;
  onQuizCompleted: (attempt: QuizAttempt, recalibration?: RecalibrationEvent) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const QuizGenerator: React.FC<QuizGeneratorProps> = ({ profile, onQuizCompleted, onNavigateToTab }) => {
  // Main view tab: 'quiz' | 'chatbot'
  const [activeTab, setActiveTab] = useState<'quiz' | 'chatbot'>('quiz');

  // Input modes: 'sample' | 'paste' | 'upload'
  const [inputMode, setInputMode] = useState<'sample' | 'paste' | 'upload'>('upload');
  const [selectedSampleId, setSelectedSampleId] = useState<string>(SAMPLE_DOCUMENTS[0].id);
  const [pastedText, setPastedText] = useState<string>('');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [fileSizeText, setFileSizeText] = useState<string | null>(null);
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);
  const [uploadedText, setUploadedText] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Active Quiz State
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentDocTitle, setCurrentDocTitle] = useState<string>('');
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [analyzedMistakes, setAnalyzedMistakes] = useState<MicroLearningMistake[]>([]);
  const [isLoadingMistakes, setIsLoadingMistakes] = useState<boolean>(false);
  const [chatbotInitialPrompt, setChatbotInitialPrompt] = useState<string | undefined>(undefined);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Robust File Upload & Drag-and-Drop Handler (Supports PDF & Text)
  const processUploadedFile = (file: File) => {
    if (!file) return;

    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type.includes('pdf');
    const sizeInKb = (file.size / 1024).toFixed(1);
    const sizeText = file.size > 1024 * 1024 
      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` 
      : `${sizeInKb} KB`;

    setUploadedFileName(file.name);
    setFileSizeText(sizeText);
    setCustomTitle(file.name.replace(/\.[^/.]+$/, ''));
    setIsReadingFile(true);
    setGenerationError(null);

    if (isPdf) {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedBase64(reader.result as string);
        setUploadedText(null);
        setIsReadingFile(false);
      };
      reader.onerror = () => {
        setGenerationError('Failed to read PDF file. Please try again.');
        setIsReadingFile(false);
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedText(reader.result as string);
        setUploadedBase64(null);
        setIsReadingFile(false);
      };
      reader.onerror = () => {
        setGenerationError('Failed to read text file.');
        setIsReadingFile(false);
      };
      reader.readAsText(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleClearFile = () => {
    setUploadedFileName(null);
    setFileSizeText(null);
    setUploadedBase64(null);
    setUploadedText(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Helper to obtain current active document data
  const getActiveDocumentInfo = () => {
    if (inputMode === 'sample') {
      const sample = SAMPLE_DOCUMENTS.find((s) => s.id === selectedSampleId);
      return {
        title: sample?.title || 'Official MoSPI Guidelines',
        text: sample?.content || '',
        base64: null,
      };
    } else if (inputMode === 'paste') {
      return {
        title: customTitle.trim() || 'MoSPI Statistical Circular / Notes',
        text: pastedText,
        base64: null,
      };
    } else {
      return {
        title: uploadedFileName || 'Uploaded Statistical Document',
        text: uploadedText || '',
        base64: uploadedBase64,
      };
    }
  };

  // Generate Quiz Trigger
  const handleGenerateQuiz = async () => {
    setIsGenerating(true);
    setGenerationError(null);

    const doc = getActiveDocumentInfo();

    if (inputMode === 'paste' && (!doc.text || doc.text.trim().length < 50)) {
      setGenerationError('Please paste at least 50 characters of document content.');
      setIsGenerating(false);
      return;
    }
    if (inputMode === 'upload' && !doc.text && !doc.base64) {
      setGenerationError('Please select or upload a valid .pdf or .txt file first.');
      setIsGenerating(false);
      return;
    }

    try {
      const response = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: doc.text,
          pdfBase64: doc.base64,
          documentName: doc.title,
          count: 5,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        setCurrentDocTitle(data.documentName || doc.title);
        setActiveQuestionIndex(0);
        setUserAnswers({});
        setQuizSubmitted(false);
        setActiveTab('quiz');
      } else {
        throw new Error('No quiz questions could be generated from this document.');
      }
    } catch (err: any) {
      console.error('Quiz generation error:', err);
      setGenerationError(err.message || 'Failed to generate quiz. Please check your document.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Answer selection handler
  const handleSelectAnswer = (optionIndex: number) => {
    if (userAnswers[activeQuestionIndex] !== undefined) {
      return; // Already answered this question
    }
    setUserAnswers({
      ...userAnswers,
      [activeQuestionIndex]: optionIndex,
    });
  };

  // Complete Quiz & Calculate Score
  const handleFinishQuiz = () => {
    setQuizSubmitted(true);

    let score = 0;
    questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctAnswerIndex) {
        score++;
      }
    });

    const percent = Math.round((score / questions.length) * 100);
    const passed = percent >= 60;

    const attempt: QuizAttempt = {
      id: `attempt-${Date.now()}`,
      userId: profile.id,
      documentTitle: currentDocTitle,
      score,
      totalQuestions: questions.length,
      percentage: percent,
      completedAt: new Date().toISOString(),
      learningHoursEarned: Number(((questions.length * 15) / 60).toFixed(1)), // 15 mins per assessment
    };

    saveQuizAttempt(attempt);

    // Analyze mistakes to synthesize personalized micro-learning lessons
    setIsLoadingMistakes(true);
    analyzeQuizMistakes(currentDocTitle, questions, userAnswers)
      .then((mistakes) => {
        setAnalyzedMistakes(mistakes);
        setIsLoadingMistakes(false);
      })
      .catch((err) => {
        console.warn('Failed to analyze mistakes:', err);
        setIsLoadingMistakes(false);
      });
    
    // Connect Quiz completion to global Learner Competency recalibration
    onQuizCompleted(attempt, {
      passed,
      competencyName: 'Sampling Techniques',
      fromLevel: 2,
      toLevel: passed ? 3 : 2,
    });
  };

  // Prototype Evaluation Shortcuts
  const handleQuickRecalibrateTest = () => {
    const demoQuestions = SAMPLE_DOCUMENTS[0].questions || [];
    setQuestions(demoQuestions);
    setCurrentDocTitle('NSSO Multistage Stratified Sampling Manual');
    const demoAnswers: Record<number, number> = {
      0: 1,
      1: 1,
      2: 1,
      3: 2,
      4: 1,
    };
    setUserAnswers(demoAnswers);
    setQuizSubmitted(true);
    setAnalyzedMistakes([]);

    const attempt: QuizAttempt = {
      id: `attempt-${Date.now()}`,
      userId: profile.id,
      documentTitle: 'NSSO Multistage Stratified Sampling Manual',
      score: 5,
      totalQuestions: 5,
      percentage: 100,
      completedAt: new Date().toISOString(),
      learningHoursEarned: 1.5,
    };
    saveQuizAttempt(attempt);
    onQuizCompleted(attempt, {
      passed: true,
      competencyName: 'Sampling Techniques',
      fromLevel: 2,
      toLevel: 3,
    });
  };

  const handleQuickTestWithMistakes = async () => {
    const fallbackQs: QuizQuestion[] = [
      {
        id: 'q-demo-1',
        question: 'Under SNA 2008 and MoSPI guidelines, how is Real Gross Value Added (GVA) accurately measured under the recommended double deflation methodology?',
        options: [
          'By deflating nominal GVA directly using the aggregate Wholesale Price Index (WPI).',
          'By independently deflating gross output with output deflators and intermediate inputs with input deflators, then taking the difference.',
          'By multiplying current year volume indices by base year Consumer Price Index.',
          'By applying a uniform single deflation rate across both goods and services sectors.'
        ],
        correctAnswerIndex: 1,
        explanation: 'Under double deflation, real GVA is calculated as real gross output (deflated by output price indices) minus real intermediate consumption (deflated by input price indices).',
        competencyTag: 'National Accounts',
      },
      {
        id: 'q-demo-2',
        question: 'In NSSO multi-stage stratified sampling, what units constitute the First Stage Units (FSUs) in rural and urban sectors respectively?',
        options: [
          'Rural: Individual farm holdings; Urban: Municipal municipal wards.',
          'Rural: Census villages; Urban: Urban Frame Survey (UFS) blocks.',
          'Rural: Gram Panchayats; Urban: Pincode zones.',
          'Rural: Block Development Offices; Urban: Commercial census establishments.'
        ],
        correctAnswerIndex: 1,
        explanation: 'NSSO sampling design specifies Census villages as FSUs in rural sector and Urban Frame Survey (UFS) blocks as FSUs in urban sector.',
        competencyTag: 'Sampling Techniques',
      },
      {
        id: 'q-demo-3',
        question: 'According to the National Data Quality Assurance Framework (NDQAF), which quality checkpoint is dedicated to real-time scrutiny rules embedded in CAPI software?',
        options: [
          'Gate 1 (Design Stage)',
          'Gate 2 (Field Collection Stage)',
          'Gate 3 (Processing Stage)',
          'Gate 4 (Dissemination Stage)'
        ],
        correctAnswerIndex: 1,
        explanation: 'Gate 2 enforces field collection quality through real-time CAPI logic checks, skip-validation, geo-fencing, and supervisor re-interview audits.',
        competencyTag: 'Data Quality Frameworks',
      },
      {
        id: 'q-demo-4',
        question: 'Under SNA 2008 and MoSPI accounting classifications, expenditures on Research & Development (R&D) and software database development are classified as:',
        options: [
          'Intermediate consumption by producing industries.',
          'Current transfer payments to research institutes.',
          'Gross Fixed Capital Formation (intellectual property assets).',
          'Non-produced non-financial tangible assets.'
        ],
        correctAnswerIndex: 2,
        explanation: 'SNA 2008 capitalizes R&D and database development as Gross Fixed Capital Formation (Intellectual Property Products).',
        competencyTag: 'National Accounts',
      },
      {
        id: 'q-demo-5',
        question: 'What is the primary purpose of selecting two independent sub-samples (Sub-sample 1 and Sub-sample 2) in NSSO sample surveys?',
        options: [
          'To allow one sub-sample to serve as a backup in case of monsoon delays.',
          'To facilitate non-parametric estimation of sampling errors and variance between estimators.',
          'To compare state government investigators against central government staff.',
          'To reduce printing costs of survey schedules.'
        ],
        correctAnswerIndex: 1,
        explanation: 'Two independent sub-samples are drawn to calculate valid variance estimators and standard errors without requiring restrictive parametric assumptions.',
        competencyTag: 'Sampling Techniques',
      },
    ];

    setQuestions(fallbackQs);
    setCurrentDocTitle('NSSO Multistage Stratified Sampling Manual');
    // Deliberate mistakes on Question 2 (index 1) and Question 5 (index 4)
    const deliberateAnswers: Record<number, number> = {
      0: 1, // Correct
      1: 0, // Mistake! (Selected farm holdings instead of Census villages)
      2: 1, // Correct
      3: 2, // Correct
      4: 0, // Mistake! (Selected backup instead of variance estimation)
    };
    setUserAnswers(deliberateAnswers);
    setQuizSubmitted(true);
    setActiveTab('quiz');

    setIsLoadingMistakes(true);
    const mistakes = await analyzeQuizMistakes(
      'NSSO Multistage Stratified Sampling Manual',
      fallbackQs,
      deliberateAnswers
    );
    setAnalyzedMistakes(mistakes);
    setIsLoadingMistakes(false);

    const attempt: QuizAttempt = {
      id: `attempt-${Date.now()}`,
      userId: profile.id,
      documentTitle: 'NSSO Multistage Stratified Sampling Manual',
      score: 3,
      totalQuestions: 5,
      percentage: 60,
      completedAt: new Date().toISOString(),
      learningHoursEarned: 1.5,
    };
    saveQuizAttempt(attempt);
    onQuizCompleted(attempt, {
      passed: true,
      competencyName: 'Sampling Techniques',
      fromLevel: 2,
      toLevel: 3,
    });
  };

  const handleResetQuiz = () => {
    setQuestions([]);
    setUserAnswers({});
    setQuizSubmitted(false);
    setAnalyzedMistakes([]);
    setIsLoadingMistakes(false);
    setActiveQuestionIndex(0);
  };

  const currentQ = questions[activeQuestionIndex];
  const answeredCount = Object.keys(userAnswers).length;
  const isCurrentAnswered = userAnswers[activeQuestionIndex] !== undefined;
  const activeDocInfo = getActiveDocumentInfo();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Hero Banner */}
      <div className="bg-white border border-slate-200 rounded-xs p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-semibold text-slate-700 uppercase tracking-widest mb-1 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-black" />
              <span>MoSPI Document Intelligence &amp; Verification Suite</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Assessment &amp; Document AI Chatbot
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed font-sans">
              Upload any official MoSPI survey manual, national accounts circular, or statistical guideline to test yourself via interactive oral AI examination or take certified statutory MCQ assessments.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-800 bg-slate-100 px-3.5 py-2 rounded-xs border border-slate-300 font-mono shrink-0">
            <Award className="w-4 h-4 text-black" />
            <span>Earns +1.5 iGOT accredited learning hours upon completion</span>
          </div>
        </div>

        {/* Interactive Mode Switcher Pill */}
        <div className="mt-5 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex rounded-xs p-1 bg-slate-100 border border-slate-300">
            <button
              type="button"
              onClick={() => setActiveTab('quiz')}
              className={`px-4 py-1.5 rounded-xs text-xs font-mono font-medium flex items-center space-x-2 transition-all cursor-pointer ${
                activeTab === 'quiz'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-slate-600 hover:text-black'
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>1. Statutory MCQ Assessment</span>
              {questions.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-white text-black text-[10px] rounded-xs font-bold">
                  {questions.length} Qs
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('chatbot')}
              className={`px-4 py-1.5 rounded-xs text-xs font-mono font-medium flex items-center space-x-2 transition-all cursor-pointer ${
                activeTab === 'chatbot'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-slate-600 hover:text-black'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>2. AI Document Assessment Chatbot</span>
              <span className="ml-1 px-1.5 py-0.2 bg-emerald-600 text-white text-[10px] rounded-xs font-bold">
                Live
              </span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span>Dual Processing: PDF Extraction &amp; Multimodal Gemini Cascade</span>
          </div>
        </div>
      </div>

      {/* PROTOTYPE CLOSED-LOOP EVALUATION BANNER */}
      <div className="p-3.5 bg-slate-50 border border-slate-300 rounded-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
        <div className="flex items-center space-x-2.5 text-xs text-slate-800">
          <div className="w-6 h-6 rounded-xs bg-black text-white flex items-center justify-center shrink-0">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <span className="font-serif font-bold text-slate-900">Prototype Closed-Loop Evaluation:</span>
            <span className="text-slate-600 block sm:inline sm:ml-1">
              Verify real-time competency recalibration of <strong>"Sampling Techniques"</strong> (Level 2 → 3) updating the Radar Chart &amp; iGOT pathways.
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleQuickRecalibrateTest}
          className="px-3 py-1.5 bg-black hover:bg-slate-800 text-white font-mono text-[10px] font-bold uppercase rounded-xs transition-colors cursor-pointer shadow-xs shrink-0 whitespace-nowrap"
        >
          ⚡ Instant Pass &amp; Recalibrate (Level 2 → 3)
        </button>
      </div>

      {/* Unified Document Selector Card (Always Accessible) */}
      <div className="bg-white border border-slate-200 rounded-xs p-6 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
          <div>
            <label className="block font-semibold text-slate-900 font-mono uppercase tracking-wider text-[11px]">
              Step 1: Select or Upload Reference Document
            </label>
            <p className="text-[11px] text-slate-500 font-sans">
              This document serves as the ground-truth for both the MCQ generator and the AI Assessment Chatbot.
            </p>
          </div>

          {uploadedFileName && (
            <div className="flex items-center space-x-2 bg-slate-100 px-2.5 py-1 rounded-xs border border-slate-300 text-xs font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span className="font-bold text-slate-800 truncate max-w-xs">{uploadedFileName}</span>
              <button
                type="button"
                onClick={handleClearFile}
                className="text-slate-400 hover:text-rose-600 ml-1"
                title="Remove file"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Method Selection Tabs */}
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setInputMode('upload')}
              className={`p-3.5 rounded-xs border text-left transition-colors cursor-pointer ${
                inputMode === 'upload'
                  ? 'bg-black border-black text-white'
                  : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-400'
              }`}
            >
              <Upload className={`w-5 h-5 mb-1.5 ${inputMode === 'upload' ? 'text-white' : 'text-slate-900'}`} />
              <div className={`font-serif text-xs font-bold ${inputMode === 'upload' ? 'text-white' : 'text-slate-900'}`}>
                Upload File (.pdf / .txt)
              </div>
              <div className={`text-[11px] mt-0.5 font-sans ${inputMode === 'upload' ? 'text-slate-300' : 'text-slate-500'}`}>
                Attach survey manual or PDF circular
              </div>
            </button>

            <button
              type="button"
              onClick={() => setInputMode('sample')}
              className={`p-3.5 rounded-xs border text-left transition-colors cursor-pointer ${
                inputMode === 'sample'
                  ? 'bg-black border-black text-white'
                  : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-400'
              }`}
            >
              <BookOpen className={`w-5 h-5 mb-1.5 ${inputMode === 'sample' ? 'text-white' : 'text-slate-900'}`} />
              <div className={`font-serif text-xs font-bold ${inputMode === 'sample' ? 'text-white' : 'text-slate-900'}`}>
                Pre-Loaded MoSPI Docs
              </div>
              <div className={`text-[11px] mt-0.5 font-sans ${inputMode === 'sample' ? 'text-slate-300' : 'text-slate-500'}`}>
                SNA 2008, NSSO Sampling, NDQAF
              </div>
            </button>

            <button
              type="button"
              onClick={() => setInputMode('paste')}
              className={`p-3.5 rounded-xs border text-left transition-colors cursor-pointer ${
                inputMode === 'paste'
                  ? 'bg-black border-black text-white'
                  : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-400'
              }`}
            >
              <FileCode className={`w-5 h-5 mb-1.5 ${inputMode === 'paste' ? 'text-white' : 'text-slate-900'}`} />
              <div className={`font-serif text-xs font-bold ${inputMode === 'paste' ? 'text-white' : 'text-slate-900'}`}>
                Paste Circular / Text
              </div>
              <div className={`text-[11px] mt-0.5 font-sans ${inputMode === 'paste' ? 'text-slate-300' : 'text-slate-500'}`}>
                Paste excerpt, concept note, or guidelines
              </div>
            </button>
          </div>
        </div>

        {/* Option 1: Upload File (PDF / Text) with Drag & Drop */}
        {inputMode === 'upload' && (
          <div className="space-y-3">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xs p-8 text-center cursor-pointer transition-all ${
                isDragOver
                  ? 'border-black bg-slate-100 scale-[1.01]'
                  : 'border-slate-300 hover:border-black bg-slate-50/70'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,.txt,application/pdf,text/plain"
                className="hidden"
              />

              {isReadingFile ? (
                <div className="space-y-2 py-3">
                  <Loader2 className="w-8 h-8 animate-spin text-black mx-auto" />
                  <p className="font-serif text-xs font-bold text-slate-900">
                    Extracting &amp; Validating Document Structure...
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">Parsing PDF pages for assessment</p>
                </div>
              ) : uploadedFileName ? (
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xs bg-black text-white flex items-center justify-center mx-auto shadow-xs">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 font-mono flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{uploadedFileName}</span>
                    </p>
                    <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                      {fileSizeText || 'Ready'} • PDF text parsing armed &amp; verified
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-400 font-sans">
                    Click to replace or drag a different file here
                  </p>
                </div>
              ) : (
                <div className="space-y-2 py-2">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="font-serif text-xs font-semibold text-slate-900">
                    Click to upload or drag and drop official statistical document
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Supports <strong>.pdf</strong> and <strong>.txt</strong> files (National Accounts, NSSO, CPI, IIP, Census)
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Option 2: Pre-loaded MoSPI Documents */}
        {inputMode === 'sample' && (
          <div className="space-y-3">
            <label className="block font-semibold text-slate-700 font-mono uppercase tracking-wider text-[11px]">
              Choose Official Statistical Reference:
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {SAMPLE_DOCUMENTS.map((doc) => {
                const isSelected = selectedSampleId === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedSampleId(doc.id)}
                    className={`p-4 rounded-xs border cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-slate-50 border-black ring-1 ring-black'
                        : 'bg-white border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="px-2 py-0.5 rounded-xs text-[9px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-300">
                        {doc.competencyTag}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-black" />
                      )}
                    </div>
                    <h4 className="font-serif text-xs font-bold text-slate-900 leading-snug">
                      {doc.title}
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-1 line-clamp-3 leading-relaxed font-sans">
                      {doc.subtitle || doc.category}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Option 3: Paste Text */}
        {inputMode === 'paste' && (
          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 font-mono uppercase tracking-wider text-[11px]">
                Document Title / Reference:
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g. MoSPI Circular on Base Year Revision for CPI 2024"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xs text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-black font-sans"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 font-mono uppercase tracking-wider text-[11px]">
                Paste Document Text / Excerpt:
              </label>
              <textarea
                rows={5}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste official methodology notes, sampling instructions, survey schedules, or guidelines..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xs text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-black font-mono text-[11px]"
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {generationError && (
          <div className="p-3 bg-rose-50 border border-rose-300 text-rose-900 rounded-xs text-xs flex items-center space-x-2 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-700" />
            <span>{generationError}</span>
          </div>
        )}

        {/* Quick Launch Actions Bar */}
        <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-[11px] text-slate-500 font-mono">
            Target Reference: <strong className="text-slate-900">{activeDocInfo.title}</strong>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('chatbot')}
              className={`px-4 py-2 rounded-xs text-[11px] font-mono font-medium flex items-center space-x-1.5 transition-colors cursor-pointer border ${
                activeTab === 'chatbot'
                  ? 'bg-slate-100 text-slate-900 border-slate-400'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-black'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Open AI Chatbot</span>
            </button>

            <button
              type="button"
              onClick={handleGenerateQuiz}
              disabled={isGenerating || isReadingFile}
              className="px-5 py-2 bg-black hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xs text-[11px] font-medium tracking-wide uppercase flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-xs font-mono"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Synthesizing MCQs from PDF...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                  <span>Generate Assessment Quiz</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: AI ASSESSMENT CHATBOT */}
      {activeTab === 'chatbot' && (
        <AssessmentChatbot
          documentTitle={activeDocInfo.title}
          documentText={activeDocInfo.text}
          pdfBase64={activeDocInfo.base64}
          profile={profile}
          onSwitchToQuiz={handleGenerateQuiz}
        />
      )}

      {/* VIEW 2: STATUTORY MCQ ASSESSMENT */}
      {activeTab === 'quiz' && (
        <div>
          {questions.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xs p-10 text-center space-y-4">
              <div className="w-12 h-12 rounded-xs bg-black text-white flex items-center justify-center mx-auto shadow-xs">
                <FileCheck2 className="w-6 h-6 text-white" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="font-serif text-base font-bold text-slate-900">
                  Ready to Take Assessment
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-sans">
                  Click <strong>"Generate Assessment Quiz"</strong> above to extract conceptual MCQs from{' '}
                  <span className="font-semibold text-slate-900">{activeDocInfo.title}</span>, or switch to the{' '}
                  <strong>AI Document Assessment Chatbot</strong> for an oral interactive examination.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center space-x-3">
                <button
                  type="button"
                  onClick={handleGenerateQuiz}
                  disabled={isGenerating || isReadingFile}
                  className="px-6 py-2.5 bg-black hover:bg-slate-800 disabled:bg-slate-300 text-white font-mono text-xs font-semibold rounded-xs transition-colors cursor-pointer shadow-xs flex items-center space-x-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Generating Assessment Questions...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-white" />
                      <span>Generate 5 Questions</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('chatbot')}
                  className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 font-mono text-xs font-medium rounded-xs border border-slate-300 transition-colors cursor-pointer"
                >
                  Chat with PDF First
                </button>
              </div>
            </div>
          ) : (
            /* Active Interactive Quiz Runner */
            <div className="bg-white border border-slate-200 rounded-xs p-6 shadow-xs space-y-6">
              {/* Quiz Top Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest font-mono">
                    Official Assessment Ledger
                  </div>
                  <h2 className="font-serif text-base font-bold text-slate-900 leading-snug">
                    {currentDocTitle}
                  </h2>
                </div>

                <div className="flex items-center space-x-3 font-mono">
                  <div className="text-xs text-slate-600">
                    Question <strong className="text-slate-900">{activeQuestionIndex + 1}</strong> of{' '}
                    <strong className="text-slate-900">{questions.length}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetQuiz}
                    className="px-2.5 py-1 text-slate-700 hover:text-black rounded-xs border border-slate-300 bg-slate-50 text-xs flex items-center space-x-1 cursor-pointer transition-colors"
                    title="Select another document"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Change Doc</span>
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-1.5 rounded-xs overflow-hidden">
                <div
                  className="bg-black h-full transition-all duration-300"
                  style={{ width: `${((activeQuestionIndex + 1) / questions.length) * 100}%` }}
                />
              </div>

              {/* If Quiz Completed: Score Summary Screen */}
              {quizSubmitted ? (
                <div className="p-8 bg-slate-50 border border-slate-200 rounded-xs text-center space-y-6">
                  <div className="w-14 h-14 rounded-xs bg-black text-white flex items-center justify-center mx-auto shadow-xs">
                    <Award className="w-7 h-7 text-white" />
                  </div>

                  <div className="space-y-1">
                    <span className="px-2.5 py-1 rounded-xs text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 uppercase tracking-widest">
                      Statutory Evaluation Complete
                    </span>
                    <h3 className="font-serif text-2xl font-bold text-slate-900 pt-2">
                      Assessment Ledger Certified
                    </h3>
                    <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed font-sans">
                      Your performance on <strong className="text-slate-900">{currentDocTitle}</strong> has been logged in the official MoSPI Competency Ledger.
                    </p>
                  </div>

                  {/* Score Badges */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
                    <div className="p-3 bg-white rounded-xs border border-slate-200 text-center">
                      <div className="text-[10px] font-mono text-slate-500 uppercase">Score</div>
                      <div className="font-serif text-xl font-bold text-slate-900">
                        {Object.values(userAnswers).filter((ans, idx) => ans === questions[idx]?.correctAnswerIndex).length} / {questions.length}
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-xs border border-slate-200 text-center">
                      <div className="text-[10px] font-mono text-slate-500 uppercase">Percentage</div>
                      <div className="font-serif text-xl font-bold text-slate-900">
                        {Math.round((Object.values(userAnswers).filter((ans, idx) => ans === questions[idx]?.correctAnswerIndex).length / questions.length) * 100)}%
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-xs border border-slate-200 text-center">
                      <div className="text-[10px] font-mono text-slate-500 uppercase">iGOT Credit</div>
                      <div className="font-serif text-xl font-bold text-slate-900">
                        +1.5 Hours
                      </div>
                    </div>
                  </div>

                  {/* Recalibration Notice */}
                  <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xs text-left max-w-lg mx-auto flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-950 space-y-1 font-sans">
                      <div className="font-semibold font-serif">Competency Recalibration Attested</div>
                      <p className="leading-relaxed">
                        Competency <strong>Sampling Techniques</strong> has been recalibrated from <strong>Level 2 → Level 3</strong> across your Radar Profile and iGOT learning pathway.
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setUserAnswers({});
                        setQuizSubmitted(false);
                        setActiveQuestionIndex(0);
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 text-[11px] font-medium tracking-wide uppercase rounded-xs border border-slate-300 transition-colors cursor-pointer font-mono"
                    >
                      Retake Assessment
                    </button>
                    <button
                      type="button"
                      onClick={handleResetQuiz}
                      className="px-4 py-2 bg-black hover:bg-slate-800 text-white text-[11px] font-medium tracking-wide uppercase rounded-xs transition-colors cursor-pointer shadow-xs font-mono"
                    >
                      Assess Another Reference
                    </button>
                  </div>
                </div>
              ) : (
                /* Active Question Card */
                <div className="space-y-6">
                  {/* Question Text */}
                  <div className="space-y-2">
                    <div className="inline-block px-2 py-0.5 rounded-xs text-[9px] font-mono font-semibold bg-slate-100 text-slate-800 border border-slate-300 uppercase tracking-wider">
                      Competency: {currentQ.competencyTag}
                    </div>
                    <h3 className="font-serif text-base sm:text-lg font-bold text-slate-900 leading-snug">
                      {currentQ.question}
                    </h3>
                  </div>

                  {/* Options */}
                  <div className="space-y-2.5">
                    {currentQ.options.map((option, optIdx) => {
                      const isSelected = userAnswers[activeQuestionIndex] === optIdx;
                      const isCorrect = optIdx === currentQ.correctAnswerIndex;

                      let optionStyle = 'bg-white border-slate-200 hover:border-black text-slate-800';

                      if (isCurrentAnswered) {
                        if (isCorrect) {
                          optionStyle = 'bg-emerald-50 border-emerald-600 text-emerald-950 font-semibold';
                        } else if (isSelected && !isCorrect) {
                          optionStyle = 'bg-rose-50 border-rose-600 text-rose-950';
                        } else {
                          optionStyle = 'bg-slate-50 border-slate-200 text-slate-400 opacity-60';
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          disabled={isCurrentAnswered}
                          onClick={() => handleSelectAnswer(optIdx)}
                          className={`w-full text-left p-3.5 rounded-xs border text-xs transition-colors flex items-start space-x-3 cursor-pointer ${optionStyle}`}
                        >
                          <span className="w-5 h-5 rounded-xs bg-slate-100 border border-slate-300 text-slate-800 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="flex-1 leading-relaxed font-sans">{option}</span>
                          {isCurrentAnswered && isCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                          )}
                          {isCurrentAnswered && isSelected && !isCorrect && (
                            <XCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Instant Explanation Box (Reveals after answer selected) */}
                  {isCurrentAnswered && (
                    <div className="p-4 rounded-xs bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5">
                      <div className="font-serif font-semibold text-slate-900 flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4 text-black" />
                        <span>Official Context &amp; Statutory Guidance:</span>
                      </div>
                      <p className="text-[11px] text-slate-700 leading-relaxed font-sans">
                        {currentQ.explanation}
                      </p>
                    </div>
                  )}

                  {/* Navigation Controls */}
                  <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                    <button
                      type="button"
                      disabled={activeQuestionIndex === 0}
                      onClick={() => setActiveQuestionIndex(activeQuestionIndex - 1)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 rounded-xs text-[11px] font-mono border border-slate-300 cursor-pointer"
                    >
                      Previous
                    </button>

                    {activeQuestionIndex < questions.length - 1 ? (
                      <button
                        type="button"
                        disabled={!isCurrentAnswered}
                        onClick={() => setActiveQuestionIndex(activeQuestionIndex + 1)}
                        className="px-4 py-2 bg-black hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xs text-[11px] font-medium tracking-wide uppercase flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs font-mono"
                      >
                        <span>Next Question</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={answeredCount < questions.length}
                        onClick={handleFinishQuiz}
                        className="px-5 py-2 bg-black hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xs text-[11px] font-medium tracking-wide uppercase flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs font-mono"
                      >
                        <span>Attest &amp; Submit Score</span>
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
