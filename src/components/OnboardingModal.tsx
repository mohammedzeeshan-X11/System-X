import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Building2,
  Briefcase,
  GraduationCap,
  Award,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Shield,
  Layers,
  Lock,
} from 'lucide-react';
import {
  AssignmentFRAC,
  OfficialProfile,
  PastAssignment,
  PriorTraining,
  UserCompetencyScores,
  UserRole,
} from '../types';
import { ASSIGNMENT_FRAC_DATA, getAssignmentById, getAssignmentsByDepartment } from '../data/assignmentFRAC';
import { saveOfficialProfile, saveUserCompetencies } from '../services/storage';
import { OnboardingWalkthroughModal } from './OnboardingWalkthroughModal';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted: (profile: OfficialProfile, scores: UserCompetencyScores) => void;
  initialData?: Partial<OfficialProfile> | null;
  isMandatory?: boolean;
}

const SERVICE_CADRES = [
  'Indian Statistical Service (ISS)',
  'Subordinate Statistical Service (SSS)',
  'Central Secretariat Service (CSS)',
  'Contractual / Young Professional',
  'Other',
];

const CADRE_GROUPS = [
  'Group A',
  'Group B Gazetted',
  'Group B Non-Gazetted',
  'Group C',
];

const DEPARTMENTS = [
  'Price Statistics Division (PSD)',
  'National Accounts Division (NAD)',
  'NSSO Field Operations Division (FOD)',
  'NSSO Survey Design & Research Division (SDRD)',
  'NSSO Data Processing Division (DPD)',
  'Agricultural Statistics Division (ASD)',
  'Social Statistics Division (SSD)',
  'Data Informatics & Innovation Division (DIID)',
  'National Statistical Systems Training Academy (NSSTA)',
  'Coordination & Administration Division',
];

const QUALIFICATIONS = [
  'Ph.D. Statistics',
  'Master of Statistics (M.Stat)',
  'M.Sc. Statistics',
  'M.A. / M.Sc. Economics/Econometrics',
  'B.Stat / B.Sc. Statistics',
  'B.Tech / M.Tech Computer Science',
  'Master of Computer Applications (MCA)',
  'Master of Business Administration (MBA)',
  'Other Post-Graduate Degree',
  'Graduate Degree',
];

const TRAINING_PROVIDERS = [
  'NSSTA',
  'iGOT Karmayogi',
  'ISTM',
  'IMF / World Bank',
  'UN SIAP',
  'Other',
];

const QUICK_ADD_TRAININGS: { name: string; provider: string; domain: any }[] = [
  { name: 'NSSTA Induction Course for ISS/SSS', provider: 'NSSTA', domain: 'Statistical' },
  { name: 'SNA 2008 & Base Revision Workshop', provider: 'NSSTA', domain: 'Statistical' },
  { name: 'CAPI Field Survey Tools & Scrutiny', provider: 'iGOT Karmayogi', domain: 'Technical' },
  { name: 'Python for Official Statistics & Big Data', provider: 'iGOT Karmayogi', domain: 'Technical' },
  { name: 'Public Procurement & Ethics on GeM', provider: 'ISTM', domain: 'Behavioural/Managerial' },
  { name: 'Cyber Security for Government Officials', provider: 'iGOT Karmayogi', domain: 'Digital Governance' },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onCompleted,
  initialData,
  isMandatory,
}) => {
  const effectiveIsMandatory = Boolean(isMandatory || !initialData?.onboardingCompleted);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Section 1: Identity & Service
  const [name, setName] = useState(initialData?.name || '');
  const [employeeId, setEmployeeId] = useState(initialData?.employeeId || 'ISS-2019-084');
  const [serviceCadre, setServiceCadre] = useState(
    initialData?.serviceCadre || 'Indian Statistical Service (ISS)'
  );
  const [group, setGroup] = useState(initialData?.group || 'Group A');
  const [dateOfJoiningGovt, setDateOfJoiningGovt] = useState(
    initialData?.dateOfJoiningGovt || '2019-09-01'
  );
  const [yearsOfExperience, setYearsOfExperience] = useState<number>(
    initialData?.yearsOfExperience ?? 6
  );
  const [role, setRole] = useState<UserRole>(initialData?.role || 'official');

  // Section 2: Current Assignment (FRAC link)
  const [department, setDepartment] = useState(
    initialData?.department || 'Price Statistics Division (PSD)'
  );
  const [assignmentId, setAssignmentId] = useState(
    initialData?.assignmentId || 'frac-psd-01'
  );
  const [yearsInCurrentAssignment, setYearsInCurrentAssignment] = useState<number>(
    initialData?.yearsInCurrentAssignment ?? 2
  );
  const [datePostedToAssignment, setDatePostedToAssignment] = useState(
    initialData?.datePostedToAssignment || '2023-04-15'
  );

  // Section 3: Qualifications & Experience
  const [educationalQualification, setEducationalQualification] = useState(
    initialData?.educationalQualification || 'Master of Statistics (M.Stat)'
  );
  const [specialization, setSpecialization] = useState(
    initialData?.specialization || 'Econometrics & Index Number Theory'
  );
  const [previousAssignments, setPreviousAssignments] = useState<PastAssignment[]>(
    initialData?.previousAssignments || [
      {
        position: 'Assistant Director',
        department: 'NSSO Survey Design & Research Division (SDRD)',
        durationYears: 3,
      },
    ]
  );
  const [newPastPos, setNewPastPos] = useState('');
  const [newPastDept, setNewPastDept] = useState('');
  const [newPastYears, setNewPastYears] = useState<number>(2);

  // Section 4: Prior In-Service Learning
  const [priorTrainings, setPriorTrainings] = useState<PriorTraining[]>(
    initialData?.priorTrainings || [
      {
        trainingName: 'NSSTA Induction Course for ISS/SSS',
        provider: 'NSSTA',
        domain: 'Statistical',
        yearCompleted: 2020,
      },
      {
        trainingName: 'Price Index Compilation and Scanner Data',
        provider: 'IMF / World Bank',
        domain: 'Statistical',
        yearCompleted: 2022,
      },
      {
        trainingName: 'Python for Official Statistics & Big Data',
        provider: 'iGOT Karmayogi',
        domain: 'Technical',
        yearCompleted: 2023,
      },
    ]
  );

  // Synchronize when initialData or modal open status changes
  useEffect(() => {
    if (initialData && isOpen) {
      setName(initialData.name || '');
      setEmployeeId(initialData.employeeId || '');
      setServiceCadre(initialData.serviceCadre || 'Indian Statistical Service (ISS)');
      setGroup(initialData.group || 'Group A');
      setDateOfJoiningGovt(initialData.dateOfJoiningGovt || '');
      setYearsOfExperience(initialData.yearsOfExperience ?? 0);
      setRole(initialData.role || 'official');

      setDepartment(initialData.department || 'Price Statistics Division (PSD)');
      setAssignmentId(initialData.assignmentId || 'frac-psd-01');
      setYearsInCurrentAssignment(initialData.yearsInCurrentAssignment ?? 0);
      setDatePostedToAssignment(initialData.datePostedToAssignment || '');

      setEducationalQualification(initialData.educationalQualification || '');
      setSpecialization(initialData.specialization || '');
      setPreviousAssignments(initialData.previousAssignments || []);
      setPriorTrainings(initialData.priorTrainings || []);
      setCurrentStep(1);
      setError(null);
    }
  }, [initialData?.id, isOpen]);

  // New training form
  const [newTrName, setNewTrName] = useState('');
  const [newTrProvider, setNewTrProvider] = useState('NSSTA');
  const [newTrDomain, setNewTrDomain] = useState<'Statistical' | 'Technical' | 'Digital Governance' | 'Behavioural/Managerial'>('Statistical');
  const [newTrYear, setNewTrYear] = useState<number>(2024);

  // Status & loading
  const [loading, setLoading] = useState(false);
  const [evalStatus, setEvalStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [walkthroughData, setWalkthroughData] = useState<{
    profile: OfficialProfile;
    scores: UserCompetencyScores;
  } | null>(null);

  // Assignments available for selected division
  const availableAssignments = ASSIGNMENT_FRAC_DATA.filter(
    (a) => a.department === department
  );

  // When department changes, sync assignmentId to first available
  useEffect(() => {
    const matching = ASSIGNMENT_FRAC_DATA.filter((a) => a.department === department);
    if (matching.length > 0 && !matching.some((m) => m.assignmentId === assignmentId)) {
      setAssignmentId(matching[0].assignmentId);
    }
  }, [department]);

  const selectedFRAC = getAssignmentById(assignmentId) || availableAssignments[0] || ASSIGNMENT_FRAC_DATA[0];

  if (!isOpen) return null;

  const handleAddPastAssignment = () => {
    if (!newPastPos.trim() || !newPastDept.trim()) return;
    setPreviousAssignments([
      ...previousAssignments,
      {
        position: newPastPos.trim(),
        department: newPastDept.trim(),
        durationYears: Number(newPastYears) || 1,
      },
    ]);
    setNewPastPos('');
    setNewPastDept('');
    setNewPastYears(2);
  };

  const handleRemovePastAssignment = (idx: number) => {
    setPreviousAssignments(previousAssignments.filter((_, i) => i !== idx));
  };

  const handleAddPriorTraining = () => {
    if (!newTrName.trim()) return;
    setPriorTrainings([
      ...priorTrainings,
      {
        trainingName: newTrName.trim(),
        provider: newTrProvider,
        domain: newTrDomain,
        yearCompleted: Number(newTrYear) || 2023,
      },
    ]);
    setNewTrName('');
  };

  const handleRemovePriorTraining = (idx: number) => {
    setPriorTrainings(priorTrainings.filter((_, i) => i !== idx));
  };

  const handleQuickAddTraining = (item: { name: string; provider: string; domain: any }) => {
    if (priorTrainings.some((t) => t.trainingName.toLowerCase() === item.name.toLowerCase())) return;
    setPriorTrainings([
      ...priorTrainings,
      {
        trainingName: item.name,
        provider: item.provider,
        domain: item.domain,
        yearCompleted: 2023,
      },
    ]);
  };

  const handleAutoFillSample = (sampleType: 'iss-director' | 'sso-field' | 'it-specialist') => {
    if (sampleType === 'iss-director') {
      setName('Dr. Priya Venkataraman');
      setEmployeeId('ISS-2014-023');
      setServiceCadre('Indian Statistical Service (ISS)');
      setGroup('Group A');
      setDateOfJoiningGovt('2014-08-01');
      setYearsOfExperience(11);
      setDepartment('National Accounts Division (NAD)');
      setAssignmentId('frac-nad-01');
      setYearsInCurrentAssignment(3);
      setDatePostedToAssignment('2022-06-01');
      setEducationalQualification('Ph.D. Statistics');
      setSpecialization('Macroeconomic Aggregates & Input-Output Tables');
      setPreviousAssignments([
        { position: 'Deputy Director', department: 'Price Statistics Division (PSD)', durationYears: 4 },
        { position: 'Assistant Director', department: 'Social Statistics Division (SSD)', durationYears: 4 },
      ]);
      setPriorTrainings([
        { trainingName: 'System of National Accounts (SNA 2008) Advanced', provider: 'IMF / World Bank', domain: 'Statistical', yearCompleted: 2021 },
        { trainingName: 'Input-Output Modeling & Supply Use Tables', provider: 'UN SIAP', domain: 'Statistical', yearCompleted: 2022 },
        { trainingName: 'Executive Leadership in Civil Services', provider: 'ISTM', domain: 'Behavioural/Managerial', yearCompleted: 2023 },
      ]);
    } else if (sampleType === 'sso-field') {
      setName('Sunil Kumar Yadav');
      setEmployeeId('SSS-2020-412');
      setServiceCadre('Subordinate Statistical Service (SSS)');
      setGroup('Group B Gazetted');
      setDateOfJoiningGovt('2020-02-15');
      setYearsOfExperience(5);
      setDepartment('NSSO Field Operations Division (FOD)');
      setAssignmentId('frac-fod-01');
      setYearsInCurrentAssignment(2);
      setDatePostedToAssignment('2023-01-10');
      setEducationalQualification('Master of Statistics (M.Stat)');
      setSpecialization('Survey Sampling & CAPI Systems');
      setPreviousAssignments([
        { position: 'Junior Statistical Officer', department: 'NSSO Field Operations Division (FOD)', durationYears: 3 },
      ]);
      setPriorTrainings([
        { trainingName: 'NSSTA Induction Course for ISS/SSS', provider: 'NSSTA', domain: 'Statistical', yearCompleted: 2020 },
        { trainingName: 'CAPI Field Survey Tools & Scrutiny', provider: 'iGOT Karmayogi', domain: 'Technical', yearCompleted: 2022 },
        { trainingName: 'Household Consumer Expenditure Survey Methodology', provider: 'NSSTA', domain: 'Statistical', yearCompleted: 2023 },
      ]);
    } else {
      setName('Amitabh Sen');
      setEmployeeId('IT-2018-091');
      setServiceCadre('Contractual / Young Professional');
      setGroup('Group A');
      setDateOfJoiningGovt('2018-11-01');
      setYearsOfExperience(7);
      setDepartment('Data Informatics & Innovation Division (DIID)');
      setAssignmentId('frac-diid-01');
      setYearsInCurrentAssignment(3);
      setDatePostedToAssignment('2022-03-01');
      setEducationalQualification('B.Tech / M.Tech Computer Science');
      setSpecialization('Enterprise Data Pipelines & API Platforms');
      setPreviousAssignments([
        { position: 'Senior Data Engineer', department: 'NIC / MeitY', durationYears: 4 },
      ]);
      setPriorTrainings([
        { trainingName: 'Python for Official Statistics & Big Data', provider: 'iGOT Karmayogi', domain: 'Technical', yearCompleted: 2021 },
        { trainingName: 'Digital Public Infrastructure & Data Standards', provider: 'iGOT Karmayogi', domain: 'Digital Governance', yearCompleted: 2023 },
        { trainingName: 'Cyber Security for Government Officials', provider: 'iGOT Karmayogi', domain: 'Digital Governance', yearCompleted: 2024 },
      ]);
    }
  };

  const validateStep1 = (): string[] => {
    const missing: string[] = [];
    if (!name.trim()) missing.push('Full Name');
    if (!employeeId.trim()) missing.push('Cadre ID / Employee ID');
    if (!serviceCadre.trim()) missing.push('Service / Cadre');
    if (!group.trim()) missing.push('Group');
    if (!dateOfJoiningGovt.trim()) missing.push('Date of Joining Govt');
    if (
      yearsOfExperience === undefined ||
      yearsOfExperience === null ||
      isNaN(Number(yearsOfExperience)) ||
      Number(yearsOfExperience) < 0
    ) {
      missing.push('Total Years of Service (must be 0 or greater)');
    }
    return missing;
  };

  const validateStep2 = (): string[] => {
    const missing: string[] = [];
    if (!department.trim()) missing.push('Department / Division');
    if (!assignmentId.trim()) missing.push('Assignment / Position (selected from FRAC list)');
    if (!datePostedToAssignment.trim()) missing.push('Date Posted');
    if (
      yearsInCurrentAssignment === undefined ||
      yearsInCurrentAssignment === null ||
      isNaN(Number(yearsInCurrentAssignment)) ||
      Number(yearsInCurrentAssignment) < 0
    ) {
      missing.push('Years in Current Assignment (must be 0 or greater)');
    }
    return missing;
  };

  const validateStep3 = (): string[] => {
    const missing: string[] = [];
    if (!educationalQualification.trim()) missing.push('Highest Educational Qualification');
    if (!specialization.trim()) missing.push('Academic Specialization');
    return missing;
  };

  const validateStep4 = (): string[] => {
    const missing: string[] = [];
    if (priorTrainings.length === 0) {
      missing.push('At least one Prior Training entry (or click "Record None yet")');
    }
    return missing;
  };

  const handleAddNoneYetTraining = () => {
    const exists = priorTrainings.some((t) => t.trainingName.toLowerCase().includes('none yet'));
    if (!exists) {
      const noneEntry: PriorTraining = {
        id: `pt-none-${Date.now()}`,
        trainingName: 'None yet (No prior in-service training attended)',
        provider: 'Other',
        domain: 'Statistical',
        yearCompleted: new Date().getFullYear(),
      };
      setPriorTrainings([...priorTrainings, noneEntry]);
      setError(null);
    }
  };

  const handleNext = () => {
    setError(null);
    if (currentStep === 1) {
      const missing = validateStep1();
      if (missing.length > 0) {
        setError(`Section 1 incomplete. Please provide required fields: ${missing.join(', ')}.`);
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const missing = validateStep2();
      if (missing.length > 0) {
        setError(`Section 2 incomplete. Please provide required fields: ${missing.join(', ')}.`);
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      const missing = validateStep3();
      if (missing.length > 0) {
        setError(`Section 3 incomplete. Please provide required fields: ${missing.join(', ')}.`);
        return;
      }
      setCurrentStep(4);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missingS1 = validateStep1();
    const missingS2 = validateStep2();
    const missingS3 = validateStep3();
    const missingS4 = validateStep4();

    const allMissing = [...missingS1, ...missingS2, ...missingS3, ...missingS4];
    if (allMissing.length > 0) {
      setError(`Cannot establish competency profile. Please complete mandatory fields: ${allMissing.join(', ')}.`);
      if (missingS1.length > 0) setCurrentStep(1);
      else if (missingS2.length > 0) setCurrentStep(2);
      else if (missingS3.length > 0) setCurrentStep(3);
      else setCurrentStep(4);
      return;
    }

    setLoading(true);
    setError(null);
    setEvalStatus('Resolving FRAC role requirements and generating audit-ready baseline...');

    const resolvedFRAC = getAssignmentById(assignmentId) || ASSIGNMENT_FRAC_DATA[0];

    const newProfile: OfficialProfile = {
      id: initialData?.id || `official-${Date.now()}`,
      uid: initialData?.uid || `uid-${Date.now()}`,
      name: name.trim(),
      email: `${name.toLowerCase().replace(/[^a-z0-9]/g, '.') || 'official'}@mospi.gov.in`,
      employeeId: employeeId.trim(),
      serviceCadre,
      group,
      dateOfJoiningGovt,
      designation: resolvedFRAC.title,
      department: resolvedFRAC.department,
      jobRole: resolvedFRAC.title,
      assignmentId: resolvedFRAC.assignmentId,
      assignmentTitle: resolvedFRAC.title,
      currentAssignment: resolvedFRAC.keyActivities[0] || resolvedFRAC.title,
      datePostedToAssignment,
      yearsInCurrentAssignment: Number(yearsInCurrentAssignment) || 0,
      educationalQualification,
      specialization: specialization.trim(),
      yearsOfExperience: Number(yearsOfExperience) || 0,
      previousAssignments,
      priorTrainings,
      previousTrainings: priorTrainings.map((t) => t.trainingName),
      role,
      learningHoursLogged: initialData?.learningHoursLogged || 0,
      enrolledCourseIds: initialData?.enrolledCourseIds || [],
      createdAt: initialData?.createdAt || new Date().toISOString(),
      lastEvaluatedAt: new Date().toISOString(),
      onboardingCompleted: true,
    };

    try {
      // Call Server-side FRAC Competency Evaluation
      const response = await fetch('/api/competency/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: newProfile }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const evalData = await response.json();

      const userScores: UserCompetencyScores = {
        userId: newProfile.id,
        assignmentId: evalData.assignmentId || resolvedFRAC.assignmentId,
        assignmentTitle: evalData.assignmentTitle || resolvedFRAC.title,
        evaluatedAt: evalData.evaluatedAt || new Date().toISOString(),
        overallProficiency: evalData.overallProficiency || 60,
        overallTarget: evalData.overallTarget || 85,
        overallGap: evalData.overallGap || 25,
        assignmentReadinessPercentage: evalData.assignmentReadinessPercentage || 70,
        scores: evalData.scores || [],
        allFrameworkScores: evalData.allFrameworkScores || evalData.scores || [],
        domainSummaries: evalData.domainSummaries || {},
        evaluationTrace: evalData.evaluationTrace,
      };

      // Save to local storage
      saveOfficialProfile(newProfile);
      saveUserCompetencies(userScores);

      setEvalStatus('FRAC competency profile established successfully!');
      setTimeout(() => {
        setLoading(false);
        setWalkthroughData({ profile: newProfile, scores: userScores });
      }, 500);
    } catch (err: any) {
      console.error('Evaluation failed:', err);
      setLoading(false);
      setError('Unable to evaluate profile right now. Please try again.');
    }
  };

  if (walkthroughData) {
    return (
      <OnboardingWalkthroughModal
        isOpen={true}
        profile={walkthroughData.profile}
        scores={walkthroughData.scores}
        onFinish={() => {
          onCompleted(walkthroughData.profile, walkthroughData.scores);
          setWalkthroughData(null);
          onClose();
        }}
      />
    );
  }

  return (
    <div
      id="onboarding-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div
        id="onboarding-modal-card"
        className="bg-white rounded-xs shadow-2xl border border-slate-300 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="bg-white text-slate-900 px-6 py-5 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xs bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-900 font-bold">
              <Shield className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg font-bold tracking-tight text-slate-900">
                  Official Onboarding &amp; FRAC Intake Ledger
                </h2>
                <span className="text-[10px] bg-slate-100 text-slate-800 border border-slate-300 px-2 py-0.5 rounded-xs font-mono font-medium">
                  Mission Karmayogi
                </span>
              </div>
              <p className="text-xs text-slate-600 font-sans">
                MoSPI Framework of Roles, Activities and Competencies (FRAC) Mapping
              </p>
            </div>
          </div>
          {effectiveIsMandatory ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-slate-100 border border-slate-300 text-slate-800 text-[11px] font-mono font-semibold">
              <Lock className="w-3.5 h-3.5" />
              <span>Mandatory Intake</span>
            </div>
          ) : (
            <button
              id="close-onboarding-btn"
              onClick={onClose}
              className="text-slate-500 hover:text-black p-1 rounded-xs hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close Intake Form"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Quick Demo Pre-fill Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-mono text-xs text-slate-700 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-black" /> Demonstration Cadre Profiles:
          </span>
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => handleAutoFillSample('iss-director')}
              className="px-2.5 py-1 rounded-xs bg-white hover:bg-slate-100 text-slate-700 hover:text-black border border-slate-300 transition-colors cursor-pointer shadow-2xs"
            >
              National Accounts (Dir, ISS)
            </button>
            <button
              type="button"
              onClick={() => handleAutoFillSample('sso-field')}
              className="px-2.5 py-1 rounded-xs bg-white hover:bg-slate-100 text-slate-700 hover:text-black border border-slate-300 transition-colors cursor-pointer shadow-2xs"
            >
              NSSO Field Ops (SSO, SSS)
            </button>
            <button
              type="button"
              onClick={() => handleAutoFillSample('it-specialist')}
              className="px-2.5 py-1 rounded-xs bg-white hover:bg-slate-100 text-slate-700 hover:text-black border border-slate-300 transition-colors cursor-pointer shadow-2xs"
            >
              Data Informatics (DIID)
            </button>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between text-xs font-medium text-slate-600 font-serif">
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto w-full text-[11px] uppercase tracking-wider">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setCurrentStep(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xs whitespace-nowrap transition-colors cursor-pointer ${
                currentStep === 1
                  ? 'bg-black text-white font-semibold'
                  : 'text-slate-600 hover:text-black bg-slate-50 border border-slate-200'
              }`}
            >
              <span className={`w-4 h-4 rounded-xs border flex items-center justify-center text-[10px] font-mono ${
                currentStep === 1 ? 'border-white/50 text-white' : 'border-slate-400 text-slate-600'
              }`}>
                1
              </span>
              <span>Identity &amp; Service</span>
            </button>

            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

            <button
              type="button"
              onClick={() => {
                const missing = validateStep1();
                if (missing.length > 0) {
                  setError(`Section 1 incomplete: ${missing.join(', ')}`);
                  return;
                }
                setError(null);
                setCurrentStep(2);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xs whitespace-nowrap transition-colors cursor-pointer ${
                currentStep === 2
                  ? 'bg-black text-white font-semibold'
                  : currentStep > 2
                  ? 'text-emerald-800 bg-emerald-50 border border-emerald-300 font-semibold'
                  : 'text-slate-600 hover:text-black bg-slate-50 border border-slate-200'
              }`}
            >
              <span className={`w-4 h-4 rounded-xs border flex items-center justify-center text-[10px] font-mono ${
                currentStep === 2 ? 'border-white/50 text-white' : 'border-slate-400 text-slate-600'
              }`}>
                2
              </span>
              <span>Current Assignment (FRAC)</span>
            </button>

            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

            <button
              type="button"
              onClick={() => {
                const missing1 = validateStep1();
                if (missing1.length > 0) {
                  setError(`Section 1 incomplete: ${missing1.join(', ')}`);
                  return;
                }
                const missing2 = validateStep2();
                if (missing2.length > 0) {
                  setError(`Section 2 incomplete: ${missing2.join(', ')}`);
                  return;
                }
                setError(null);
                setCurrentStep(3);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xs whitespace-nowrap transition-colors cursor-pointer ${
                currentStep === 3
                  ? 'bg-black text-white font-semibold'
                  : currentStep > 3
                  ? 'text-emerald-800 bg-emerald-50 border border-emerald-300 font-semibold'
                  : 'text-slate-600 hover:text-black bg-slate-50 border border-slate-200'
              }`}
            >
              <span className={`w-4 h-4 rounded-xs border flex items-center justify-center text-[10px] font-mono ${
                currentStep === 3 ? 'border-white/50 text-white' : 'border-slate-400 text-slate-600'
              }`}>
                3
              </span>
              <span>Qualifications &amp; Postings</span>
            </button>

            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

            <button
              type="button"
              onClick={() => {
                const missing1 = validateStep1();
                if (missing1.length > 0) {
                  setError(`Section 1 incomplete: ${missing1.join(', ')}`);
                  return;
                }
                const missing2 = validateStep2();
                if (missing2.length > 0) {
                  setError(`Section 2 incomplete: ${missing2.join(', ')}`);
                  return;
                }
                const missing3 = validateStep3();
                if (missing3.length > 0) {
                  setError(`Section 3 incomplete: ${missing3.join(', ')}`);
                  return;
                }
                setError(null);
                setCurrentStep(4);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xs whitespace-nowrap transition-colors cursor-pointer ${
                currentStep === 4
                  ? 'bg-black text-white font-semibold'
                  : 'text-slate-600 hover:text-black bg-slate-50 border border-slate-200'
              }`}
            >
              <span className={`w-4 h-4 rounded-xs border flex items-center justify-center text-[10px] font-mono ${
                currentStep === 4 ? 'border-white/50 text-white' : 'border-slate-400 text-slate-600'
              }`}>
                4
              </span>
              <span>Prior Learning</span>
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-900 bg-white">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-300 text-rose-900 rounded-xs text-xs flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-700" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: IDENTITY & SERVICE */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-black" /> Section 1: Official Identity &amp; Service Record
                </h3>
                <p className="text-xs text-slate-600 font-sans">
                  Enter your official cadre credentials in the Indian Statistical System.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-700 mb-1">
                    Full Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Sharma"
                    className="w-full text-xs px-3 py-2 rounded-xs border border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-black font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-700 mb-1">
                    Employee / Cadre ID
                  </label>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="e.g. ISS-2018-042 or SSS-2020-119"
                    className="w-full text-xs px-3 py-2 rounded-xs border border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-black font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-700 mb-1">
                    Service / Cadre
                  </label>
                  <select
                    value={serviceCadre}
                    onChange={(e) => setServiceCadre(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xs border border-slate-300 bg-slate-50 text-slate-900 focus:outline-hidden focus:border-black font-sans"
                  >
                    {SERVICE_CADRES.map((cadre) => (
                      <option key={cadre} value={cadre}>
                        {cadre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-700 mb-1">
                    Group Classification
                  </label>
                  <select
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xs border border-slate-300 bg-slate-50 text-slate-900 focus:outline-hidden focus:border-black font-sans"
                  >
                    {CADRE_GROUPS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-700 mb-1">
                    Date of Joining Government Service
                  </label>
                  <input
                    type="date"
                    value={dateOfJoiningGovt}
                    onChange={(e) => setDateOfJoiningGovt(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xs border border-slate-300 bg-slate-50 text-slate-900 focus:outline-hidden focus:border-black font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-700 mb-1">
                    Total Years of Service
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={40}
                    value={yearsOfExperience}
                    onChange={(e) => setYearsOfExperience(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 rounded-xs border border-slate-300 bg-slate-50 text-slate-900 focus:outline-hidden focus:border-black font-mono"
                  />
                </div>
              </div>

              {/* Portal Access Role */}
              <div className="pt-2">
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-700 mb-1">
                  Default Platform Role
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="userRole"
                      value="official"
                      checked={role === 'official'}
                      onChange={() => setRole('official')}
                      className="accent-black"
                    />
                    <span>Statistical Official (Individual Learner)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="userRole"
                      value="admin"
                      checked={role === 'admin'}
                      onChange={() => setRole('admin')}
                      className="accent-black"
                    />
                    <span>Division Head / Administrator (Analytics &amp; Capacity View)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CURRENT ASSIGNMENT (FRAC LINK) */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-black" /> Section 2: Current Assignment &amp; FRAC Mapping
                </h3>
                <p className="text-xs text-slate-600 font-sans">
                  Select your current MoSPI division and specific assignment to bind your target competency profile.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-700 mb-1">
                    Division / Wing <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xs border border-slate-300 bg-slate-50 text-slate-900 focus:outline-hidden focus:border-black font-sans"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-700 mb-1">
                    Specific Assignment / Position <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={assignmentId}
                    onChange={(e) => setAssignmentId(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xs border border-black bg-slate-100 text-slate-900 focus:outline-hidden font-medium"
                  >
                    {availableAssignments.map((frac) => (
                      <option key={frac.assignmentId} value={frac.assignmentId}>
                        {frac.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-700 mb-1">
                    Date Posted to Current Assignment
                  </label>
                  <input
                    type="date"
                    value={datePostedToAssignment}
                    onChange={(e) => setDatePostedToAssignment(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xs border border-slate-300 bg-slate-50 text-slate-900 focus:outline-hidden focus:border-black font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-700 mb-1">
                    Tenure in Current Assignment (Years)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={0.5}
                    value={yearsInCurrentAssignment}
                    onChange={(e) => setYearsInCurrentAssignment(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 rounded-xs border border-slate-300 bg-slate-50 text-slate-900 focus:outline-hidden focus:border-black font-mono"
                  />
                </div>
              </div>

              {/* FRAC Role Preview Card */}
              {selectedFRAC && (
                <div className="mt-4 p-4 rounded-xs bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-xs bg-white text-slate-800 font-mono text-[9px] font-bold border border-slate-300">
                        {selectedFRAC.divisionCode}
                      </span>
                      <h4 className="font-serif text-xs font-bold text-slate-900">
                        FRAC Role Specification: {selectedFRAC.title}
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-slate-800 bg-white px-2 py-0.5 rounded-xs border border-slate-300">
                      {selectedFRAC.requiredCompetencies.length} Required Competencies
                    </span>
                  </div>

                  {/* Key Activities */}
                  <div className="mb-3">
                    <p className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Key Activities &amp; Mandates:
                    </p>
                    <ul className="space-y-1">
                      {selectedFRAC.keyActivities.map((act, i) => (
                        <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5 font-sans">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Top Weighted Competencies */}
                  <div>
                    <p className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Top Target Competencies for this Assignment:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {selectedFRAC.requiredCompetencies
                        .sort((a, b) => b.requiredLevel - a.requiredLevel)
                        .slice(0, 3)
                        .map((rc, i) => (
                          <div
                            key={i}
                            className="bg-white p-2.5 rounded-xs border border-slate-200 shadow-2xs"
                          >
                            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-900 mb-1 font-serif">
                              <span className="truncate">{rc.competencyName}</span>
                              <span className="font-mono text-black font-bold ml-1">
                                {rc.requiredLevel}%
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 block font-mono">
                              {rc.domain} • {rc.importance}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: QUALIFICATIONS & EXPERIENCE */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-black" /> Section 3: Qualifications &amp; Career Postings
                </h3>
                <p className="text-xs text-slate-600 font-sans">
                  Academic qualifications and previous government postings contribute to your assessed baseline.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-700 mb-1">
                    Highest Educational Qualification
                  </label>
                  <select
                    value={educationalQualification}
                    onChange={(e) => setEducationalQualification(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xs border border-slate-300 bg-slate-50 text-slate-900 focus:outline-hidden focus:border-black font-sans"
                  >
                    {QUALIFICATIONS.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-700 mb-1">
                    Academic Specialization / Majors
                  </label>
                  <input
                    type="text"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    placeholder="e.g. Econometrics, Sample Survey, Machine Learning"
                    className="w-full text-xs px-3 py-2 rounded-xs border border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-black font-sans"
                  />
                </div>
              </div>

              {/* Past Assignments / Postings (Repeatable) */}
              <div className="pt-2">
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-700 mb-2">
                  Previous Postings in Government / MoSPI
                </label>

                {previousAssignments.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {previousAssignments.map((p, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xs bg-slate-50 border border-slate-200 text-xs"
                      >
                        <div>
                          <span className="font-serif font-semibold text-slate-900">{p.position}</span>
                          <span className="text-slate-600 font-sans"> — {p.department}</span>
                          <span className="ml-2 px-2 py-0.5 rounded-xs bg-white text-slate-800 border border-slate-300 font-mono text-[10px]">
                            {p.durationYears} {p.durationYears === 1 ? 'year' : 'years'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePastAssignment(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Past Posting Row */}
                <div className="p-3 bg-slate-50 rounded-xs border border-dashed border-slate-300 grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-600 mb-0.5">Position / Designation</label>
                    <input
                      type="text"
                      value={newPastPos}
                      onChange={(e) => setNewPastPos(e.target.value)}
                      placeholder="e.g. Assistant Director"
                      className="w-full text-xs px-2.5 py-1.5 rounded-xs border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-black font-sans"
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-600 mb-0.5">Division / Department</label>
                    <input
                      type="text"
                      value={newPastDept}
                      onChange={(e) => setNewPastDept(e.target.value)}
                      placeholder="e.g. NSSO SDRD or FOD"
                      className="w-full text-xs px-2.5 py-1.5 rounded-xs border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-black font-sans"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-600 mb-0.5">Years</label>
                    <input
                      type="number"
                      min={0.5}
                      max={20}
                      step={0.5}
                      value={newPastYears}
                      onChange={(e) => setNewPastYears(Number(e.target.value))}
                      className="w-full text-xs px-2 py-1.5 rounded-xs border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-black font-mono"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <button
                      type="button"
                      onClick={handleAddPastAssignment}
                      className="w-full py-1.5 bg-black hover:bg-slate-800 text-white rounded-xs flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                      title="Add Past Assignment"
                    >
                      <Plus className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: PRIOR IN-SERVICE LEARNING */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-black" /> Section 4: Prior In-Service Learning &amp; Certifications
                </h3>
                <p className="text-xs text-slate-600 font-sans">
                  Record your completed training courses from NSSTA, iGOT Karmayogi, ISTM, IMF, or UN SIAP.
                </p>
              </div>

              {/* Quick Add Common Trainings */}
              <div>
                <label className="block text-[10px] font-mono font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Click to Quick-Add Official MoSPI Trainings:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_ADD_TRAININGS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleQuickAddTraining(item)}
                      className="text-[11px] px-2.5 py-1 rounded-xs border border-slate-300 bg-white hover:border-black text-slate-700 hover:text-black flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3 h-3 text-black" />
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Training List */}
              <div className="space-y-2">
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-700">
                  Recorded In-Service Trainings ({priorTrainings.length})
                </label>

                {priorTrainings.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-50 border border-slate-200 rounded-xs text-center font-mono">
                    No prior trainings added yet. Use quick-add chips above or add manually below.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {priorTrainings.map((t, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xs bg-slate-50 border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-3.5 h-3.5 text-black shrink-0" />
                          <span className="font-serif font-semibold text-slate-900">{t.trainingName}</span>
                          <span className="px-2 py-0.5 rounded-xs bg-white text-slate-800 border border-slate-300 font-mono text-[10px]">
                            {t.provider}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {t.domain} • {t.yearCompleted}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePriorTraining(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Custom Training Form */}
              <div className="p-3 bg-slate-50 rounded-xs border border-dashed border-slate-300 grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                <div className="sm:col-span-5">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-600 mb-0.5">Training Title</label>
                  <input
                    type="text"
                    value={newTrName}
                    onChange={(e) => setNewTrName(e.target.value)}
                    placeholder="e.g. Big Data Analytics in Official Statistics"
                    className="w-full text-xs px-2.5 py-1.5 rounded-xs border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-black font-sans"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-600 mb-0.5">Provider</label>
                  <select
                    value={newTrProvider}
                    onChange={(e) => setNewTrProvider(e.target.value)}
                    className="w-full text-xs px-2 py-1.5 rounded-xs border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-black font-sans"
                  >
                    {TRAINING_PROVIDERS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-600 mb-0.5">Domain</label>
                  <select
                    value={newTrDomain}
                    onChange={(e: any) => setNewTrDomain(e.target.value)}
                    className="w-full text-xs px-2 py-1.5 rounded-xs border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-black font-sans"
                  >
                    <option value="Statistical">Statistical</option>
                    <option value="Technical">Technical</option>
                    <option value="Digital Governance">Digital Gov</option>
                    <option value="Behavioural/Managerial">Managerial</option>
                  </select>
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-600 mb-0.5">Year</label>
                  <input
                    type="number"
                    min={2000}
                    max={2026}
                    value={newTrYear}
                    onChange={(e) => setNewTrYear(Number(e.target.value))}
                    className="w-full text-xs px-1.5 py-1.5 rounded-xs border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-black font-mono"
                  />
                </div>

                <div className="sm:col-span-1">
                  <button
                    type="button"
                    onClick={handleAddPriorTraining}
                    className="w-full py-1.5 bg-black hover:bg-slate-800 text-white rounded-xs flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                    title="Add Training"
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              {/* Explicit "None yet" option for officials who haven't completed any trainings */}
              <div className="p-3 bg-slate-50 rounded-xs border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-slate-600">
                  <span className="font-serif font-semibold text-slate-900">No prior in-service courses?</span>{' '}
                  Mission Karmayogi requires an explicit declaration rather than an omission.
                </div>
                <button
                  type="button"
                  onClick={handleAddNoneYetTraining}
                  className="px-3 py-1.5 rounded-xs bg-white border border-slate-300 hover:border-black text-slate-800 text-xs font-serif flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Record &quot;None yet&quot;</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
                disabled={loading}
                className="px-4 py-2 rounded-xs border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-medium tracking-wide uppercase flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {effectiveIsMandatory ? (
              <span className="text-[10px] text-slate-700 bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-xs font-mono flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                All 4 sections required before accessing dashboard
              </span>
            ) : (
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-[11px] font-medium tracking-wide uppercase text-slate-500 hover:text-black transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2 rounded-xs bg-black hover:bg-slate-800 text-white text-[11px] font-medium tracking-wide uppercase flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                Next Step <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-5 py-2 rounded-xs bg-black hover:bg-slate-800 text-white text-[11px] font-medium tracking-wide uppercase flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Evaluating FRAC Gap...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-white" />
                    <span>Establish FRAC Baseline</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center z-20 p-6 text-center">
            <div className="w-14 h-14 rounded-xs bg-slate-100 border border-slate-300 flex items-center justify-center mb-4 text-black shadow-xs">
              <Sparkles className="w-7 h-7 text-black" />
            </div>
            <h4 className="font-serif text-sm font-bold text-slate-900 mb-1">
              Executing FRAC 2-Step Competency Evaluation
            </h4>
            <p className="text-xs text-slate-600 max-w-md mb-2 font-sans">{evalStatus}</p>
            <span className="text-[10px] text-slate-700 bg-slate-100 px-3 py-1 rounded-xs border border-slate-300 font-mono">
              Step 1: FRAC Target Lookup • Step 2: Gemini Profiling • Step 3: Explicit Gap Calculus
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
