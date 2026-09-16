import {
  AssignmentFRAC,
  DesiredCompetency,
  OfficialProfile,
  QuizAttempt,
  SelfAttestedProficiency,
  UserCompetencyScores,
  UserCourseProgress,
} from '../types';
import { SEED_OFFICIALS } from '../data/seedData';
import { ASSIGNMENT_FRAC_DATA, getAssignmentById } from '../data/assignmentFRAC';

const STORAGE_KEYS = {
  OFFICIALS: 'igot_skillintel_officials_v2',
  ASSIGNMENTS_FRAC: 'igot_skillintel_assignments_frac_v2',
  ACTIVE_USER_ID: 'igot_skillintel_active_user_id_v2',
  COMPETENCY_SCORES: 'igot_skillintel_competencies_v2',
  QUIZ_ATTEMPTS: 'igot_skillintel_quiz_attempts_v2',
  ROLE_OVERRIDE: 'igot_skillintel_role_override_v2',
  COURSE_PROGRESS: 'igot_skillintel_course_progress_v2',
};

// Initialize default storage if empty
export function initializeStorage(): void {
  if (typeof window === 'undefined') return;

  const existingOfficials = localStorage.getItem(STORAGE_KEYS.OFFICIALS);
  if (!existingOfficials) {
    localStorage.setItem(STORAGE_KEYS.OFFICIALS, JSON.stringify(SEED_OFFICIALS));
  }

  const existingFRAC = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS_FRAC);
  if (!existingFRAC) {
    localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS_FRAC, JSON.stringify(ASSIGNMENT_FRAC_DATA));
  }

  const activeUserId = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER_ID);
  if (!activeUserId) {
    // Default to Rajesh Sharma (Senior Statistical Officer)
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, SEED_OFFICIALS[0].id);
  }
}

export function getAllAssignmentsFRACStorage(): AssignmentFRAC[] {
  if (typeof window === 'undefined') return ASSIGNMENT_FRAC_DATA;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS_FRAC);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS_FRAC, JSON.stringify(ASSIGNMENT_FRAC_DATA));
      return ASSIGNMENT_FRAC_DATA;
    }
    return JSON.parse(raw);
  } catch (e) {
    return ASSIGNMENT_FRAC_DATA;
  }
}

export function getAssignmentFRAC(assignmentId: string): AssignmentFRAC | undefined {
  const all = getAllAssignmentsFRACStorage();
  return all.find((a) => a.assignmentId === assignmentId) || getAssignmentById(assignmentId);
}

export function getAllOfficials(): OfficialProfile[] {
  if (typeof window === 'undefined') return SEED_OFFICIALS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OFFICIALS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.OFFICIALS, JSON.stringify(SEED_OFFICIALS));
      return SEED_OFFICIALS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read officials from storage:', e);
    return SEED_OFFICIALS;
  }
}

export function getActiveUserId(): string {
  if (typeof window === 'undefined') return SEED_OFFICIALS[0].id;
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_USER_ID) || SEED_OFFICIALS[0].id;
}

export function setActiveUserId(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, id);
}

export function getCurrentProfile(): OfficialProfile {
  const activeId = getActiveUserId();
  const officials = getAllOfficials();
  const found = officials.find((o) => o.id === activeId);
  return found || officials[0] || SEED_OFFICIALS[0];
}

export function saveOfficialProfile(profile: OfficialProfile): void {
  if (typeof window === 'undefined') return;
  const officials = getAllOfficials();
  const index = officials.findIndex((o) => o.id === profile.id);

  if (index >= 0) {
    officials[index] = profile;
  } else {
    officials.push(profile);
  }

  localStorage.setItem(STORAGE_KEYS.OFFICIALS, JSON.stringify(officials));
  localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, profile.id);
}

export function getUserCompetencies(userId: string): UserCompetencyScores | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.COMPETENCY_SCORES}_${userId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read competencies:', e);
    return null;
  }
}

export function saveUserCompetencies(scores: UserCompetencyScores): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(
    `${STORAGE_KEYS.COMPETENCY_SCORES}_${scores.userId}`,
    JSON.stringify(scores)
  );
}

export function enrollCourseInStorage(userId: string, courseId: string, durationHours: number = 10): OfficialProfile {
  const officials = getAllOfficials();
  const official = officials.find((o) => o.id === userId);

  if (official) {
    if (!official.enrolledCourseIds) {
      official.enrolledCourseIds = [];
    }
    if (!official.enrolledCourseIds.includes(courseId)) {
      official.enrolledCourseIds.push(courseId);
      official.learningHoursLogged = Number((official.learningHoursLogged + durationHours * 0.4).toFixed(1));
      saveOfficialProfile(official);
    }
    return official;
  }
  return getCurrentProfile();
}

export function getQuizAttempts(userId: string): QuizAttempt[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.QUIZ_ATTEMPTS}_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to read quiz attempts:', e);
    return [];
  }
}

export function saveQuizAttempt(attempt: QuizAttempt): void {
  if (typeof window === 'undefined') return;
  const attempts = getQuizAttempts(attempt.userId);
  attempts.unshift(attempt);
  localStorage.setItem(
    `${STORAGE_KEYS.QUIZ_ATTEMPTS}_${attempt.userId}`,
    JSON.stringify(attempts)
  );

  // Credit learning hours to official profile
  const officials = getAllOfficials();
  const official = officials.find((o) => o.id === attempt.userId);
  if (official) {
    official.learningHoursLogged = Number(
      (official.learningHoursLogged + (attempt.learningHoursEarned || 1.5)).toFixed(1)
    );
    saveOfficialProfile(official);
  }
}

export function getRoleOverride(): 'official' | 'admin' | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.ROLE_OVERRIDE) as any;
}

export function setRoleOverride(role: 'official' | 'admin' | null): void {
  if (typeof window === 'undefined') return;
  if (role) {
    localStorage.setItem(STORAGE_KEYS.ROLE_OVERRIDE, role);
  } else {
    localStorage.removeItem(STORAGE_KEYS.ROLE_OVERRIDE);
  }
}

export function getAllUserCourseProgress(userId: string): Record<string, UserCourseProgress> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.COURSE_PROGRESS}_${userId}`);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Failed to read course progress:', e);
    return {};
  }
}

export function getUserCourseProgress(userId: string, courseId: string): UserCourseProgress | null {
  const all = getAllUserCourseProgress(userId);
  return all[courseId] || null;
}

export function saveUserCourseProgress(progress: UserCourseProgress): void {
  if (typeof window === 'undefined') return;
  const all = getAllUserCourseProgress(progress.userId);
  all[progress.courseId] = progress;
  localStorage.setItem(
    `${STORAGE_KEYS.COURSE_PROGRESS}_${progress.userId}`,
    JSON.stringify(all)
  );

  // If completed, ensure enrolled and credit learning hours
  if (progress.status === 'Completed') {
    const officials = getAllOfficials();
    const official = officials.find((o) => o.id === progress.userId);
    if (official) {
      if (!official.enrolledCourseIds) official.enrolledCourseIds = [];
      if (!official.enrolledCourseIds.includes(progress.courseId)) {
        official.enrolledCourseIds.push(progress.courseId);
      }
      saveOfficialProfile(official);
    }
  }
}

export function updateSelfAttestedCompetency(
  userId: string,
  competencyName: string,
  level: SelfAttestedProficiency
): OfficialProfile {
  const officials = getAllOfficials();
  const official = officials.find((o) => o.id === userId);
  if (official) {
    if (!official.selfAttestedCompetencies) {
      official.selfAttestedCompetencies = {};
    }
    official.selfAttestedCompetencies[competencyName] = level;
    saveOfficialProfile(official);
    return official;
  }
  return getCurrentProfile();
}

export function addDesiredCompetency(
  userId: string,
  desired: DesiredCompetency
): OfficialProfile {
  const officials = getAllOfficials();
  const official = officials.find((o) => o.id === userId);
  if (official) {
    if (!official.desiredCompetencies) {
      official.desiredCompetencies = [];
    }
    // Remove if already exists to replace
    official.desiredCompetencies = official.desiredCompetencies.filter(
      (d) => d.competencyName !== desired.competencyName
    );
    official.desiredCompetencies.push(desired);
    saveOfficialProfile(official);
    return official;
  }
  return getCurrentProfile();
}

export function removeDesiredCompetency(
  userId: string,
  desiredId: string
): OfficialProfile {
  const officials = getAllOfficials();
  const official = officials.find((o) => o.id === userId);
  if (official && official.desiredCompetencies) {
    official.desiredCompetencies = official.desiredCompetencies.filter(
      (d) => d.id !== desiredId && d.competencyName !== desiredId
    );
    saveOfficialProfile(official);
    return official;
  }
  return getCurrentProfile();
}

export function resetAllDataToDefault(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.OFFICIALS);
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER_ID);
  localStorage.removeItem(STORAGE_KEYS.ROLE_OVERRIDE);

  // Clear specific user keys
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (
      key &&
      (key.startsWith(STORAGE_KEYS.COMPETENCY_SCORES) ||
        key.startsWith(STORAGE_KEYS.QUIZ_ATTEMPTS) ||
        key.startsWith(STORAGE_KEYS.COURSE_PROGRESS))
    ) {
      localStorage.removeItem(key);
    }
  }

  initializeStorage();
}
