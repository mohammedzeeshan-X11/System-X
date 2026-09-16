import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  Clock,
  Award,
  CheckCircle2,
  Search,
  Filter,
  ExternalLink,
  Loader2,
  Building,
  Check,
  Zap,
  TrendingUp,
  RotateCcw,
  Star,
  Printer,
  ChevronRight,
  Layers,
  Tag,
  Briefcase,
  Play,
  Sliders,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import {
  Course,
  CourseProgressStatus,
  CourseRecommendation,
  OfficialProfile,
  UserCompetencyScores,
  UserCourseProgress,
} from '../types';
import {
  enrollCourseInStorage,
  getAllUserCourseProgress,
  saveUserCourseProgress,
} from '../services/storage';
import { CertificateModal } from './CertificateModal';
import { CourseRatingModal } from './CourseRatingModal';
import { COMPETENCY_FRAMEWORK } from '../data/seedData';

interface CourseRecommendationsProps {
  profile: OfficialProfile;
  competencyScores: UserCompetencyScores | null;
  onProfileUpdated: (updatedProfile: OfficialProfile) => void;
  initialFocusGap?: string;
  onNavigateToCompetencies?: () => void;
}

export const CourseRecommendations: React.FC<CourseRecommendationsProps> = ({
  profile,
  competencyScores,
  onProfileUpdated,
  initialFocusGap,
  onNavigateToCompetencies,
}) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [recommendations, setRecommendations] = useState<CourseRecommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState<boolean>(false);

  // Multi-Lens Discovery Tabs
  type DiscoveryLens = 'for-you' | 'by-topic' | 'by-competency' | 'by-provider' | 'my-learning';
  const [activeLens, setActiveLens] = useState<DiscoveryLens>('for-you');

  // Lens Filters
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [selectedCompetency, setSelectedCompetency] = useState<string>('All');
  const [selectedProvider, setSelectedProvider] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>(initialFocusGap || '');

  // Course Progress & Lifecycle State
  const [courseProgressMap, setCourseProgressMap] = useState<Record<string, UserCourseProgress>>({});
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal states
  const [certModalOpen, setCertModalOpen] = useState<boolean>(false);
  const [activeCertProgress, setActiveCertProgress] = useState<UserCourseProgress | null>(null);

  const [ratingModalOpen, setRatingModalOpen] = useState<boolean>(false);
  const [ratingCourse, setRatingCourse] = useState<Course | null>(null);

  // Algorithm Weights Tuner State
  const [isTunerOpen, setIsTunerOpen] = useState<boolean>(true);
  const [skillGapWeight, setSkillGapWeight] = useState<number>(75); // 0 - 100%
  const [strategicBoostWeight, setStrategicBoostWeight] = useState<number>(50); // 0 - 100%
  const [peerCompletionWeight, setPeerCompletionWeight] = useState<number>(40); // 0 - 100%

  // Load courses
  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await fetch('/api/igot/courses');
        const data = await res.json();
        if (data.courses) {
          setCourses(data.courses);
        }
      } catch (err) {
        console.error('Failed to load courses from API:', err);
      }
    }
    loadCatalog();
  }, []);

  // Load user progress map
  useEffect(() => {
    const map = getAllUserCourseProgress(profile.id);
    setCourseProgressMap(map);
  }, [profile.id]);

  // Fetch AI Recommendations via Gemini
  useEffect(() => {
    async function fetchAIRecommendations() {
      if (!competencyScores) return;

      setLoadingRecs(true);
      const unresolvedGaps = [...(competencyScores.scores || [])]
        .filter((s) => s.gap > 0)
        .sort((a, b) => b.gap - a.gap);

      if (unresolvedGaps.length === 0) {
        setRecommendations([]);
        setLoadingRecs(false);
        return;
      }

      try {
        const res = await fetch('/api/courses/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile,
            scores: unresolvedGaps,
            topGaps: unresolvedGaps,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.recommendations) {
            setRecommendations(data.recommendations);
          }
        }
      } catch (err) {
        console.error('Failed to fetch recommendations:', err);
      } finally {
        setLoadingRecs(false);
      }
    }

    fetchAIRecommendations();
  }, [profile.id, competencyScores?.evaluatedAt]);

  // Handle Enrollment
  const handleEnroll = async (course: Course) => {
    setEnrollingId(course.id);
    try {
      await fetch('/api/igot/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.id,
          courseId: course.id,
        }),
      });

      // Update storage
      const updatedProfile = enrollCourseInStorage(profile.id, course.id, course.durationHours);
      onProfileUpdated(updatedProfile);

      // Initialize progress
      const progress: UserCourseProgress = {
        courseId: course.id,
        userId: profile.id,
        status: 'Enrolled',
        enrolledAt: new Date().toISOString(),
        progressPercentage: 15,
      };
      saveUserCourseProgress(progress);
      setCourseProgressMap((prev) => ({ ...prev, [course.id]: progress }));

      setToastMessage(`Enrolled in "${course.title}". Added to your iGOT Karmayogi learning passport!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Enrollment error:', err);
    } finally {
      setEnrollingId(null);
    }
  };

  // Start Course (Enrolled -> In Progress)
  const handleStartCourse = (course: Course) => {
    const existing = courseProgressMap[course.id];
    const progress: UserCourseProgress = {
      courseId: course.id,
      userId: profile.id,
      status: 'In Progress',
      enrolledAt: existing?.enrolledAt || new Date().toISOString(),
      startedAt: new Date().toISOString(),
      progressPercentage: Math.max(existing?.progressPercentage || 0, 45),
    };
    saveUserCourseProgress(progress);
    setCourseProgressMap((prev) => ({ ...prev, [course.id]: progress }));

    setToastMessage(`Started learning "${course.title}". Status updated to "In Progress".`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Complete Course (In Progress -> Completed)
  const handleCompleteCourse = (course: Course) => {
    const certificateId = `IGOT-MOSPI-${new Date().getFullYear()}-${course.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}-${profile.employeeId ? profile.employeeId.slice(-4) : '9912'}`;
    const progress: UserCourseProgress = {
      courseId: course.id,
      userId: profile.id,
      status: 'Completed',
      enrolledAt: courseProgressMap[course.id]?.enrolledAt || new Date().toISOString(),
      startedAt: courseProgressMap[course.id]?.startedAt || new Date().toISOString(),
      completedAt: new Date().toISOString(),
      progressPercentage: 100,
      certificateId,
      rating: courseProgressMap[course.id]?.rating,
      review: courseProgressMap[course.id]?.review,
    };

    saveUserCourseProgress(progress);
    setCourseProgressMap((prev) => ({ ...prev, [course.id]: progress }));

    // Credit hours
    const updated = enrollCourseInStorage(profile.id, course.id, course.durationHours);
    onProfileUpdated(updated);

    setToastMessage(`Congratulations! Completed "${course.title}". Certificate generated!`);
    setTimeout(() => setToastMessage(null), 4000);

    // Prompt for rating
    setRatingCourse(course);
    setRatingModalOpen(true);
  };

  // Start Again (Completed -> In Progress)
  const handleStartAgain = (course: Course) => {
    const existing = courseProgressMap[course.id];
    const progress: UserCourseProgress = {
      ...existing,
      courseId: course.id,
      userId: profile.id,
      status: 'In Progress',
      startedAt: new Date().toISOString(),
      progressPercentage: 10,
    };
    saveUserCourseProgress(progress);
    setCourseProgressMap((prev) => ({ ...prev, [course.id]: progress }));

    setToastMessage(`Course "${course.title}" restarted.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Submit Rating
  const handleSaveRating = (rating: number, review?: string) => {
    if (!ratingCourse) return;
    const existing = courseProgressMap[ratingCourse.id];
    if (existing) {
      const updated: UserCourseProgress = {
        ...existing,
        rating,
        review,
      };
      saveUserCourseProgress(updated);
      setCourseProgressMap((prev) => ({ ...prev, [ratingCourse.id]: updated }));
      setToastMessage(`Thank you for rating "${ratingCourse.title}"!`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleOpenCertificate = (course: Course) => {
    const prog = courseProgressMap[course.id];
    if (prog) {
      setActiveCertProgress(prog);
      setCertModalOpen(true);
    }
  };

  // Helper to get effective status
  const getCourseStatus = (courseId: string): CourseProgressStatus => {
    const prog = courseProgressMap[courseId];
    if (prog) return prog.status;
    if (profile.enrolledCourseIds?.includes(courseId)) return 'In Progress';
    return 'Not Started';
  };

  // Desired Competencies Courses (Lane 2: Grow your career)
  const desiredCompetencies = profile.desiredCompetencies || [];
  const desiredNames = new Set(desiredCompetencies.map((d) => d.competencyName.toLowerCase()));

  const careerGrowthCourses = courses.filter((c) =>
    c.targetCompetencies.some((tc) => desiredNames.has(tc.toLowerCase()))
  );

  // Multi-Lens Filtered Catalogue
  const filteredCatalogue = courses.filter((c) => {
    // Lens filters
    if (activeLens === 'by-topic') {
      if (selectedTopic !== 'All' && c.domain !== selectedTopic) return false;
    } else if (activeLens === 'by-competency') {
      if (
        selectedCompetency !== 'All' &&
        !c.targetCompetencies.some(
          (t) => t.toLowerCase() === selectedCompetency.toLowerCase()
        )
      ) {
        return false;
      }
    } else if (activeLens === 'by-provider') {
      if (selectedProvider !== 'All' && c.source !== selectedProvider) return false;
    } else if (activeLens === 'my-learning') {
      const status = getCourseStatus(c.id);
      if (status === 'Not Started') return false;
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchDesc = c.description.toLowerCase().includes(q);
      const matchComp = c.targetCompetencies.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchComp) return false;
    }

    return true;
  });

  // Extract all distinct competency tags from courses
  const allCompetencyTags = Array.from(
    new Set(courses.flatMap((c) => c.targetCompetencies))
  ).sort();

  // Active Enrolled and Completed counts
  const progressList = Object.values(courseProgressMap) as UserCourseProgress[];
  const completedCount = progressList.filter((p) => p.status === 'Completed').length;
  const inProgressCount = progressList.filter(
    (p) => p.status === 'In Progress' || p.status === 'Enrolled'
  ).length;

  // Dynamic course attribution & scoring using the interactive algorithm weights
  const computeCourseAttribution = (
    course: Course,
    rec?: CourseRecommendation
  ) => {
    const officialScores = competencyScores?.scores || [];
    let maxGap = 0;
    let matchingCompetency = course.targetCompetencies[0] || 'General Statistical Framework';
    let evaluatedLevel = 2;
    let mandatedLevel = 4;

    for (const tag of course.targetCompetencies) {
      const match = officialScores.find(
        (s) =>
          s.competencyName.toLowerCase().includes(tag.toLowerCase()) ||
          tag.toLowerCase().includes(s.competencyName.toLowerCase())
      );
      if (match && match.gap > maxGap) {
        maxGap = match.gap;
        matchingCompetency = match.competencyName;
        evaluatedLevel = match.currentLevel >= 75 ? 3 : match.currentLevel >= 50 ? 2 : 1;
        mandatedLevel = match.targetLevel >= 85 ? 4 : 3;
      }
    }

    // Normalized gap score (0-100)
    const gapFactor = maxGap > 0 ? Math.min(100, Math.round(30 + (maxGap / 40) * 70)) : 25;
    const gapDelta = maxGap > 0 ? -maxGap : 0;

    // MoSPI Strategic Boost Factor (0-100)
    const flagshipTags = [
      'sampling',
      'national accounts',
      'price statistics',
      'labour statistics',
      'data quality',
      'industrial statistics',
      'survey design',
    ];
    const hasFlagship = course.targetCompetencies.some((tag) =>
      flagshipTags.some(
        (f) => tag.toLowerCase().includes(f) || course.title.toLowerCase().includes(f)
      )
    );
    const isNsstaTpac = course.source === 'NSSTA TPAC';
    const strategicFactor = (hasFlagship ? 55 : 25) + (isNsstaTpac ? 40 : 20);

    // Peer Cadre Completion Rate Factor (0-100)
    const ratingContribution = (course.rating / 5) * 55;
    const enrollmentContribution = Math.min(45, (course.enrolledCount / 2800) * 45);
    const peerFactor = Math.round(ratingContribution + enrollmentContribution);

    // Composite Weighted Score
    const totalWeight = skillGapWeight + strategicBoostWeight + peerCompletionWeight;
    const rawWeighted =
      totalWeight > 0
        ? (skillGapWeight * gapFactor +
            strategicBoostWeight * strategicFactor +
            peerCompletionWeight * peerFactor) /
          totalWeight
        : 50;
    const compositeScore = Math.min(99, Math.max(35, Math.round(rawWeighted)));

    // Role alignment text
    const roleName = profile.assignmentTitle || profile.designation;
    const roleAlignment = `Mapped to official FRAC role: ${roleName} (${profile.department})`;

    // Rationale text
    let rationaleText = rec?.aiReason || '';
    if (!rationaleText) {
      if (maxGap > 0) {
        rationaleText = `Assigned priority to resolve statutory deficit in ${matchingCompetency} (${gapDelta} pts delta) mandated for current cadre deployment.`;
      } else if (hasFlagship) {
        rationaleText = `Recommended under MoSPI Strategic Capacity Building Directive for ${matchingCompetency} methodologies.`;
      } else {
        rationaleText = `Selected based on high peer cadre completion rate (${course.enrolledCount} officers, ${course.rating}★) across Ministry divisions.`;
      }
    }

    if (matchingCompetency.toLowerCase().includes('sampling') && evaluatedLevel >= 3) {
      rationaleText = `Recalibrated to Level 3 (Advanced) following verified statutory quiz assessment. Re-indexed for advanced mastery and survey leadership.`;
    }

    return {
      compositeScore,
      gapFactor,
      strategicFactor,
      peerFactor,
      targetedCompetency: matchingCompetency,
      evaluatedLevel,
      mandatedLevel,
      gapDelta,
      roleAlignment,
      rationaleText,
    };
  };

  // Dynamically re-sort course lists based on current tuner slider values
  const sortedRecommendations = [...recommendations].sort((a, b) => {
    const scoreA = computeCourseAttribution(a.course, a).compositeScore;
    const scoreB = computeCourseAttribution(b.course, b).compositeScore;
    return scoreB - scoreA;
  });

  const sortedCareerGrowthCourses = [...careerGrowthCourses].sort((a, b) => {
    const scoreA = computeCourseAttribution(a).compositeScore;
    const scoreB = computeCourseAttribution(b).compositeScore;
    return scoreB - scoreA;
  });

  const sortedCatalogue = [...filteredCatalogue].sort((a, b) => {
    const scoreA = computeCourseAttribution(a).compositeScore;
    const scoreB = computeCourseAttribution(b).compositeScore;
    return scoreB - scoreA;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xs p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-semibold text-slate-700 uppercase tracking-widest mb-1 font-serif">
              <Zap className="w-3.5 h-3.5 text-black" />
              <span>iGOT Karmayogi &amp; NSSTA Integrated Capacity Building Ledger</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Course Recommendations &amp; Curriculum Catalog
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed font-sans">
              Targeted training syllabus for{' '}
              <strong className="text-slate-900 font-medium">
                {profile.assignmentTitle || profile.designation}
              </strong>{' '}
              ({profile.department}) resolving mandatory assignment FRAC deficits and supporting career
              advancement goals.
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs text-slate-700 bg-slate-50 px-4 py-2.5 rounded-xs border border-slate-200 shadow-xs">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-serif">Active:</span>{' '}
              <strong className="text-slate-900 font-mono font-bold">{inProgressCount}</strong>
            </div>
            <span className="text-slate-300">|</span>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-serif">Certified:</span>{' '}
              <strong className="text-emerald-700 font-mono font-bold">{completedCount}</strong>
            </div>
            <span className="text-slate-300">|</span>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-serif">Hours:</span>{' '}
              <strong className="text-slate-900 font-mono font-bold">{profile.learningHoursLogged}h</strong>
            </div>
          </div>
        </div>

        {/* Toast alert */}
        {toastMessage && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xs text-xs font-mono flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </div>
        )}
      </div>

      {/* Multi-Lens Navigation Bar */}
      <div className="bg-white border border-slate-200 rounded-xs p-3 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Lenses */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 lg:pb-0 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveLens('for-you')}
              className={`px-3 py-1.5 rounded-xs flex items-center space-x-2 transition-colors shrink-0 text-[11px] cursor-pointer ${
                activeLens === 'for-you'
                  ? 'bg-black text-white border border-black shadow-xs font-semibold'
                  : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-inherit" />
              <span>For You (Dual Lanes)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveLens('by-topic')}
              className={`px-3 py-1.5 rounded-xs flex items-center space-x-2 transition-colors shrink-0 text-[11px] cursor-pointer ${
                activeLens === 'by-topic'
                  ? 'bg-black text-white border border-black shadow-xs font-semibold'
                  : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-inherit" />
              <span>By Domain</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveLens('by-competency')}
              className={`px-3 py-1.5 rounded-xs flex items-center space-x-2 transition-colors shrink-0 text-[11px] cursor-pointer ${
                activeLens === 'by-competency'
                  ? 'bg-black text-white border border-black shadow-xs font-semibold'
                  : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Tag className="w-3.5 h-3.5 text-inherit" />
              <span>By Competency</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveLens('by-provider')}
              className={`px-3 py-1.5 rounded-xs flex items-center space-x-2 transition-colors shrink-0 text-[11px] cursor-pointer ${
                activeLens === 'by-provider'
                  ? 'bg-black text-white border border-black shadow-xs font-semibold'
                  : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Building className="w-3.5 h-3.5 text-inherit" />
              <span>By Provider</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveLens('my-learning')}
              className={`px-3 py-1.5 rounded-xs flex items-center space-x-2 transition-colors shrink-0 text-[11px] cursor-pointer ${
                activeLens === 'my-learning'
                  ? 'bg-black text-white border border-black shadow-xs font-semibold'
                  : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-inherit" />
              <span>My Learning &amp; Credentials</span>
              <span className="px-1.5 py-0.2 rounded-xs bg-slate-100 text-slate-800 border border-slate-300 text-[10px] font-mono">
                {inProgressCount + completedCount}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search curriculum, skills..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xs text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-black font-sans"
            />
          </div>
        </div>

        {/* Sub-Filter Controls Depending on Lens */}
        {activeLens === 'by-topic' && (
          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold font-serif">Domain:</span>
            {['All', 'Statistical', 'Technical', 'Digital Governance', 'Behavioural/Managerial'].map(
              (topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => setSelectedTopic(topic)}
                  className={`px-2.5 py-0.5 rounded-xs text-[11px] font-medium transition-colors cursor-pointer ${
                    selectedTopic === topic
                      ? 'bg-black text-white border border-black'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {topic === 'Behavioural/Managerial' ? 'Managerial' : topic}
                </button>
              )
            )}
          </div>
        )}

        {activeLens === 'by-competency' && (
          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold font-serif">Target Competency:</span>
            <select
              value={selectedCompetency}
              onChange={(e) => setSelectedCompetency(e.target.value)}
              className="text-xs px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-xs text-slate-900 focus:outline-hidden focus:border-black max-w-xs font-sans"
            >
              <option value="All">All Competencies ({allCompetencyTags.length})</option>
              {allCompetencyTags.map((comp) => (
                <option key={comp} value={comp}>
                  {comp}
                </option>
              ))}
            </select>
          </div>
        )}

        {activeLens === 'by-provider' && (
          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold font-serif">Academy / Provider:</span>
            {['All', 'iGOT Karmayogi', 'NSSTA TPAC'].map((prov) => (
              <button
                key={prov}
                type="button"
                onClick={() => setSelectedProvider(prov)}
                className={`px-2.5 py-0.5 rounded-xs text-[11px] font-medium transition-colors cursor-pointer ${
                  selectedProvider === prov
                    ? 'bg-black text-white border border-black'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {prov}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. INTERACTIVE ALGORITHM WEIGHTS TUNER WIDGET */}
      <div className="bg-white border border-slate-300 rounded-xs shadow-xs overflow-hidden">
        {/* Tuner Header / Collapsible toggle */}
        <div
          onClick={() => setIsTunerOpen(!isTunerOpen)}
          className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 cursor-pointer hover:bg-slate-100 transition-colors select-none"
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-xs bg-black text-white flex items-center justify-center font-bold">
              <Sliders className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-sm font-bold text-slate-900 tracking-tight">
                  Tuning Engine Weights
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs bg-black text-white font-semibold uppercase">
                  Adaptive AI Ranker
                </span>
              </div>
              <p className="text-[11px] text-slate-600 font-sans">
                Adjust multi-criteria recommendation weights to re-sort course catalog in real time.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 self-end sm:self-center">
            <span className="text-[10px] font-mono text-slate-500 font-medium hidden md:inline">
              Skill Gap: <strong className="text-black">{skillGapWeight}%</strong> • Strategic: <strong className="text-black">{strategicBoostWeight}%</strong> • Peer: <strong className="text-black">{peerCompletionWeight}%</strong>
            </span>
            <div className="p-1 rounded-xs bg-white border border-slate-200 text-slate-700">
              {isTunerOpen ? (
                <ChevronUp className="w-4 h-4 text-black" />
              ) : (
                <ChevronDown className="w-4 h-4 text-black" />
              )}
            </div>
          </div>
        </div>

        {/* Tuner Body */}
        {isTunerOpen && (
          <div className="p-4 sm:p-5 space-y-4 bg-white animate-in fade-in duration-150">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Slider 1: Skill Gap Weight */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="skill-gap-slider" className="text-xs font-serif font-bold text-slate-900 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-black" />
                    <span>Skill Gap Weight</span>
                  </label>
                  <span className="font-mono text-xs font-bold text-black px-2 py-0.5 bg-white border border-slate-300 rounded-xs">
                    {skillGapWeight}%
                  </span>
                </div>
                <input
                  id="skill-gap-slider"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={skillGapWeight}
                  onChange={(e) => setSkillGapWeight(Number(e.target.value))}
                  className="w-full accent-black cursor-pointer h-1.5 bg-slate-200 rounded-xs"
                />
                <p className="text-[10px] text-slate-500 font-sans leading-tight">
                  Prioritizes courses resolving verified statutory FRAC deficits for current cadre deployment.
                </p>
              </div>

              {/* Slider 2: MoSPI Strategic Boost */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="strategic-boost-slider" className="text-xs font-serif font-bold text-slate-900 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-black" />
                    <span>MoSPI Strategic Boost</span>
                  </label>
                  <span className="font-mono text-xs font-bold text-black px-2 py-0.5 bg-white border border-slate-300 rounded-xs">
                    {strategicBoostWeight}%
                  </span>
                </div>
                <input
                  id="strategic-boost-slider"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={strategicBoostWeight}
                  onChange={(e) => setStrategicBoostWeight(Number(e.target.value))}
                  className="w-full accent-black cursor-pointer h-1.5 bg-slate-200 rounded-xs"
                />
                <p className="text-[10px] text-slate-500 font-sans leading-tight">
                  Elevates high-priority national initiatives (SNA 2008 re-basing, PLFS quarterly, NSSTA TPAC).
                </p>
              </div>

              {/* Slider 3: Peer Cadre Completion Rate */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="peer-completion-slider" className="text-xs font-serif font-bold text-slate-900 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-black" />
                    <span>Peer Cadre Completion Rate</span>
                  </label>
                  <span className="font-mono text-xs font-bold text-black px-2 py-0.5 bg-white border border-slate-300 rounded-xs">
                    {peerCompletionWeight}%
                  </span>
                </div>
                <input
                  id="peer-completion-slider"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={peerCompletionWeight}
                  onChange={(e) => setPeerCompletionWeight(Number(e.target.value))}
                  className="w-full accent-black cursor-pointer h-1.5 bg-slate-200 rounded-xs"
                />
                <p className="text-[10px] text-slate-500 font-sans leading-tight">
                  Boosts courses with high civil servant ratings (4.8+ ★) and cross-ministry completion rates.
                </p>
              </div>
            </div>

            {/* Presets and Status Line */}
            <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-500">Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    setSkillGapWeight(75);
                    setStrategicBoostWeight(50);
                    setPeerCompletionWeight(40);
                  }}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-mono rounded-xs border border-slate-200 transition-colors cursor-pointer"
                >
                  Balanced Standard (75/50/40)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSkillGapWeight(100);
                    setStrategicBoostWeight(20);
                    setPeerCompletionWeight(10);
                  }}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-mono rounded-xs border border-slate-200 transition-colors cursor-pointer"
                >
                  Deficit Remediation (100/20/10)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSkillGapWeight(25);
                    setStrategicBoostWeight(100);
                    setPeerCompletionWeight(25);
                  }}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-mono rounded-xs border border-slate-200 transition-colors cursor-pointer"
                >
                  MoSPI Strategic Focus (25/100/25)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSkillGapWeight(20);
                    setStrategicBoostWeight(20);
                    setPeerCompletionWeight(100);
                  }}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-mono rounded-xs border border-slate-200 transition-colors cursor-pointer"
                >
                  Peer Social Proof (20/20/100)
                </button>
              </div>

              <div className="flex items-center space-x-2 text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xs border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>Live Dynamic Re-Sorting Active</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* LENS 1: "FOR YOU" (DUAL RECOMMENDATION LANES) */}
      {activeLens === 'for-you' && (
        <div className="space-y-8">
          {/* LANE 1: CLOSE YOUR ASSIGNMENT GAPS */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-200">
              <div>
                <div className="inline-flex items-center space-x-1.5 text-slate-700 text-[10px] font-semibold uppercase tracking-widest mb-1 font-serif">
                  <Zap className="w-3.5 h-3.5 text-black" />
                  <span>Lane 1 • Mandatory Statutory FRAC Gap Closure</span>
                </div>
                <h2 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>Mandatory FRAC Remediations</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-xs bg-slate-100 text-slate-800 border border-slate-300 font-mono font-medium">
                    Current Post
                  </span>
                </h2>
                <p className="text-xs text-slate-600 font-sans">
                  Syllabus targeted to close assessed statutory deficits for your posting as{' '}
                  <strong className="text-slate-900">
                    {profile.assignmentTitle || profile.designation}
                  </strong>
                  .
                </p>
              </div>

              <div className="text-xs text-slate-600 font-mono">
                Active Deficits: {competencyScores?.scores.filter((s) => s.gap > 0).length || 0}
              </div>
            </div>

            {loadingRecs ? (
              <div className="p-12 text-center text-slate-600 space-y-3 bg-white rounded-xs border border-slate-200 shadow-xs">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-black" />
                <p className="text-xs font-mono">Synthesizing assignment competency deficits via Gemini Engine...</p>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="p-8 text-center bg-white border border-slate-200 rounded-xs space-y-2 shadow-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="font-serif text-sm font-bold text-slate-900">All Assignment Standards Satisfied</h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto font-sans">
                  No active competency gaps detected for your current statutory role. You may inspect
                  aspirational growth courses below or explore general topics.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedRecommendations.map((rec) => renderCourseCard(rec.course, rec))}
              </div>
            )}
          </div>

          {/* LANE 2: GROW YOUR CAREER (DESIRED COMPETENCIES) */}
          <div className="space-y-4 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-200">
              <div>
                <div className="inline-flex items-center space-x-1.5 text-slate-700 text-[10px] font-semibold uppercase tracking-widest mb-1 font-serif">
                  <TrendingUp className="w-3.5 h-3.5 text-black" />
                  <span>Lane 2 • Self-Attested Career Advancement</span>
                </div>
                <h2 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>Grow Your Career</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-xs bg-slate-100 text-slate-800 font-mono border border-slate-300 font-medium">
                    Aspirational Goals
                  </span>
                </h2>
                <p className="text-xs text-slate-600 font-sans">
                  Targeted courses addressing the <strong>Desired Competencies</strong> declared in
                  your Karmayogi profile for deputations, promotions, and inter-cadre assignments.
                </p>
              </div>

              {onNavigateToCompetencies && (
                <button
                  type="button"
                  onClick={onNavigateToCompetencies}
                  className="text-xs text-slate-900 hover:text-black font-serif font-semibold inline-flex items-center gap-1 self-start sm:self-center cursor-pointer underline underline-offset-2"
                >
                  <span>Edit Desired Competencies</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {desiredCompetencies.length === 0 ? (
              <div className="p-8 text-center bg-white border border-dashed border-slate-300 rounded-xs space-y-3 shadow-xs">
                <TrendingUp className="w-7 h-7 text-slate-400 mx-auto" />
                <h4 className="font-serif text-sm font-bold text-slate-900">No Desired Competencies Declared Yet</h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed font-sans">
                  Mission Karmayogi empowers officials to record career ambitions beyond their current
                  posting (e.g. &apos;National Accounts&apos;, &apos;Data Analytics&apos;,
                  &apos;Digital Governance&apos;). Add them in the <strong>My Competencies</strong>{' '}
                  tab to generate an aspirational curriculum.
                </p>
                {onNavigateToCompetencies && (
                  <button
                    type="button"
                    onClick={onNavigateToCompetencies}
                    className="px-4 py-2 rounded-xs bg-black hover:bg-slate-800 text-white text-xs font-medium tracking-wide uppercase inline-flex items-center gap-1.5 transition-colors border border-black cursor-pointer shadow-xs"
                  >
                    <span>Declare Desired Competencies</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : careerGrowthCourses.length === 0 ? (
              <div className="p-8 text-center bg-white border border-slate-200 rounded-xs space-y-2 shadow-xs">
                <BookOpen className="w-7 h-7 text-slate-400 mx-auto" />
                <h4 className="font-serif text-sm font-semibold text-slate-900">
                  Courses for Desired Skills in Production
                </h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto font-sans">
                  Specialized modules covering{' '}
                  {desiredCompetencies.map((d) => `"${d.competencyName}"`).join(', ')} are being
                  digitized on iGOT. Explore general statistical modules in the catalog.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedCareerGrowthCourses.map((course) =>
                  renderCourseCard(course, undefined, true)
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* OTHER LENSES: TOPIC, COMPETENCY, PROVIDER, MY LEARNING */}
      {activeLens !== 'for-you' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-600 px-1 font-mono">
            <span>
              Showing <strong className="text-slate-900">{sortedCatalogue.length}</strong> modules
              {activeLens === 'my-learning' && ' in your learning ledger'}
            </span>
          </div>

          {sortedCatalogue.length === 0 ? (
            <div className="p-12 text-center text-slate-600 bg-white rounded-xs border border-slate-200 space-y-2 shadow-xs">
              <BookOpen className="w-7 h-7 mx-auto text-slate-400" />
              <p className="font-serif text-sm font-semibold text-slate-900">No training modules matched</p>
              <p className="text-xs text-slate-500 font-sans">
                {activeLens === 'my-learning'
                  ? 'You have not enrolled in any courses yet. Explore the "For You" tab to begin.'
                  : 'Try relaxing your filter criteria or search terms.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedCatalogue.map((course) => renderCourseCard(course))}
            </div>
          )}
        </div>
      )}

      {/* Certificate Modal with Verifiable QR */}
      <CertificateModal
        isOpen={certModalOpen}
        onClose={() => setCertModalOpen(false)}
        progress={activeCertProgress}
        profile={profile}
      />

      {/* Course Rating & Review Modal */}
      <CourseRatingModal
        isOpen={ratingModalOpen}
        onClose={() => setRatingModalOpen(false)}
        course={ratingCourse}
        initialRating={ratingCourse ? courseProgressMap[ratingCourse.id]?.rating || 5 : 5}
        initialReview={ratingCourse ? courseProgressMap[ratingCourse.id]?.review || '' : ''}
        onSubmitRating={handleSaveRating}
      />
    </div>
  );

  // Helper renderer for course card across all views
  function renderCourseCard(
    course: Course,
    rec?: CourseRecommendation,
    isCareerGrowth?: boolean
  ) {
    const status = getCourseStatus(course.id);
    const progress = courseProgressMap[course.id];
    const isEnrolling = enrollingId === course.id;
    const attribution = computeCourseAttribution(course, rec);

    return (
      <div
        key={course.id}
        className={`bg-white border rounded-xs p-5 flex flex-col justify-between shadow-xs transition-all group relative ${
          status === 'Completed'
            ? 'border-emerald-300 hover:border-emerald-500'
            : status === 'In Progress'
            ? 'border-slate-800 hover:border-black'
            : isCareerGrowth
            ? 'border-slate-300 hover:border-slate-500'
            : 'border-slate-200 hover:border-slate-400'
        }`}
      >
        <div>
          {/* Top Badges Strip */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
              <span
                className={`px-2 py-0.5 rounded-xs text-[9px] font-mono uppercase tracking-wider font-semibold ${
                  course.source === 'iGOT Karmayogi'
                    ? 'bg-slate-100 text-slate-800 border border-slate-300'
                    : 'bg-slate-100 text-black border border-slate-400'
                }`}
              >
                {course.source}
              </span>

              {/* Status Badge */}
              <span
                className={`px-2 py-0.5 rounded-xs text-[9px] font-mono uppercase tracking-wider font-medium ${
                  status === 'Completed'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1 font-semibold'
                    : status === 'In Progress'
                    ? 'bg-blue-50 text-blue-900 border border-blue-300'
                    : status === 'Enrolled'
                    ? 'bg-slate-100 text-slate-800 border border-slate-300'
                    : 'bg-slate-50 text-slate-600 border border-slate-200'
                }`}
              >
                {status === 'Completed' && <Check className="w-3 h-3 text-emerald-700" />}
                {status}
              </span>

              {isCareerGrowth && (
                <span className="px-2 py-0.5 rounded-xs text-[9px] bg-slate-100 text-slate-800 border border-slate-300 font-mono uppercase tracking-wider font-semibold">
                  ★ Career Target
                </span>
              )}
            </div>

            <span className="text-[10px] font-mono text-black font-bold flex items-center gap-1 shrink-0 bg-slate-50 px-2 py-0.5 border border-slate-200 rounded-xs">
              <Zap className="w-3 h-3 text-black" />
              <span>{attribution.compositeScore}% Match</span>
            </span>
          </div>

          {/* Title */}
          <h3 className="font-serif text-sm font-bold text-slate-900 group-hover:text-black transition-colors leading-snug">
            {course.title}
          </h3>

          <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed font-sans">
            {course.description}
          </p>

          {/* Target Competencies */}
          <div className="mt-3 flex flex-wrap gap-1">
            {course.targetCompetencies.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-xs text-[9px] font-mono bg-slate-100 text-slate-700 border border-slate-200"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* 3. EXPLAINABLE AI (XAI) RATIONALE CARD */}
          <div className="mt-3.5 pt-3 border-t border-slate-200">
            <div className="bg-slate-50 border border-slate-300 rounded-xs p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-xs bg-slate-200 border border-slate-300 text-[10px] font-mono font-bold text-slate-900 uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 text-black" />
                  <span>XAI Rationale Card</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-black flex items-center gap-1">
                  <Zap className="w-3 h-3 text-black" />
                  <span>Fit: {attribution.compositeScore}%</span>
                </span>
              </div>

              <div className="text-[11px] text-slate-700 leading-snug font-sans">
                <strong className="text-slate-900 font-semibold">Official Role Framework:</strong>{' '}
                {attribution.roleAlignment}
              </div>

              <div className="text-[11px] text-slate-700 leading-snug font-sans">
                <strong className="text-slate-900 font-semibold">Gap Delta Resolution:</strong>{' '}
                <span>
                  Targets <strong className="text-slate-900 font-semibold">{attribution.targetedCompetency}</strong>{' '}
                  (Assessed Level {attribution.evaluatedLevel} vs Required Level {attribution.mandatedLevel}; Delta: {attribution.gapDelta !== 0 ? `${attribution.gapDelta} pts` : 'Benchmark Met'}).
                </span>
              </div>

              <p className="text-[11px] text-slate-700 font-sans leading-relaxed italic border-l-2 border-black pl-2 py-0.5 bg-white">
                &ldquo;{attribution.rationaleText}&rdquo;
              </p>

              {/* Weights Attribution Breakdown */}
              <div className="pt-1.5 border-t border-slate-200 grid grid-cols-3 gap-1.5 text-[9px] font-mono text-center">
                <div className="bg-white p-1 rounded-xs border border-slate-200">
                  <div className="text-slate-500 font-bold uppercase">Skill Gap</div>
                  <div className="text-slate-900 font-bold">{attribution.gapFactor}% <span className="text-slate-400 font-normal">({skillGapWeight}w)</span></div>
                </div>
                <div className="bg-white p-1 rounded-xs border border-slate-200">
                  <div className="text-slate-500 font-bold uppercase">MoSPI Boost</div>
                  <div className="text-slate-900 font-bold">{attribution.strategicFactor}% <span className="text-slate-400 font-normal">({strategicBoostWeight}w)</span></div>
                </div>
                <div className="bg-white p-1 rounded-xs border border-slate-200">
                  <div className="text-slate-500 font-bold uppercase">Peer Cadre</div>
                  <div className="text-slate-900 font-bold">{attribution.peerFactor}% <span className="text-slate-400 font-normal">({peerCompletionWeight}w)</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Ratings & Reviews Display */}
          <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-1 text-slate-800">
              <Star className="w-3.5 h-3.5 fill-black text-black" />
              <span className="font-bold text-slate-900">{course.rating.toFixed(1)}</span>
              <span className="text-[10px] text-slate-500">
                ({course.enrolledCount + (status !== 'Not Started' ? 1 : 0)} officials)
              </span>
            </div>

            {progress?.rating && (
              <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                <span>Personal:</span>
                <span className="font-bold">{progress.rating} ★</span>
              </span>
            )}
          </div>

          {/* Progress Bar (If Enrolled or In Progress) */}
          {(status === 'Enrolled' || status === 'In Progress') && (
            <div className="mt-2.5 space-y-1">
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>Completion Status</span>
                <span className="font-bold text-slate-800">{progress?.progressPercentage || 25}%</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-xs overflow-hidden border border-slate-200">
                <div
                  className="bg-black h-full transition-all duration-300"
                  style={{ width: `${progress?.progressPercentage || 25}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions Based on Course Lifecycle */}
        <div className="mt-4 pt-3 border-t border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>{course.duration} ({course.durationHours}h)</span>
            </span>
            <span>Level: {course.level}</span>
          </div>

          {/* Lifecycle Buttons */}
          <div className="flex items-center gap-2 pt-1">
            {status === 'Not Started' && (
              <button
                type="button"
                onClick={() => handleEnroll(course)}
                disabled={isEnrolling}
                className="w-full py-2 bg-black hover:bg-slate-800 disabled:bg-slate-400 text-white border border-black rounded-xs text-[11px] font-medium tracking-wide uppercase flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
              >
                {isEnrolling ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <>
                    <GraduationCap className="w-3.5 h-3.5 text-white" />
                    <span>Register via iGOT</span>
                  </>
                )}
              </button>
            )}

            {status === 'Enrolled' && (
              <button
                type="button"
                onClick={() => handleStartCourse(course)}
                className="w-full py-2 bg-black hover:bg-slate-800 text-white border border-black rounded-xs text-[11px] font-medium tracking-wide uppercase flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Commence Module</span>
              </button>
            )}

            {status === 'In Progress' && (
              <div className="w-full flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCompleteCourse(course)}
                  className="flex-1 py-2 bg-slate-900 hover:bg-black text-white border border-slate-900 rounded-xs text-[11px] font-medium tracking-wide uppercase flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Attest Completion</span>
                </button>
              </div>
            )}

            {status === 'Completed' && (
              <div className="w-full flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenCertificate(course)}
                  className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 rounded-xs text-[11px] font-medium tracking-wide uppercase flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                  title="View and Print Verified Certificate"
                >
                  <Award className="w-3.5 h-3.5 text-black" />
                  <span>Statutory Credential</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRatingCourse(course);
                    setRatingModalOpen(true);
                  }}
                  className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xs text-xs font-medium transition-colors cursor-pointer"
                  title="Audit and Evaluate Course"
                >
                  <Star className="w-3.5 h-3.5 text-black" />
                </button>

                <button
                  type="button"
                  onClick={() => handleStartAgain(course)}
                  className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xs text-xs font-medium transition-colors cursor-pointer"
                  title="Retake Module"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
};
