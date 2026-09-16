import React, { useState } from 'react';
import {
  Building2,
  GraduationCap,
  Briefcase,
  Layers,
  Award,
  Plus,
  Trash2,
  CheckCircle,
  Save,
  ArrowRight,
  HelpCircle,
  FileCheck,
  Compass,
  FileText,
  Sliders,
  ShieldAlert,
  PhoneCall,
} from 'lucide-react';
import {
  AssignedProject,
  OfficialProfile,
  PastProjectExperience,
  PriorTraining,
  ServiceCadre,
  ServiceGroup,
} from '../types';
import { ASSIGNED_PROJECTS_CATALOG } from '../data/assignedProjects';
import { computeFramework5Analysis } from '../services/framework5Engine';
import { saveOfficialProfile } from '../services/storage';

interface OfficialProfileIntakeFormProps {
  currentProfile: OfficialProfile;
  onProfileCompiled: (updatedProfile: OfficialProfile) => void;
  onCancel?: () => void;
  onSwitchToVoiceCall?: () => void;
}

export const OfficialProfileIntakeForm: React.FC<OfficialProfileIntakeFormProps> = ({
  currentProfile,
  onProfileCompiled,
  onCancel,
  onSwitchToVoiceCall,
}) => {
  // Section 1: Identity & Designation
  const [name, setName] = useState(currentProfile.name || '');
  const [designation, setDesignation] = useState(currentProfile.designation || '');
  const [employeeId, setEmployeeId] = useState(currentProfile.employeeId || '');
  const [email, setEmail] = useState(currentProfile.email || '');
  const [serviceCadre, setServiceCadre] = useState<ServiceCadre>(currentProfile.serviceCadre || 'Indian Statistical Service');
  const [group, setGroup] = useState<ServiceGroup>(currentProfile.group || 'Group A');
  const [department, setDepartment] = useState(currentProfile.department || 'NSSO Field Operations Division (FOD)');
  const [yearsOfExperience, setYearsOfExperience] = useState<number>(currentProfile.yearsOfExperience || 5);
  const [dateOfJoiningGovt, setDateOfJoiningGovt] = useState(currentProfile.dateOfJoiningGovt || '2019-01-01');

  // Section 2: Educational Qualification
  const [educationalQualification, setEducationalQualification] = useState(
    currentProfile.educationalQualification || 'Master of Statistics (M.Stat)'
  );
  const [specialization, setSpecialization] = useState(
    currentProfile.specialization || 'Sample Survey Design, Econometric Modeling & Data Quality'
  );
  const [academicInstitute, setAcademicInstitute] = useState(
    'Indian Statistical Institute (ISI) / University of Delhi'
  );
  const [publishedTheses, setPublishedTheses] = useState(
    'Estimation of Sub-Regional Sampling Errors in Multi-Stage Household Surveys'
  );

  // Section 3: Past Project Experiences
  const defaultPastProjects: PastProjectExperience[] = currentProfile.pastProjectExperiences && currentProfile.pastProjectExperiences.length > 0
    ? currentProfile.pastProjectExperiences
    : [
        {
          id: 'past-1',
          projectTitle: 'Periodic Labour Force Survey (PLFS) CAPI Pipeline Scrutiny',
          ministryOrWing: 'NSSO (Survey Design and Research Division)',
          role: 'Deputy Director / Technical Scrutiny Lead',
          durationYears: 2.5,
          toolsUsed: ['Python', 'SQL', 'Field CAPI', 'Excel'],
          description: 'Engineered automated scrutiny rules and outlier validation scripts for 100,000+ quarterly household schedules.',
          keyDeliverables: 'Reduced processing turnaround by 35 days and authored national methodology bulletin.'
        },
        {
          id: 'past-2',
          projectTitle: 'All-India Consumer Price Index (CPI) Rural Market Quotation Audit',
          ministryOrWing: 'Price Statistics Division (PSD)',
          role: 'Assistant Director',
          durationYears: 2.0,
          toolsUsed: ['R', 'STATA', 'e-Office', 'GeM'],
          description: 'Supervised 280 field investigators across 600 rural sample points. Standardized item substitution protocols.',
          keyDeliverables: 'Audited monthly price indices with zero discrepancy and trained 120 field personnel.'
        }
      ];

  const [pastProjects, setPastProjects] = useState<PastProjectExperience[]>(defaultPastProjects);

  // Section 4: Self-Attested Skill Ratings across the 5 Parameters (0 - 100)
  const [selfRatings, setSelfRatings] = useState({
    statistical: 78,
    technological: 72,
    digitalGovernance: 70,
    domainSpecific: 80,
    managerial: 75,
  });

  // Section 5: Assigned Project Selection
  const [assignedProjectId, setAssignedProjectId] = useState<string>(
    currentProfile.assignedProjectId || ASSIGNED_PROJECTS_CATALOG[0].id
  );

  // Section 6: Prior In-Service Trainings
  const [priorTrainingsList, setPriorTrainingsList] = useState<PriorTraining[]>(
    currentProfile.priorTrainings && currentProfile.priorTrainings.length > 0
      ? currentProfile.priorTrainings
      : [
          {
            id: 'pt-auto-1',
            trainingName: 'Advanced Sampling & Quality Assurance in Official Statistics',
            provider: 'NSSTA',
            domain: 'Statistical',
            yearCompleted: 2023,
          },
          {
            id: 'pt-auto-2',
            trainingName: 'Python for Data Automation & Geospatial Survey Audit',
            provider: 'iGOT Karmayogi',
            domain: 'Technical',
            yearCompleted: 2024,
          }
        ]
  );

  // Handler for adding a new past project
  const handleAddProject = () => {
    const newProj: PastProjectExperience = {
      id: `past-${Date.now()}`,
      projectTitle: '',
      ministryOrWing: '',
      role: '',
      durationYears: 1,
      toolsUsed: ['Python', 'SQL'],
      description: '',
      keyDeliverables: ''
    };
    setPastProjects([...pastProjects, newProj]);
  };

  const handleRemoveProject = (index: number) => {
    if (pastProjects.length <= 1) {
      alert('At least one past project experience is required for profile compilation.');
      return;
    }
    setPastProjects(pastProjects.filter((_, i) => i !== index));
  };

  const handleUpdateProject = (index: number, field: keyof PastProjectExperience, value: any) => {
    const updated = [...pastProjects];
    updated[index] = { ...updated[index], [field]: value };
    setPastProjects(updated);
  };

  // Submission & Compilation
  const [isCompiling, setIsCompiling] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCompiling(true);

    const selectedProject =
      ASSIGNED_PROJECTS_CATALOG.find((p) => p.id === assignedProjectId) ||
      ASSIGNED_PROJECTS_CATALOG[0];

    // Build the updated official profile
    const updatedProfile: OfficialProfile = {
      ...currentProfile,
      name,
      designation,
      employeeId,
      email,
      serviceCadre,
      group,
      department,
      yearsOfExperience: Number(yearsOfExperience),
      dateOfJoiningGovt,
      educationalQualification,
      specialization: `${specialization} | ${academicInstitute}`,
      pastProjectExperiences: pastProjects,
      assignedProjectId: selectedProject.id,
      priorTrainings: priorTrainingsList,
      onboardingCompleted: true,
      intakeFormCompleted: true,
      lastEvaluatedAt: new Date().toISOString(),
    };

    // Run the 5-Parameter Framework Compilation Engine
    const gapAnalysis = computeFramework5Analysis(updatedProfile, selectedProject);
    updatedProfile.gapAnalysis = gapAnalysis;
    updatedProfile.parameterScores = gapAnalysis.parameters;

    setTimeout(() => {
      saveOfficialProfile(updatedProfile);
      setIsCompiling(false);
      onProfileCompiled(updatedProfile);
    }, 600);
  };

  const activeProject =
    ASSIGNED_PROJECTS_CATALOG.find((p) => p.id === assignedProjectId) ||
    ASSIGNED_PROJECTS_CATALOG[0];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 p-6 rounded-xs shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-xs bg-slate-100 border border-slate-300 text-slate-800 text-[10px] font-mono uppercase tracking-widest mb-1.5 font-semibold">
              <Building2 className="w-3.5 h-3.5 text-black" />
              <span>Official Gazetted Intake Dossier • MoSPI Cadre</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 tracking-tight">
              Comprehensive Official Profile &amp; Project Intake Form
            </h1>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Provide your official designation, academic qualifications, past project records, and assigned project mandate. 
              The system compiles this data against the <strong>5 Framework Parameters</strong> to reveal exact skill gaps and recommend tailored iGOT Karmayogi courses.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3.5 py-1.5 text-xs font-mono text-slate-700 hover:text-black bg-white border border-slate-300 hover:bg-slate-50 rounded-xs shadow-xs"
              >
                Back to Dashboard
              </button>
            )}
          </div>
        </div>

        {/* 5 Framework Parameters Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4 pt-1">
          <div className="p-2 bg-slate-50 border border-slate-200 rounded-xs text-center">
            <span className="text-[10px] font-mono text-slate-500 block uppercase">Parameter 1</span>
            <span className="text-xs font-serif font-bold text-slate-900">Statistical</span>
          </div>
          <div className="p-2 bg-slate-50 border border-slate-200 rounded-xs text-center">
            <span className="text-[10px] font-mono text-slate-500 block uppercase">Parameter 2</span>
            <span className="text-xs font-serif font-bold text-slate-900">Technological</span>
          </div>
          <div className="p-2 bg-slate-50 border border-slate-200 rounded-xs text-center">
            <span className="text-[10px] font-mono text-slate-500 block uppercase">Parameter 3</span>
            <span className="text-xs font-serif font-bold text-slate-900">Digital Governance</span>
          </div>
          <div className="p-2 bg-slate-50 border border-slate-200 rounded-xs text-center">
            <span className="text-[10px] font-mono text-slate-500 block uppercase">Parameter 4</span>
            <span className="text-xs font-serif font-bold text-slate-900">Domain-Specific</span>
          </div>
          <div className="p-2 bg-slate-50 border border-slate-200 rounded-xs text-center">
            <span className="text-[10px] font-mono text-slate-500 block uppercase">Parameter 5</span>
            <span className="text-xs font-serif font-bold text-slate-900">Managerial</span>
          </div>
        </div>
      </div>

      {/* VOICE CALL INTAKE FAST-TRACK BANNER */}
      {onSwitchToVoiceCall && (
        <div className="bg-white border-2 border-black rounded-xs p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xs bg-black text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
              <PhoneCall className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-serif text-sm font-bold text-slate-900">
                  Prefer a Humanized Voice Call Instead of Typing?
                </span>
                <span className="text-[9px] font-mono font-bold uppercase bg-emerald-600 text-white px-2 py-0.5 rounded-xs">
                  AI Calling Agent
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 font-sans max-w-xl leading-relaxed">
                Connect directly with <strong>Aditi</strong> (CBC Senior Liaison Mentor) on a realistic telephone call. Just talk naturally about your posting, analytical software, and projects—the AI agent understands you deeply and automatically compiles your entire profile.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onSwitchToVoiceCall}
            className="px-5 py-2.5 bg-black hover:bg-slate-800 text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xs flex items-center space-x-2 transition-all cursor-pointer shrink-0 shadow-xs hover:scale-[1.02]"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Launch Voice Call Intake</span>
          </button>
        </div>
      )}

      {/* Main Intake Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION 1: CADRE IDENTITY & DESIGNATION */}
        <div className="bg-white border border-slate-200 rounded-xs p-6 shadow-xs">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3 mb-5">
            <div className="w-8 h-8 rounded-xs bg-black text-white flex items-center justify-center font-bold text-sm shadow-xs">
              1
            </div>
            <div>
              <h2 className="font-serif text-base font-bold text-slate-900">
                Cadre Identity &amp; Government Designation
              </h2>
              <p className="text-[11px] text-slate-500">
                Official service grade, ministry wing, and gazetted tenure.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-slate-700 uppercase tracking-wider mb-1 font-semibold">
                Full Name of Official *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xs px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                placeholder="e.g. Rajesh Sharma"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-700 uppercase tracking-wider mb-1 font-semibold">
                Official Designation *
              </label>
              <input
                type="text"
                required
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xs px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                placeholder="e.g. Deputy Director / Senior Statistical Officer"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-700 uppercase tracking-wider mb-1 font-semibold">
                Employee / Cadre ID *
              </label>
              <input
                type="text"
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xs px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                placeholder="e.g. ISS-2018-842"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-700 uppercase tracking-wider mb-1 font-semibold">
                Official Email (gov.in / nic.in) *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xs px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                placeholder="rajesh.sharma@mospi.gov.in"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-700 uppercase tracking-wider mb-1 font-semibold">
                Service Cadre
              </label>
              <select
                value={serviceCadre}
                onChange={(e) => setServiceCadre(e.target.value as ServiceCadre)}
                className="w-full bg-white border border-slate-300 rounded-xs px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
              >
                <option value="Indian Statistical Service">Indian Statistical Service (ISS)</option>
                <option value="Subordinate Statistical Service">Subordinate Statistical Service (SSS)</option>
                <option value="State Statistical Service">State Statistical Service (DES)</option>
                <option value="Central Secretariat Service">Central Secretariat Service (CSS)</option>
                <option value="Other">Other Gazetted Cadre</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-700 uppercase tracking-wider mb-1 font-semibold">
                Gazetted Group &amp; Rank
              </label>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value as ServiceGroup)}
                className="w-full bg-white border border-slate-300 rounded-xs px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
              >
                <option value="Group A">Group A (Director / Joint Director / Deputy Director)</option>
                <option value="Group B">Group B (Senior Statistical Officer / Gazetted)</option>
                <option value="Group C">Group C (Junior Cadre Support)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-mono text-slate-700 uppercase tracking-wider mb-1 font-semibold">
                Current Ministry / Operating Division *
              </label>
              <input
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xs px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                placeholder="e.g. NSSO Field Operations Division (FOD)"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-700 uppercase tracking-wider mb-1 font-semibold">
                Total Years of Govt Service *
              </label>
              <input
                type="number"
                min="0"
                max="40"
                required
                value={yearsOfExperience}
                onChange={(e) => setYearsOfExperience(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-xs px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: EDUCATIONAL QUALIFICATIONS */}
        <div className="bg-white border border-slate-200 rounded-xs p-6 shadow-xs">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3 mb-5">
            <div className="w-8 h-8 rounded-xs bg-black text-white flex items-center justify-center font-bold text-sm shadow-xs">
              2
            </div>
            <div>
              <h2 className="font-serif text-base font-bold text-slate-900">
                Educational Qualifications &amp; Academic Specialization
              </h2>
              <p className="text-[11px] text-slate-500">
                Academic degrees, statistical training institutes, and research specializations.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-slate-700 uppercase tracking-wider mb-1 font-semibold">
                Highest Degree Awarded *
              </label>
              <input
                type="text"
                required
                value={educationalQualification}
                onChange={(e) => setEducationalQualification(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xs px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                placeholder="e.g. Master of Statistics (M.Stat) / Ph.D in Econometrics / B.Tech CSE"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-700 uppercase tracking-wider mb-1 font-semibold">
                Awarding University / Institute *
              </label>
              <input
                type="text"
                required
                value={academicInstitute}
                onChange={(e) => setAcademicInstitute(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xs px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                placeholder="e.g. Indian Statistical Institute (ISI Kolkata) / Delhi School of Economics"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-700 uppercase tracking-wider mb-1 font-semibold">
                Core Academic Specialization *
              </label>
              <input
                type="text"
                required
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xs px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                placeholder="e.g. Multi-stage Sampling Theory, Econometric Modeling, Machine Learning"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-700 uppercase tracking-wider mb-1 font-semibold">
                Theses / Major Statistical Papers Published
              </label>
              <input
                type="text"
                value={publishedTheses}
                onChange={(e) => setPublishedTheses(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xs px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                placeholder="e.g. Microdata Imputation Methods for Non-Response in Consumer Surveys"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: PAST PROJECT EXPERIENCES */}
        <div className="bg-white border border-slate-200 rounded-xs p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xs bg-black text-white flex items-center justify-center font-bold text-sm shadow-xs">
                3
              </div>
              <div>
                <h2 className="font-serif text-base font-bold text-slate-900">
                  Past Project Experiences &amp; Technical Track Record
                </h2>
                <p className="text-[11px] text-slate-500">
                  Document previous postings, surveys conducted, and computational tools utilized.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddProject}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black hover:bg-slate-800 text-white rounded-xs text-xs font-mono font-medium transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>+ Add Past Project</span>
            </button>
          </div>

          <div className="space-y-4">
            {pastProjects.map((project, idx) => (
              <div
                key={project.id || idx}
                className="bg-slate-50 border border-slate-200 rounded-xs p-4 relative transition-colors hover:border-slate-400"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                  <span className="text-xs font-serif font-bold text-slate-900 flex items-center gap-2">
                    <span>Project #{idx + 1}</span>
                    {project.projectTitle && (
                      <span className="text-slate-600 font-sans font-normal truncate max-w-sm">
                        • {project.projectTitle}
                      </span>
                    )}
                  </span>
                  {pastProjects.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveProject(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-xs"
                      title="Remove this project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-mono text-slate-600 uppercase tracking-wider mb-1 font-semibold">
                      Project Title / Survey Mandate *
                    </label>
                    <input
                      type="text"
                      required
                      value={project.projectTitle}
                      onChange={(e) => handleUpdateProject(idx, 'projectTitle', e.target.value)}
                      placeholder="e.g. Periodic Labour Force Survey (PLFS) Sub-Round 2"
                      className="w-full bg-white border border-slate-300 rounded-xs px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-600 uppercase tracking-wider mb-1 font-semibold">
                      Duration (Years) *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="15"
                      required
                      value={project.durationYears}
                      onChange={(e) => handleUpdateProject(idx, 'durationYears', Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-xs px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-600 uppercase tracking-wider mb-1 font-semibold">
                      Ministry / Division / Wing *
                    </label>
                    <input
                      type="text"
                      required
                      value={project.ministryOrWing}
                      onChange={(e) => handleUpdateProject(idx, 'ministryOrWing', e.target.value)}
                      placeholder="e.g. NSSO (FOD) / PSD / NAD"
                      className="w-full bg-white border border-slate-300 rounded-xs px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-600 uppercase tracking-wider mb-1 font-semibold">
                      Your Role in Project *
                    </label>
                    <input
                      type="text"
                      required
                      value={project.role}
                      onChange={(e) => handleUpdateProject(idx, 'role', e.target.value)}
                      placeholder="e.g. Lead Analyst / Field Coordinator / Deputy Director"
                      className="w-full bg-white border border-slate-300 rounded-xs px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-600 uppercase tracking-wider mb-1 font-semibold">
                      Tools &amp; Tech Used (Comma-separated) *
                    </label>
                    <input
                      type="text"
                      required
                      value={project.toolsUsed ? project.toolsUsed.join(', ') : ''}
                      onChange={(e) =>
                        handleUpdateProject(
                          idx,
                          'toolsUsed',
                          e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                        )
                      }
                      placeholder="e.g. Python, SQL, CAPI, R, STATA, Excel"
                      className="w-full bg-white border border-slate-300 rounded-xs px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-mono text-slate-600 uppercase tracking-wider mb-1 font-semibold">
                      Key Responsibilities &amp; Methodology Implemented *
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={project.description}
                      onChange={(e) => handleUpdateProject(idx, 'description', e.target.value)}
                      placeholder="Describe what statistical sampling, validation scripts, or field procedures you executed..."
                      className="w-full bg-white border border-slate-300 rounded-xs px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 4: ASSIGNED PROJECT (MANDATE COMPARISON) */}
        <div className="bg-white border border-slate-200 rounded-xs p-6 shadow-xs border-l-4 border-l-black">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3 mb-5">
            <div className="w-8 h-8 rounded-xs bg-black text-white flex items-center justify-center font-bold text-sm shadow-xs">
              4
            </div>
            <div>
              <h2 className="font-serif text-base font-bold text-slate-900">
                Assigned Project / Mandate Selection
              </h2>
              <p className="text-[11px] text-slate-500">
                Select the gazetted operational project assigned to you to compare against your profile.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono text-slate-700 uppercase tracking-wider mb-2 font-semibold">
                Choose Your Assigned Project Mandate:
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ASSIGNED_PROJECTS_CATALOG.map((proj) => (
                  <label
                    key={proj.id}
                    className={`p-3.5 rounded-xs border cursor-pointer block transition-all ${
                      assignedProjectId === proj.id
                        ? 'bg-slate-100 border-2 border-black shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="radio"
                        name="assignedProjectSelection"
                        value={proj.id}
                        checked={assignedProjectId === proj.id}
                        onChange={() => setAssignedProjectId(proj.id)}
                        className="mt-1 accent-black focus:ring-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-serif font-bold text-xs text-slate-900">
                            {proj.title}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 font-mono mt-0.5 font-medium">
                          {proj.division}
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                          {proj.description}
                        </p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Selected Project Benchmark Requirements Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-xs p-4 mt-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                <span className="font-serif text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-black" />
                  <span>Mandated Benchmarks for: {activeProject.title}</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">{activeProject.division}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="bg-white p-2 rounded-xs border border-slate-200 text-center shadow-xs">
                  <span className="text-[10px] text-slate-500 block font-mono">Statistical Target</span>
                  <span className="text-base font-bold text-slate-900">{activeProject.requiredLevels.statistical}%</span>
                </div>
                <div className="bg-white p-2 rounded-xs border border-slate-200 text-center shadow-xs">
                  <span className="text-[10px] text-slate-500 block font-mono">Technological Target</span>
                  <span className="text-base font-bold text-slate-900">{activeProject.requiredLevels.technological}%</span>
                </div>
                <div className="bg-white p-2 rounded-xs border border-slate-200 text-center shadow-xs">
                  <span className="text-[10px] text-slate-500 block font-mono">Governance Target</span>
                  <span className="text-base font-bold text-slate-900">{activeProject.requiredLevels.digitalGovernance}%</span>
                </div>
                <div className="bg-white p-2 rounded-xs border border-slate-200 text-center shadow-xs">
                  <span className="text-[10px] text-slate-500 block font-mono">Domain Target</span>
                  <span className="text-base font-bold text-slate-900">{activeProject.requiredLevels.domainSpecific}%</span>
                </div>
                <div className="bg-white p-2 rounded-xs border border-slate-200 text-center shadow-xs">
                  <span className="text-[10px] text-slate-500 block font-mono">Managerial Target</span>
                  <span className="text-base font-bold text-slate-900">{activeProject.requiredLevels.managerial}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 5: PRIOR IN-SERVICE TRAININGS */}
        <div className="bg-white border border-slate-200 rounded-xs p-6 shadow-xs">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3 mb-5">
            <div className="w-8 h-8 rounded-xs bg-black text-white flex items-center justify-center font-bold text-sm shadow-xs">
              5
            </div>
            <div>
              <h2 className="font-serif text-base font-bold text-slate-900">
                Prior In-Service Training Certifications
              </h2>
              <p className="text-[11px] text-slate-500">
                Courses completed via iGOT Karmayogi, NSSTA (Greater Noida), ISTM, or international institutes.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {priorTrainingsList.map((tr, i) => (
              <div
                key={tr.id || i}
                className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xs text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-900">{tr.trainingName}</span>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Provider: {tr.provider} • Domain: {tr.domain} • Year: {tr.yearCompleted}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-xs bg-slate-200 text-slate-800 border border-slate-300 text-[10px] font-mono font-medium">
                  Verified
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* SUBMISSION BAR */}
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-black shrink-0" />
            <div className="text-xs text-slate-700">
              <span className="font-bold text-slate-900 block">Official Verification Declaration:</span>
              <span>
                By submitting, your dossier is compiled into the 5-parameter framework and measured against your assigned project.
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isCompiling}
            className="w-full sm:w-auto px-8 py-3 rounded-xs bg-black hover:bg-slate-800 text-white border border-black font-serif text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isCompiling ? (
              <span>Compiling 5-Parameter Framework...</span>
            ) : (
              <>
                <span>Compile Profile &amp; Run Gap Analysis</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
