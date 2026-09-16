import React, { useState, useEffect } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import {
  Building2,
  Compass,
  AlertTriangle,
  CheckCircle2,
  GraduationCap,
  ArrowRight,
  Sparkles,
  Layers,
  FileText,
  Sliders,
  TrendingUp,
  UserCheck,
  Edit3,
  Clock,
  Star,
  BookOpen,
  ShieldCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  ArrowDown,
  ExternalLink,
  Target,
  Zap,
  Award,
  Play,
  Filter,
} from 'lucide-react';
import {
  Course,
  CourseRecommendation,
  OfficialProfile,
  ParameterScore,
  ProfileProjectGapAnalysis,
  UserCourseProgress,
} from '../types';
import { ASSIGNED_PROJECTS_CATALOG } from '../data/assignedProjects';
import { computeFramework5Analysis } from '../services/framework5Engine';
import {
  enrollCourseInStorage,
  getAllUserCourseProgress,
  saveOfficialProfile,
  saveUserCourseProgress,
} from '../services/storage';

interface ProfileProjectGapViewProps {
  currentProfile: OfficialProfile;
  onNavigateToIgot: (targetDomain?: string, targetCourseId?: string) => void;
  onEditProfile: () => void;
  onProfileUpdated?: (updated: OfficialProfile) => void;
  onTakeQuiz?: (courseTitle?: string) => void;
}

export const ProfileProjectGapView: React.FC<ProfileProjectGapViewProps> = ({
  currentProfile,
  onNavigateToIgot,
  onEditProfile,
  onProfileUpdated,
  onTakeQuiz,
}) => {
  // Ensure we have a gap analysis computed
  const gapAnalysis: ProfileProjectGapAnalysis =
    currentProfile.gapAnalysis || computeFramework5Analysis(currentProfile);

  const assignedProject =
    ASSIGNED_PROJECTS_CATALOG.find((p) => p.id === currentProfile.assignedProjectId) ||
    ASSIGNED_PROJECTS_CATALOG[0];

  const [selectedParamKey, setSelectedParamKey] = useState<string | null>(null);

  // Automated Course Recommendation & Dismantler State
  const [recommendations, setRecommendations] = useState<CourseRecommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState<boolean>(true);
  const [recSource, setRecSource] = useState<string>('');
  const [expandedDismantleId, setExpandedDismantleId] = useState<string | null>(null);
  const [selectedFilterDomain, setSelectedFilterDomain] = useState<string>('All');
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>(
    currentProfile.enrolledCourseIds || []
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [courseProgressMap, setCourseProgressMap] = useState<Record<string, UserCourseProgress>>({});

  // Radar data format
  const radarData = gapAnalysis.parameters.map((p) => ({
    parameter: p.name.replace(' Domain', ''),
    Profile: p.profileScore,
    ProjectTarget: p.projectTarget,
    gap: p.gap,
  }));

  const activeParam = selectedParamKey
    ? gapAnalysis.parameters.find((p) => p.key === selectedParamKey)
    : gapAnalysis.parameters[0];

  // Load user course progress map from storage
  useEffect(() => {
    const progress = getAllUserCourseProgress(currentProfile.id);
    setCourseProgressMap(progress);
    if (currentProfile.enrolledCourseIds) {
      setEnrolledCourseIds(currentProfile.enrolledCourseIds);
    }
  }, [currentProfile.id, currentProfile.enrolledCourseIds]);

  // AUTOMATED COURSE RECOMMENDATION FETCH PIPELINE
  useEffect(() => {
    let isMounted = true;
    async function fetchAutomatedRecommendations() {
      setLoadingRecs(true);
      try {
        const response = await fetch('/api/courses/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile: currentProfile,
            scores: gapAnalysis.parameters.flatMap((p) => [
              {
                competencyName: p.name.replace(' Domain', ''),
                currentLevel: p.profileScore,
                targetLevel: p.projectTarget,
                gap: p.gap,
                domain: p.name.replace(' Domain', ''),
                rationale: p.rationale,
              },
              ...(p.subSkills || []).map((sub) => ({
                competencyName: sub.name,
                currentLevel: sub.profile,
                targetLevel: sub.target,
                gap: sub.gap,
                domain: p.name.replace(' Domain', ''),
              })),
            ]),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (isMounted && data.recommendations) {
            setRecommendations(data.recommendations);
            setRecSource(data.source || 'iGOT FRAC Gap Engine');
            // Auto-expand the #1 top recommendation's dismantler so the user immediately sees the deep breakdown
            if (data.recommendations.length > 0) {
              setExpandedDismantleId(data.recommendations[0].course.id);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load automated course recommendations:', err);
      } finally {
        if (isMounted) setLoadingRecs(false);
      }
    }

    fetchAutomatedRecommendations();
    return () => {
      isMounted = false;
    };
  }, [currentProfile.id, currentProfile.lastEvaluatedAt, assignedProject.id]);

  // 1-Click Course Enrollment
  const handleEnrollCourse = (course: Course) => {
    try {
      const updated = enrollCourseInStorage(currentProfile.id, course.id, course.durationHours);
      setEnrolledCourseIds((prev) => [...new Set([...prev, course.id])]);

      const updatedProgress: UserCourseProgress = {
        courseId: course.id,
        userId: currentProfile.id,
        status: 'In Progress',
        enrolledAt: new Date().toISOString(),
        progressPercentage: 15,
      };
      saveUserCourseProgress(updatedProgress);
      setCourseProgressMap((prev) => ({ ...prev, [course.id]: updatedProgress }));

      if (onProfileUpdated) {
        onProfileUpdated(updated);
      }

      setToastMessage(`✓ Enrolled in "${course.title}"! Course added to your active iGOT learning ledger.`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Enrollment error:', err);
    }
  };

  const scrollToRecommendations = () => {
    const el = document.getElementById('auto-recommendations-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Filter recommendations based on domain selection
  const filteredRecommendations = recommendations.filter((rec) => {
    if (selectedFilterDomain === 'All') return true;
    return (
      rec.course.domain.toLowerCase().includes(selectedFilterDomain.toLowerCase()) ||
      rec.targetedGap.toLowerCase().includes(selectedFilterDomain.toLowerCase())
    );
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-black text-white px-5 py-3 rounded-xs border border-slate-700 shadow-xl flex items-center gap-3 text-xs font-mono animate-in fade-in slide-in-from-bottom-3 duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 3-STAGE AUTOMATED PIPELINE BREADCRUMB */}
      <div className="bg-white border-2 border-black rounded-xs p-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
            {/* Stage 1 */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xs bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold">
              <Check className="w-3.5 h-3.5 text-emerald-700" />
              <span>1. Profile &amp; Mandate Ingested</span>
            </div>

            <span className="text-slate-400">➔</span>

            {/* Stage 2 */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xs bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold">
              <Check className="w-3.5 h-3.5 text-emerald-700" />
              <span>2. 5-Parameter Competencies Evaluated</span>
            </div>

            <span className="text-slate-400">➔</span>

            {/* Stage 3 */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xs bg-black text-white font-bold shadow-xs">
              <Target className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>3. Top Courses Auto-Recommended &amp; Dismantled</span>
            </div>
          </div>

          {/* Quick jump to recommendations */}
          <button
            type="button"
            onClick={scrollToRecommendations}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 text-xs font-mono font-semibold rounded-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <span>Jump to Top Recommended Courses</span>
            <ArrowDown className="w-3.5 h-3.5 text-black" />
          </button>
        </div>
      </div>

      {/* Institutional Header Dossier */}
      <div className="bg-white border border-slate-200 p-6 rounded-xs shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-200 pb-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-xs bg-slate-100 border border-slate-300 text-slate-800 text-[10px] font-mono uppercase tracking-widest font-semibold">
              <Building2 className="w-3.5 h-3.5 text-black" />
              <span>Official FRAC Audit • Profile vs Mandate Comparative Analysis</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 tracking-tight">
              5-Parameter Framework Compilation &amp; Gap Matrix
            </h1>
            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
              Comparative analysis between the qualifications, educational degrees, and past projects of{' '}
              <strong className="text-slate-900">{currentProfile.name}</strong> ({currentProfile.designation}) 
              against the statutory requirements of the assigned project:{' '}
              <strong className="text-black font-semibold">{assignedProject.title}</strong>.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onEditProfile}
              className="px-3.5 py-2 text-xs font-mono text-slate-700 hover:text-black bg-white border border-slate-300 hover:bg-slate-50 rounded-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-700" />
              <span>Update Profile Long Form</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateToIgot()}
              className="px-4 py-2 text-xs font-serif font-bold tracking-wide uppercase text-white bg-black hover:bg-slate-800 border border-black rounded-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <GraduationCap className="w-4 h-4 text-white" />
              <span>Open iGOT Karmayogi Portal</span>
            </button>
          </div>
        </div>

        {/* Assigned Project Scope Summary Banner */}
        <div className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-xs grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <div className="md:col-span-2">
            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-wider font-semibold">
              Assigned Operational Project
            </div>
            <div className="text-sm font-serif font-bold text-slate-900 mt-0.5">
              {assignedProject.title}
            </div>
            <div className="text-xs text-slate-600 mt-1 line-clamp-1">
              {assignedProject.description}
            </div>
          </div>

          <div className="border-l border-slate-200 pl-4">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              Overall Mandate Readiness
            </div>
            <div className="text-2xl font-serif font-bold text-slate-900 mt-0.5 flex items-baseline gap-2">
              <span className={gapAnalysis.overallReadiness >= 80 ? 'text-emerald-700 font-bold' : 'text-slate-900 font-bold'}>
                {gapAnalysis.overallReadiness}%
              </span>
              <span className="text-xs font-normal text-slate-500">
                ({gapAnalysis.parameters.filter((p) => p.gap <= 8).length} of 5 Benchmarks Met)
              </span>
            </div>
          </div>

          <div className="border-l border-slate-200 pl-4">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              Average Skill Deficit
            </div>
            <div className="text-2xl font-serif font-bold text-rose-700 mt-0.5">
              -{gapAnalysis.averageGap} <span className="text-xs font-normal text-slate-500">pts delta</span>
            </div>
          </div>
        </div>
      </div>

      {/* Radar Chart & High-Level Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Radar Chart Column */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xs p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-2">
              <div>
                <h2 className="font-serif text-sm font-bold text-slate-900 uppercase tracking-wider">
                  5-Parameter Competency Polygon
                </h2>
                <p className="text-[11px] text-slate-500">
                  Officer Baseline (Black) vs Project Mandate Benchmark (Slate)
                </p>
              </div>
            </div>

            <div className="h-68 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis
                    dataKey="parameter"
                    tick={{ fill: '#334155', fontSize: 10, fontFamily: 'serif' }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    stroke="#94a3b8"
                    tick={{ fill: '#64748b', fontSize: 9 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#cbd5e1',
                      fontSize: '11px',
                      color: '#0f172a',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Radar
                    name="Project Mandate Target"
                    dataKey="ProjectTarget"
                    stroke="#64748b"
                    fill="#94a3b8"
                    fillOpacity={0.25}
                  />
                  <Radar
                    name="Officer Profile Score"
                    dataKey="Profile"
                    stroke="#000000"
                    fill="#000000"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xs text-[11px] text-slate-700 mt-2">
            <span className="font-bold text-slate-900 block font-serif">Interpretation:</span>
            <span>
              Where the solid dark shape falls inside the grey outline, an operational deficit exists. 
              These gaps are targeted for automated resolution through the courses recommended below.
            </span>
          </div>
        </div>

        {/* 5 Parameters Summary Cards Column */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xs p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h2 className="font-serif text-sm font-bold text-slate-900 uppercase tracking-wider">
              Parameter-by-Parameter Audit Breakdown
            </h2>
            <span className="text-[10px] font-mono text-slate-500">5 Statutory Domains</span>
          </div>

          <div className="space-y-2.5">
            {gapAnalysis.parameters.map((param) => {
              const isSelected = selectedParamKey === param.key;
              const isCritical = param.gap >= 18;
              const isModerate = param.gap >= 8 && param.gap < 18;

              return (
                <div
                  key={param.key}
                  onClick={() => setSelectedParamKey(param.key)}
                  className={`p-3.5 rounded-xs border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-100 border-2 border-black shadow-xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-serif text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>{param.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded-xs font-mono text-[9px] uppercase tracking-wider font-semibold ${
                            isCritical
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : isModerate
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          {param.status}
                        </span>
                      </span>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-1">{param.rationale}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono text-slate-600">
                        Profile: <strong className="text-slate-900">{param.profileScore}%</strong> / Target:{' '}
                        <strong className="text-slate-700">{param.projectTarget}%</strong>
                      </div>
                      <div className="text-xs font-mono mt-0.5">
                        {param.gap > 0 ? (
                          <span className="text-rose-700 font-bold">Gap: -{param.gap} pts</span>
                        ) : (
                          <span className="text-emerald-700 font-bold">Benchmark Met (+0)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar comparison */}
                  <div className="mt-3 relative h-2 bg-slate-200 rounded-xs overflow-hidden">
                    {/* Project target bar marker */}
                    <div
                      className="absolute top-0 bottom-0 bg-slate-400 z-0"
                      style={{ width: `${param.projectTarget}%` }}
                    />
                    {/* Official score bar */}
                    <div
                      className={`absolute top-0 bottom-0 z-10 transition-all ${
                        isCritical ? 'bg-rose-600' : isModerate ? 'bg-amber-600' : 'bg-emerald-600'
                      }`}
                      style={{ width: `${param.profileScore}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Deep-Dive Parameter Card */}
      {activeParam && (
        <div className="bg-white border border-slate-200 rounded-xs p-6 shadow-xs border-t-2 border-t-black">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-5">
            <div>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-semibold">
                Selected Domain In-Depth Audit
              </span>
              <h3 className="font-serif text-lg font-bold text-slate-900">
                {activeParam.name} — Component Breakdown
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">{activeParam.rationale}</p>
            </div>

            <button
              type="button"
              onClick={() => onNavigateToIgot(activeParam.name.replace(' Domain', ''))}
              className="px-4 py-2 bg-black hover:bg-slate-800 text-white border border-black rounded-xs text-xs font-serif font-bold tracking-wide uppercase transition-colors flex items-center gap-2 shrink-0 shadow-xs cursor-pointer"
            >
              <span>View {activeParam.name} iGOT Courses</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Sub-skills breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-serif font-bold text-slate-800 uppercase tracking-wider">
              Component Competency Metrics:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {activeParam.subSkills.map((sub, i) => (
                <div
                  key={i}
                  className="bg-slate-50 border border-slate-200 rounded-xs p-3.5 text-xs space-y-2"
                >
                  <div className="font-semibold text-slate-900">{sub.name}</div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-600">
                    <span>Officer Level: {sub.profile}%</span>
                    <span>Target: {sub.target}%</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-500">Deficit:</span>
                    {sub.gap > 0 ? (
                      <span className="text-rose-700 font-bold">-{sub.gap} pts</span>
                    ) : (
                      <span className="text-emerald-700 font-bold">Satisfied</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CORE FEATURE: AUTOMATED TOP COURSE RECOMMENDATIONS & GAP DISMANTLER       */}
      {/* ========================================================================= */}
      <div
        id="auto-recommendations-section"
        className="bg-white border-2 border-black rounded-xs p-6 md:p-8 shadow-sm space-y-6"
      >
        {/* SECTION HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-black text-white text-[10px] font-mono font-bold uppercase tracking-wider rounded-xs">
                Auto-Generated
              </span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-mono font-bold uppercase tracking-wider rounded-xs">
                Mandate Deficit Resolved
              </span>
              <span className="text-xs text-slate-500 font-mono hidden sm:inline">
                • {recSource}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-serif font-bold text-slate-900 tracking-tight">
              Automated Top Course Recommendations &amp; Gap Dismantler
            </h2>
            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
              Based on the extracted dossier for <strong className="text-slate-900">{currentProfile.name}</strong> and 
              diagnosed deficits for <strong className="text-slate-900">{assignedProject.title}</strong>, our 
              recommendation engine has automatically mapped the highest-priority courses. Each recommendation below 
              details <strong>WHY it is being recommended</strong> and provides an <strong>automated dismantling</strong> of the gap.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            {['All', 'Statistical', 'Technical', 'Digital Governance'].map((domain) => (
              <button
                key={domain}
                type="button"
                onClick={() => setSelectedFilterDomain(domain)}
                className={`px-3 py-1.5 rounded-xs text-xs font-mono transition-colors cursor-pointer ${
                  selectedFilterDomain === domain
                    ? 'bg-black text-white font-bold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                }`}
              >
                {domain}
              </button>
            ))}
          </div>
        </div>

        {/* LOADING INDICATOR */}
        {loadingRecs && (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-black animate-spin" />
            <div className="text-sm font-serif font-bold text-slate-900">
              Running Automatic Deficit-to-Curriculum Matching...
            </div>
            <p className="text-xs text-slate-500 font-mono">
              Evaluating 5 statutory domains, CAPI/Python tools, and MoSPI operational standards
            </p>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loadingRecs && filteredRecommendations.length === 0 && (
          <div className="p-8 bg-slate-50 border border-slate-200 rounded-xs text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h4 className="font-serif text-sm font-bold text-slate-900">
              No Unresolved Gaps Found for this Filter
            </h4>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              All statutory competencies for this category satisfy the benchmark for {assignedProject.title}.
            </p>
          </div>
        )}

        {/* LIST OF RECOMMENDED COURSES */}
        {!loadingRecs && filteredRecommendations.length > 0 && (
          <div className="space-y-6">
            {filteredRecommendations.map((rec, index) => {
              const isEnrolled = enrolledCourseIds.includes(rec.course.id);
              const progress = courseProgressMap[rec.course.id];
              const isDismantleOpen = expandedDismantleId === rec.course.id;

              const currentVal = rec.currentLevel || 45;
              const targetVal = rec.targetLevel || 85;
              const gapVal = rec.gapValue || Math.max(0, targetVal - currentVal);

              return (
                <div
                  key={rec.course.id}
                  className="bg-white border border-slate-300 rounded-xs p-5 md:p-6 shadow-xs hover:border-black transition-all space-y-5"
                >
                  {/* CARD HEADER */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      {/* PRIORITY RANK & BADGES */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-xs bg-black text-white text-[10px] font-mono font-bold uppercase tracking-wider">
                          #{index + 1} Priority Recommendation
                        </span>
                        <span className="px-2 py-0.5 rounded-xs bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-mono font-bold">
                          {rec.scoreMatch}% Deficit Match
                        </span>
                        <span className="px-2 py-0.5 rounded-xs bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-mono font-semibold">
                          {rec.course.source}
                        </span>
                        <span className="px-2 py-0.5 rounded-xs bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-mono">
                          {rec.course.courseCode}
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-serif font-bold text-slate-900">
                        {rec.course.title}
                      </h3>

                      <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                        {rec.course.description}
                      </p>

                      <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500 pt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{rec.course.instructorOrg}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{rec.course.duration}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span className="text-slate-800 font-semibold">{rec.course.rating}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                          <span>{rec.course.enrolledCount?.toLocaleString()} Officials Enrolled</span>
                        </span>
                      </div>
                    </div>

                    {/* STATUS & ACTIONS */}
                    <div className="flex flex-col sm:items-end gap-2.5 shrink-0">
                      {isEnrolled ? (
                        <div className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-mono font-bold rounded-xs flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-emerald-700" />
                          <span>Enrolled ({progress?.progressPercentage || 25}% Complete)</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleEnrollCourse(rec.course)}
                          className="w-full sm:w-auto px-4 py-2 bg-black hover:bg-slate-800 text-white border border-black text-xs font-serif font-bold uppercase tracking-wider rounded-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer hover:scale-[1.02]"
                        >
                          <Play className="w-3.5 h-3.5 text-white fill-white" />
                          <span>Enroll on iGOT (1-Click)</span>
                        </button>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onNavigateToIgot(rec.course.domain, rec.course.id)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-[11px] font-mono rounded-xs flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>Open in iGOT Portal</span>
                          <ExternalLink className="w-3 h-3 text-slate-500" />
                        </button>

                        {onTakeQuiz && (
                          <button
                            type="button"
                            onClick={() => onTakeQuiz(rec.course.title)}
                            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-[11px] font-mono rounded-xs flex items-center gap-1 transition-colors cursor-pointer"
                            title="Attempt MCQs to test knowledge and directly close the gap on the radar chart"
                          >
                            <Award className="w-3 h-3 text-slate-700" />
                            <span>Recalibrate Quiz</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ========================================================================= */}
                  {/* MANDATORY: "WHY THIS IS RECOMMENDED" HIGH-VISIBILITY JUSTIFICATION BOX    */}
                  {/* ========================================================================= */}
                  <div className="bg-slate-50 border-l-4 border-l-black border-y border-r border-slate-200 rounded-xs p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-black shrink-0" />
                        <span className="text-xs font-serif font-bold text-slate-900 uppercase tracking-wider">
                          Why This Course is Recommended:
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-600">
                        Targeted Deficit: <strong className="text-slate-900">{rec.targetedGap}</strong>
                      </div>
                    </div>

                    {/* STATUTORY GAP FORMULA */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white border border-slate-200 p-2.5 rounded-xs text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Officer Baseline</span>
                        <span className="font-bold text-slate-900">{currentVal}% Proficiency</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Project Mandate Benchmark</span>
                        <span className="font-bold text-slate-900">{targetVal}% Required</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Diagnosed Skill Deficit</span>
                        <span className="font-bold text-rose-700">-{gapVal} pts Shortfall</span>
                      </div>
                    </div>

                    {/* AI REASON & MANDATE JUSTIFICATION */}
                    <p className="text-xs text-slate-800 font-sans leading-relaxed">
                      <strong>Diagnostic Justification:</strong> {rec.aiReason}
                    </p>

                    {rec.whyRecommended?.mandateContext && (
                      <div className="text-xs text-slate-700 font-sans leading-relaxed">
                        <strong className="text-slate-900">Project Mandate Alignment:</strong>{' '}
                        {rec.whyRecommended.mandateContext}
                      </div>
                    )}

                    {rec.whyRecommended?.dismantledDeficit && (
                      <div className="text-xs text-slate-700 font-sans leading-relaxed">
                        <strong className="text-slate-900">Deficit Being Dismantled:</strong>{' '}
                        <span className="text-slate-800 bg-slate-200/60 px-1.5 py-0.5 rounded-xs font-mono text-[11px]">
                          {rec.whyRecommended.dismantledDeficit}
                        </span>
                      </div>
                    )}

                    {rec.whyRecommended?.expectedOutcome && (
                      <div className="text-xs text-emerald-900 font-sans leading-relaxed flex items-center gap-1.5 pt-0.5">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>
                          <strong>Projected Competency Lift:</strong> {rec.whyRecommended.expectedOutcome}
                        </span>
                      </div>
                    )}

                    {/* TOPICS COVERED TAGS */}
                    {rec.whyRecommended?.keyTopicsCovered && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] font-mono text-slate-500 uppercase">
                          Syllabus Modules Addressing Gap:
                        </span>
                        {rec.whyRecommended.keyTopicsCovered.map((topic, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-white border border-slate-300 text-slate-700 text-[10px] font-mono rounded-xs"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ========================================================================= */}
                  {/* AUTOMATED GAP DISMANTLER (FORENSIC BREAKDOWN ACCORDION)                   */}
                  {/* ========================================================================= */}
                  <div className="border-t border-slate-200 pt-3">
                    <button
                      type="button"
                      onClick={() => setExpandedDismantleId(isDismantleOpen ? null : rec.course.id)}
                      className="flex items-center justify-between w-full text-left py-1 text-xs font-mono font-semibold text-slate-700 hover:text-black cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-black" />
                        <span>Automated Forensic Gap Dismantler (Step-by-Step Breakdown)</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <span>{isDismantleOpen ? 'Hide Dismantled Breakdown' : 'Expand Dismantled Breakdown'}</span>
                        {isDismantleOpen ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </button>

                    {isDismantleOpen && (
                      <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xs space-y-4 animate-in fade-in duration-200">
                        <div className="text-xs font-serif font-bold text-slate-900 uppercase tracking-wider">
                          Dismantling the Operational Deficit: {rec.targetedGap}
                        </div>

                        {/* 5-STEP FORENSIC DISMANTLE PIPELINE */}
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
                          {/* Step 1: Baseline Deficit */}
                          <div className="bg-white border border-slate-200 p-3 rounded-xs space-y-1.5">
                            <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase">
                              1. Baseline Intake Deficit
                            </span>
                            <div className="font-semibold text-slate-900 text-[11px]">
                              {currentProfile.name}&apos;s Profile
                            </div>
                            <p className="text-[11px] text-slate-600 leading-normal">
                              Initial score of {currentVal}%. Lacking verified training in modern {rec.targetedGap} methodologies.
                            </p>
                          </div>

                          {/* Step 2: Operational Mandate Requirement */}
                          <div className="bg-white border border-slate-200 p-3 rounded-xs space-y-1.5">
                            <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase">
                              2. Project Demand
                            </span>
                            <div className="font-semibold text-slate-900 text-[11px]">
                              {assignedProject.title}
                            </div>
                            <p className="text-[11px] text-slate-600 leading-normal">
                              Statutory requirement of {targetVal}% for data collection, quality audits, and official tabulation.
                            </p>
                          </div>

                          {/* Step 3: Dismantled Gap Delta */}
                          <div className="bg-white border border-slate-200 p-3 rounded-xs space-y-1.5">
                            <span className="text-[10px] font-mono font-bold text-rose-600 block uppercase">
                              3. Dismantled Gap
                            </span>
                            <div className="font-bold text-rose-700 text-sm">
                              -{gapVal} pts Delta
                            </div>
                            <p className="text-[11px] text-slate-600 leading-normal">
                              Critical operational bottleneck that prevents autonomous sign-off on statistical deliverables.
                            </p>
                          </div>

                          {/* Step 4: Prescribed Course Solution */}
                          <div className="bg-white border border-slate-200 p-3 rounded-xs space-y-1.5">
                            <span className="text-[10px] font-mono font-bold text-slate-800 block uppercase">
                              4. Prescribed Solution
                            </span>
                            <div className="font-semibold text-slate-900 text-[11px] line-clamp-1">
                              {rec.course.title}
                            </div>
                            <p className="text-[11px] text-slate-600 leading-normal">
                              {rec.course.durationHours} hours of structured practical modules with hands-on case exercises.
                            </p>
                          </div>

                          {/* Step 5: Target Resolution */}
                          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xs space-y-1.5">
                            <span className="text-[10px] font-mono font-bold text-emerald-800 block uppercase">
                              5. Post-Course Target
                            </span>
                            <div className="font-bold text-emerald-900 text-sm">
                              {targetVal}% Readiness
                            </div>
                            <p className="text-[11px] text-emerald-800 leading-normal">
                              Zero deficit remaining. Automatic recertification and radar chart polygon expansion.
                            </p>
                          </div>
                        </div>

                        {/* Direct Action inside the dismantler */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                          <span className="text-[11px] font-mono text-slate-500">
                            Verified under Mission Karmayogi Capacity Building Commission guidelines.
                          </span>
                          {!isEnrolled ? (
                            <button
                              type="button"
                              onClick={() => handleEnrollCourse(rec.course)}
                              className="px-3 py-1 bg-black hover:bg-slate-800 text-white text-[11px] font-mono font-bold rounded-xs cursor-pointer flex items-center gap-1"
                            >
                              <Play className="w-3 h-3 fill-white" />
                              <span>Enroll Now to Dismantle Gap</span>
                            </button>
                          ) : (
                            <span className="text-[11px] font-mono text-emerald-700 font-bold">
                              ✓ Already Enrolled &amp; Progressing
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom CTA to iGOT Karmayogi Clone */}
      <div className="p-6 bg-slate-50 border border-slate-200 rounded-xs flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-slate-800 text-xs font-mono font-semibold">
            <Sparkles className="w-4 h-4 text-black" />
            <span>Mission Karmayogi Automated Learning Execution</span>
          </div>
          <h3 className="font-serif text-lg font-bold text-slate-900">
            Ready to bridge your {gapAnalysis.averageGap} point deficit for {assignedProject.title}?
          </h3>
          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
            All courses can be completed on our integrated <strong>iGOT Karmayogi Clone Portal</strong>, 
            complete with video players, interactive modules, assessments, and verifiable digital certificates.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigateToIgot()}
          className="w-full md:w-auto px-8 py-3.5 rounded-xs bg-black hover:bg-slate-800 text-white border border-black font-serif text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-xs shrink-0 cursor-pointer hover:scale-[1.02]"
        >
          <GraduationCap className="w-4 h-4 text-white" />
          <span>Launch Full iGOT Catalog</span>
          <ArrowRight className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
};
