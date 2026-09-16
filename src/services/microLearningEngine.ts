import { MicroLearningMistake, QuizQuestion } from '../types';

/**
 * Builds deterministic fallback micro-learning content for a specific question mistake.
 */
export function buildDeterministicMicroLesson(
  question: QuizQuestion,
  questionIndex: number,
  userAnswerIndex: number
): MicroLearningMistake {
  const userAnswerText = question.options[userAnswerIndex] || 'Selected Option';
  const correctAnswerText = question.options[question.correctAnswerIndex] || 'Correct Statutory Option';
  const tag = question.competencyTag || 'Official Statistics';

  // Customized domain-specific cognitive traps and rules of thumb
  let cognitiveTrap = `Selecting "${userAnswerText}" commonly occurs when officials conflate preliminary operational proxies with strict statutory MoSPI classification protocols.`;
  let microLesson = `Under official standards, "${correctAnswerText}" is the mandated requirement. ${question.explanation}`;
  let ruleOfThumb = `Always cross-reference the statutory guideline boundary before finalizing survey schedules or estimation weights.`;
  let mospiApplication = `This rule prevents non-sampling errors and classification anomalies across NSSO survey schedules and national statistics reporting.`;
  let igotMicroModuleTitle = `iGOT 3-Min Capsule: Core Principles of ${tag}`;

  const qLower = question.question.toLowerCase();

  if (qLower.includes('deflation') || qLower.includes('gva') || qLower.includes('gross value added')) {
    cognitiveTrap = `A common pitfall is applying single deflation using aggregate WPI/CPI, which distorts real value added when input and output prices diverge.`;
    microLesson = `Double deflation separately deflates gross output with output indices and intermediate consumption with input indices. Real GVA is strictly the arithmetic difference between the two deflated series.`;
    ruleOfThumb = `Golden Rule: Real GVA = Real Output (Output Deflator) − Real Inputs (Input Deflator). Never deflate nominal GVA directly!`;
    mospiApplication = `Mandated under SNA 2008 for National Accounts base revisions to ensure real GDP accurately reflects manufacturing and services productivity.`;
    igotMicroModuleTitle = `iGOT 3-Min Capsule: Double Deflation in SNA 2008`;
  } else if (qLower.includes('fsu') || qLower.includes('first stage unit') || qLower.includes('sampling')) {
    cognitiveTrap = `Officers frequently mix up First Stage Units (geographic areal clusters) with Ultimate Stage Units (households or enterprises) in multi-stage stratification.`;
    microLesson = `In NSSO surveys, First Stage Units (FSUs) are Census villages in rural areas and Urban Frame Survey (UFS) blocks in urban areas. Individual households/enterprises are selected at the second/ultimate stage.`;
    ruleOfThumb = `Memory Anchor: FSUs are geographic boundaries (Villages/UFS Blocks); USUs are listing units (Households/Enterprises).`;
    mospiApplication = `Field investigators in FOD rely on this exact frame hierarchy to ensure complete listing before household selection for PLFS and ASHE.`;
    igotMicroModuleTitle = `iGOT 3-Min Capsule: FSU Hierarchy & Sampling Frames`;
  } else if (qLower.includes('sub-sample') || qLower.includes('variance') || qLower.includes('error')) {
    cognitiveTrap = `Assuming sub-samples are mere operational backups or administrative divisions between central and state staff.`;
    microLesson = `Drawing two independent, interpenetrating sub-samples allows calculating valid, non-parametric standard errors and sampling variances without restrictive distribution assumptions.`;
    ruleOfThumb = `Interpenetrating sub-samples provide direct, model-free estimates of survey variance.`;
    mospiApplication = `MoSPI SDRD publishes variance estimates for key indicators (like unemployment in PLFS) derived directly from sub-sample divergence.`;
    igotMicroModuleTitle = `iGOT 2-Min Capsule: Interpenetrating Sub-Samples & Variance Estimation`;
  } else if (qLower.includes('capi') || qLower.includes('ndqaf') || qLower.includes('quality')) {
    cognitiveTrap = `Confusing Gate 1 (survey design & schedule drafting) with Gate 2 (live field data collection scrutiny).`;
    microLesson = `NDQAF Gate 2 governs real-time data capture in CAPI software with mandatory geo-fencing, timestamp consistency checks, and supervisor re-interview audits.`;
    ruleOfThumb = `Gate 2 = Live Field Verification (CAPI Logic & Geo-tagging); Gate 3 = Post-Collection Tabulation Processing.`;
    mospiApplication = `Enforced on tablet devices used by field enumerators to block impossible skip patterns and out-of-range demographic inputs.`;
    igotMicroModuleTitle = `iGOT 3-Min Capsule: NDQAF Field Quality Checkpoints`;
  } else if (qLower.includes('r&d') || qLower.includes('capital formation') || qLower.includes('intellectual property')) {
    cognitiveTrap = `Treating Research & Development expenditures as immediate intermediate consumption instead of capitalized long-term assets.`;
    microLesson = `SNA 2008 classifies R&D and database creation as Gross Fixed Capital Formation (GFCF) under Intellectual Property Products because they yield economic value over multi-year periods.`;
    ruleOfThumb = `If it generates multi-period economic utility (like R&D or software), it is GFCF, not current operating expense.`;
    mospiApplication = `Vital for National Accounts division when processing annual balance sheets of registered manufacturing firms from the Annual Survey of Industries (ASI).`;
    igotMicroModuleTitle = `iGOT 2-Min Capsule: Capitalizing IPP & R&D in National Accounts`;
  }

  return {
    questionIndex,
    questionId: question.id,
    question: question.question,
    options: question.options,
    userAnswerIndex,
    userAnswerText,
    correctAnswerIndex: question.correctAnswerIndex,
    correctAnswerText,
    competencyTag: tag,
    explanation: question.explanation,
    cognitiveTrap,
    microLesson,
    ruleOfThumb,
    mospiApplication,
    igotMicroModuleTitle,
    remedyReadMinutes: 2,
  };
}

/**
 * Analyses all mistakes in a completed quiz, calling the AI micro-learning endpoint with deterministic fallback.
 */
export async function analyzeQuizMistakes(
  documentTitle: string,
  questions: QuizQuestion[],
  userAnswers: Record<number, number>
): Promise<MicroLearningMistake[]> {
  const mistakesList: Array<{
    questionIndex: number;
    question: QuizQuestion;
    userAnswerIndex: number;
  }> = [];

  questions.forEach((q, idx) => {
    const userAns = userAnswers[idx];
    if (userAns !== undefined && userAns !== q.correctAnswerIndex) {
      mistakesList.push({
        questionIndex: idx,
        question: q,
        userAnswerIndex: userAns,
      });
    }
  });

  if (mistakesList.length === 0) {
    return [];
  }

  // Generate instant deterministic analysis as baseline
  const baselineMistakes: MicroLearningMistake[] = mistakesList.map((m) =>
    buildDeterministicMicroLesson(m.question, m.questionIndex, m.userAnswerIndex)
  );

  // Try calling AI enhancement API
  try {
    const payload = {
      documentName: documentTitle,
      mistakes: baselineMistakes.map((m) => ({
        questionIndex: m.questionIndex,
        question: m.question,
        options: m.options,
        userAnswerIndex: m.userAnswerIndex,
        userAnswerText: m.userAnswerText,
        correctAnswerIndex: m.correctAnswerIndex,
        correctAnswerText: m.correctAnswerText,
        explanation: m.explanation,
        competencyTag: m.competencyTag,
      })),
    };

    const response = await fetch('/api/quiz/analyze-mistakes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.analyzedMistakes) && data.analyzedMistakes.length > 0) {
        return data.analyzedMistakes;
      }
    }
  } catch (err) {
    console.warn('Micro-learning AI service call note, using deterministic lessons:', err);
  }

  return baselineMistakes;
}
