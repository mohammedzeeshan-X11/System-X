import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Layers,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  Zap,
} from 'lucide-react';
import { OfficialProfile, UserCompetencyScores } from '../types';
import { SEED_COURSES } from '../data/seedData';

interface OnboardingWalkthroughModalProps {
  isOpen: boolean;
  profile: OfficialProfile;
  scores: UserCompetencyScores;
  onFinish: () => void;
}

export const OnboardingWalkthroughModal: React.FC<OnboardingWalkthroughModalProps> = ({
  isOpen,
  profile,
  scores,
  onFinish,
}) => {
  const [currentSlide, setCurrentSlide] = useState<number>(1);

  if (!isOpen) return null;

  const meetingTargetsCount = scores.scores.filter((s) => s.gap <= 0).length;
  const needingDevelopmentCount = scores.scores.filter((s) => s.gap > 0).length;
  const topGaps = [...scores.scores].filter((s) => s.gap > 0).sort((a, b) => b.gap - a.gap);

  // Relevant curated courses count (matching top gaps)
  const gapNames = new Set(topGaps.map((g) => g.competencyName.toLowerCase()));
  const curatedCourses = SEED_COURSES.filter((c) =>
    c.targetCompetencies.some((tc) => gapNames.has(tc.toLowerCase()))
  );
  const curatedCount = Math.max(curatedCourses.length, 5);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-300 rounded-xs max-w-2xl w-full text-slate-800 shadow-2xl overflow-hidden">
        {/* Progress Stepper Header */}
        <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between text-white">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-xs bg-white" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-300">
              Karmayogi Induction Walkthrough • Step {currentSlide} of 4
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-1 rounded-xs transition-all duration-300 ${
                  step === currentSlide
                    ? 'w-6 bg-white'
                    : step < currentSlide
                    ? 'w-2 bg-emerald-400'
                    : 'w-2 bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content Slides */}
        <div className="p-8 sm:p-10 min-h-[380px] flex flex-col justify-between">
          {/* SLIDE 1: Your Assignment */}
          {currentSlide === 1 && (
            <div className="space-y-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-xs bg-slate-100 border border-slate-300 text-slate-800 text-[10px] font-mono font-medium">
                <UserCheck className="w-3.5 h-3.5 text-black" />
                <span>Assignment Verified Under MoSPI Cadre Allocation</span>
              </div>

              <div>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  Your Assignment:
                </h2>
                <div className="font-serif text-xl sm:text-2xl font-bold text-black mt-1">
                  {profile.assignmentTitle || profile.designation}
                </div>
                <div className="text-xs text-slate-500 mt-1 font-sans">
                  Ministry of Statistics &amp; Programme Implementation • {profile.department}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xs border border-slate-200 text-xs shadow-xs">
                <div>
                  <div className="text-[10px] font-serif uppercase tracking-wider text-slate-500">Official Name</div>
                  <div className="font-serif font-bold text-slate-900 mt-0.5">{profile.name}</div>
                </div>
                <div>
                  <div className="text-[10px] font-serif uppercase tracking-wider text-slate-500">Employee ID / Cadre</div>
                  <div className="font-mono text-xs text-slate-800 mt-0.5">
                    {profile.employeeId} ({profile.serviceCadre})
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-serif uppercase tracking-wider text-slate-500">Assignment Tenure</div>
                  <div className="font-mono text-xs text-slate-800 mt-0.5">
                    {profile.yearsInCurrentAssignment} Years
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                Your post is mapped directly to the Government of India&apos;s National Civil Services
                Competency Dictionary. Next, we benchmark your profile against the statutory FRAC
                requirements for this role.
              </p>
            </div>
          )}

          {/* SLIDE 2: The FRAC Framework */}
          {currentSlide === 2 && (
            <div className="space-y-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-xs bg-slate-100 border border-slate-300 text-slate-800 text-[10px] font-mono font-medium">
                <Layers className="w-3.5 h-3.5 text-black" />
                <span>Framework for Roles, Activities, and Competencies (FRAC)</span>
              </div>

              <div>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  The FRAC Framework:
                </h2>
                <div className="text-sm text-slate-600 mt-1 font-sans">
                  Identified <strong className="text-slate-900 font-semibold">{scores.scores.length} statutory competencies</strong> required for your role
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xs bg-slate-50 border border-slate-200 shadow-xs">
                  <div className="text-xs font-serif font-bold text-slate-900">Statistical Domain</div>
                  <div className="text-[11px] text-slate-600 mt-1 font-sans">
                    Survey design, sampling, index numbers, national accounts, and price indices.
                  </div>
                </div>
                <div className="p-3.5 rounded-xs bg-slate-50 border border-slate-200 shadow-xs">
                  <div className="text-xs font-serif font-bold text-slate-900">Technical Domain</div>
                  <div className="text-[11px] text-slate-600 mt-1 font-sans">
                    Python, R, SQL, and automated statistical data validation pipelines.
                  </div>
                </div>
                <div className="p-3.5 rounded-xs bg-slate-50 border border-slate-200 shadow-xs">
                  <div className="text-xs font-serif font-bold text-slate-900">Digital Governance</div>
                  <div className="text-[11px] text-slate-600 mt-1 font-sans">
                    GeM procurement, PFMS accounting, e-Office workflows, and official cybersecurity.
                  </div>
                </div>
                <div className="p-3.5 rounded-xs bg-slate-50 border border-slate-200 shadow-xs">
                  <div className="text-xs font-serif font-bold text-slate-900">Managerial / Behavioural</div>
                  <div className="text-[11px] text-slate-600 mt-1 font-sans">
                    Leadership, stakeholder communication, and cross-departmental coordination.
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                Rather than generic training, every recommendation is tied to the specific roles and
                activities defined in this mandate.
              </p>
            </div>
          )}

          {/* SLIDE 3: Your Competency Gaps */}
          {currentSlide === 3 && (
            <div className="space-y-5">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-xs bg-slate-100 border border-slate-300 text-slate-800 text-[10px] font-mono font-medium">
                <Target className="w-3.5 h-3.5 text-black" />
                <span>Competency Gap Benchmark</span>
              </div>

              <div>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  Your Competency Gaps:
                </h2>
                <div className="text-xs text-slate-600 mt-1 font-sans">
                  You are currently meeting <strong className="text-emerald-700 font-semibold">{meetingTargetsCount}</strong> targets;{' '}
                  <strong className="text-slate-900 font-semibold">{needingDevelopmentCount}</strong> require capacity building.
                </div>
              </div>

              {/* Progress Summary Card */}
              <div className="bg-slate-50 p-4 rounded-xs border border-slate-200 flex items-center justify-between shadow-xs">
                <div>
                  <div className="text-[10px] font-serif uppercase tracking-wider text-slate-500">Overall Assignment Readiness</div>
                  <div className="text-2xl font-mono font-bold text-slate-900 mt-0.5">
                    {scores.assignmentReadinessPercentage}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-serif uppercase tracking-wider text-slate-500">Average Gap</div>
                  <div className="text-lg font-mono font-bold text-black mt-0.5">
                    {scores.overallGap} pts
                  </div>
                </div>
              </div>

              {/* Priority Gaps List */}
              <div className="space-y-2">
                <div className="text-[10px] font-serif uppercase tracking-wider text-slate-700 font-semibold">
                  Top Priority Capacitation Needs:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {topGaps.slice(0, 4).map((g) => (
                    <div
                      key={g.competencyName}
                      className="p-2.5 rounded-xs bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <span className="font-serif text-slate-900 font-medium">{g.competencyName}</span>
                      <span className="px-2 py-0.5 rounded-xs bg-slate-100 text-slate-900 border border-slate-300 text-[10px] font-mono font-bold">
                        -{g.gap} pts gap
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 4: Your Personalized Learning Plan */}
          {currentSlide === 4 && (
            <div className="space-y-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-xs bg-slate-100 border border-slate-300 text-slate-800 text-[10px] font-mono font-medium">
                <Sparkles className="w-3.5 h-3.5 text-black" />
                <span>AI-Curated Learning Roadmap Ready</span>
              </div>

              <div>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  Your Personalized Learning Plan:
                </h2>
                <p className="text-xs text-slate-600 mt-1 font-sans">
                  We&apos;ve curated <strong className="text-emerald-700 font-semibold">{curatedCount} certified courses</strong> from{' '}
                  <strong className="text-slate-900">iGOT Karmayogi</strong> and{' '}
                  <strong className="text-slate-900">NSSTA TPAC</strong> to close these exact gaps.
                </p>
              </div>

              <div className="space-y-3 bg-slate-50 p-4 rounded-xs border border-slate-200 text-xs font-sans">
                <div className="flex items-center space-x-2.5 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    <strong className="text-slate-900 font-serif">Dual-Layer Self-Attestation:</strong> Self-rate your skills alongside AI
                    evaluations in &quot;My Competencies&quot;.
                  </span>
                </div>
                <div className="flex items-center space-x-2.5 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    <strong className="text-slate-900 font-serif">Full Course Lifecycle:</strong> Track progress from Enrolled to Completed, and earn QR-verifiable official certificates.
                  </span>
                </div>
                <div className="flex items-center space-x-2.5 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    <strong className="text-slate-900 font-serif">Career Aspirations:</strong> Declare desired competencies to generate target recommendations for future postings.
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-100 border border-slate-200 rounded-xs text-xs text-slate-700 font-sans">
                Your profile is initialized and ready for deployment under the Mission Karmayogi
                framework.
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-200 mt-6">
            <div>
              {currentSlide > 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentSlide((prev) => prev - 1)}
                  className="px-4 py-2 rounded-xs text-[11px] font-medium tracking-wide uppercase text-slate-700 hover:text-black hover:bg-slate-100 border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>
              )}
            </div>

            <div>
              {currentSlide < 4 ? (
                <button
                  type="button"
                  onClick={() => setCurrentSlide((prev) => prev + 1)}
                  className="px-5 py-2.5 rounded-xs bg-black hover:bg-slate-800 text-white text-[11px] font-medium tracking-wide uppercase flex items-center gap-2 transition-all border border-black cursor-pointer shadow-xs"
                >
                  <span>Next Step</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onFinish}
                  className="px-5 py-2.5 rounded-xs bg-black hover:bg-slate-800 text-white text-[11px] font-medium tracking-wide uppercase flex items-center gap-2 transition-all border border-black cursor-pointer shadow-xs"
                >
                  <Award className="w-4 h-4 text-white" />
                  <span>Enter Dashboard</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
