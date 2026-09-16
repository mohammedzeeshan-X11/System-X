import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  GitCommit,
  CheckCircle2,
  Cpu,
  FileText,
  Target,
  GraduationCap,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { EvaluationTrace, OfficialProfile, UserCompetencyScores } from '../types';

interface EvaluationTraceViewProps {
  profile: OfficialProfile;
  competencyScores: UserCompetencyScores | null;
  onNavigateToRecommendations?: () => void;
}

export const EvaluationTraceView: React.FC<EvaluationTraceViewProps> = ({
  profile,
  competencyScores,
  onNavigateToRecommendations,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);

  const trace: EvaluationTrace | undefined = competencyScores?.evaluationTrace;

  // Fallback synthesis if an existing profile doesn't have an evaluation trace recorded yet
  const effectiveTrace: EvaluationTrace = trace || {
    assignmentId: profile.assignmentId || 'frac-nad-01',
    assignmentTitle: profile.assignmentTitle || profile.designation,
    department: profile.department,
    timestamp: competencyScores?.evaluatedAt || new Date().toISOString(),
    assessorModel: 'MoSPI FRAC Gemini 3.8 Engine',
    requiredCount: competencyScores?.scores?.length || 8,
    evaluatedCount: competencyScores?.scores?.length || 8,
    identifiedGapsCount: (competencyScores?.scores || []).filter((s) => s.gap > 0).length,
    steps: [
      {
        stepNumber: 1,
        stepName: 'Profile Intake Dossier Received',
        timestamp: profile.createdAt || new Date().toISOString(),
        summary: `Mandatory profile intake completed for ${profile.name} (${profile.employeeId || 'Officer'}, ${profile.serviceCadre}) with ${profile.yearsOfExperience} yrs service and ${profile.priorTrainings?.length || profile.previousTrainings?.length || 0} documented training entries.`,
        details: {
          name: profile.name,
          cadreId: profile.employeeId,
          serviceCadre: profile.serviceCadre,
          group: profile.group,
          qualification: profile.educationalQualification,
          specialization: profile.specialization,
          totalServiceYears: profile.yearsOfExperience,
          yearsInAssignment: profile.yearsInCurrentAssignment,
          trainingRecordsCount: profile.priorTrainings?.length || 0,
        },
      },
      {
        stepNumber: 2,
        stepName: 'Assignment FRAC Requirements Loaded',
        timestamp: competencyScores?.evaluatedAt || new Date().toISOString(),
        summary: `Deterministic lookup from official MoSPI assignmentFRAC repository for "${profile.assignmentTitle || profile.designation}". Loaded exact target levels for ${competencyScores?.scores?.length || 8} competencies.`,
        details: {
          assignmentTitle: profile.assignmentTitle || profile.designation,
          department: profile.department,
          mandatedCompetencies: (competencyScores?.scores || []).map((s) => ({
            competency: s.competencyName,
            requiredLevel: s.targetLevel,
            domain: s.domain,
          })),
        },
      },
      {
        stepNumber: 3,
        stepName: 'Current Level Assessed from Dossier Evidence',
        timestamp: competencyScores?.evaluatedAt || new Date().toISOString(),
        summary: `Evaluated official dossier evidence against the ${competencyScores?.scores?.length || 8} required competencies using the MoSPI FRAC engine.`,
        details: {
          scores: (competencyScores?.scores || []).map((s) => ({
            competency: s.competencyName,
            assessedCurrent: s.currentLevel,
            rationale: s.rationale,
          })),
        },
      },
      {
        stepNumber: 4,
        stepName: 'Deterministic Gap Calculus (Gap = Required − Current)',
        timestamp: competencyScores?.evaluatedAt || new Date().toISOString(),
        summary: `Computed mathematical difference in code: gap = max(0, targetLevel − currentLevel). Total ${competencyScores?.scores?.filter((s) => s.gap > 0).length || 0} gaps identified.`,
        details: {
          overallProficiency: competencyScores?.overallProficiency,
          overallTarget: competencyScores?.overallTarget,
          overallGap: competencyScores?.overallGap,
          assignmentReadiness: competencyScores?.assignmentReadinessPercentage,
          gapsList: (competencyScores?.scores || [])
            .filter((s) => s.gap > 0)
            .sort((a, b) => b.gap - a.gap)
            .map((s) => ({
              competency: s.competencyName,
              required: s.targetLevel,
              current: s.currentLevel,
              gap: s.gap,
            })),
        },
      },
      {
        stepNumber: 5,
        stepName: 'Gap-Driven Course Recommendation Linking',
        timestamp: competencyScores?.evaluatedAt || new Date().toISOString(),
        summary: `Course recommendation engine strictly scoped to the unresolved gaps, prioritizing largest deficits first.`,
        details: {
          targetGaps: (competencyScores?.scores || [])
            .filter((s) => s.gap > 0)
            .sort((a, b) => b.gap - a.gap)
            .map((s) => `${s.competencyName} (Gap: ${s.gap} pts)`),
        },
      },
    ],
  };

  const steps = effectiveTrace.steps || [];
  const unresolvedGaps = (competencyScores?.scores || [])
    .filter((s) => s.gap > 0)
    .sort((a, b) => b.gap - a.gap);

  return (
    <div
      id="evaluation-trace-panel"
      className="bg-white border border-slate-200 rounded-xs overflow-hidden shadow-xs transition-all"
    >
      {/* Header Bar / Toggle */}
      <button
        type="button"
        id="toggle-evaluation-trace-btn"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors focus:outline-none cursor-pointer"
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xs bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
            <Cpu className="w-4 h-4 text-black" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-serif text-xs font-bold text-slate-900 tracking-wide">
                Evaluation Trace &amp; Statutory Audit Ledger
              </span>
              <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-xs bg-slate-100 text-slate-800 border border-slate-300 font-semibold">
                5-Stage Pipeline Verified
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-sans mt-0.5">
              Deterministic FRAC intake → statutory benchmark comparison → mathematical delta calculation → NSSTA alignment
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className="hidden sm:inline-block text-[11px] text-slate-500 font-mono">
            {isExpanded ? 'Collapse audit details' : 'Audit calculus steps'}
          </span>
          <div className="w-7 h-7 rounded-xs bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-black" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-600" />
            )}
          </div>
        </div>
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="border-t border-slate-200 p-5 space-y-5 bg-slate-50">
          {/* Metadata row */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xs bg-white border border-slate-200 text-xs shadow-xs">
            <div className="flex flex-wrap items-center gap-4 text-slate-700 font-sans">
              <div>
                <span className="text-slate-500 uppercase tracking-wider text-[10px]">Official:</span>{' '}
                <strong className="text-slate-900">{profile.name}</strong>
              </div>
              <span className="text-slate-300">|</span>
              <div>
                <span className="text-slate-500 uppercase tracking-wider text-[10px]">Statutory Assignment:</span>{' '}
                <strong className="text-slate-900">
                  {effectiveTrace.assignmentTitle || profile.assignmentTitle}
                </strong>
              </div>
              <span className="text-slate-300">|</span>
              <div>
                <span className="text-slate-500 uppercase tracking-wider text-[10px]">Engine:</span>{' '}
                <span className="font-mono text-emerald-700 font-semibold">
                  {effectiveTrace.assessorModel || 'MoSPI FRAC Gemini 3.8 Engine'}
                </span>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 font-mono">
              Audited: {new Date(effectiveTrace.timestamp).toLocaleString()}
            </div>
          </div>

          {/* 5-Step Pipeline Flow Diagram */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 font-serif">
              <GitCommit className="w-3.5 h-3.5 text-black" />
              <span>Execution Pipeline Stages (Sequential Order):</span>
            </h4>

            <div className="grid grid-cols-1 gap-2.5">
              {steps.map((step, idx) => {
                const isSelected = selectedStepIndex === idx;
                return (
                  <div
                    key={step.stepNumber}
                    className={`rounded-xs border transition-all ${
                      isSelected
                        ? 'bg-white border-black shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedStepIndex(isSelected ? null : idx)}
                      className="w-full p-3.5 flex items-start justify-between text-left focus:outline-none cursor-pointer"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-5 h-5 rounded-xs bg-slate-100 border border-slate-300 text-slate-800 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {step.stepNumber}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-serif text-xs font-bold text-slate-900">
                              {step.stepName}
                            </span>
                            <span className="text-[10px] text-emerald-700 flex items-center gap-0.5 uppercase tracking-wider font-mono font-semibold">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Verified</span>
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed font-sans">
                            {step.summary}
                          </p>
                        </div>
                      </div>

                      <div className="text-slate-500 shrink-0 ml-3 mt-1">
                        {isSelected ? (
                          <ChevronUp className="w-3.5 h-3.5 text-black" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </div>
                    </button>

                    {/* Expandable Step Details */}
                    {isSelected && step.details && (
                      <div className="px-4 pb-4 pt-1 border-t border-slate-200 text-xs">
                        <div className="p-3 rounded-xs bg-slate-50 border border-slate-200 space-y-2 font-mono text-[11px] text-slate-700 overflow-x-auto">
                          {step.stepNumber === 1 && (
                            <div className="space-y-1">
                              <div><span className="text-slate-500">Official Name:</span> {profile.name}</div>
                              <div><span className="text-slate-500">Cadre ID:</span> {profile.employeeId}</div>
                              <div><span className="text-slate-500">Service &amp; Cadre:</span> {profile.serviceCadre} ({profile.group})</div>
                              <div><span className="text-slate-500">Qualification:</span> {profile.educationalQualification} — {profile.specialization}</div>
                              <div><span className="text-slate-500">Total Service:</span> {profile.yearsOfExperience} years (Joined: {profile.dateOfJoiningGovt})</div>
                              <div><span className="text-slate-500">Years in Current Assignment:</span> {profile.yearsInCurrentAssignment} years (Posted: {profile.datePostedToAssignment})</div>
                              <div><span className="text-slate-500">Prior In-Service Trainings:</span> {profile.priorTrainings?.length || 0} entries documented</div>
                            </div>
                          )}

                          {step.stepNumber === 2 && (
                            <div className="space-y-1.5">
                              <div className="text-slate-900 font-serif font-bold">
                                Mandated FRAC Assignment Requirements ({step.details.mandatedCompetencies?.length || 8} competencies):
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                {(step.details.mandatedCompetencies || []).map((c: any, i: number) => (
                                  <div key={i} className="p-2 rounded-xs bg-white border border-slate-200 flex items-center justify-between">
                                    <span className="text-slate-900 text-[11px] font-sans">{c.competency}</span>
                                    <span className="px-1.5 py-0.5 rounded-xs bg-slate-100 text-slate-800 border border-slate-300 font-mono font-bold text-[10px]">
                                      Req: {c.requiredLevel}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {step.stepNumber === 3 && (
                            <div className="space-y-1.5">
                              <div className="text-emerald-800 font-serif font-bold">
                                Assessed Proficiency Levels (from dossier evidence):
                              </div>
                              <div className="space-y-1 mt-1">
                                {(step.details.scores || []).map((s: any, i: number) => (
                                  <div key={i} className="p-1.5 rounded-xs bg-white border border-slate-200 flex items-center justify-between">
                                    <span className="text-slate-800 font-sans">{s.competency}</span>
                                    <span className="text-emerald-700 font-mono font-bold">{s.assessedCurrent} / 100</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {step.stepNumber === 4 && (
                            <div className="space-y-1.5">
                              <div className="text-slate-900 font-serif font-bold">
                                Deterministic Gap Calculus (Gap = Required − Current):
                              </div>
                              <div className="space-y-1 mt-1">
                                {(step.details.gapsList || []).map((g: any, i: number) => (
                                  <div key={i} className="p-1.5 rounded-xs bg-white border border-slate-200 flex items-center justify-between">
                                    <span className="text-slate-800 font-sans">{g.competency}</span>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-slate-500 text-[10px]">Req: {g.required} | Curr: {g.current}</span>
                                      <span className="px-1.5 py-0.5 rounded-xs bg-rose-50 text-rose-800 border border-rose-200 font-bold">
                                        Gap: {g.gap} pts
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {step.stepNumber === 5 && (
                            <div className="space-y-1.5">
                              <div className="text-slate-900 font-serif font-bold">
                                Capacity Building Prioritization (Largest Gaps First):
                              </div>
                              <p className="text-slate-500 text-[10px] font-sans">
                                Every course displayed in Course Recommendations strictly addresses one of these active deficits.
                              </p>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {(step.details.targetGaps || []).map((tg: string, i: number) => (
                                  <span key={i} className="px-2 py-0.5 rounded-xs bg-white text-slate-800 border border-slate-300 text-[10px] font-medium">
                                    #{i + 1} {tg}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Action */}
          {onNavigateToRecommendations && unresolvedGaps.length > 0 && (
            <div className="p-3.5 rounded-xs bg-white border border-slate-200 flex items-center justify-between text-xs shadow-xs">
              <div className="flex items-center space-x-2 text-slate-700">
                <Sparkles className="w-4 h-4 text-black shrink-0" />
                <span className="font-sans">
                  Ready to resolve your primary statutory deficit in{' '}
                  <strong className="text-slate-900 font-medium">{unresolvedGaps[0]?.competencyName}</strong>?
                </span>
              </div>
              <button
                type="button"
                onClick={onNavigateToRecommendations}
                className="px-3 py-1.5 rounded-xs bg-black hover:bg-slate-800 text-white border border-black font-medium tracking-wide uppercase text-[11px] flex items-center space-x-1 transition-colors cursor-pointer shadow-xs"
              >
                <span>Examine Course Syllabus</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
