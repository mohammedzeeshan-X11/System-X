import React, { useState } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  Award,
  TrendingUp,
  Clock,
  Target,
  ArrowRight,
  Sparkles,
  BarChart2,
  PieChart,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Building2,
  Briefcase,
  Layers,
  Calendar,
  ShieldCheck,
  ChevronRight,
  Info,
  UserCheck,
} from 'lucide-react';
import { CompetencyDomain, CompetencyScore, OfficialProfile, UserCompetencyScores } from '../types';
import { getAssignmentFRAC } from '../services/storage';
import { EvaluationTraceView } from './EvaluationTraceView';

interface EmployeeDashboardProps {
  profile: OfficialProfile;
  competencyScores: UserCompetencyScores | null;
  onNavigateToRecommendations: (focusGap?: string) => void;
  onReEvaluate: () => void;
  isEvaluating?: boolean;
  onOpenProfileEditor?: () => void;
  onNavigateToCompetencies?: () => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  profile,
  competencyScores,
  onNavigateToRecommendations,
  onReEvaluate,
  isEvaluating,
  onOpenProfileEditor,
  onNavigateToCompetencies,
}) => {
  const [chartType, setChartType] = useState<'radar' | 'bar'>('radar');
  const [selectedDomain, setSelectedDomain] = useState<CompetencyDomain | 'All'>('All');
  const [scopeMode, setScopeMode] = useState<'assignment' | 'all'>('assignment');

  // Load FRAC record for current assignment
  const fracRecord = getAssignmentFRAC(profile.assignmentId || 'frac-nad-01');

  // Competency lists
  const assignmentScores: CompetencyScore[] = competencyScores?.scores || [];
  const allFrameworkScores: CompetencyScore[] =
    competencyScores?.allFrameworkScores && competencyScores.allFrameworkScores.length > 0
      ? competencyScores.allFrameworkScores
      : assignmentScores;

  const activeScores = scopeMode === 'assignment' ? assignmentScores : allFrameworkScores;

  // Filtered by domain if user clicked a domain chip
  const filteredScores =
    selectedDomain === 'All'
      ? activeScores
      : activeScores.filter((s) => s.domain === selectedDomain);

  // Top ranked skill gaps in the active scope
  const topGaps = [...activeScores]
    .sort((a, b) => b.gap - a.gap)
    .filter((s) => s.gap > 0)
    .slice(0, 6);

  // Calculate dynamic domain summaries for active scope
  const domains: CompetencyDomain[] = [
    'Statistical',
    'Technical',
    'Digital Governance',
    'Behavioural/Managerial',
  ];

  const domainRadarData = domains.map((dom) => {
    const domScores = activeScores.filter((s) => s.domain === dom);
    if (domScores.length === 0) {
      return {
        domain: dom === 'Behavioural/Managerial' ? 'Managerial' : dom,
        current: 50,
        target: 80,
        gap: 30,
      };
    }
    const current = Math.round(domScores.reduce((a, b) => a + b.currentLevel, 0) / domScores.length);
    const target = Math.round(domScores.reduce((a, b) => a + b.targetLevel, 0) / domScores.length);
    return {
      domain: dom === 'Behavioural/Managerial' ? 'Managerial' : dom,
      current,
      target,
      gap: Math.max(0, target - current),
    };
  });

  // Granular bar data
  const granularBarData = filteredScores.slice(0, 10).map((s) => ({
    name: s.competencyName.length > 16 ? s.competencyName.substring(0, 15) + '…' : s.competencyName,
    fullName: s.competencyName,
    Current: s.currentLevel,
    Target: s.targetLevel,
    Gap: s.gap,
    domain: s.domain,
  }));

  // Readiness calculation
  const totalRequired = assignmentScores.length || 1;
  const readyCount = assignmentScores.filter((s) => s.gap <= s.targetLevel * 0.1).length;
  const readinessPercentage =
    competencyScores?.assignmentReadinessPercentage ??
    Math.round((readyCount / totalRequired) * 100);

  const overallProficiency =
    activeScores.length > 0
      ? Math.round(activeScores.reduce((a, b) => a + b.currentLevel, 0) / activeScores.length)
      : 65;
  const overallTarget =
    activeScores.length > 0
      ? Math.round(activeScores.reduce((a, b) => a + b.targetLevel, 0) / activeScores.length)
      : 85;
  const overallGap = Math.max(0, overallTarget - overallProficiency);

  return (
    <div className="space-y-6">
      {/* 1. Official Header & Cadre Status */}
      <div className="bg-white border border-slate-200 rounded-xs p-6 shadow-xs relative">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-semibold uppercase tracking-widest text-slate-700 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              <span>Gazetted Officer Competency Dossier &amp; FRAC Verification</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <span>{profile.name}</span>
              {profile.employeeId && (
                <span className="text-[11px] px-2 py-0.5 rounded-xs bg-slate-100 border border-slate-300 text-slate-700 font-mono font-normal">
                  ID: {profile.employeeId}
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed font-sans">
              <strong className="text-slate-900 font-medium">{profile.serviceCadre || 'Indian Statistical Service'}</strong> ({profile.group || 'Group A'}) • {profile.yearsOfExperience} years in Civil Services • {profile.educationalQualification} ({profile.specialization || 'Statistics'})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReEvaluate}
              disabled={isEvaluating}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xs text-xs font-medium flex items-center space-x-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              title="Recalibrate profile using Gemini FRAC engine"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin text-black' : 'text-slate-500'}`} />
              <span>{isEvaluating ? 'Calibrating...' : 'Recalibrate Baseline'}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateToRecommendations()}
              className="px-4 py-2 bg-black hover:bg-slate-800 text-white border border-black rounded-xs text-xs font-medium tracking-wide uppercase flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span>View Curriculum Plan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Unmapped Assignment Alert (if assignment not found in assignmentFRAC) */}
      {!fracRecord && (
        <div className="bg-amber-50 border border-amber-200 rounded-xs p-5 text-amber-900 shadow-xs">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-sm font-bold text-amber-900">Statutory Position Pending Mapping</h3>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-xs bg-white text-amber-800 border border-amber-300">
                  FRAC Status: Pending Verification
                </span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed font-sans">
                The assignment position <strong className="text-slate-900">"{profile.assignmentTitle || profile.designation}"</strong> is not yet mapped in the official MoSPI FRAC framework repository.
                Competency benchmarks and gap analyses must run strictly against mapped FRAC assignments to ensure auditable accuracy.
              </p>
              {onOpenProfileEditor && (
                <button
                  type="button"
                  onClick={onOpenProfileEditor}
                  className="mt-1 px-3 py-1.5 rounded-xs bg-black hover:bg-slate-800 text-white text-xs font-medium transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Select Mapped Assignment in Intake Wizard</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. 'YOUR ASSIGNMENT' CARD (CORE FRAC SPECIFICATION) */}
      <div className="bg-white border border-slate-200 rounded-xs p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xs bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 shrink-0 mt-0.5">
              <Briefcase className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-300">
                  {fracRecord?.divisionCode || 'MoSPI'}
                </span>
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Gazetted Assignment Designation</span>
              </div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-1">
                {profile.assignmentTitle || fracRecord?.title || profile.designation}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                <span className="text-slate-900 font-medium">{profile.department}</span>
                {profile.datePostedToAssignment && (
                  <span className="text-slate-500 ml-2">
                    • Posted since: <strong>{profile.datePostedToAssignment}</strong> ({profile.yearsInCurrentAssignment || 1} yrs in role)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Assignment Readiness Metric */}
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xs border border-slate-200 shrink-0">
            <div className="relative flex items-center justify-center">
              <div className="w-11 h-11 rounded-full border-2 border-slate-300 border-t-black border-r-black flex items-center justify-center font-serif text-xs font-bold text-slate-900">
                {readinessPercentage}%
              </div>
            </div>
            <div>
              <div className="text-xs font-serif font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Cadre Readiness</span>
              </div>
              <div className="text-[11px] text-slate-600 font-sans">
                {readyCount} of {totalRequired} statutory benchmarks met
              </div>
            </div>
          </div>
        </div>

        {/* Key Activities Grid */}
        <div className="mt-4 pt-1">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5 font-serif">
            <Layers className="w-3.5 h-3.5 text-black" />
            <span>Statutory Activities &amp; Operational Mandates:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {(fracRecord?.keyActivities || [profile.currentAssignment]).map((act, i) => (
              <div
                key={i}
                className="bg-slate-50 p-2.5 rounded-xs border border-slate-200 text-xs text-slate-700 flex items-start gap-2"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                <span className="leading-snug">{act}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Karmayogi Self-Attestation Quick Callout */}
      <div className="bg-slate-50 border border-slate-200 rounded-xs p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xs bg-white border border-slate-300 flex items-center justify-center text-slate-800 shrink-0 shadow-xs">
            <UserCheck className="w-4 h-4 text-black" />
          </div>
          <div>
            <div className="text-xs font-serif font-bold text-slate-900 flex items-center gap-2">
              <span>Mission Karmayogi Competency Verification Ledger</span>
              <span className="px-2 py-0.5 rounded-xs bg-slate-200 text-slate-800 border border-slate-300 text-[9px] uppercase tracking-wider font-mono font-medium">
                Triad Model
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5 font-sans">
              Audit the three-way comparison: <span className="text-slate-900 font-semibold">FRAC Benchmark</span> vs. <span className="text-slate-900 font-semibold">AI Assessment</span> vs. <span className="text-slate-900 font-semibold">Self-Attestation</span>.
            </p>
          </div>
        </div>

        {onNavigateToCompetencies && (
          <button
            type="button"
            onClick={onNavigateToCompetencies}
            className="px-3.5 py-1.5 rounded-xs bg-black hover:bg-slate-800 text-white border border-black text-xs font-medium tracking-wide uppercase inline-flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer shadow-xs"
          >
            <span>Audit Competencies</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 3. Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Assessed Proficiency */}
        <div className="bg-white border border-slate-200 rounded-xs p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Assessed Proficiency</span>
            <div className="p-1.5 rounded-xs bg-slate-100 text-slate-800 border border-slate-200">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="font-serif text-3xl font-bold text-slate-900">{overallProficiency}</span>
            <span className="text-xs text-slate-500">/ 100</span>
          </div>
          <div className="mt-2.5 w-full bg-slate-100 h-1 border border-slate-200 overflow-hidden rounded-xs">
            <div
              className="bg-black h-full"
              style={{ width: `${overallProficiency}%` }}
            />
          </div>
          <div className="mt-2.5 flex justify-between text-[10px] text-slate-600 font-mono">
            <span>Target: {overallTarget}/100</span>
            <span className="text-slate-900 font-semibold">{readinessPercentage}% Compliance</span>
          </div>
        </div>

        {/* Stat 2: Learning Hours Logged */}
        <div className="bg-white border border-slate-200 rounded-xs p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Certified Hours</span>
            <div className="p-1.5 rounded-xs bg-slate-100 text-emerald-700 border border-slate-200">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="font-serif text-3xl font-bold text-slate-900">
              {profile.learningHoursLogged || 0}
            </span>
            <span className="text-xs text-slate-500">hours</span>
          </div>
          <div className="mt-2 text-[10px] text-emerald-700 flex items-center gap-1 font-medium uppercase tracking-wide">
            <TrendingUp className="w-3 h-3" />
            <span>NSSTA / iGOT Accredited</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 font-mono">
            {profile.enrolledCourseIds?.length || 0} curriculum modules active
          </div>
        </div>

        {/* Stat 3: Top Skill Gaps Active */}
        <div className="bg-white border border-slate-200 rounded-xs p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Priority Deficits</span>
            <div className="p-1.5 rounded-xs bg-slate-100 text-rose-700 border border-slate-200">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="font-serif text-3xl font-bold text-slate-900">{topGaps.length}</span>
            <span className="text-xs text-slate-500">focus areas</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-700 truncate font-serif">
            Top gap: <strong className="text-slate-900 font-medium">{topGaps[0]?.competencyName || 'National Accounts'}</strong>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 font-mono">
            Average delta margin: {overallGap} pts
          </div>
        </div>

        {/* Stat 4: Evaluated Framework Scale */}
        <div className="bg-white border border-slate-200 rounded-xs p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Framework Scale</span>
            <div className="p-1.5 rounded-xs bg-slate-100 text-slate-800 border border-slate-200">
              <Target className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="font-serif text-3xl font-bold text-slate-900">{activeScores.length}</span>
            <span className="text-xs text-slate-500">
              {scopeMode === 'assignment' ? 'Role Roles' : 'MoSPI Total'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-600 truncate">
            {scopeMode === 'assignment'
              ? `${assignmentScores.length} statutory FRAC competencies`
              : 'All 33 civil services framework competencies'}
          </div>
          <div className="mt-2 text-[10px] text-slate-700 font-medium uppercase tracking-wider font-mono">
            Auditable FRAC Baseline
          </div>
        </div>
      </div>

      {/* 3.5. Visible Evaluation Trace (5-Step Sequential Pipeline) */}
      <EvaluationTraceView
        profile={profile}
        competencyScores={competencyScores}
        onNavigateToRecommendations={() => onNavigateToRecommendations()}
      />

      {/* 4. Scope Mode Toggle & Granular Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-slate-200 p-3 rounded-xs text-xs shadow-xs">
        <div className="flex items-center gap-2">
          <span className="font-serif font-semibold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
            <Layers className="w-3.5 h-3.5 text-black" /> Statutory Scope:
          </span>
          <div className="inline-flex rounded-xs p-0.5 bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => setScopeMode('assignment')}
              className={`px-3 py-1 rounded-xs text-[11px] font-medium transition-colors cursor-pointer ${
                scopeMode === 'assignment'
                  ? 'bg-black text-white'
                  : 'text-slate-600 hover:text-black'
              }`}
            >
              Assignment Benchmarks ({assignmentScores.length} competencies)
            </button>
            <button
              type="button"
              onClick={() => setScopeMode('all')}
              className={`px-3 py-1 rounded-xs text-[11px] font-medium transition-colors cursor-pointer ${
                scopeMode === 'all'
                  ? 'bg-black text-white'
                  : 'text-slate-600 hover:text-black'
              }`}
            >
              Full MoSPI Framework (33 competencies)
            </button>
          </div>
        </div>

        <div className="text-[10px] text-slate-500 font-mono">
          {scopeMode === 'assignment'
            ? `Scoped to "${profile.assignmentTitle || fracRecord?.title || 'Current Assignment'}"`
            : 'Auditing entire civil service statistical framework across 12 divisions'}
        </div>
      </div>

      {/* 5. Main Grid: Charts & Top Skill Gaps */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Competency Visualizer Chart */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xs p-5 shadow-xs flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-black" />
                <span>
                  {scopeMode === 'assignment'
                    ? 'Assignment Benchmarks: Target vs. Assessed'
                    : 'Framework Comprehensive Assessment'}
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 font-sans">
                Statutory Target Benchmark vs. AI-Assessed Baseline
              </p>
            </div>

            {/* View Switcher */}
            <div className="flex items-center space-x-2">
              <div className="inline-flex rounded-xs p-0.5 bg-slate-100 border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setChartType('radar')}
                  className={`px-2.5 py-1 rounded-xs text-[11px] font-medium transition-colors cursor-pointer ${
                    chartType === 'radar'
                      ? 'bg-black text-white'
                      : 'text-slate-600 hover:text-black'
                  }`}
                  title="Domain Radar Chart"
                >
                  <PieChart className="w-3 h-3 inline mr-1" />
                  <span>Domain Radar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('bar')}
                  className={`px-2.5 py-1 rounded-xs text-[11px] font-medium transition-colors cursor-pointer ${
                    chartType === 'bar'
                      ? 'bg-black text-white'
                      : 'text-slate-600 hover:text-black'
                  }`}
                  title="Granular Bar Chart"
                >
                  <BarChart2 className="w-3 h-3 inline mr-1" />
                  <span>Competency Bars</span>
                </button>
              </div>
            </div>
          </div>

          {/* Chart Display Container */}
          <div className="h-80 w-full mt-4 flex items-center justify-center">
            {chartType === 'radar' ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={domainRadarData} outerRadius="75%">
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis
                    dataKey="domain"
                    tick={{ fill: '#0f172a', fontSize: 10, fontFamily: 'serif' }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    stroke="#cbd5e1"
                    tick={{ fill: '#64748b', fontSize: 9 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '2px',
                      color: '#0f172a',
                      fontSize: '11px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                    formatter={(value) => <span className="text-slate-800 font-sans font-medium">{value}</span>}
                  />
                  <Radar
                    name="FRAC Target Level"
                    dataKey="target"
                    stroke="#000000"
                    fill="#000000"
                    fillOpacity={0.08}
                    strokeWidth={1.5}
                  />
                  <Radar
                    name="Current Assessed Level"
                    dataKey="current"
                    stroke="#475569"
                    fill="#0f172a"
                    fillOpacity={0.25}
                    strokeWidth={1.5}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col">
                <div className="flex space-x-1.5 mb-2 overflow-x-auto pb-1 text-[10px]">
                  {(['All', 'Statistical', 'Technical', 'Digital Governance', 'Behavioural/Managerial'] as const).map(
                    (dom) => (
                      <button
                        key={dom}
                        type="button"
                        onClick={() => setSelectedDomain(dom)}
                        className={`px-2 py-0.5 rounded-xs whitespace-nowrap transition-colors cursor-pointer ${
                          selectedDomain === dom
                            ? 'bg-black text-white font-medium'
                            : 'bg-slate-100 text-slate-600 border border-slate-200 hover:text-black'
                        }`}
                      >
                        {dom === 'Behavioural/Managerial' ? 'Managerial' : dom}
                      </button>
                    )
                  )}
                </div>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={granularBarData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                      tick={{ fill: '#475569', fontSize: 9 }}
                      angle={-25}
                      textAnchor="end"
                    />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#475569', fontSize: 9 }} domain={[0, 100]} />
                    <Tooltip
                      formatter={(val: any) => [`${val}/100`, '']}
                      labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullName || _label}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '2px',
                        color: '#0f172a',
                        fontSize: '11px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="Current" fill="#0f172a" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Target" fill="#94a3b8" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Domain Breakdown Bars */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 mt-2 border-t border-slate-200 text-xs">
            {domainRadarData.map((d) => (
              <div key={d.domain} className="bg-slate-50 p-2.5 rounded-xs border border-slate-200">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-700 truncate">{d.domain}</div>
                <div className="mt-1 flex items-baseline justify-between text-xs font-mono">
                  <span className="text-slate-900 font-bold">{d.current} <span className="text-[9px] text-slate-500">/100</span></span>
                  <span className="text-rose-700 font-semibold text-[10px]">Δ -{d.gap}</span>
                </div>
                <div className="mt-1.5 w-full bg-slate-200 h-1 rounded-xs overflow-hidden">
                  <div className="bg-black h-full" style={{ width: `${d.current}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 5 Cols: Top Ranked Skill Gaps */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xs p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-black" />
                <span>Priority Skill Gaps ({scopeMode === 'assignment' ? 'Assignment Scope' : 'Framework Scope'})</span>
              </h2>
              <p className="text-[11px] text-slate-500 font-sans">
                Statutory competency delta calculated for this gazetted role
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-xs text-[9px] font-mono uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-300 font-semibold">
              {scopeMode === 'assignment' ? 'FRAC Required' : 'All MoSPI'}
            </span>
          </div>

          {/* Gaps List */}
          <div className="mt-3 divide-y divide-slate-200 flex-1 space-y-1 overflow-y-auto max-h-[380px] pr-1">
            {topGaps.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-700 mx-auto" />
                <p className="text-xs font-medium text-slate-900">No Statutory Deficits Identified</p>
                <p className="text-[11px]">All required competencies meet or exceed FRAC standards.</p>
              </div>
            ) : (
              topGaps.map((item, index) => {
                const priorityClass =
                  item.gap >= 25
                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                    : item.gap >= 15
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-slate-50 text-slate-800 border-slate-300';

                return (
                  <div
                    key={item.competencyId}
                    className="pt-3 pb-2.5 first:pt-1 group flex flex-col space-y-2 hover:bg-slate-50 p-2 rounded-xs transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-2">
                        <span className="w-4 h-4 rounded-xs bg-slate-100 border border-slate-300 text-slate-800 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <div>
                          <div className="text-xs font-medium text-slate-900 font-serif group-hover:text-black transition-colors">
                            {item.competencyName}
                          </div>
                          <div className="text-[10px] text-slate-500 font-sans">
                            Domain: <span className="text-slate-700">{item.domain}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-xs text-[10px] font-mono border ${priorityClass}`}
                        >
                          Delta: -{item.gap} pts
                        </span>
                      </div>
                    </div>

                    {/* AI Assessment Rationale */}
                    {item.rationale && (
                      <div className="ml-6 text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded-xs border border-slate-200 leading-relaxed font-sans italic">
                        "{item.rationale}"
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-600 pl-6 font-mono">
                      <span>
                        Current: <strong className="text-slate-900">{item.currentLevel}</strong> | Target:{' '}
                        <strong className="text-black">{item.targetLevel}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => onNavigateToRecommendations(item.competencyName)}
                        className="text-black hover:text-slate-600 text-[11px] font-serif font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                      >
                        <span>Curriculum</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick CTA to AI Recommendations */}
          <div className="mt-4 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => onNavigateToRecommendations()}
              className="w-full py-2 px-3 bg-black hover:bg-slate-800 text-white border border-black rounded-xs text-xs font-medium tracking-wide uppercase flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span>Bridge Deficits with NSSTA Courses</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
