import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, Lock, AlertTriangle } from 'lucide-react';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { CourseRecommendations } from './components/CourseRecommendations';
import { QuizGenerator } from './components/QuizGenerator';
import { AdminAnalytics } from './components/AdminAnalytics';
import { CompetencyFrameworkView } from './components/CompetencyFrameworkView';
import { MyCompetencies } from './components/MyCompetencies';
import { OnboardingModal } from './components/OnboardingModal';
import { PortalAuthModal } from './components/PortalAuthModal';
import { OfficialProfileIntakeForm } from './components/OfficialProfileIntakeForm';
import { CallingAgent } from './components/CallingAgent';
import { ProfileProjectGapView } from './components/ProfileProjectGapView';
import { IgotPortalClone } from './components/IgotPortalClone';
import { AdminPortal } from './components/AdminPortal';
import { OfficialProfile, QuizAttempt, UserCompetencyScores, UserRole, CompetencyScore } from './types';
import { RecalibrationEvent } from './components/QuizGenerator';
import {
  getCurrentProfile,
  getUserCompetencies,
  initializeStorage,
  resetAllDataToDefault,
  saveUserCompetencies,
  getRoleOverride,
  saveOfficialProfile,
  setActiveUserId,
  setRoleOverride,
} from './services/storage';
import { computeFramework5Analysis } from './services/framework5Engine';

export default function App() {
  const [profile, setProfile] = useState<OfficialProfile>(() => {
    initializeStorage();
    const current = getCurrentProfile();
    // Ensure 5-parameter analysis is computed
    if (!current.gapAnalysis) {
      current.gapAnalysis = computeFramework5Analysis(current);
      current.parameterScores = current.gapAnalysis.parameters;
    }
    return current;
  });

  const [activeRole, setActiveRole] = useState<UserRole>('official');

  // Default tab on landing page: 5-Parameter Gap Analysis or Intake
  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    return profile.intakeFormCompleted ? 'gapAnalysis' : 'intake';
  });

  const [competencyScores, setCompetencyScores] = useState<UserCompetencyScores | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [focusGap, setFocusGap] = useState<string | undefined>(undefined);
  const [igotInitialDomain, setIgotInitialDomain] = useState<string | undefined>(undefined);

  // Closed-Loop Recalibration Toast Banner state
  const [recalibrationToast, setRecalibrationToast] = useState<{
    show: boolean;
    message: string;
    competency: string;
    fromLevel: number;
    toLevel: number;
  } | null>(null);

  // Load or evaluate competencies whenever active official profile changes
  const evaluateProfile = async (targetProfile: OfficialProfile) => {
    setIsEvaluating(true);
    try {
      const response = await fetch('/api/competency/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: targetProfile }),
      });

      if (response.ok) {
        const data = await response.json();
        const userScores: UserCompetencyScores = {
          userId: targetProfile.id,
          assignmentId: data.assignmentId || targetProfile.assignmentId,
          assignmentTitle: data.assignmentTitle || targetProfile.assignmentTitle || targetProfile.designation,
          evaluatedAt: data.evaluatedAt || new Date().toISOString(),
          overallProficiency: data.overallProficiency || 62,
          overallTarget: data.overallTarget || 82,
          overallGap: data.overallGap || 20,
          assignmentReadinessPercentage: data.assignmentReadinessPercentage || 70,
          scores: data.scores || [],
          allFrameworkScores: data.allFrameworkScores || data.scores || [],
          domainSummaries: data.domainSummaries || {},
          evaluationTrace: data.evaluationTrace,
        };
        saveUserCompetencies(userScores);
        setCompetencyScores(userScores);
      }
    } catch (err) {
      console.error('Failed to evaluate competency profile:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  useEffect(() => {
    const existing = getUserCompetencies(profile.id);
    if (existing) {
      setCompetencyScores(existing);
    } else if (profile.onboardingCompleted) {
      evaluateProfile(profile);
    }
  }, [profile.id]);

  const handleProfileChange = (newProfile: OfficialProfile) => {
    if (!newProfile.gapAnalysis) {
      newProfile.gapAnalysis = computeFramework5Analysis(newProfile);
      newProfile.parameterScores = newProfile.gapAnalysis.parameters;
    }
    setProfile(newProfile);
    const existing = getUserCompetencies(newProfile.id);
    if (existing) {
      setCompetencyScores(existing);
    } else {
      evaluateProfile(newProfile);
    }
  };

  const handleRoleToggle = (newRole: UserRole) => {
    setActiveRole(newRole);
    setRoleOverride(newRole);
    if (newRole === 'admin') {
      setActiveTab('admin');
    } else {
      setActiveTab(profile.intakeFormCompleted ? 'gapAnalysis' : 'intake');
    }
  };

  const handleAuthLoginSuccess = (loggedInProfile: OfficialProfile, role: UserRole) => {
    if (!loggedInProfile.gapAnalysis) {
      loggedInProfile.gapAnalysis = computeFramework5Analysis(loggedInProfile);
      loggedInProfile.parameterScores = loggedInProfile.gapAnalysis.parameters;
    }
    setProfile(loggedInProfile);
    setActiveRole(role);
    setIsAuthModalOpen(false);

    if (role === 'admin') {
      setActiveTab('admin');
    } else {
      setActiveTab(loggedInProfile.intakeFormCompleted ? 'gapAnalysis' : 'intake');
    }
  };

  const handleProfileCompiled = (updatedProfile: OfficialProfile) => {
    setProfile(updatedProfile);
    evaluateProfile(updatedProfile);
    // Transition straight to the 5-parameter gap analysis view!
    setActiveTab('gapAnalysis');
  };

  const handleResetData = () => {
    resetAllDataToDefault();
    const fresh = getCurrentProfile();
    fresh.gapAnalysis = computeFramework5Analysis(fresh);
    setProfile(fresh);
    setActiveRole(fresh.role);
    setActiveTab('intake');
  };

  const handleNavigateToIgot = (domain?: string) => {
    setIgotInitialDomain(domain);
    setActiveTab('igot');
  };

  const handleQuizCompleted = (
    _attempt: QuizAttempt,
    recalibration?: RecalibrationEvent
  ) => {
    const isPass = recalibration ? recalibration.passed : _attempt.percentage >= 60;

    if (isPass) {
      const compName = recalibration?.competencyName || 'Sampling Techniques';
      const fromL = recalibration?.fromLevel || 2;
      const toL = recalibration?.toLevel || 3;

      // 1. Update CompetencyScores (STAT-2 Sampling Techniques: Level 2 -> 3)
      setCompetencyScores((prev) => {
        const base = prev || getUserCompetencies(profile.id);
        if (!base) return null;

        const updateList = (list: CompetencyScore[]) =>
          list.map((s) => {
            if (
              s.competencyId === 'stat-2' ||
              s.competencyName.toLowerCase().includes('sampling')
            ) {
              const newCurrent = 75; // Level 3 (Advanced) on standard 0-100 scale
              const newGap = Math.max(0, s.targetLevel - newCurrent);
              return {
                ...s,
                currentLevel: newCurrent,
                gap: newGap,
                rationale: `Statutory deficit closed following verified assessment. Recalibrated from Level 2 to Level 3 on ${new Date().toLocaleDateString('en-IN')}.`,
              };
            }
            return s;
          });

        const newScores = updateList(base.scores);
        const newAllScores = updateList(base.allFrameworkScores || base.scores);
        const totalCur = newScores.reduce((acc, s) => acc + s.currentLevel, 0);
        const totalTar = newScores.reduce((acc, s) => acc + s.targetLevel, 0);
        const overallProf = Math.round(totalCur / (newScores.length || 1));
        const overallTar = Math.round(totalTar / (newScores.length || 1));
        const overallGap = Math.max(0, overallTar - overallProf);
        const readiness = Math.min(100, Math.round((overallProf / overallTar) * 100));

        const updated: UserCompetencyScores = {
          ...base,
          scores: newScores,
          allFrameworkScores: newAllScores,
          overallProficiency: overallProf,
          overallTarget: overallTar,
          overallGap,
          assignmentReadinessPercentage: readiness,
          evaluatedAt: new Date().toISOString(),
        };

        saveUserCompetencies(updated);
        return updated;
      });

      // 2. Update official profile parameterScores and 5-parameter analysis for Radar Chart
      setProfile((prev) => {
        const updated = { ...prev };
        if (updated.parameterScores) {
          updated.parameterScores = updated.parameterScores.map((param) => {
            if (param.key === 'statistical') {
              const updatedSubSkills = param.subSkills.map((sub) => {
                if (sub.name.toLowerCase().includes('sampling')) {
                  const newSubProfile = 75;
                  return {
                    ...sub,
                    profile: newSubProfile,
                    gap: Math.max(0, sub.target - newSubProfile),
                  };
                }
                return sub;
              });
              const avgProfile = Math.round(
                updatedSubSkills.reduce((acc, s) => acc + s.profile, 0) /
                  (updatedSubSkills.length || 1)
              );
              const newGap = Math.max(0, param.projectTarget - avgProfile);
              return {
                ...param,
                profileScore: avgProfile,
                gap: newGap,
                status: (newGap === 0 ? 'Benchmark Met' : newGap <= 15 ? 'Moderate Gap' : 'Critical Gap') as any,
                subSkills: updatedSubSkills,
              };
            }
            return param;
          });
        }
        updated.gapAnalysis = computeFramework5Analysis(updated);
        saveOfficialProfile(updated);
        return updated;
      });

      // 3. Trigger High-Contrast Toast Banner
      setRecalibrationToast({
        show: true,
        message: 'Competency Recalibrated! Radar Chart & iGOT Pathways Updated.',
        competency: compName,
        fromLevel: fromL,
        toLevel: toL,
      });
    } else {
      const updated = getCurrentProfile();
      setProfile(updated);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-black selection:text-white">
      {/* Institutional Top Header */}
      <Header
        currentProfile={profile}
        activeRole={activeRole}
        onRoleToggle={handleRoleToggle}
        onProfileChange={handleProfileChange}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
        onResetData={handleResetData}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenCallingAgent={() => setActiveTab('callingAgent')}
      />

      {/* 1. HIGH-CONTRAST CLOSED-LOOP RECALIBRATION TOAST BANNER */}
      {recalibrationToast && (
        <div className="bg-black text-white px-4 sm:px-6 py-3.5 border-b-2 border-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in slide-in-from-top duration-200">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-xs bg-white text-black flex items-center justify-center font-bold shrink-0">
              <Sparkles className="w-4 h-4 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-serif font-bold tracking-tight text-white">
                  Competency Recalibrated! Radar Chart &amp; iGOT Pathways Updated.
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs bg-emerald-400 text-black font-bold uppercase">
                  Closed-Loop Active
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-sans mt-0.5">
                Statutory deficit in <strong>"{recalibrationToast.competency}"</strong> updated from Level {recalibrationToast.fromLevel} to Level {recalibrationToast.toLevel}. Official Radar Chart and course recommendations re-ranked in real time.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={() => {
                setActiveTab('gapAnalysis');
                setRecalibrationToast(null);
              }}
              className="px-3 py-1.5 bg-white hover:bg-slate-200 text-black text-xs font-mono font-bold rounded-xs transition-colors cursor-pointer shadow-xs"
            >
              View Radar Chart
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('recommendations');
                setRecalibrationToast(null);
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono font-medium rounded-xs border border-slate-600 transition-colors cursor-pointer"
            >
              View iGOT Pathways
            </button>
            <button
              type="button"
              onClick={() => setRecalibrationToast(null)}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xs transition-colors cursor-pointer"
              aria-label="Dismiss toast"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Layout Container */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto border-x border-slate-200">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          activeRole={activeRole}
          currentProfile={profile}
        />

        {/* Tab Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-[#f8fafc]">
          {/* TAB 1: COMPREHENSIVE PROFILE INTAKE LONG FORM */}
          {activeTab === 'intake' && (
            <OfficialProfileIntakeForm
              currentProfile={profile}
              onProfileCompiled={handleProfileCompiled}
              onCancel={() => setActiveTab('dashboard')}
              onSwitchToVoiceCall={() => setActiveTab('callingAgent')}
            />
          )}

          {/* TAB: AI CALLING AGENT (VOICE INTAKE & PROFILE INTERVIEW) */}
          {activeTab === 'callingAgent' && (
            <CallingAgent
              currentProfile={profile}
              onProfileUpdated={(updated) => {
                setProfile(updated);
                evaluateProfile(updated);
              }}
              onNavigateToTab={(tab) => setActiveTab(tab as NavTab)}
            />
          )}

          {/* TAB 2: 5-PARAMETER GAP ANALYSIS (PROFILE VS ASSIGNED PROJECT) */}
          {activeTab === 'gapAnalysis' && (
            <ProfileProjectGapView
              currentProfile={profile}
              onNavigateToIgot={handleNavigateToIgot}
              onEditProfile={() => setActiveTab('intake')}
              onProfileUpdated={(updated) => {
                setProfile(updated);
                evaluateProfile(updated);
              }}
              onTakeQuiz={() => setActiveTab('quiz')}
            />
          )}

          {/* TAB 3: iGOT KARMAYOGI CLONE PORTAL */}
          {activeTab === 'igot' && (
            <IgotPortalClone
              currentProfile={profile}
              initialDomainFilter={igotInitialDomain}
              onProfileUpdated={(up) => setProfile(up)}
              onBackToGapAnalysis={() => setActiveTab('gapAnalysis')}
            />
          )}

          {/* TAB 4: CADRE ADMINISTRATION & DIRECTORATE OVERSIGHT */}
          {activeTab === 'admin' && (
            <AdminPortal
              onSelectOfficial={(selected) => {
                handleProfileChange(selected);
                setActiveTab('gapAnalysis');
              }}
            />
          )}

          {/* TAB 5: OFFICER DASHBOARD */}
          {activeTab === 'dashboard' && (
            <EmployeeDashboard
              profile={profile}
              competencyScores={competencyScores}
              onNavigateToRecommendations={(gap) => {
                setFocusGap(gap);
                setActiveTab('recommendations');
              }}
              onReEvaluate={() => evaluateProfile(profile)}
              isEvaluating={isEvaluating}
              onOpenProfileEditor={() => setActiveTab('intake')}
              onNavigateToCompetencies={() => setActiveTab('competencies')}
            />
          )}

          {/* TAB 6: MY COMPETENCIES (FRAC TRIAD) */}
          {activeTab === 'competencies' && (
            <MyCompetencies
              profile={profile}
              competencyScores={competencyScores}
              onProfileUpdated={(up) => setProfile(up)}
              onNavigateToRecommendations={(gap) => {
                setFocusGap(gap);
                setActiveTab('recommendations');
              }}
            />
          )}

          {/* TAB 7: GENERAL COURSE RECOMMENDATIONS */}
          {activeTab === 'recommendations' && (
            <CourseRecommendations
              profile={profile}
              competencyScores={competencyScores}
              onProfileUpdated={(up) => setProfile(up)}
              initialFocusGap={focusGap}
              onNavigateToCompetencies={() => setActiveTab('competencies')}
            />
          )}

          {/* TAB 8: ASSESSMENT & VERIFICATION QUIZ */}
          {activeTab === 'quiz' && (
            <QuizGenerator
              profile={profile}
              onQuizCompleted={handleQuizCompleted}
              onNavigateToTab={(tab) => setActiveTab(tab as NavTab)}
            />
          )}

          {/* TAB 9: DIRECTORATE ANALYTICS */}
          {activeTab === 'analytics' && <AdminAnalytics />}

          {/* TAB 10: STATUTORY FRAC DICTIONARY */}
          {activeTab === 'framework' && <CompetencyFrameworkView />}
        </main>
      </div>

      {/* DUAL LOGIN MODAL (ADMIN & USER) */}
      <PortalAuthModal
        isOpen={isAuthModalOpen}
        onLoginSuccess={handleAuthLoginSuccess}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Legacy/Quick Onboarding Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onCompleted={(p, s) => {
          setProfile(p);
          setCompetencyScores(s);
          setIsOnboardingOpen(false);
          setActiveTab('gapAnalysis');
        }}
        initialData={profile}
        isMandatory={false}
      />
    </div>
  );
}
