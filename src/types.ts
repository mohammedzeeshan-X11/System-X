export type UserRole = 'official' | 'admin';

export type CompetencyDomain =
  | 'Statistical'
  | 'Technical'
  | 'Digital Governance'
  | 'Behavioural/Managerial';

export type ServiceCadre =
  | 'Indian Statistical Service'
  | 'Subordinate Statistical Service'
  | 'State Statistical Service'
  | 'Central Secretariat Service'
  | 'Other';

export type ServiceGroup = 'Group A' | 'Group B' | 'Group C';

// -------------------------------------------------------------
// FRAC DATA MODELS (Framework of Roles, Activities & Competencies)
// -------------------------------------------------------------

export interface FRACRequiredCompetency {
  competencyName: string;
  domain: CompetencyDomain;
  requiredLevel: number; // 0 - 100
  importance?: 'Critical' | 'High' | 'Medium';
}

export interface AssignmentFRAC {
  assignmentId: string;
  title: string; // e.g. "Deputy Director – Price Statistics Division"
  department: string;
  divisionCode?: string;
  cadreLevel?: string;
  keyActivities: string[]; // 3-5 activities
  requiredCompetencies: FRACRequiredCompetency[]; // 8-14 relevant subset
}

// -------------------------------------------------------------
// PROFILE MODELS
// -------------------------------------------------------------

export interface PastAssignment {
  id: string;
  position: string;
  department: string;
  durationYears: number;
}

export interface PastProjectExperience {
  id: string;
  projectTitle: string;
  ministryOrWing: string;
  role: string;
  durationYears: number;
  toolsUsed: string[];
  description: string;
  keyDeliverables?: string;
}

export interface AssignedProject {
  id: string;
  title: string;
  division: string;
  description: string;
  keyDeliverables: string[];
  requiredLevels: {
    statistical: number;
    technological: number;
    digitalGovernance: number;
    domainSpecific: number;
    managerial: number;
  };
  mandatedCompetencies?: string[];
}

export type Parameter5Key =
  | 'statistical'
  | 'technological'
  | 'digitalGovernance'
  | 'domainSpecific'
  | 'managerial';

export interface ParameterScore {
  name: string;
  key: Parameter5Key;
  profileScore: number;
  projectTarget: number;
  gap: number;
  status: 'Critical Gap' | 'Moderate Gap' | 'Benchmark Met';
  rationale: string;
  subSkills: { name: string; profile: number; target: number; gap: number }[];
}

export interface ProfileProjectGapAnalysis {
  officialId: string;
  projectId: string;
  projectTitle: string;
  division: string;
  overallReadiness: number;
  averageGap: number;
  parameters: ParameterScore[];
  evaluatedAt: string;
}

export interface PriorTraining {
  id: string;
  trainingName: string;
  provider: 'iGOT Karmayogi' | 'NSSTA' | 'ISTM' | 'Other';
  domain: string;
  yearCompleted: number;
}

export type SelfAttestedProficiency = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export interface DesiredCompetency {
  id: string;
  competencyName: string;
  domain: CompetencyDomain;
  desiredLevel: SelfAttestedProficiency;
  targetYear?: number;
  addedAt: string;
}

export type CourseProgressStatus = 'Not Started' | 'Enrolled' | 'In Progress' | 'Completed';

export interface UserCourseProgress {
  courseId: string;
  userId: string;
  status: CourseProgressStatus;
  enrolledAt?: string;
  startedAt?: string;
  completedAt?: string;
  progressPercentage: number;
  certificateId?: string;
  rating?: number; // 1 - 5
  review?: string;
}

export interface OfficialProfile {
  id: string;
  uid: string;
  name: string;
  email: string;
  employeeId: string;
  serviceCadre: ServiceCadre;
  group: ServiceGroup;
  dateOfJoiningGovt: string;

  // Assignment (FRAC Centerpiece)
  department: string;
  assignmentId: string;
  assignmentTitle: string;
  datePostedToAssignment: string;
  yearsInCurrentAssignment: number;

  // Backward compatibility convenience fields
  designation: string;
  jobRole: string;
  currentAssignment: string;

  // Qualifications & Experience
  educationalQualification: string;
  specialization: string;
  yearsOfExperience: number; // Total years of government service
  previousAssignments: PastAssignment[];
  pastProjectExperiences?: PastProjectExperience[];

  // Assigned Project (Current Mandate to be executed)
  assignedProjectId?: string;
  assignedProjectCustom?: AssignedProject;
  parameterScores?: ParameterScore[];
  gapAnalysis?: ProfileProjectGapAnalysis;
  intakeFormCompleted?: boolean;

  // Prior Learning
  priorTrainings: PriorTraining[];
  previousTrainings: string[]; // Flat strings for legacy/fallback

  // Karmayogi Self-Attested & Desired Competencies
  selfAttestedCompetencies?: Record<string, SelfAttestedProficiency>;
  desiredCompetencies?: DesiredCompetency[];

  role: UserRole;
  learningHoursLogged: number;
  enrolledCourseIds: string[];
  createdAt: string;
  lastEvaluatedAt?: string;
  onboardingCompleted?: boolean;
}

export interface EvaluationTraceStep {
  stepNumber: number;
  stepName: string;
  timestamp: string;
  summary: string;
  details?: Record<string, any>;
}

export interface EvaluationTrace {
  assignmentId: string;
  assignmentTitle: string;
  department: string;
  divisionCode?: string;
  timestamp: string;
  assessorModel?: string;
  requiredCount: number;
  evaluatedCount: number;
  identifiedGapsCount: number;
  steps: EvaluationTraceStep[];
}

export interface CompetencyItem {
  id: string;
  name: string;
  domain: CompetencyDomain;
  description: string;
  standardTargetLevel: number;
  code?: string;
}

export interface CompetencyScore {
  competencyId: string;
  competencyName: string;
  domain: CompetencyDomain;
  currentLevel: number; // 0 - 100
  targetLevel: number;  // 0 - 100
  gap: number;          // max(0, targetLevel - currentLevel)
  rationale?: string;
  isAssignmentRequired?: boolean;
}

export interface DomainSummary {
  currentAvg: number;
  targetAvg: number;
  gapAvg: number;
}

export interface UserCompetencyScores {
  userId: string;
  assignmentId?: string;
  assignmentTitle?: string;
  evaluatedAt: string;
  overallProficiency: number;
  overallTarget: number;
  overallGap: number;
  assignmentReadinessPercentage?: number;
  scores: CompetencyScore[]; // Scoped to assignment requirements
  allFrameworkScores?: CompetencyScore[]; // Full 33 competencies for expand toggle
  domainSummaries: Record<CompetencyDomain, DomainSummary>;
  evaluationTrace?: EvaluationTrace;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  domain: CompetencyDomain;
  targetCompetencies: string[];
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  durationHours: number;
  source: 'iGOT Karmayogi' | 'NSSTA TPAC';
  courseCode: string;
  link: string;
  instructorOrg: string;
  rating: number;
  enrolledCount: number;
  modulesCount: number;
}

export interface CourseRecommendation {
  course: Course;
  scoreMatch: number;
  aiReason: string;
  targetedGap: string;
  gapValue?: number;
  currentLevel?: number;
  targetLevel?: number;
  whyRecommended?: {
    primaryReason: string;
    mandateContext: string;
    dismantledDeficit: string;
    expectedOutcome: string;
    recommendedBy?: string;
    keyTopicsCovered?: string[];
  };
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  competencyTag: string;
}

export interface MicroLearningMistake {
  questionIndex: number;
  questionId: string;
  question: string;
  options: string[];
  userAnswerIndex: number;
  userAnswerText: string;
  correctAnswerIndex: number;
  correctAnswerText: string;
  competencyTag: string;
  explanation: string;
  cognitiveTrap: string;
  microLesson: string;
  ruleOfThumb: string;
  mospiApplication: string;
  igotMicroModuleTitle?: string;
  remedyReadMinutes?: number;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  title?: string;
  documentTitle?: string;
  sourceDocumentName?: string;
  questionsCount?: number;
  totalQuestions?: number;
  score: number;
  total?: number;
  percentage: number;
  attemptedAt?: string;
  completedAt?: string;
  learningHoursEarned: number;
  userAnswers?: {
    questionIndex: number;
    selectedIndex: number;
    isCorrect: boolean;
  }[];
}
