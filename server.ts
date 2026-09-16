import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { COMPETENCY_FRAMEWORK, SEED_COURSES } from './src/data/seedData';
import { ASSIGNMENT_FRAC_DATA, getAssignmentById } from './src/data/assignmentFRAC';
import {
  AssignmentFRAC,
  CompetencyDomain,
  CompetencyScore,
  Course,
  OfficialProfile,
  EvaluationTrace,
  EvaluationTraceStep,
} from './src/types';

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit for uploading documents or base64 PDFs
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Lazy initialization of Gemini client
let genAIClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

/**
 * Robust extraction of text from PDF Base64 string using PDFParse
 */
async function extractTextFromPdfBase64(cleanBase64: string): Promise<{ text: string; numPages: number }> {
  try {
    const pdfModule: any = await import('pdf-parse');
    const PDFParse = pdfModule.PDFParse || pdfModule.default || pdfModule;
    const buffer = Buffer.from(cleanBase64, 'base64');
    const parser: any = new PDFParse({ data: buffer });
    if (typeof parser.load === 'function') {
      await parser.load();
    }
    const result = typeof parser.getText === 'function' ? await parser.getText() : null;
    const text = result?.text ? result.text.trim() : '';
    const numPages = result?.total || 1;
    return { text, numPages };
  } catch (err) {
    console.warn('PDF text extraction notice/fallback:', err);
    return { text: '', numPages: 1 };
  }
}

/**
 * Calls Gemini with automatic fallback from gemini-2.5-flash to gemini-2.5-flash-lite and gemini-3.1-flash-lite
 * preventing failures due to 429 quota exhaustion, 503 high demand, or single-model free-tier limits.
 */
async function generateWithGeminiFallback(ai: GoogleGenAI, params: any): Promise<{ text: string; modelUsed: string }> {
  const candidateModels = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
  ];
  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        ...params,
        model,
      });
      const text = response.text?.trim() || '';
      if (text) {
        return { text, modelUsed: model };
      }
    } catch (err: any) {
      console.warn(`Model ${model} call notice (${err?.message?.substring(0, 80) || err}), trying candidate fallback...`);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini models failed');
}

// -------------------------------------------------------------
// HEALTH CHECK
// -------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'iGOT SkillIntel - MoSPI Official Statistical System',
    geminiConfigured: !!getGemini(),
    timestamp: new Date().toISOString(),
  });
});

// -------------------------------------------------------------
// MOCK iGOT KARMAYOGI API ROUTES
// Explicitly modeled on iGOT Karmayogi / NSSTA Training Portals
// -------------------------------------------------------------

/**
 * GET /api/igot/courses
 * Mock of iGOT Karmayogi Courses API for Official Statistics
 */
app.get('/api/igot/courses', (req, res) => {
  const { domain, source, search } = req.query;

  let courses: Course[] = [...SEED_COURSES];

  if (domain && domain !== 'All') {
    courses = courses.filter((c) => c.domain === domain);
  }

  if (source && source !== 'All') {
    courses = courses.filter((c) => c.source === source);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    courses = courses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.targetCompetencies.some((t) => t.toLowerCase().includes(q))
    );
  }

  res.json({
    success: true,
    count: courses.length,
    courses,
    source: 'iGOT Karmayogi & NSSTA TPAC Integrated Catalog (MoSPI)',
  });
});

/**
 * POST /api/igot/enroll
 * Mock of iGOT Karmayogi Course Enrollment API
 */
app.post('/api/igot/enroll', (req, res) => {
  const { userId, courseId } = req.body;

  if (!courseId) {
    return res.status(400).json({ error: 'courseId is required' });
  }

  const course = SEED_COURSES.find((c) => c.id === courseId);
  if (!course) {
    return res.status(404).json({ error: 'Course not found in catalog' });
  }

  // Simulate government portal enrollment acknowledgement
  res.json({
    success: true,
    message: `Successfully enrolled in ${course.title} via ${course.source}`,
    enrollmentId: `IGOT-ENR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    courseId,
    userId: userId || 'anonymous-official',
    enrolledAt: new Date().toISOString(),
    course,
  });
});

// -------------------------------------------------------------
// FRAC (FRAMEWORK OF ROLES, ACTIVITIES & COMPETENCIES) APIS
// -------------------------------------------------------------

app.get('/api/frac/assignments', (req, res) => {
  const { department } = req.query;
  let list = ASSIGNMENT_FRAC_DATA;
  if (department && department !== 'All') {
    list = list.filter((a) => a.department === department);
  }
  res.json({
    success: true,
    count: list.length,
    assignments: list,
  });
});

app.get('/api/frac/assignments/:id', (req, res) => {
  const assignment = getAssignmentById(req.params.id);
  if (!assignment) {
    return res.status(404).json({ error: 'Assignment FRAC record not found' });
  }
  res.json({ success: true, assignment });
});

// -------------------------------------------------------------
// AI COMPETENCY EVALUATION (FRAC 2-STEP ARCHITECTURE)
// -------------------------------------------------------------

/**
 * POST /api/competency/evaluate
 * Evaluates official against their specific assignment FRAC requirements.
 * STEP 1: TARGET levels looked up deterministically from assignmentFRAC (no AI, 100% auditable).
 * STEP 2: CURRENT levels assessed by Gemini 3.8 Flash based on rich official dossier.
 * STEP 3: GAP calculated explicitly in code (target - current).
 */
app.post('/api/competency/evaluate', async (req, res) => {
  try {
    const profile: OfficialProfile = req.body.profile;
    if (!profile) {
      return res.status(400).json({ error: 'Official profile is required' });
    }

    // Resolve official's target assignment from FRAC repository
    const assignmentId = profile.assignmentId || req.body.assignmentId;
    let targetAssignment: AssignmentFRAC | undefined;

    if (assignmentId) {
      targetAssignment = getAssignmentById(assignmentId);
    }
    if (!targetAssignment && profile.assignmentTitle) {
      targetAssignment = ASSIGNMENT_FRAC_DATA.find(
        (a) => a.title.toLowerCase().trim() === (profile.assignmentTitle || '').toLowerCase().trim()
      );
    }

    // REQUIREMENT 2: If the assignment isn't found in assignmentFRAC for any reason,
    // do not silently fall back to a generic AI guess — show a clear "Assignment not yet mapped" state
    if (!targetAssignment) {
      return res.status(404).json({
        success: false,
        unmapped: true,
        error: 'Assignment not yet mapped',
        message: `The assignment "${profile.assignmentTitle || profile.designation || assignmentId || 'Unspecified'}" is not yet mapped in the MoSPI FRAC framework repository. Every evaluation must run strictly against mapped FRAC assignment requirements.`,
        assignmentId: assignmentId || null,
      });
    }

    // STEP 1: Deterministic TARGET levels from FRAC repository (No AI black box)
    const requiredCompetencies = targetAssignment.requiredCompetencies;

    // STEP 2: Assess CURRENT levels using Gemini 3.8 Flash (or fallback heuristic engine)
    const ai = getGemini();
    let assessedScores: CompetencyScore[] = [];

    if (ai) {
      try {
        const prompt = `You are the Lead FRAC Assessor for the Ministry of Statistics and Programme Implementation (MoSPI) and Mission Karmayogi Capacity Building Commission.

Assess this official's CURRENT competency levels against the mandatory requirements of their specific government assignment.

GOVERNMENT OFFICIAL DOSSIER:
- Full Name: ${profile.name}
- Employee/Cadre ID: ${profile.employeeId || 'Cadre Officer'}
- Service / Cadre: ${profile.serviceCadre || 'Indian Statistical Service'} (${profile.group || 'Group A'})
- Date Joined Government Service: ${profile.dateOfJoiningGovt || 'N/A'}
- Total Years of Service: ${profile.yearsOfExperience} years
- Current Assignment / Position: ${targetAssignment.title}
- Department / Wing: ${targetAssignment.department}
- Years in Current Assignment: ${profile.yearsInCurrentAssignment || 1} years
- Key Assignment Activities:
${targetAssignment.keyActivities.map((act, i) => `  ${i + 1}. ${act}`).join('\n')}
- Highest Qualification: ${profile.educationalQualification}
- Academic Specialization: ${profile.specialization || 'General Statistics'}
- Previous Government Postings / Assignments:
${(profile.previousAssignments || []).map((p, i) => `  ${i + 1}. ${p.position} (${p.department}) - ${p.durationYears} yrs`).join('\n') || '  (First assignment)'}
- Prior In-Service Trainings & Certifications:
${(profile.priorTrainings || []).map((t, i) => `  ${i + 1}. ${t.trainingName} [${t.provider}] (Domain: ${t.domain}, Year: ${t.yearCompleted})`).join('\n') || profile.previousTrainings?.map((pt, i) => `  ${i + 1}. ${pt}`).join('\n') || '  (None reported)'}

REQUIRED COMPETENCIES FOR THIS ASSIGNMENT (Only assess these required competencies):
${JSON.stringify(
  requiredCompetencies.map((rc) => ({
    name: rc.competencyName,
    domain: rc.domain,
    targetLevel: rc.requiredLevel,
    importance: rc.importance,
  }))
)}

INSTRUCTIONS:
1. For each required competency, assess the official's CURRENT level (0 - 100).
   - Higher scores if qualification/specialization directly aligns (e.g., M.Stat/Economics for National Accounts or Sampling).
   - Credit for total years of service AND years in this specific assignment.
   - Credit for relevant prior in-service trainings (especially from iGOT, NSSTA, IMF, UNSD).
   - Credit for relevant past assignments in related statistical divisions.
2. Provide a 1-sentence analytical rationale connecting their specific background to the current assessed level.
3. DO NOT alter the targetLevel (it is locked by the FRAC framework).
4. Return a JSON array matching the schema.`;

        const { text: rawText } = await generateWithGeminiFallback(ai, {
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });
        if (rawText) {
          const parsed = JSON.parse(rawText);
          assessedScores = requiredCompetencies.map((rc) => {
            const aiItem = parsed.find(
              (p: any) =>
                p.competencyName?.toLowerCase().trim() === rc.competencyName.toLowerCase().trim()
            );
            const compDef = COMPETENCY_FRAMEWORK.find(
              (cf) => cf.name.toLowerCase().trim() === rc.competencyName.toLowerCase().trim()
            );

            const current = aiItem
              ? Math.min(100, Math.max(15, Math.round(aiItem.currentLevel)))
              : calculateDeterministicCurrentLevel(rc.competencyName, rc.domain, profile);

            const target = rc.requiredLevel;

            return {
              competencyId: compDef?.id || `comp-${rc.competencyName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
              competencyName: rc.competencyName,
              domain: rc.domain,
              currentLevel: current,
              targetLevel: target,
              gap: Math.max(0, target - current), // STEP 3: Explicit in-code gap
              rationale:
                aiItem?.rationale ||
                `Assessed against ${targetAssignment.title} requirements based on educational qualifications and service record.`,
              isAssignmentRequired: true,
            };
          });
        }
      } catch (geminiError) {
        console.warn('Gemini FRAC evaluation failed, falling back to deterministic engine:', geminiError);
      }
    }

    // Fallback if AI was unavailable or had parse errors
    if (assessedScores.length === 0) {
      assessedScores = requiredCompetencies.map((rc) => {
        const compDef = COMPETENCY_FRAMEWORK.find(
          (cf) => cf.name.toLowerCase().trim() === rc.competencyName.toLowerCase().trim()
        );
        const current = calculateDeterministicCurrentLevel(rc.competencyName, rc.domain, profile);
        const target = rc.requiredLevel;

        return {
          competencyId: compDef?.id || `comp-${rc.competencyName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          competencyName: rc.competencyName,
          domain: rc.domain,
          currentLevel: current,
          targetLevel: target,
          gap: Math.max(0, target - current),
          rationale: `Assessed deterministically from ${profile.serviceCadre || 'cadre'} service record, ${profile.yearsInCurrentAssignment || 1} yrs in ${targetAssignment.title}, and prior trainings.`,
          isAssignmentRequired: true,
        };
      });
    }

    // Calculate full 33 framework scores as well (for the toggle to expand to full framework)
    const allFrameworkScores: CompetencyScore[] = COMPETENCY_FRAMEWORK.map((cf) => {
      const existing = assessedScores.find(
        (s) => s.competencyName.toLowerCase().trim() === cf.name.toLowerCase().trim()
      );
      if (existing) return existing;

      const current = calculateDeterministicCurrentLevel(cf.name, cf.domain, profile);
      const target = cf.standardTargetLevel;
      return {
        competencyId: cf.id,
        competencyName: cf.name,
        domain: cf.domain,
        currentLevel: current,
        targetLevel: target,
        gap: Math.max(0, target - current),
        rationale: `Assessed across broad MoSPI competency baseline.`,
        isAssignmentRequired: false,
      };
    });

    const domainSummaries = calculateDomainSummaries(assessedScores);
    const overallProficiency = Math.round(
      assessedScores.reduce((acc, s) => acc + s.currentLevel, 0) / assessedScores.length
    );
    const overallTarget = Math.round(
      assessedScores.reduce((acc, s) => acc + s.targetLevel, 0) / assessedScores.length
    );
    const overallGap = Math.max(0, overallTarget - overallProficiency);

    // Assignment Readiness: percentage of competencies where gap is 0 or within 10%
    const readyCount = assessedScores.filter((s) => s.gap <= s.targetLevel * 0.1).length;
    const assignmentReadinessPercentage = Math.round((readyCount / assessedScores.length) * 100);

    const identifiedGaps = assessedScores.filter((s) => s.gap > 0).sort((a, b) => b.gap - a.gap);

    const evaluationTrace: EvaluationTrace = {
      assignmentId: targetAssignment.assignmentId,
      assignmentTitle: targetAssignment.title,
      department: targetAssignment.department,
      divisionCode: targetAssignment.divisionCode,
      timestamp: new Date().toISOString(),
      assessorModel: ai ? 'Gemini 3.8 Flash FRAC Engine' : 'MoSPI FRAC Deterministic Engine',
      requiredCount: requiredCompetencies.length,
      evaluatedCount: assessedScores.length,
      identifiedGapsCount: identifiedGaps.length,
      steps: [
        {
          stepNumber: 1,
          stepName: 'Profile Intake Dossier Received',
          timestamp: new Date().toISOString(),
          summary: `Verified official dossier for ${profile.name} (${profile.employeeId || 'Cadre Officer'}, ${profile.serviceCadre || 'ISS'}) with ${profile.yearsOfExperience} yrs total service and ${profile.priorTrainings?.length || profile.previousTrainings?.length || 0} documented in-service training records.`,
          details: {
            name: profile.name,
            employeeId: profile.employeeId,
            serviceCadre: profile.serviceCadre,
            group: profile.group,
            qualification: profile.educationalQualification,
            specialization: profile.specialization,
            totalServiceYears: profile.yearsOfExperience,
            yearsInAssignment: profile.yearsInCurrentAssignment,
            trainingsCount: (profile.priorTrainings || []).length || (profile.previousTrainings || []).length,
          },
        },
        {
          stepNumber: 2,
          stepName: 'Assignment FRAC Requirements Loaded',
          timestamp: new Date().toISOString(),
          summary: `Retrieved official MoSPI FRAC benchmark specification for "${targetAssignment.title}" (${targetAssignment.department}) requiring ${requiredCompetencies.length} mandated competencies.`,
          details: {
            assignmentId: targetAssignment.assignmentId,
            assignmentTitle: targetAssignment.title,
            department: targetAssignment.department,
            requiredCompetencies: requiredCompetencies.map((rc) => ({
              competency: rc.competencyName,
              domain: rc.domain,
              requiredLevel: rc.requiredLevel,
              importance: rc.importance || 'High',
            })),
          },
        },
        {
          stepNumber: 3,
          stepName: 'Current Level Assessed from Dossier Evidence',
          timestamp: new Date().toISOString(),
          summary: `Assessed current proficiency strictly for the ${requiredCompetencies.length} mandated competencies based on educational qualification, service tenure, postings history, and certifications.`,
          details: {
            assessorModel: ai ? 'Gemini 3.8 Flash' : 'MoSPI Deterministic Rules',
            scores: assessedScores.map((s) => ({
              competency: s.competencyName,
              currentLevel: s.currentLevel,
              rationale: s.rationale,
            })),
          },
        },
        {
          stepNumber: 4,
          stepName: 'Deterministic Gap Calculus (Gap = Required − Current)',
          timestamp: new Date().toISOString(),
          summary: `Computed explicit mathematical differences (gap = required − current) in code. Identified ${identifiedGaps.length} active skill gaps, yielding ${assignmentReadinessPercentage}% assignment readiness.`,
          details: {
            overallProficiency,
            overallTarget,
            overallGap,
            assignmentReadinessPercentage,
            gapsList: identifiedGaps.map((s) => ({
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
          timestamp: new Date().toISOString(),
          summary: `Prioritized capacity building catalog strictly by largest gap first (${identifiedGaps[0]?.competencyName || 'All benchmarks met'}) to supply targeted courses.`,
          details: {
            priorityGaps: identifiedGaps.map((s) => `${s.competencyName} (Gap: ${s.gap} pts)`),
          },
        },
      ],
    };

    res.json({
      success: true,
      source: ai ? 'Gemini 3.8 Flash FRAC Engine' : 'MoSPI FRAC Deterministic Engine',
      assignmentId: targetAssignment.assignmentId,
      assignmentTitle: targetAssignment.title,
      department: targetAssignment.department,
      divisionCode: targetAssignment.divisionCode,
      keyActivities: targetAssignment.keyActivities,
      evaluatedAt: new Date().toISOString(),
      overallProficiency,
      overallTarget,
      overallGap,
      assignmentReadinessPercentage,
      scores: assessedScores,
      allFrameworkScores,
      domainSummaries,
      evaluationTrace,
    });
  } catch (error: any) {
    console.error('Competency evaluation error:', error);
    res.status(500).json({ error: error.message || 'Failed to evaluate competency' });
  }
});


// -------------------------------------------------------------
// AI COURSE RECOMMENDATIONS (GEMINI)
// -------------------------------------------------------------

/**
 * POST /api/courses/recommend
 * Matches courses strictly to official's unresolved skill gaps (required > current), sorted by largest gap first.
 * Now generates detailed "Why Recommended" justification and dismantled deficit forensics.
 */
app.post('/api/courses/recommend', async (req, res) => {
  try {
    const { profile } = req.body;
    let rawGaps: any[] = req.body.scores || req.body.topGaps || [];

    // If scores not provided directly, extract unresolved gaps from 5-parameter profile analysis
    if ((!rawGaps || rawGaps.length === 0) && profile) {
      if (profile.gapAnalysis?.parameters) {
        profile.gapAnalysis.parameters.forEach((p: any) => {
          if (p.gap > 0) {
            rawGaps.push({
              competencyName: p.name.replace(' Domain', ''),
              currentLevel: p.profileScore,
              targetLevel: p.projectTarget,
              gap: p.gap,
              domain: p.name.replace(' Domain', ''),
              rationale: p.rationale,
            });
          }
          if (p.subSkills && Array.isArray(p.subSkills)) {
            p.subSkills.forEach((s: any) => {
              if (s.gap > 0) {
                rawGaps.push({
                  competencyName: s.name,
                  currentLevel: s.profile,
                  targetLevel: s.target,
                  gap: s.gap,
                  domain: p.name.replace(' Domain', ''),
                });
              }
            });
          }
        });
      } else if (profile.parameterScores) {
        profile.parameterScores.forEach((p: any) => {
          if (p.gap > 0) {
            rawGaps.push({
              competencyName: p.name.replace(' Domain', ''),
              currentLevel: p.profileScore,
              targetLevel: p.projectTarget,
              gap: p.gap,
              domain: p.name.replace(' Domain', ''),
            });
          }
        });
      }
    }

    // STEP 1: Strict filtering: ONLY consider unresolved gaps (required > current)
    const unresolvedGaps = rawGaps
      .map((g) => {
        const competencyName = typeof g === 'string' ? g : g.competencyName;
        const currentLevel = typeof g.currentLevel === 'number' ? g.currentLevel : 45;
        const targetLevel = typeof g.targetLevel === 'number' ? g.targetLevel : 85;
        const gap = typeof g.gap === 'number' ? g.gap : Math.max(0, targetLevel - currentLevel);
        const domain = g.domain || 'Statistical';
        return { competencyName, currentLevel, targetLevel, gap, domain };
      })
      .filter((g) => g.gap > 0 && g.competencyName)
      .sort((a, b) => b.gap - a.gap); // Largest gap first

    // If no unresolved gaps exist, return empty recommendations list (no filler courses)
    if (unresolvedGaps.length === 0) {
      return res.json({
        success: true,
        source: 'MoSPI FRAC Engine',
        recommendations: [],
        message: 'No unresolved skill gaps identified for this assignment. All competency benchmarks met.',
      });
    }

    const candidateCourses = SEED_COURSES;
    const ai = getGemini();

    // Map each candidate course to see if it resolves an unresolved gap
    const gapMappedCourses: Array<{
      course: Course;
      primaryGap: typeof unresolvedGaps[0];
      allMatchedGaps: typeof unresolvedGaps;
      scoreMatch: number;
    }> = [];

    for (const course of candidateCourses) {
      const matchingGaps = unresolvedGaps.filter((g) =>
        course.targetCompetencies.some(
          (tc) =>
            tc.toLowerCase().trim() === g.competencyName.toLowerCase().trim() ||
            tc.toLowerCase().includes(g.competencyName.toLowerCase()) ||
            g.competencyName.toLowerCase().includes(tc.toLowerCase())
        )
      );

      if (matchingGaps.length > 0) {
        // Sort matching gaps so the largest deficit is primary
        matchingGaps.sort((a, b) => b.gap - a.gap);
        const primaryGap = matchingGaps[0];
        // Score match weighted by gap size and domain alignment
        const scoreMatch = Math.min(99, Math.max(78, 65 + primaryGap.gap));

        gapMappedCourses.push({
          course,
          primaryGap,
          allMatchedGaps: matchingGaps,
          scoreMatch,
        });
      }
    }

    // Sort strictly by primary gap size (largest gap first)
    gapMappedCourses.sort((a, b) => {
      if (b.primaryGap.gap !== a.primaryGap.gap) {
        return b.primaryGap.gap - a.primaryGap.gap;
      }
      return b.scoreMatch - a.scoreMatch;
    });

    const topCandidateList = gapMappedCourses.slice(0, 8);
    const assignmentContext = profile?.assignmentTitle || profile?.designation || 'Statistical Officer Mandate';
    const officialName = profile?.name || 'Officer';

    if (ai && topCandidateList.length > 0) {
      try {
        const prompt = `You are the iGOT Karmayogi Learning Recommendation Engine for the Ministry of Statistics and Programme Implementation (MoSPI).
Analyze the official's detected competency deficits and generate clear, authoritative "Why Recommended" rationale and dismantled gap breakdown for each course.

OFFICIAL PROFILE:
- Name: ${officialName}
- Assignment / Mandate: ${assignmentContext}
- Department / Wing: ${profile?.department || 'MoSPI'}

UNRESOLVED COMPETENCY GAPS (Sorted by largest deficit):
${unresolvedGaps.map((g, i) => `${i + 1}. ${g.competencyName} (Current: ${g.currentLevel}%, Required: ${g.targetLevel}%, Deficit: -${g.gap} pts)`).join('\n')}

COURSES TARGETING THESE GAPS:
${JSON.stringify(
  topCandidateList.map((c) => ({
    courseId: c.course.id,
    title: c.course.title,
    targetedGap: c.primaryGap.competencyName,
    currentLevel: c.primaryGap.currentLevel,
    requiredLevel: c.primaryGap.targetLevel,
    gap: c.primaryGap.gap,
    courseDescription: c.course.description,
  }))
)}

INSTRUCTIONS:
For each course, output a structured JSON object detailing WHY it is being recommended and dismantling the gap:
- courseId: string
- scoreMatch: number (80-99)
- aiReason: A strict 1-line reason: "Recommended because your \${targetedGap} level is \${currentLevel}% vs. the \${requiredLevel}% required for \${assignmentContext}."
- targetedGap: string
- whyRecommended:
  - primaryReason: "Recommended because your \${targetedGap} level is \${currentLevel}% vs. the \${requiredLevel}% benchmark."
  - mandateContext: Concrete explanation of why this course is essential for their operational mandate in ${assignmentContext} (1-2 sentences).
  - dismantledDeficit: Exactly what root gap or tool deficit this course dismantles (e.g. "Dismantles: Deficit in multi-stage cluster sampling weights and non-response adjustment").
  - expectedOutcome: Concrete operational outcome upon course completion (e.g. "Elevates proficiency to \${requiredLevel}%, closing the -\${gap} pt deficit and ensuring compliance with National Data Quality standards").
  - keyTopicsCovered: 3-4 specific topic names taught in the course.

Output a valid JSON array of objects.`;

        const { text: rawText } = await generateWithGeminiFallback(ai, {
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        if (rawText) {
          const parsed = JSON.parse(rawText);
          const formatted = parsed
            .map((r: any) => {
              const matched = topCandidateList.find((c) => c.course.id === r.courseId);
              if (!matched) return null;
              const strictReason = `Recommended because your ${matched.primaryGap.competencyName} level is ${matched.primaryGap.currentLevel}% vs. the ${matched.primaryGap.targetLevel}% required for ${assignmentContext}.`;

              return {
                course: matched.course,
                scoreMatch: r.scoreMatch || matched.scoreMatch,
                aiReason: r.aiReason && r.aiReason.includes('vs.') ? r.aiReason : strictReason,
                targetedGap: matched.primaryGap.competencyName,
                gapValue: matched.primaryGap.gap,
                currentLevel: matched.primaryGap.currentLevel,
                targetLevel: matched.primaryGap.targetLevel,
                whyRecommended: {
                  primaryReason: r.whyRecommended?.primaryReason || strictReason,
                  mandateContext:
                    r.whyRecommended?.mandateContext ||
                    `Directly satisfies the statutory quality and methodological benchmarks established for ${assignmentContext}.`,
                  dismantledDeficit:
                    r.whyRecommended?.dismantledDeficit ||
                    `Dismantles: Operational shortfall in ${matched.primaryGap.competencyName} methodology and practical tooling.`,
                  expectedOutcome:
                    r.whyRecommended?.expectedOutcome ||
                    `Elevates competency to ${matched.primaryGap.targetLevel}%, eliminating the -${matched.primaryGap.gap} pts deficit.`,
                  recommendedBy: 'iGOT Karmayogi AI Engine • MoSPI Capacity Building Framework',
                  keyTopicsCovered:
                    r.whyRecommended?.keyTopicsCovered || matched.course.targetCompetencies,
                },
              };
            })
            .filter(Boolean);

          if (formatted.length > 0) {
            return res.json({
              success: true,
              source: 'Gemini 3.8 Flash Gap Matcher',
              recommendations: formatted,
            });
          }
        }
      } catch (err) {
        console.warn('Gemini recommendation failed, falling back to deterministic gap reasons:', err);
      }
    }

    // Deterministic fallback: Generate rich reasons from actual gap data
    const formattedRecommendations = topCandidateList.slice(0, 6).map((item) => {
      const reason = `Recommended because your ${item.primaryGap.competencyName} level is ${item.primaryGap.currentLevel}% vs. the ${item.primaryGap.targetLevel}% required for ${assignmentContext}.`;
      return {
        course: item.course,
        scoreMatch: item.scoreMatch,
        aiReason: reason,
        targetedGap: item.primaryGap.competencyName,
        gapValue: item.primaryGap.gap,
        currentLevel: item.primaryGap.currentLevel,
        targetLevel: item.primaryGap.targetLevel,
        whyRecommended: {
          primaryReason: reason,
          mandateContext: `Statutory requirement for the assigned project (${assignmentContext}) under MoSPI statistical guidelines.`,
          dismantledDeficit: `Dismantles: Competency shortfall in ${item.primaryGap.competencyName} and relevant computational modules.`,
          expectedOutcome: `Elevates score from ${item.primaryGap.currentLevel}% to benchmark ${item.primaryGap.targetLevel}%, bridging -${item.primaryGap.gap} pts gap.`,
          recommendedBy: 'iGOT Karmayogi AI Engine • NSSTA Certified',
          keyTopicsCovered: item.course.targetCompetencies,
        },
      };
    });

    res.json({
      success: true,
      source: 'MoSPI FRAC Gap Matcher',
      recommendations: formattedRecommendations,
    });
  } catch (error: any) {
    console.error('Course recommendation error:', error);
    res.status(500).json({ error: error.message || 'Failed to recommend courses' });
  }
});

// -------------------------------------------------------------
// AI QUIZ / MCQ GENERATOR (GEMINI)
// -------------------------------------------------------------

/**
 * POST /api/quiz/generate
 * Extracts concepts and creates 5-8 MCQs from uploaded document text or PDF
 */
app.post('/api/quiz/generate', async (req, res) => {
  try {
    const { text, pdfBase64, documentName, count = 5 } = req.body;

    if (!text && !pdfBase64) {
      return res.status(400).json({ error: 'Please provide either document text or a PDF file' });
    }

    let cleanBase64 = '';
    let extractedPdfText = typeof text === 'string' ? text.trim() : '';
    let pdfPages = 1;

    if (pdfBase64 && typeof pdfBase64 === 'string') {
      cleanBase64 = pdfBase64.includes(';base64,')
        ? pdfBase64.split(';base64,')[1]
        : pdfBase64.replace(/^data:[^;]+;base64,/, '');

      try {
        const extraction = await extractTextFromPdfBase64(cleanBase64);
        if (extraction.text && extraction.text.length > 50) {
          extractedPdfText = extraction.text;
        }
        pdfPages = extraction.numPages || 1;
      } catch (err) {
        console.warn('PDF extraction skipped or failed, relying on raw base64:', err);
      }
    }

    const ai = getGemini();

    if (ai) {
      try {
        let contents: any;

        const systemPrompt = `You are a Senior Technical Examiner for the National Statistical Systems Training Academy (NSSTA), MoSPI.
Based on the provided statistical document, generate ${count} high-quality, practical Multiple Choice Questions (MCQs) for government statistical officials.

REQUIREMENTS:
1. Questions must test genuine conceptual and methodological comprehension (definitions, formulas, classifications, quality gates, sampling designs, institutional boundaries).
2. Provide exactly 4 plausible options for each question.
3. Mark the correctAnswerIndex (0, 1, 2, or 3).
4. Provide a clear, authoritative 2-3 sentence explanation citing the document context.
5. Tag the relevant competency (e.g., "National Accounts", "Sampling", "Survey Design", "Data Quality Frameworks", "Price Statistics").
6. Output strict JSON array of objects with keys: "question", "options", "correctAnswerIndex", "explanation", "competencyTag".`;

        if (extractedPdfText && extractedPdfText.length > 80) {
          const docSnippet = extractedPdfText.length > 25000
            ? extractedPdfText.substring(0, 25000) + '\n...[Content clipped for question generation]'
            : extractedPdfText;
          contents = `${systemPrompt}\n\nDOCUMENT TITLE: ${documentName || 'Uploaded Statistical Document'}\n\nDOCUMENT TEXT CONTENT:\n${docSnippet}`;
        } else if (cleanBase64) {
          contents = {
            parts: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: cleanBase64,
                },
              },
              {
                text: `${systemPrompt}\nDocument Title: ${documentName || 'Uploaded Statistical PDF'}`,
              },
            ],
          };
        } else {
          contents = `${systemPrompt}\n\nDOCUMENT CONTENT (${documentName || 'Official Document'}):\n${text}`;
        }

        const { text: rawText, modelUsed } = await generateWithGeminiFallback(ai, {
          contents,
          config: {
            responseMimeType: 'application/json',
          },
        });

        if (rawText) {
          const cleanedJson = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
          let parsed = JSON.parse(cleanedJson);
          if (!Array.isArray(parsed) && parsed && Array.isArray(parsed.questions)) {
            parsed = parsed.questions;
          }

          if (Array.isArray(parsed) && parsed.length > 0) {
            const questions = parsed.map((q: any, idx: number) => ({
              id: `q-${Date.now()}-${idx}`,
              question: q.question,
              options: Array.isArray(q.options) && q.options.length === 4
                ? q.options
                : [q.options?.[0] || 'Option A', q.options?.[1] || 'Option B', q.options?.[2] || 'Option C', q.options?.[3] || 'Option D'],
              correctAnswerIndex: typeof q.correctAnswerIndex === 'number' && q.correctAnswerIndex >= 0 && q.correctAnswerIndex <= 3
                ? q.correctAnswerIndex
                : 0,
              explanation: q.explanation || 'Official statistical guideline compliance check.',
              competencyTag: q.competencyTag || 'Official Statistics',
            }));

            return res.json({
              success: true,
              source: `${modelUsed === 'gemini-3.8-flash' ? 'Gemini 3.8 Flash' : 'Gemini 3.1 Flash Lite'} Examiner`,
              questions,
              documentName: documentName || 'Uploaded Document',
              numPages: pdfPages,
              extractedTextSnippet: extractedPdfText ? extractedPdfText.substring(0, 160) + '...' : null,
            });
          }
        }
      } catch (geminiError: any) {
        console.warn('Gemini quiz generation notice, using intelligent fallback:', geminiError);
      }
    }

    // High quality fallback questions matching typical official MoSPI topics
    const fallbackQuestions = generateFallbackQuiz(documentName || 'Official Statistical Guidelines');
    res.json({
      success: true,
      source: 'SkillIntel Pre-certified Assessment Bank',
      questions: fallbackQuestions,
      documentName: documentName || 'MoSPI Technical Guidelines',
      numPages: pdfPages,
    });
  } catch (error: any) {
    console.error('Quiz generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate quiz' });
  }
});

/**
 * POST /api/quiz/analyze-mistakes
 * Generates personalized micro-learning lessons for each mistake made during the MCQ assessment.
 */
app.post('/api/quiz/analyze-mistakes', async (req, res) => {
  try {
    const { documentName = 'Statistical Document', mistakes = [] } = req.body;

    if (!Array.isArray(mistakes) || mistakes.length === 0) {
      return res.json({
        success: true,
        source: 'MoSPI Micro-Learning Engine',
        analyzedMistakes: [],
        summary: 'All questions answered correctly! No mistakes identified.',
      });
    }

    const ai = getGemini();

    if (ai) {
      try {
        const prompt = `You are a Senior Methodological Mentor & Master Statistical Assessor at the National Statistical Systems Training Academy (NSSTA), Ministry of Statistics and Programme Implementation (MoSPI).

A government statistical officer took an official MCQ assessment on "${documentName}" and answered ${mistakes.length} question(s) incorrectly.

Analyze their specific mistakes and generate bite-sized, high-retention "Micro-Learning Remedial Lessons" for each mistake.

MISTAKES DETAILS:
${JSON.stringify(mistakes, null, 2)}

REQUIREMENTS FOR EACH MISTAKE:
1. "cognitiveTrap": (1-2 sentences) Explain the exact misconception or confusion that led them to choose their wrong answer over the correct one.
2. "microLesson": (3-4 concise, high-clarity sentences) Explain the core statutory or statistical concept in 60 seconds.
3. "ruleOfThumb": (1 punchy sentence) A memorable rule of thumb / mental anchor to never miss this in field operations.
4. "mospiApplication": (1-2 sentences) How this concept directly applies to real MoSPI operations (e.g., CAPI data collection, NSSO survey rounds, SDRD sampling designs, or National Accounts revisions).
5. "igotMicroModuleTitle": (Short title) A realistic 2-minute iGOT Karmayogi micro-module title.
6. "remedyReadMinutes": Integer between 2 and 3.

Return ONLY a strict JSON array of objects with keys: "questionIndex", "cognitiveTrap", "microLesson", "ruleOfThumb", "mospiApplication", "igotMicroModuleTitle", "remedyReadMinutes".`;

        const { text: rawText, modelUsed } = await generateWithGeminiFallback(ai, {
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        if (rawText) {
          const cleanedJson = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
          let parsed = JSON.parse(cleanedJson);
          if (!Array.isArray(parsed) && parsed && Array.isArray(parsed.analyzedMistakes)) {
            parsed = parsed.analyzedMistakes;
          }

          if (Array.isArray(parsed) && parsed.length > 0) {
            const mapped = mistakes.map((m: any, idx: number) => {
              const matchedAnalysis = parsed.find((p: any) => p.questionIndex === m.questionIndex) || parsed[idx] || {};
              return {
                ...m,
                cognitiveTrap: matchedAnalysis.cognitiveTrap || `Choosing "${m.userAnswerText}" is a common slip caused by conflating preliminary stage definitions with operational verification rules.`,
                microLesson: matchedAnalysis.microLesson || m.explanation || `The correct standard is "${m.correctAnswerText}". Ensure strict adherence to official statistical manuals.`,
                ruleOfThumb: matchedAnalysis.ruleOfThumb || `Always verify the statutory unit boundary before applying estimation weights.`,
                mospiApplication: matchedAnalysis.mospiApplication || `Critical for eliminating non-sampling bias in field survey schedules and national statistics tabulation.`,
                igotMicroModuleTitle: matchedAnalysis.igotMicroModuleTitle || `iGOT 3-Min Capsule: Master ${m.competencyTag || 'Statistical Methodology'}`,
                remedyReadMinutes: matchedAnalysis.remedyReadMinutes || 2,
              };
            });

            return res.json({
              success: true,
              source: `${modelUsed === 'gemini-3.8-flash' ? 'Gemini 3.8 Flash' : 'Gemini 3.1 Flash Lite'} Micro-Pedagogy Engine`,
              analyzedMistakes: mapped,
              summary: `Deconstructed ${mistakes.length} mistakes into bite-sized remedial micro-lessons.`,
            });
          }
        }
      } catch (geminiError) {
        console.warn('Gemini mistake analysis fallback:', geminiError);
      }
    }

    // Intelligent Deterministic Fallback
    const fallbackAnalyzed = mistakes.map((m: any) => {
      const tag = m.competencyTag || 'Statistical Methods';
      return {
        ...m,
        cognitiveTrap: `Selecting "${m.userAnswerText}" frequently occurs when officers confuse aggregate conceptual proxies with strict operational MoSPI classification standards.`,
        microLesson: `The authoritative standard is "${m.correctAnswerText}". ${m.explanation}`,
        ruleOfThumb: `Memory Anchor: When assessing ${tag}, statutory protocol takes precedence over informal heuristic assumptions.`,
        mospiApplication: `This distinction directly governs consistency in NSSO survey rounds, CAPI validation gates, and official reports released to the public.`,
        igotMicroModuleTitle: `iGOT 3-Min Micro-Course: Key Principles of ${tag}`,
        remedyReadMinutes: 2,
      };
    });

    res.json({
      success: true,
      source: 'MoSPI Pedagogical Deterministic Engine',
      analyzedMistakes: fallbackAnalyzed,
      summary: `Analyzed ${mistakes.length} mistakes with structured micro-learning capsules.`,
    });
  } catch (error: any) {
    console.error('Mistake analysis error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze mistakes' });
  }
});

// -------------------------------------------------------------
// AI ASSESSMENT & DOCUMENT Q&A CHATBOT (GEMINI)
// -------------------------------------------------------------

/**
 * POST /api/assessment/chat
 * Interactive Assessment & Document Q&A Chatbot
 * Can answer questions about uploaded PDFs, conduct oral assessments, explain methodologies, and evaluate answers.
 */
app.post('/api/assessment/chat', async (req, res) => {
  try {
    const {
      message,
      conversationHistory = [],
      documentName = 'Statistical Document',
      documentText = '',
      pdfBase64 = null,
      profile = null,
    } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message string is required' });
    }

    let cleanBase64 = '';
    let extractedPdfText = documentText || '';
    let pdfPages = 1;

    if (pdfBase64 && typeof pdfBase64 === 'string') {
      cleanBase64 = pdfBase64.includes(';base64,')
        ? pdfBase64.split(';base64,')[1]
        : pdfBase64.replace(/^data:[^;]+;base64,/, '');

      if (!extractedPdfText) {
        try {
          const extraction = await extractTextFromPdfBase64(cleanBase64);
          extractedPdfText = extraction.text;
          pdfPages = extraction.numPages || 1;
        } catch (err) {
          console.warn('PDF extraction notice in chat:', err);
        }
      }
    }

    const ai = getGemini();

    if (ai) {
      try {
        const systemPrompt = `You are the NSSTA Senior Technical Assessor and AI Statistical Tutor for the Ministry of Statistics and Programme Implementation (MoSPI).
Your role is to assist, teach, and rigorously evaluate government statistical officials based on official circulars, survey manuals, and guidelines.

OFFICIAL IN SESSION:
- Name: ${profile?.name || 'Statistical Officer'}
- Current Assignment: ${profile?.assignmentTitle || profile?.designation || 'Statistical Officer'} (${profile?.serviceCadre || 'Indian Statistical Service'})
- Active Reference Document: "${documentName}"

PEDAGOGICAL & EVALUATION GUIDELINES:
1. Ground your answers strictly in the document content and official Indian statistical standards (SNA 2008, NSSO sampling, NDQAF, CPI/IIP base revision, etc.).
2. If the official asks for an oral test/quiz, ask ONE clear, probing conceptual question from the document and invite their answer.
3. If the official provides an answer to a quiz question, evaluate it thoroughly: give a clear verdict (Accurate / Partially Accurate / Inaccurate), explain the precise statutory rationale, and reference the relevant section/concept.
4. If the official asks for summaries, audit risks, or explanations, format your answer cleanly with bullet points, bold key terms, and statutory context.
5. Maintain a professional, encouraging, authoritative civil service examiner tone.`;

        let contents: any;
        const historyText = (conversationHistory || [])
          .slice(-6)
          .map((h: any) => `${h.role === 'user' ? 'Official' : 'NSSTA Examiner'}: ${h.content}`)
          .join('\n\n');

        if (extractedPdfText && extractedPdfText.length > 50) {
          const docSnippet = extractedPdfText.length > 25000
            ? extractedPdfText.substring(0, 25000) + '\n...[Remaining document content clipped for chat]'
            : extractedPdfText;

          contents = `${systemPrompt}

REFERENCE DOCUMENT (${documentName}):
${docSnippet}

CONVERSATION HISTORY:
${historyText || '(No previous history)'}

Official: ${message}
NSSTA Examiner:`;
        } else if (cleanBase64) {
          contents = {
            parts: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: cleanBase64,
                },
              },
              {
                text: `${systemPrompt}

Document Title: ${documentName}

CONVERSATION HISTORY:
${historyText || '(No previous history)'}

Official: ${message}
NSSTA Examiner:`,
              },
            ],
          };
        } else {
          contents = `${systemPrompt}

(No specific document attached; answer based on standard MoSPI/NSSTA official statistical frameworks).

CONVERSATION HISTORY:
${historyText || '(No previous history)'}

Official: ${message}
NSSTA Examiner:`;
        }

        const { text: replyText, modelUsed } = await generateWithGeminiFallback(ai, {
          contents,
        });

        if (replyText) {
          return res.json({
            success: true,
            reply: replyText,
            source: `${modelUsed === 'gemini-3.8-flash' ? 'Gemini 3.8 Flash' : 'Gemini 3.1 Flash Lite'} Examiner`,
            documentName,
            numPages: pdfPages,
          });
        }
      } catch (geminiError: any) {
        console.warn('Gemini chat notice, using fallback:', geminiError);
      }
    }

    const fallbackReply = generateFallbackChatReply(message, documentName);
    res.json({
      success: true,
      reply: fallbackReply,
      source: 'NSSTA Technical Advisory Engine (Offline Mode)',
      documentName,
    });
  } catch (error: any) {
    console.error('Assessment chat error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate assessment chat response' });
  }
});

function generateFallbackChatReply(message: string, docTitle: string): string {
  const m = message.toLowerCase();
  if (m.includes('quiz') || m.includes('test') || m.includes('oral') || m.includes('question')) {
    return `**NSSTA Oral Examination Assessment:**\n\nBased on "${docTitle}", please answer this core methodological question:\n\n*Under official MoSPI guidelines, how are First Stage Units (FSUs) selected to minimize sampling variance while maintaining unbiased estimators across diverse geographical strata?*\n\nTake a moment to formulate your answer, and I will evaluate your methodology.`;
  }
  if (m.includes('formula') || m.includes('method') || m.includes('deflation')) {
    return `**Statistical Methodology Summary (${docTitle}):**\n\n1. **Estimation Principle:** Uses weighted probability proportional to size (PPS) sampling combined with linear calibration.\n2. **Deflation / Quality Protocol:** Aligns with SNA 2008 double-deflation standards to avoid single-deflation input divergence bias.\n3. **Validation Checkpoints:** Gate 2 embedded validation checks enforce real-time range restrictions on CAPI schedules.`;
  }
  if (m.includes('risk') || m.includes('audit') || m.includes('scrutiny')) {
    return `**Statutory Audit & Scrutiny Checkpoints (${docTitle}):**\n\n- **Non-Sampling Error Mitigation:** Ensure 5% mandatory supervisor re-interviews are logged in CAPI.\n- **Outlier Scrutiny:** Scrutinize input price index outliers before compiling sector-level GVA.\n- **Metadata Conformity:** Adhere strictly to the National Data Quality Assurance Framework (NDQAF) Quality Gate 2.`;
  }
  return `**NSSTA Assessor Advisory for "${docTitle}":**\n\nThis statutory document defines key methodology, quality controls, and compilation procedures for MoSPI officials. You can ask for an oral examination question, request a breakdown of mandatory quality gates, or switch to the **Statutory MCQ Assessment** tab to earn certified iGOT learning hours.`;
}

// -------------------------------------------------------------
// HELPER FUNCTIONS
// -------------------------------------------------------------

function calculateDomainSummaries(scores: CompetencyScore[]): Record<CompetencyDomain, any> {
  const domains: CompetencyDomain[] = [
    'Statistical',
    'Technical',
    'Digital Governance',
    'Behavioural/Managerial',
  ];

  const summaries: any = {};

  for (const domain of domains) {
    const domainScores = scores.filter((s) => s.domain === domain);
    if (domainScores.length === 0) continue;

    const currentAvg = Math.round(
      domainScores.reduce((acc, s) => acc + s.currentLevel, 0) / domainScores.length
    );
    const targetAvg = Math.round(
      domainScores.reduce((acc, s) => acc + s.targetLevel, 0) / domainScores.length
    );

    summaries[domain] = {
      currentAvg,
      targetAvg,
      gapAvg: Math.max(0, targetAvg - currentAvg),
    };
  }

  return summaries;
}

function calculateDeterministicCurrentLevel(
  compName: string,
  domain: CompetencyDomain,
  profile: OfficialProfile
): number {
  const expYears = Number(profile.yearsOfExperience) || 5;
  const assignmentYears = Number(profile.yearsInCurrentAssignment) || 1;
  const qual = ((profile.educationalQualification || '') + ' ' + (profile.specialization || '')).toLowerCase();
  const pastAssignments = (profile.previousAssignments || []).map((p) => (p.position + ' ' + p.department).toLowerCase()).join(' ');
  const priorTrainings = [
    ...(profile.priorTrainings || []).map((t) => `${t.trainingName} ${t.domain} ${t.provider}`),
    ...(profile.previousTrainings || []),
  ].join(' ').toLowerCase();

  const nameLower = compName.toLowerCase();

  let score = 42;

  // Total government service contribution
  score += Math.min(22, expYears * 1.8);

  // Tenure in specific assignment contribution
  score += Math.min(14, assignmentYears * 3.5);

  // Academic qualification & specialization matches
  if (qual.includes('stat') && domain === 'Statistical') score += 14;
  if ((qual.includes('econ') || qual.includes('econometric')) && (nameLower.includes('national accounts') || nameLower.includes('price') || nameLower.includes('macro'))) score += 15;
  if ((qual.includes('computer') || qual.includes('data science') || qual.includes('tech') || qual.includes('mca')) && domain === 'Technical') score += 18;
  if (qual.includes('math') && (nameLower.includes('sampling') || nameLower.includes('statistical inference'))) score += 14;

  // Past assignments experience
  if (pastAssignments.includes('price') && nameLower.includes('price')) score += 14;
  if (pastAssignments.includes('national accounts') && nameLower.includes('national accounts')) score += 14;
  if (pastAssignments.includes('survey') && (nameLower.includes('survey') || nameLower.includes('sampling') || nameLower.includes('field'))) score += 14;
  if (pastAssignments.includes('nsso') && (nameLower.includes('sampling') || nameLower.includes('survey') || nameLower.includes('capi'))) score += 14;
  if (pastAssignments.includes('it') && domain === 'Technical') score += 12;

  // Prior in-service trainings
  if (priorTrainings.includes(nameLower)) score += 16;
  if (nameLower.includes('python') && priorTrainings.includes('python')) score += 16;
  if (nameLower.includes('r') && (priorTrainings.includes(' r ') || priorTrainings.includes('r language') || priorTrainings.includes('r programming'))) score += 16;
  if (nameLower.includes('sql') && priorTrainings.includes('sql')) score += 15;
  if (nameLower.includes('capi') && priorTrainings.includes('capi')) score += 16;
  if (nameLower.includes('sna') && (priorTrainings.includes('sna') || priorTrainings.includes('national accounts'))) score += 16;
  if (domain === 'Digital Governance' && (priorTrainings.includes('cyber') || priorTrainings.includes('dpg') || priorTrainings.includes('gov'))) score += 14;
  if (domain === 'Behavioural/Managerial' && expYears >= 8) score += 12;

  return Math.min(95, Math.max(20, Math.round(score)));
}

function generateDeterministicCompetencyScores(profile: OfficialProfile): CompetencyScore[] {
  const expYears = Number(profile.yearsOfExperience) || 5;
  const qual = (profile.educationalQualification || '').toLowerCase();
  const role = (profile.jobRole || '').toLowerCase();
  const dept = (profile.department || '').toLowerCase();
  const trainings = (profile.previousTrainings || []).map((t) => t.toLowerCase()).join(' ');

  return COMPETENCY_FRAMEWORK.map((comp) => {
    let current = 45; // baseline
    let target = comp.standardTargetLevel;

    // Experience bonus
    current += Math.min(25, expYears * 2.2);

    // Domain / competency specific boosts
    const nameLower = comp.name.toLowerCase();

    // Qualification boosts
    if (qual.includes('stat') && comp.domain === 'Statistical') current += 15;
    if (qual.includes('econ') && (nameLower.includes('national accounts') || nameLower.includes('price'))) current += 15;
    if ((qual.includes('tech') || qual.includes('computer')) && comp.domain === 'Technical') current += 20;

    // Department / Role alignment
    if (dept.includes('national accounts') && nameLower.includes('national accounts')) {
      current += 20;
      target = 95;
    }
    if (dept.includes('sdrd') || dept.includes('survey') || role.includes('sampling')) {
      if (nameLower.includes('survey design') || nameLower.includes('sampling')) {
        current += 22;
        target = 95;
      }
    }
    if (dept.includes('price') && nameLower.includes('price statistics')) {
      current += 25;
      target = 90;
    }
    if (dept.includes('quality') && nameLower.includes('data quality')) {
      current += 20;
      target = 95;
    }

    // Training matches
    if (trainings.includes(nameLower) || (nameLower.includes('python') && trainings.includes('python'))) {
      current += 16;
    }
    if (trainings.includes('r') && nameLower === 'r') {
      current += 16;
    }
    if (trainings.includes('cyber') && comp.domain === 'Digital Governance') {
      current += 15;
    }

    // Managerial & Leadership for senior officials
    if (expYears >= 10 && comp.domain === 'Behavioural/Managerial') {
      current += 15;
      target = 88;
    }

    // Clamp
    current = Math.min(95, Math.max(20, Math.round(current)));
    target = Math.min(98, Math.max(50, Math.round(target)));

    return {
      competencyId: comp.id,
      competencyName: comp.name,
      domain: comp.domain,
      currentLevel: current,
      targetLevel: target,
      gap: Math.max(0, target - current),
      rationale: `Profile alignment evaluated based on ${profile.designation} in ${profile.department} with ${expYears} yrs experience.`,
    };
  });
}

function generateFallbackQuiz(docName: string) {
  return [
    {
      id: 'fb-1',
      question: 'Under SNA 2008 and MoSPI guidelines, how is Real Gross Value Added (GVA) accurately measured under the recommended double deflation methodology?',
      options: [
        'By deflating nominal GVA directly using the aggregate Wholesale Price Index (WPI).',
        'By independently deflating gross output with output deflators and intermediate inputs with input deflators, then taking the difference.',
        'By multiplying current year volume indices by base year Consumer Price Index.',
        'By applying a uniform single deflation rate across both goods and services sectors.'
      ],
      correctAnswerIndex: 1,
      explanation: 'Under double deflation, real GVA is calculated as real gross output (deflated by output price indices) minus real intermediate consumption (deflated by input price indices), preventing distorted value-added growth.',
      competencyTag: 'National Accounts',
    },
    {
      id: 'fb-2',
      question: 'In NSSO multi-stage stratified sampling, what units constitute the First Stage Units (FSUs) in rural and urban sectors respectively?',
      options: [
        'Rural: Individual farm holdings; Urban: Municipal municipal wards.',
        'Rural: Census villages; Urban: Urban Frame Survey (UFS) blocks.',
        'Rural: Gram Panchayats; Urban: Pincode zones.',
        'Rural: Block Development Offices; Urban: Commercial census establishments.'
      ],
      correctAnswerIndex: 1,
      explanation: 'NSSO sampling design specifies Census villages as FSUs in the rural sector and Urban Frame Survey (UFS) blocks as FSUs in the urban sector.',
      competencyTag: 'Sampling',
    },
    {
      id: 'fb-3',
      question: 'According to the National Data Quality Assurance Framework (NDQAF), which quality checkpoint is dedicated to real-time scrutiny rules embedded in CAPI software?',
      options: [
        'Gate 1 (Design Stage)',
        'Gate 2 (Field Collection Stage)',
        'Gate 3 (Processing Stage)',
        'Gate 4 (Dissemination Stage)'
      ],
      correctAnswerIndex: 1,
      explanation: 'Gate 2 enforces field collection quality through real-time CAPI logic checks, skip-validation, geo-fencing, and mandatory 5% supervisor re-interview audits.',
      competencyTag: 'Data Quality Frameworks',
    },
    {
      id: 'fb-4',
      question: 'Under SNA 2008 and MoSPI accounting classifications, expenditures on Research & Development (R&D) and software database development are classified as:',
      options: [
        'Intermediate consumption by producing industries.',
        'Current transfer payments to research institutes.',
        'Gross Fixed Capital Formation (intellectual property assets).',
        'Non-produced non-financial tangible assets.'
      ],
      correctAnswerIndex: 2,
      explanation: 'SNA 2008 capitalizes R&D and database development as Gross Fixed Capital Formation (Intellectual Property Products) since they yield economic returns across multiple future accounting cycles.',
      competencyTag: 'National Accounts',
    },
    {
      id: 'fb-5',
      question: 'What is the primary purpose of selecting two independent sub-samples (Sub-sample 1 and Sub-sample 2) in NSSO sample surveys?',
      options: [
        'To allow one sub-sample to serve as a backup in case of monsoon delays.',
        'To facilitate non-parametric estimation of sampling errors and variance between estimators.',
        'To compare state government investigators against central government staff.',
        'To reduce printing costs of survey schedules.'
      ],
      correctAnswerIndex: 1,
      explanation: 'Two independent sub-samples are drawn to calculate valid variance estimators and standard errors without requiring restrictive parametric assumptions.',
      competencyTag: 'Sampling',
    },
  ];
}

// -------------------------------------------------------------
// AI CALLING AGENT - HUMANIZED OFFICER PROFILING & INTAKE INTERVIEW
// -------------------------------------------------------------

interface ExtractedDossier {
  name?: string;
  serviceCadre?: string;
  group?: string;
  designation?: string;
  department?: string;
  yearsOfExperience?: number;
  yearsInCurrentAssignment?: number;
  educationalQualification?: string;
  specialization?: string;
  pastExperiences?: string[];
  toolsUsed?: string[];
  assignedProjectTitle?: string;
  assignedProjectDivision?: string;
  assignedProjectGoals?: string;
  statisticalCompetencies?: { name: string; level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' }[];
  priorTrainings?: string[];
  learningAspirations?: string[];
  personalStrengthsAndConcerns?: string;
}

/**
 * POST /api/calling-agent/start
 * Generates an empathetic, humanized opening greeting for a phone call interview.
 */
app.post('/api/calling-agent/start', (req, res) => {
  const { initialName } = req.body || {};

  const greeting = initialName
    ? `Hi ${initialName}! This is Aditi from the Karmayogi team. Thanks so much for picking up! I just wanted to do a quick 2-minute check-in instead of handing you a long form. How is your day going so far?`
    : `Hello there! This is Aditi from the Karmayogi team. Thanks so much for picking up! I just wanted to do a quick 2-minute check-in instead of having you fill out long paperwork. How are things with you today?`;

  res.json({
    success: true,
    agentSpokenReply: greeting,
    agentEmotion: 'warm_welcoming',
    currentDossier: {
      name: initialName || '',
    },
    completionPercentage: initialName ? 15 : 5,
    nextTopicSuggestion: 'Current Wing & Role',
  });
});

/**
 * POST /api/calling-agent/interact
 * Real-time voice/conversational turn handler with Gemini fallback and intelligent profile extraction.
 */
app.post('/api/calling-agent/interact', async (req, res) => {
  const {
    conversation = [],
    userMessage = '',
    currentDossier = {},
  } = req.body;

  if (!userMessage.trim()) {
    res.status(400).json({ error: 'userMessage is required' });
    return;
  }

  // Handle explicit user request to stop speaking or pause
  const lowerMsg = userMessage.trim().toLowerCase();
  if (
    lowerMsg.includes('stop speaking') ||
    lowerMsg.includes('shut up') ||
    lowerMsg.includes('be quiet') ||
    lowerMsg.includes('stop talking') ||
    lowerMsg === 'stop' ||
    lowerMsg === 'pause'
  ) {
    res.json({
      success: true,
      agentSpokenReply: "Oh, so sorry about that! I'll pause right here. Go ahead, I'm listening.",
      agentEmotion: 'empathic',
      extractedDossier: currentDossier,
      completionPercentage: 50,
      nextTopicSuggestion: 'Listening to Officer',
      source: 'Immediate Voice Interruption',
    });
    return;
  }

  const ai = getGemini();

  if (ai) {
    try {
      const prompt = `You are "Aditi", a real human colleague calling from the Karmayogi capacity building team for MoSPI.
You are having an actual voice phone conversation with an officer or colleague.

CORE DIRECTIVE: YOU MUST SPEAK EXACTLY LIKE A CARING, NATURAL HUMAN BEING ON THE PHONE.
DO NOT sound like an AI, a robotic questionnaire, an HR interviewer, or a bureaucrat reading a script.

HOW HUMANS NATURALLY TALK ON A QUICK PHONE CALL:
1. STRICTLY 1 TO 2 SHORT SENTENCES (under 25 words total).
   Real people never deliver paragraphs or monologues on the phone. Keep it light, warm, and natural.
2. NATURAL HUMAN OPENERS:
   Start by briefly acknowledging what they just said using everyday conversational markers:
   - "Oh nice!", "Ah, got it!", "Right, that makes total sense.", "Oh wow, that sounds busy!", "Understood!", "Ah, really interesting!"
3. ONE SIMPLE QUESTION:
   Ask only ONE simple, everyday question. Never bundle multiple questions.
4. ABSOLUTELY NO ROBOTIC OR STIFF JARGON:
   - NEVER say: "I appreciate you explaining that", "Your perspective gives us clear clarity", "vital statistical work", "candidly walked me through your journey", "dossier", "operational demands in your wing", "noted down in the system", "fascinating background".
   - USE: Everyday words, natural contractions ("I'm", "that's", "you're", "we've", "let's").
5. PRONUNCIATION FRIENDLY FOR VOICE SPEECH:
   - No slashes, asterisks, brackets, bullet points, or markdown.
   - Say "R and Python", "N S S O", "M O S P I".

CURRENT EXTRACTED DOSSIER SO FAR:
${JSON.stringify(currentDossier, null, 2)}

RECENT CALL TRANSCRIPT:
${conversation.slice(-6).map((m: any) => `${m.role === 'agent' ? 'Aditi' : 'Officer'}: ${m.content}`).join('\n')}
Officer: "${userMessage}"

You MUST output ONLY a valid JSON object matching this schema:
{
  "agentSpokenReply": "1-2 short, warm, spoken human sentences (under 25 words)",
  "agentEmotion": "warm_interested | empathic | cheerful | thoughtful",
  "extractedDossier": {
    "name": "Full name if stated or inferred, else keep previous",
    "serviceCadre": "Indian Statistical Service | Subordinate Statistical Service | State Statistical Service | Central Secretariat Service | Other",
    "group": "Group A | Group B | Group C",
    "designation": "Official title or designation",
    "department": "Ministry wing / division e.g. National Accounts Division, SDRD, ESD, Price Statistics, DQID, Field Operations",
    "yearsOfExperience": number (total years in govt service),
    "yearsInCurrentAssignment": number,
    "educationalQualification": "Degree e.g. M.Sc. Statistics, M.A. Economics, B.Tech, etc.",
    "specialization": "e.g. Macroeconomic Modeling, Sample Survey Design, Price Indices, Data Science",
    "pastExperiences": ["Array of previous postings or projects mentioned"],
    "toolsUsed": ["Array of tools mentioned like Python, R, STATA, SQL, CSPro, Excel"],
    "assignedProjectTitle": "Current key project/mandate they are leading or executing",
    "assignedProjectDivision": "Division handling this project",
    "assignedProjectGoals": "Brief summary of the goals or deliverables",
    "statisticalCompetencies": [
      { "name": "Competency Name", "level": "Beginner | Intermediate | Advanced | Expert" }
    ],
    "priorTrainings": ["Trainings mentioned at NSSTA, iGOT, ISTM"],
    "learningAspirations": ["Skills, certifications or areas they want to learn"],
    "personalStrengthsAndConcerns": "A sentence summarizing their key motivation or operational pain point"
  },
  "completionPercentage": number (integer between 10 and 100 representing profile completeness),
  "nextTopicSuggestion": "Brief 3-word title of what topic to gently uncover next"
}`;

      const { text: rawText, modelUsed } = await generateWithGeminiFallback(ai, {
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      if (rawText) {
        const parsed = JSON.parse(rawText);
        res.json({
          success: true,
          agentSpokenReply: parsed.agentSpokenReply,
          agentEmotion: parsed.agentEmotion || 'warm_interested',
          extractedDossier: {
            ...currentDossier,
            ...parsed.extractedDossier,
            // Merge tools cleanly
            toolsUsed: Array.from(new Set([...(currentDossier.toolsUsed || []), ...(parsed.extractedDossier?.toolsUsed || [])])),
            pastExperiences: Array.from(new Set([...(currentDossier.pastExperiences || []), ...(parsed.extractedDossier?.pastExperiences || [])])),
            learningAspirations: Array.from(new Set([...(currentDossier.learningAspirations || []), ...(parsed.extractedDossier?.learningAspirations || [])])),
          },
          completionPercentage: Math.min(100, Math.max(15, parsed.completionPercentage || 25)),
          nextTopicSuggestion: parsed.nextTopicSuggestion || 'Analytical Tools & Field Experience',
          source: modelUsed,
        });
        return;
      }
    } catch (err: any) {
      console.warn('Gemini calling agent error, falling back to rule-based conversation engine:', err?.message || err);
    }
  }

  // Resilient heuristic rule-based conversation engine
  const fallback = buildHeuristicCallTurn(userMessage, currentDossier, conversation);
  res.json({
    success: true,
    ...fallback,
    source: 'Civil Service Liaison Engine (Heuristic Fallback)',
  });
});

/**
 * Robust rule-based fallback for the calling agent when AI quota is limited
 */
function buildHeuristicCallTurn(userMessage: string, currentDossier: ExtractedDossier, conversation: any[]) {
  const text = userMessage.toLowerCase();
  const updated: ExtractedDossier = { ...currentDossier };

  // Detect Name
  const nameMatch = userMessage.match(/(?:i am|my name is|this is|i'm|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
  if (nameMatch && !updated.name) {
    updated.name = nameMatch[1];
  }

  // Detect Cadre
  if (text.includes('iss') || text.includes('indian statistical service')) {
    updated.serviceCadre = 'Indian Statistical Service';
    updated.group = 'Group A';
  } else if (text.includes('sss') || text.includes('subordinate')) {
    updated.serviceCadre = 'Subordinate Statistical Service';
    updated.group = 'Group B';
  } else if (text.includes('state statistical')) {
    updated.serviceCadre = 'State Statistical Service';
    updated.group = 'Group A';
  }

  // Detect Designation
  if (text.includes('director general') || text.includes('dg')) updated.designation = 'Director General';
  else if (text.includes('joint director')) updated.designation = 'Joint Director';
  else if (text.includes('deputy director')) updated.designation = 'Deputy Director';
  else if (text.includes('assistant director')) updated.designation = 'Assistant Director';
  else if (text.includes('senior statistical officer') || text.includes('sso')) updated.designation = 'Senior Statistical Officer (SSO)';
  else if (text.includes('junior statistical officer') || text.includes('jso')) updated.designation = 'Junior Statistical Officer (JSO)';

  // Detect Division / Wing
  if (text.includes('national accounts') || text.includes('nad') || text.includes('gdp') || text.includes('gva')) {
    updated.department = 'National Accounts Division (NAD)';
  } else if (text.includes('price') || text.includes('cpi') || text.includes('inflation')) {
    updated.department = 'Price Statistics Division';
  } else if (text.includes('sampling') || text.includes('sdrd') || text.includes('survey design')) {
    updated.department = 'Survey Design and Research Division (SDRD)';
  } else if (text.includes('field') || text.includes('fod') || text.includes('nss')) {
    updated.department = 'Field Operations Division (FOD)';
  } else if (text.includes('data quality') || text.includes('dqid')) {
    updated.department = 'Data Quality & Informatics Division (DQID)';
  } else if (text.includes('economic statistics') || text.includes('esd') || text.includes('iip')) {
    updated.department = 'Economic Statistics Division (ESD)';
  }

  // Detect Tools
  const tools = new Set<string>(updated.toolsUsed || []);
  if (text.includes('python')) tools.add('Python');
  if (text.includes(' r ') || text.endsWith(' r') || text.includes('r programming') || text.includes('rstudio')) tools.add('R Programming');
  if (text.includes('stata')) tools.add('STATA');
  if (text.includes('sas')) tools.add('SAS');
  if (text.includes('sql') || text.includes('database')) tools.add('SQL');
  if (text.includes('excel') || text.includes('vba')) tools.add('Advanced MS Excel');
  if (text.includes('cspro')) tools.add('CSPro / CAPI');
  if (text.includes('power bi') || text.includes('tableau')) tools.add('Power BI / Tableau');
  updated.toolsUsed = Array.from(tools);

  // Detect Experience / Years
  const expMatch = text.match(/(\d+)\s*(?:years|yrs)/);
  if (expMatch) {
    const yrs = parseInt(expMatch[1], 10);
    if (yrs > 0 && yrs < 45) {
      if (!updated.yearsOfExperience) updated.yearsOfExperience = yrs;
      else if (!updated.yearsInCurrentAssignment) updated.yearsInCurrentAssignment = Math.min(yrs, 4);
    }
  }

  // Detect Education
  if (text.includes('m.sc') || text.includes('msc') || text.includes('master')) {
    updated.educationalQualification = text.includes('stat') ? 'M.Sc. Statistics' : text.includes('econ') ? 'M.A. Economics / Econometrics' : 'Master Degree';
  } else if (text.includes('b.tech') || text.includes('btech') || text.includes('engineering')) {
    updated.educationalQualification = 'B.Tech / B.E. Computer Science';
  } else if (text.includes('phd') || text.includes('doctorate')) {
    updated.educationalQualification = 'Ph.D. in Quantitative Economics';
  }

  // Compute completeness
  let filledCount = 0;
  if (updated.name) filledCount++;
  if (updated.designation) filledCount++;
  if (updated.department) filledCount++;
  if (updated.serviceCadre) filledCount++;
  if (updated.educationalQualification) filledCount++;
  if (updated.yearsOfExperience) filledCount++;
  if (updated.toolsUsed && updated.toolsUsed.length > 0) filledCount++;
  if (updated.assignedProjectTitle || updated.pastExperiences?.length) filledCount++;

  const pct = Math.min(100, Math.max(20, Math.round((filledCount / 8) * 100)));

  // Check if user told agent to stop speaking / pause / be quiet
  if (
    text.includes('stop speaking') ||
    text.includes('shut up') ||
    text.includes('be quiet') ||
    text.includes('stop talking') ||
    text === 'stop' ||
    text === 'pause'
  ) {
    return {
      agentSpokenReply: "Oh, so sorry about that! I'll stop speaking. Go ahead, I'm listening.",
      agentEmotion: 'empathic',
      extractedDossier: updated,
      completionPercentage: pct,
      nextTopicSuggestion: 'Listening to Officer',
    };
  }

  // Generate warm, concise, human conversational responses (1-2 short sentences max)
  let reply = '';
  let nextTopic = 'Background & Tools';

  if (!updated.name) {
    reply = `Oh wonderful to connect! By the way, what name do you go by?`;
    nextTopic = 'Officer Name';
  } else if (!updated.department || !updated.designation) {
    reply = `Great to meet you, ${updated.name}! What division or wing are you currently posted in?`;
    nextTopic = 'Division & Role';
  } else if (!updated.toolsUsed || updated.toolsUsed.length === 0) {
    reply = `Oh, ${updated.department} handles so much! What data tools or software do you and your team usually work with day-to-day?`;
    nextTopic = 'Tools & Software';
  } else if (!updated.educationalQualification) {
    const toolList = updated.toolsUsed.slice(0, 2).join(' and ');
    reply = `Nice! Having ${toolList} in your toolkit is super handy. Did you study Statistics originally, or Economics?`;
    nextTopic = 'Education Background';
  } else if (!updated.assignedProjectTitle) {
    reply = `Got it! And what's the main project or mandate on your plate right now?`;
    nextTopic = 'Current Project';
  } else {
    reply = `Thanks so much, ${updated.name}, that gives me a really clear picture! Is there any skill or course you'd love to explore on Karmayogi?`;
    nextTopic = 'Learning Goals';
  }

  return {
    agentSpokenReply: reply,
    agentEmotion: 'warm_interested',
    extractedDossier: updated,
    completionPercentage: pct,
    nextTopicSuggestion: nextTopic,
  };
}

// -------------------------------------------------------------
// VITE MIDDLEWARE & SERVER STARTUP
// -------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`iGOT SkillIntel server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
