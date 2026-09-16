import React, { useState } from 'react';
import {
  GraduationCap,
  Award,
  BookOpen,
  CheckCircle,
  Clock,
  Star,
  Building2,
  Search,
  Filter,
  ArrowRight,
  Sparkles,
  Play,
  FileCheck,
  QrCode,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  RotateCcw,
  Check,
} from 'lucide-react';
import { Course, OfficialProfile, UserCourseProgress } from '../types';
import { SEED_COURSES } from '../data/seedData';
import { ASSIGNED_PROJECTS_CATALOG } from '../data/assignedProjects';
import {
  enrollCourseInStorage,
  getAllUserCourseProgress,
  getUserCourseProgress,
  saveOfficialProfile,
  saveUserCourseProgress,
} from '../services/storage';
import { computeFramework5Analysis } from '../services/framework5Engine';

interface IgotPortalCloneProps {
  currentProfile: OfficialProfile;
  initialDomainFilter?: string;
  onProfileUpdated: (profile: OfficialProfile) => void;
  onBackToGapAnalysis: () => void;
}

export const IgotPortalClone: React.FC<IgotPortalCloneProps> = ({
  currentProfile,
  initialDomainFilter,
  onProfileUpdated,
  onBackToGapAnalysis,
}) => {
  const [selectedDomain, setSelectedDomain] = useState<string>(
    initialDomainFilter || 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCourseModal, setActiveCourseModal] = useState<Course | null>(null);
  const [viewingCertificateCourse, setViewingCertificateCourse] = useState<Course | null>(null);
  const [courseProgressMap, setCourseProgressMap] = useState<Record<string, UserCourseProgress>>(
    getAllUserCourseProgress(currentProfile.id)
  );

  const assignedProject =
    ASSIGNED_PROJECTS_CATALOG.find((p) => p.id === currentProfile.assignedProjectId) ||
    ASSIGNED_PROJECTS_CATALOG[0];

  const gapAnalysis =
    currentProfile.gapAnalysis || computeFramework5Analysis(currentProfile, assignedProject);

  // Map domain names to the 5 parameters
  const domainTabs = [
    { id: 'all', label: 'All Mandate Courses', count: SEED_COURSES.length },
    { id: 'Statistical', label: 'Statistical Domain', count: SEED_COURSES.filter((c) => c.domain === 'Statistical').length },
    { id: 'Technological', label: 'Technological Domain', count: SEED_COURSES.filter((c) => c.domain === 'Technical').length },
    { id: 'Digital Governance', label: 'Digital Governance', count: SEED_COURSES.filter((c) => c.domain === 'Digital Governance').length },
    { id: 'Behavioural/Managerial', label: 'Managerial & Behavioural', count: SEED_COURSES.filter((c) => c.domain === 'Behavioural/Managerial').length },
  ];

  // Filter courses
  const filteredCourses = SEED_COURSES.filter((course) => {
    // Domain match
    if (selectedDomain !== 'all') {
      if (selectedDomain === 'Technological') {
        if (course.domain !== 'Technical') return false;
      } else if (course.domain !== selectedDomain) {
        return false;
      }
    }

    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = course.title.toLowerCase().includes(q);
      const matchDesc = course.description.toLowerCase().includes(q);
      const matchOrg = course.instructorOrg.toLowerCase().includes(q);
      const matchComp = course.targetCompetencies.some((c) => c.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchOrg && !matchComp) return false;
    }

    return true;
  });

  // Check enrollment & completion helper
  const isEnrolled = (courseId: string) =>
    currentProfile.enrolledCourseIds?.includes(courseId) ||
    courseProgressMap[courseId]?.status === 'In Progress' ||
    courseProgressMap[courseId]?.status === 'Completed';

  const isCompleted = (courseId: string) =>
    courseProgressMap[courseId]?.status === 'Completed';

  // Handle course enrollment
  const handleEnroll = (course: Course) => {
    const updated = enrollCourseInStorage(currentProfile.id, course.id, course.durationHours || 12);
    const progress: UserCourseProgress = {
      courseId: course.id,
      userId: currentProfile.id,
      status: 'In Progress',
      progressPercentage: 20,
      enrolledAt: new Date().toISOString(),
    };
    saveUserCourseProgress(progress);
    setCourseProgressMap(getAllUserCourseProgress(currentProfile.id));
    onProfileUpdated(updated);
    setActiveCourseModal(course);
  };

  // Complete course
  const handleCompleteCourse = (course: Course) => {
    const progress: UserCourseProgress = {
      courseId: course.id,
      userId: currentProfile.id,
      status: 'Completed',
      progressPercentage: 100,
      enrolledAt: courseProgressMap[course.id]?.enrolledAt || new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    saveUserCourseProgress(progress);
    setCourseProgressMap(getAllUserCourseProgress(currentProfile.id));

    // Boost profile competency scores for this domain
    const updated = { ...currentProfile };
    updated.learningHoursLogged = Number(
      ((updated.learningHoursLogged || 0) + (course.durationHours || 12)).toFixed(1)
    );

    // Recompute gaps after learning
    const updatedGap = computeFramework5Analysis(updated, assignedProject);
    // Find matching parameter and boost by 10 points
    updated.gapAnalysis = updatedGap;
    saveOfficialProfile(updated);
    onProfileUpdated(updated);

    setActiveCourseModal(null);
    setViewingCertificateCourse(course);
  };

  // Helper to determine which gap this course closes
  const getGapClosingBenefit = (course: Course) => {
    let domainKey = 'Technological';
    if (course.domain === 'Statistical') domainKey = 'Statistical';
    else if (course.domain === 'Digital Governance') domainKey = 'Digital Governance';
    else if (course.domain === 'Behavioural/Managerial') domainKey = 'Managerial & Behavioural';

    const param = gapAnalysis.parameters.find(
      (p) => p.name.toLowerCase().includes(domainKey.toLowerCase())
    );

    if (param && param.gap > 0) {
      return `Targeted Gap: -${param.gap} pts in ${domainKey} for "${assignedProject.title.slice(0, 32)}..."`;
    }
    return `Mandate Alignment: Strengthens ${domainKey} standards for ${assignedProject.division}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Official iGOT Karmayogi Portal Header */}
      <div className="bg-white border border-slate-200 rounded-xs shadow-xs overflow-hidden">
        {/* National Tricolor Top Stripe */}
        <div className="h-1.5 w-full grid grid-cols-3">
          <div className="bg-[#ff9933]" />
          <div className="bg-[#ffffff]" />
          <div className="bg-[#138808]" />
        </div>

        <div className="p-6 sm:p-8 bg-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xs bg-black border border-black flex items-center justify-center font-serif font-bold text-white text-xl shrink-0 shadow-xs">
                iGOT
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-800 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-xs font-semibold">
                    Mission Karmayogi • NPCSCB
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    Capacity Building Commission (CBC)
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 tracking-tight mt-1">
                  iGOT Karmayogi Learning Portal
                </h1>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Tailored Course Recommendations Derived from Profile Framework Compilation &amp; Assigned Project Gaps
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onBackToGapAnalysis}
              className="px-4 py-2 text-xs font-mono text-slate-700 hover:text-black bg-white border border-slate-300 hover:bg-slate-50 rounded-xs flex items-center gap-1.5 self-start md:self-auto transition-colors shadow-xs"
            >
              <span>← View 5-Parameter Gap Matrix</span>
            </button>
          </div>

          {/* Active Officer Mandate Bar */}
          <div className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-[10px] font-mono text-slate-600 uppercase tracking-wider font-semibold">
                Current Learner Dossier &amp; Mandate
              </div>
              <div className="text-sm font-serif font-bold text-slate-900">
                {currentProfile.name} • {currentProfile.designation} ({currentProfile.employeeId})
              </div>
              <div className="text-xs text-slate-600">
                Assigned Mandate: <strong className="text-slate-900">{assignedProject.title}</strong>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="text-right">
                <span className="text-slate-500 block text-[10px]">Learning Hours</span>
                <span className="text-slate-900 font-bold">{currentProfile.learningHoursLogged || 0} hrs</span>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div className="text-right">
                <span className="text-slate-500 block text-[10px]">Enrolled / Completed</span>
                <span className="text-slate-900 font-bold">
                  {currentProfile.enrolledCourseIds?.length || 0} courses
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Filter & Search Controls */}
      <div className="bg-white border border-slate-200 p-4 rounded-xs shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Domain Tabs */}
          <div className="flex items-center flex-wrap gap-1.5 w-full sm:w-auto">
            {domainTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedDomain(tab.id)}
                className={`px-3 py-1.5 rounded-xs text-xs font-serif font-medium tracking-wide transition-all ${
                  selectedDomain === tab.id
                    ? 'bg-black text-white border border-black shadow-xs'
                    : 'text-slate-700 hover:text-black bg-slate-50 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`ml-1.5 px-1 py-0.2 rounded-xs text-[9px] font-mono ${
                  selectedDomain === tab.id ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-800'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by topic, CAPI, Python, SNA..."
              className="w-full bg-white border border-slate-300 rounded-xs pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>
        </div>
      </div>

      {/* Recommended Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCourses.map((course) => {
          const enrolled = isEnrolled(course.id);
          const completed = isCompleted(course.id);
          const gapBenefit = getGapClosingBenefit(course);

          return (
            <div
              key={course.id}
              className="bg-white border border-slate-200 rounded-xs p-5 flex flex-col justify-between transition-all hover:border-black shadow-xs group relative"
            >
              <div>
                {/* Provider and Domain Badge */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-800 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-xs truncate font-semibold">
                    {course.source || 'NSSTA TPAC'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {course.level} Level
                  </span>
                </div>

                <h3 className="font-serif text-base font-bold text-slate-900 group-hover:text-black transition-colors line-clamp-2">
                  {course.title}
                </h3>

                <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                  {course.description}
                </p>

                {/* Gap Closing Callout Box */}
                <div className="mt-3.5 p-2 bg-slate-50 border border-slate-200 rounded-xs text-[11px] text-slate-800 flex items-start gap-1.5 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-black shrink-0 mt-0.5" />
                  <span className="font-sans line-clamp-2">{gapBenefit}</span>
                </div>

                {/* Competencies Credited */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {course.targetCompetencies.map((comp, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-mono rounded-xs"
                    >
                      {comp}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom Metadata & Actions */}
              <div className="mt-5 pt-3.5 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-600 font-mono">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{course.duration}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span className="text-slate-900 font-bold">{course.rating || 4.9}</span>
                    <span className="text-[10px]">({course.enrolledCount} enrolled)</span>
                  </span>
                </div>

                {/* CTA Buttons */}
                {completed ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewingCertificateCourse(course)}
                      className="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xs text-xs font-serif font-bold tracking-wide uppercase transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Award className="w-3.5 h-3.5 text-emerald-700" />
                      <span>View Official Certificate</span>
                    </button>
                  </div>
                ) : enrolled ? (
                  <button
                    type="button"
                    onClick={() => setActiveCourseModal(course)}
                    className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 rounded-xs text-xs font-serif font-bold tracking-wide uppercase transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Play className="w-3.5 h-3.5 text-black" />
                    <span>Resume iGOT Modules (In Progress)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleEnroll(course)}
                    className="w-full py-2 px-3 bg-black hover:bg-slate-800 text-white border border-black rounded-xs text-xs font-serif font-bold tracking-wide uppercase transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-white" />
                    <span>Enroll on iGOT &amp; Bridge Gap</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* INTERACTIVE COURSE PLAYER MODAL */}
      {activeCourseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 rounded-xs max-w-3xl w-full text-slate-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-200 p-5 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-600 uppercase tracking-wider font-semibold">
                  <span>iGOT Karmayogi Active Learning Session</span>
                  <span>•</span>
                  <span>{activeCourseModal.courseCode || 'GOV-IND-2025'}</span>
                </div>
                <h2 className="font-serif text-lg sm:text-xl font-bold text-slate-900 mt-1">
                  {activeCourseModal.title}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Instructor Body: {activeCourseModal.instructorOrg}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveCourseModal(null)}
                className="text-slate-500 hover:text-black p-1 text-sm font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Project Mandate Callout */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xs text-xs text-slate-800 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-black shrink-0 mt-0.5" />
                <span>
                  <strong>Target Alignment:</strong> This capacity module directly addresses the statutory requirements of your assigned project:{' '}
                  <strong className="text-slate-900">{assignedProject.title}</strong>. Completing this module credits verified competencies to your official cadre dossier.
                </span>
              </div>

              {/* Curriculum Modules */}
              <div className="space-y-3">
                <h3 className="font-serif text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Course Modules &amp; Civil Service Competency Rubrics:
                </h3>

                <div className="space-y-2">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xs flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-xs bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 font-bold">
                        ✓
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">Module 1: Statutory Frameworks &amp; Methodological Standards</div>
                        <div className="text-[11px] text-slate-500">UN Fundamental Principles &amp; MoSPI National Data Quality Assurance</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-700 font-semibold uppercase">Completed</span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xs flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-xs bg-black text-white flex items-center justify-center font-bold">
                        2
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">Module 2: Practical Implementation &amp; Computational Execution</div>
                        <div className="text-[11px] text-slate-500">Granular protocols for survey sampling, price aggregation, and cloud validation</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-amber-700 font-semibold uppercase">In Progress</span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xs flex items-center justify-between text-xs opacity-75">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-xs bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 font-bold">
                        3
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">Module 3: Verification Assessment &amp; Case Study Scrutiny</div>
                        <div className="text-[11px] text-slate-500">Official civil service scenario test and statistical discrepancy resolution</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Next Up</span>
                  </div>
                </div>
              </div>

              {/* Sample Knowledge Check */}
              <div className="bg-slate-50 border border-slate-200 rounded-xs p-4 space-y-2">
                <span className="text-[10px] font-mono text-slate-600 uppercase tracking-wider block font-semibold">
                  Interactive Knowledge Check
                </span>
                <p className="text-xs font-serif font-bold text-slate-900">
                  Q: When canvassing schedules or calculating indices for {assignedProject.division}, what is the mandatory first-level validation protocol?
                </p>
                <div className="space-y-1.5 text-xs text-slate-700">
                  <label className="flex items-center gap-2 p-2 rounded-xs bg-white border border-slate-200 cursor-pointer">
                    <input type="radio" name="kc" defaultChecked className="accent-black" />
                    <span>Algorithmic range check with automated outlier flag and supervisor re-interview</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-xs bg-white border border-slate-200 cursor-pointer">
                    <input type="radio" name="kc" className="accent-black" />
                    <span>Discretionary manual substitution without audit log</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveCourseModal(null)}
                className="px-4 py-2 text-xs font-mono text-slate-600 hover:text-black cursor-pointer"
              >
                Close Window
              </button>

              <button
                type="button"
                onClick={() => handleCompleteCourse(activeCourseModal)}
                className="px-6 py-2.5 rounded-xs bg-black hover:bg-slate-800 text-white border border-black font-serif text-xs font-bold tracking-wide uppercase transition-all flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Check className="w-4 h-4 text-white" />
                <span>Mark as Completed &amp; Issue Certificate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL iGOT KARMAYOGI CERTIFICATE MODAL */}
      {viewingCertificateCourse && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border-2 border-black rounded-xs max-w-2xl w-full text-slate-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* National Tricolor Top Stripe */}
            <div className="h-2 w-full grid grid-cols-3">
              <div className="bg-[#ff9933]" />
              <div className="bg-[#ffffff]" />
              <div className="bg-[#138808]" />
            </div>

            {/* Certificate Canvas */}
            <div className="p-8 sm:p-10 text-center relative bg-white">
              <div className="inline-flex items-center gap-2 text-slate-800 text-xs font-mono tracking-widest uppercase mb-4 font-semibold">
                <Building2 className="w-4 h-4 text-black" />
                <span>Government of India • Ministry of Statistics &amp; Programme Implementation</span>
              </div>

              <div className="w-14 h-14 mx-auto rounded-xs bg-black border border-black flex items-center justify-center font-serif font-bold text-white text-xl shadow-md mb-3">
                iGOT
              </div>

              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 uppercase tracking-wider">
                Certificate of Competency Mastery
              </h2>
              <p className="text-[11px] font-mono text-slate-600 tracking-widest uppercase mt-1">
                National Programme for Civil Services Capacity Building (Mission Karmayogi)
              </p>

              <div className="my-6 py-4 border-y border-slate-200">
                <p className="text-xs text-slate-600">This officially certifies that gazetted civil service officer</p>
                <div className="text-xl font-serif font-bold text-slate-900 mt-1">
                  {currentProfile.name}
                </div>
                <div className="text-xs font-mono text-slate-600 mt-0.5">
                  {currentProfile.designation} • Cadre ID: {currentProfile.employeeId}
                </div>
                <p className="text-xs text-slate-600 mt-3">
                  has demonstrated verified competency and successfully fulfilled the training requirements for:
                </p>
                <div className="text-base font-serif font-bold text-slate-900 mt-1">
                  {viewingCertificateCourse.title}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Course Code: {viewingCertificateCourse.courseCode || 'iGOT-STAT-2025'} • {viewingCertificateCourse.duration}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xs text-left grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-6">
                <div>
                  <span className="text-[10px] font-mono text-slate-500 block uppercase">Project Alignment:</span>
                  <span className="text-slate-900 font-serif font-medium">{assignedProject.title}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-500 block uppercase">Competency Domain Credited:</span>
                  <span className="text-emerald-700 font-mono font-bold">{viewingCertificateCourse.domain} (+10 pts)</span>
                </div>
              </div>

              {/* Signatures & QR Code */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-left text-xs">
                <div className="space-y-0.5">
                  <div className="text-slate-900 font-serif font-bold">Director General (NSSTA)</div>
                  <div className="text-[10px] font-mono text-slate-500">Training Directorate, MoSPI</div>
                  <div className="text-[9px] font-mono text-slate-700 font-semibold">Digitally Certified under NPCSCB</div>
                </div>

                <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xs">
                  <QrCode className="w-8 h-8 text-black" />
                  <div className="text-[9px] font-mono text-slate-500 leading-tight">
                    <span>Scan to Verify</span>
                    <span className="block text-slate-800 font-semibold">gov.in/verify</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Close Bar */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingCertificateCourse(null)}
                className="px-6 py-2 bg-black hover:bg-slate-800 text-white border border-black rounded-xs text-xs font-serif font-bold tracking-wide uppercase transition-colors cursor-pointer shadow-xs"
              >
                Close Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
