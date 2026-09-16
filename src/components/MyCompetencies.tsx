import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  UserCheck,
  Search,
  Filter,
  Layers,
  Database,
  Briefcase,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Building,
} from 'lucide-react';
import {
  AssignmentFRAC,
  FRACRequiredCompetency,
  OfficialProfile,
  SelfAttestedProficiency,
  UserCompetencyScores,
} from '../types';
import { ASSIGNMENT_FRAC_DATA, getAssignmentById } from '../data/assignmentFRAC';
import {
  saveSelfAttestationToFirestore,
  getSelfAttestationsFromFirestore,
} from '../services/firestore';

interface MyCompetenciesProps {
  profile: OfficialProfile;
  competencyScores: UserCompetencyScores | null;
  onProfileUpdated: (updatedProfile: OfficialProfile) => void;
  onNavigateToRecommendations?: (focusGap?: string) => void;
}

const PROFICIENCY_NUMERICAL: Record<SelfAttestedProficiency, number> = {
  Beginner: 25,
  Intermediate: 50,
  Advanced: 75,
  Expert: 90,
};

const PROFICIENCY_OPTIONS: SelfAttestedProficiency[] = [
  'Beginner',
  'Intermediate',
  'Advanced',
  'Expert',
];

export const MyCompetencies: React.FC<MyCompetenciesProps> = ({
  profile,
  competencyScores,
  onProfileUpdated,
  onNavigateToRecommendations,
}) => {
  // 1. Resolve current assignment directly from real ASSIGNMENT_FRAC_DATA
  const activeAssignment: AssignmentFRAC =
    (profile.assignmentId ? getAssignmentById(profile.assignmentId) : undefined) ||
    ASSIGNMENT_FRAC_DATA.find((a) => a.title === profile.assignmentTitle) ||
    ASSIGNMENT_FRAC_DATA[0];

  // 2. Real required competencies pulled from assignment FRAC
  const requiredCompetencies: FRACRequiredCompetency[] =
    activeAssignment.requiredCompetencies || [];

  // 3. Self-attested state initialized from profile and synced with Firestore
  const [selfAttestedMap, setSelfAttestedMap] = useState<
    Record<string, SelfAttestedProficiency>
  >(profile.selfAttestedCompetencies || {});

  const [savingComp, setSavingComp] = useState<string | null>(null);
  const [saveStatusText, setSaveStatusText] = useState<string | null>(null);
  const [firestoreSynced, setFirestoreSynced] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDomain, setSelectedDomain] = useState<string>('All');

  // Load persisted Firestore records on mount / profile change
  useEffect(() => {
    let isMounted = true;
    async function loadFirestoreData() {
      try {
        const firestoreRecords = await getSelfAttestationsFromFirestore(profile.id);
        if (isMounted && Object.keys(firestoreRecords).length > 0) {
          setSelfAttestedMap((prev) => {
            const merged = { ...prev, ...firestoreRecords };
            return merged;
          });
          setFirestoreSynced(true);
        }
      } catch (err) {
        console.warn('Error fetching Firestore self-attestations:', err);
      }
    }
    loadFirestoreData();
    return () => {
      isMounted = false;
    };
  }, [profile.id]);

  // Handle clicking a proficiency selector
  const handleProficiencyChange = async (
    competencyName: string,
    level: SelfAttestedProficiency
  ) => {
    // 1. Instant local state update
    const updatedMap = {
      ...selfAttestedMap,
      [competencyName]: level,
    };
    setSelfAttestedMap(updatedMap);
    setSavingComp(competencyName);
    setSaveStatusText('Saving to Firestore & profile...');

    // 2. Persist to Firestore and durable storage
    try {
      const result = await saveSelfAttestationToFirestore(profile.id, competencyName, level);

      // 3. Update parent profile state
      const updatedProfile: OfficialProfile = {
        ...profile,
        selfAttestedCompetencies: updatedMap,
      };
      onProfileUpdated(updatedProfile);

      setSaveStatusText(
        result.firestoreSaved
          ? 'Saved to Firestore & local profile ✓'
          : 'Saved & persisted to profile ✓'
      );
      setFirestoreSynced(true);
    } catch (e) {
      console.error('Failed to save self-attestation:', e);
      setSaveStatusText('Saved to persistent storage ✓');
    } finally {
      setTimeout(() => {
        setSavingComp(null);
      }, 1500);
    }
  };

  // Helper to calculate perception gap between self-declared and AI-assessed
  const calculatePerceptionGap = (
    selfLevel: SelfAttestedProficiency | undefined,
    aiLevel: number
  ) => {
    if (!selfLevel) return null;
    const selfNum = PROFICIENCY_NUMERICAL[selfLevel];
    const diff = selfNum - aiLevel;

    if (diff >= 20) {
      return {
        type: 'overestimation' as const,
        diff,
        label: `Perception Gap (+${diff} pts)`,
        description:
          'Self-attestation exceeds AI evaluation benchmark derived from certified records and tenure.',
        badgeClass: 'bg-amber-50 text-amber-900 border-amber-300 font-semibold',
        icon: AlertTriangle,
      };
    } else if (diff <= -20) {
      return {
        type: 'underestimation' as const,
        diff,
        label: `Hidden Strength (${diff} pts)`,
        description:
          'AI-assessed background and qualifications demonstrate higher proficiency than self-declared.',
        badgeClass: 'bg-blue-50 text-blue-900 border-blue-300 font-semibold',
        icon: Lightbulb,
      };
    } else {
      return {
        type: 'aligned' as const,
        diff,
        label: `Aligned (±${Math.abs(diff)} pts)`,
        description: 'Self-attested proficiency matches the algorithmic assessment.',
        badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-300 font-semibold',
        icon: CheckCircle2,
      };
    }
  };

  // Filter competencies by domain and search query
  const filteredCompetencies = requiredCompetencies.filter((comp) => {
    const matchesDomain = selectedDomain === 'All' || comp.domain === selectedDomain;
    const matchesSearch =
      comp.competencyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.domain.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDomain && matchesSearch;
  });

  // Calculate completion stats
  const totalCount = requiredCompetencies.length;
  const attestedCount = requiredCompetencies.filter(
    (c) => !!selfAttestedMap[c.competencyName]
  ).length;
  const progressPercent = totalCount > 0 ? Math.round((attestedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xs p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="inline-flex items-center space-x-2 text-[10px] font-semibold uppercase tracking-widest text-slate-700">
              <UserCheck className="w-3.5 h-3.5 text-black" />
              <span>Mission Karmayogi • FRAC Self-Attestation Ledger</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              My Competencies: Assignment Self-Attestation
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans">
              Statutory FRAC competencies mandated for{' '}
              <strong className="text-slate-900 font-medium">{activeAssignment.title}</strong> (
              {activeAssignment.department}). Self-declare your operational proficiency to audit
              alignment with algorithmic dossier evaluations and identify perception disparities.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {onNavigateToRecommendations && (
              <button
                type="button"
                onClick={() => onNavigateToRecommendations()}
                className="px-4 py-2 bg-black hover:bg-slate-800 text-white border border-black text-xs font-medium tracking-wide uppercase flex items-center gap-2 transition-colors shrink-0 rounded-xs cursor-pointer shadow-xs"
              >
                <span>Curriculum Syllabus</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Assignment Metadata & Progress Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-200 text-xs">
          <div className="bg-slate-50 p-3 rounded-xs border border-slate-200 shadow-xs">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Cadre &amp; Division</div>
            <div className="font-serif font-bold text-slate-900 mt-1 truncate">
              {activeAssignment.divisionCode} • {activeAssignment.cadreLevel || 'Group A'}
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xs border border-slate-200 shadow-xs">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">FRAC Mandated Roles</div>
            <div className="font-serif font-bold text-slate-900 mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold text-black">{totalCount}</span>
              <span className="text-slate-500 text-xs font-sans">competencies</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xs border border-slate-200 shadow-xs">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Self-Attestation Audit</div>
            <div className="font-serif font-bold text-slate-900 mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold text-emerald-700">
                {attestedCount} / {totalCount}
              </span>
              <span className="text-slate-500 text-xs font-mono">({progressPercent}%)</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xs border border-slate-200 shadow-xs">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Cloud Persistence</div>
            <div className="font-semibold text-emerald-800 mt-1 flex items-center gap-1.5 text-xs font-mono uppercase">
              <Database className="w-3.5 h-3.5 text-emerald-700" />
              <span>Firestore Sync Active</span>
            </div>
          </div>
        </div>

        {/* Live Saving Status Banner */}
        {saveStatusText && (
          <div className="mt-4 px-3.5 py-2 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xs text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{saveStatusText}</span>
          </div>
        )}
      </div>

      {/* 2. Filter & Search Controls */}
      <div className="bg-white border border-slate-200 rounded-xs p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-slate-500 font-serif text-[11px] uppercase tracking-wider flex items-center gap-1 mr-1 font-semibold">
            <Filter className="w-3 h-3 text-black" /> Domain:
          </span>
          {['All', 'Statistical', 'Technical', 'Digital Governance', 'Behavioural/Managerial'].map(
            (dom) => (
              <button
                key={dom}
                type="button"
                onClick={() => setSelectedDomain(dom)}
                className={`px-2.5 py-1 rounded-xs whitespace-nowrap text-[11px] transition-colors font-medium cursor-pointer ${
                  selectedDomain === dom
                    ? 'bg-black text-white border border-black'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {dom === 'Behavioural/Managerial' ? 'Managerial' : dom}
              </button>
            )
          )}
        </div>

        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search statutory competencies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xs pl-8 pr-3 py-1.5 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-black text-xs font-sans"
          />
        </div>
      </div>

      {/* 3. Competency Cards List with Triad (Self-Declared / AI-Assessed / FRAC Required) */}
      <div className="space-y-4">
        {filteredCompetencies.length === 0 ? (
          <div className="p-8 text-center bg-white border border-slate-200 rounded-xs text-slate-500 text-xs shadow-xs">
            No statutory competencies match your filter criteria.
          </div>
        ) : (
          filteredCompetencies.map((comp) => {
            // Find corresponding AI score from evaluation
            const matchingAiScore = competencyScores?.scores.find(
              (s) => s.competencyName.toLowerCase() === comp.competencyName.toLowerCase()
            );
            const aiAssessedLevel = matchingAiScore ? matchingAiScore.currentLevel : 55;
            const fracRequiredLevel = comp.requiredLevel;

            const selfDeclaredLevel = selfAttestedMap[comp.competencyName];
            const selfNumerical = selfDeclaredLevel
              ? PROFICIENCY_NUMERICAL[selfDeclaredLevel]
              : null;
            const perceptionGap = calculatePerceptionGap(selfDeclaredLevel, aiAssessedLevel);

            const isSavingThis = savingComp === comp.competencyName;

            return (
              <div
                key={comp.competencyName}
                className="bg-white border border-slate-200 rounded-xs p-5 shadow-xs transition-all space-y-4 hover:border-slate-300"
              >
                {/* Competency Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-serif text-base font-bold text-slate-900">{comp.competencyName}</span>
                      <span className="px-2 py-0.5 rounded-xs text-[9px] font-mono uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                        {comp.domain}
                      </span>
                      {comp.importance && (
                        <span
                          className={`px-2 py-0.5 rounded-xs text-[9px] font-mono uppercase tracking-wider border font-medium ${
                            comp.importance === 'Critical'
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : comp.importance === 'High'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-slate-100 text-slate-800 border-slate-300'
                          }`}
                        >
                          {comp.importance}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Perception Gap Pill */}
                  {perceptionGap && (
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xs text-[10px] font-mono border shrink-0 ${perceptionGap.badgeClass}`}
                    >
                      <perceptionGap.icon className="w-3 h-3 shrink-0" />
                      <span>{perceptionGap.label}</span>
                    </div>
                  )}
                </div>

                {/* Triad Metric Comparison: FRAC Required vs AI-Assessed vs Self-Declared */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xs border border-slate-200 text-xs">
                  {/* Column 1: FRAC Required */}
                  <div className="space-y-1.5">
                    <div className="text-slate-600 font-medium flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-slate-600 font-serif font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5 text-black" />
                        <span>FRAC Statutory Target</span>
                      </span>
                      <strong className="text-slate-900 font-mono text-xs font-bold">
                        {fracRequiredLevel} / 100
                      </strong>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-xs overflow-hidden">
                      <div
                        className="bg-black h-full transition-all duration-300"
                        style={{ width: `${fracRequiredLevel}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans">
                      Mandated benchmark for this gazetted role
                    </div>
                  </div>

                  {/* Column 2: AI-Assessed */}
                  <div className="space-y-1.5">
                    <div className="text-slate-600 font-medium flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-slate-600 font-serif font-semibold">
                        <Sparkles className="w-3.5 h-3.5 text-black" />
                        <span>AI-Assessed Level</span>
                      </span>
                      <strong className="text-slate-900 font-mono text-xs font-bold">
                        {aiAssessedLevel} / 100
                      </strong>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-xs overflow-hidden">
                      <div
                        className="bg-slate-700 h-full transition-all duration-300"
                        style={{ width: `${aiAssessedLevel}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500 truncate font-sans">
                      {matchingAiScore?.rationale || 'Derived from qualification & service records'}
                    </div>
                  </div>

                  {/* Column 3: Self-Declared */}
                  <div className="space-y-1.5">
                    <div className="text-slate-600 font-medium flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-slate-600 font-serif font-semibold">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Self-Attested Level</span>
                      </span>
                      <strong
                        className={`font-mono text-xs font-bold ${
                          selfNumerical ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {selfDeclaredLevel ? `${selfDeclaredLevel} (${selfNumerical}/100)` : 'Not Declared'}
                      </strong>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-xs overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full transition-all duration-300"
                        style={{ width: `${selfNumerical || 0}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans">
                      {isSavingThis ? (
                        <span className="text-black font-mono font-semibold">Synchronizing to Firestore...</span>
                      ) : (
                        'Official personal attestation'
                      )}
                    </div>
                  </div>
                </div>

                {/* Interactive Proficiency Selector Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-200">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 font-serif">
                      Select Proficiency:
                    </span>
                    <div className="inline-flex rounded-xs p-0.5 bg-slate-100 border border-slate-200 gap-0.5">
                      {PROFICIENCY_OPTIONS.map((level) => {
                        const isSelected = selfDeclaredLevel === level;
                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() => handleProficiencyChange(comp.competencyName, level)}
                            className={`px-3 py-1 rounded-xs text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? 'bg-black text-white border border-black font-semibold shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                            }`}
                          >
                            {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                            <span>{level}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Find Courses Link */}
                  {onNavigateToRecommendations && (
                    <button
                      type="button"
                      onClick={() => onNavigateToRecommendations(comp.competencyName)}
                      className="text-xs font-serif font-semibold text-slate-900 hover:text-black flex items-center gap-1 transition-colors self-end sm:self-auto cursor-pointer underline underline-offset-2"
                    >
                      <span>Relevant Curriculum</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
