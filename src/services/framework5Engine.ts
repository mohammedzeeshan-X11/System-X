import {
  AssignedProject,
  OfficialProfile,
  ParameterScore,
  ProfileProjectGapAnalysis,
} from '../types';
import { ASSIGNED_PROJECTS_CATALOG } from '../data/assignedProjects';

export function computeFramework5Analysis(
  profile: OfficialProfile,
  assignedProjectInput?: AssignedProject
): ProfileProjectGapAnalysis {
  // Resolve assigned project
  const project =
    assignedProjectInput ||
    profile.assignedProjectCustom ||
    ASSIGNED_PROJECTS_CATALOG.find((p) => p.id === profile.assignedProjectId) ||
    ASSIGNED_PROJECTS_CATALOG[0];

  const education = (profile.educationalQualification || '').toLowerCase();
  const specialization = (profile.specialization || '').toLowerCase();
  const pastProjects = profile.pastProjectExperiences || [];
  const years = profile.yearsOfExperience || 1;
  const trainings = profile.priorTrainings || [];

  // Helper: check tools mentioned across all past projects
  const allTools = pastProjects
    .flatMap((p) => p.toolsUsed || [])
    .map((t) => t.toLowerCase());

  const hasTool = (needle: string) =>
    allTools.some((t) => t.includes(needle.toLowerCase()));

  const pastText = pastProjects
    .map((p) => `${p.projectTitle} ${p.role} ${p.description} ${p.keyDeliverables || ''}`)
    .join(' ')
    .toLowerCase();

  // -------------------------------------------------------------
  // 1. STATISTICAL PARAMETER COMPILATION
  // -------------------------------------------------------------
  let statScore = 45;
  // Academic baseline
  if (education.includes('ph.d') || education.includes('doctorate')) statScore += 25;
  else if (education.includes('m.stat') || education.includes('master of statistics')) statScore += 22;
  else if (education.includes('m.sc') && (education.includes('stat') || specialization.includes('stat'))) statScore += 18;
  else if (education.includes('economics') || specialization.includes('econometrics')) statScore += 15;
  else if (education.includes('b.tech') || education.includes('mca')) statScore += 8;

  // Past project contributions to statistical domain
  if (pastText.includes('sample') || pastText.includes('sampling')) statScore += 8;
  if (pastText.includes('survey design') || pastText.includes('questionnaire')) statScore += 7;
  if (pastText.includes('national accounts') || pastText.includes('gdp') || pastText.includes('sut')) statScore += 8;
  if (pastText.includes('price') || pastText.includes('cpi') || pastText.includes('index')) statScore += 8;
  if (pastText.includes('plfs') || pastText.includes('labour') || pastText.includes('asi')) statScore += 6;

  // In-service trainings
  const statTrainings = trainings.filter(
    (t) => t.domain.toLowerCase().includes('stat') || t.trainingName.toLowerCase().includes('stat')
  );
  statScore += Math.min(10, statTrainings.length * 4);

  // Tenure effect
  statScore += Math.min(10, Math.floor(years * 0.8));
  statScore = Math.min(98, Math.max(30, Math.round(statScore)));

  // -------------------------------------------------------------
  // 2. TECHNOLOGICAL PARAMETER COMPILATION
  // -------------------------------------------------------------
  let techScore = 38;
  if (hasTool('python')) techScore += 16;
  if (hasTool('r')) techScore += 14;
  if (hasTool('sql') || hasTool('database')) techScore += 12;
  if (hasTool('capi') || hasTool('cawi') || pastText.includes('capi')) techScore += 15;
  if (hasTool('stata') || hasTool('spss') || hasTool('sas')) techScore += 8;
  if (hasTool('powerbi') || hasTool('tableau') || hasTool('gis')) techScore += 8;
  if (hasTool('pipeline') || pastText.includes('automation') || pastText.includes('cloud')) techScore += 10;
  if (education.includes('b.tech') || education.includes('computer') || education.includes('data science') || education.includes('mca')) {
    techScore += 15;
  }
  const techTrainings = trainings.filter(
    (t) => t.domain.toLowerCase().includes('tech') || t.trainingName.toLowerCase().includes('python') || t.trainingName.toLowerCase().includes('r')
  );
  techScore += Math.min(8, techTrainings.length * 4);
  techScore = Math.min(98, Math.max(25, Math.round(techScore)));

  // -------------------------------------------------------------
  // 3. DIGITAL GOVERNANCE PARAMETER COMPILATION
  // -------------------------------------------------------------
  let govScore = 40;
  if (profile.serviceCadre === 'Indian Statistical Service') govScore += 14;
  else if (profile.serviceCadre === 'Subordinate Statistical Service') govScore += 10;
  else govScore += 8;

  if (pastText.includes('gem') || pastText.includes('procurement')) govScore += 10;
  if (pastText.includes('pfms') || pastText.includes('financial management')) govScore += 10;
  if (pastText.includes('e-office') || pastText.includes('file management')) govScore += 10;
  if (pastText.includes('dpdpa') || pastText.includes('privacy') || pastText.includes('confidentiality')) govScore += 12;
  if (pastText.includes('cyber') || pastText.includes('cert-in') || pastText.includes('security')) govScore += 10;
  if (pastText.includes('open data') || pastText.includes('data.gov.in') || pastText.includes('api')) govScore += 8;

  govScore += Math.min(12, Math.floor(years * 0.9));
  govScore = Math.min(96, Math.max(30, Math.round(govScore)));

  // -------------------------------------------------------------
  // 4. DOMAIN-SPECIFIC / SECTORAL PARAMETER COMPILATION
  // -------------------------------------------------------------
  let domainScore = 42;
  const projectTitleLower = project.title.toLowerCase();

  // Alignment between past projects and assigned project theme
  if (projectTitleLower.includes('nsso') || projectTitleLower.includes('survey')) {
    if (pastText.includes('nsso') || pastText.includes('fod') || pastText.includes('field') || pastText.includes('plfs')) {
      domainScore += 26;
    }
  } else if (projectTitleLower.includes('cpi') || projectTitleLower.includes('price')) {
    if (pastText.includes('price') || pastText.includes('cpi') || pastText.includes('wpi') || pastText.includes('inflation')) {
      domainScore += 28;
    }
  } else if (projectTitleLower.includes('national accounts') || projectTitleLower.includes('sut') || projectTitleLower.includes('gdp')) {
    if (pastText.includes('national accounts') || pastText.includes('gdp') || pastText.includes('gva') || pastText.includes('input-output')) {
      domainScore += 30;
    }
  } else if (projectTitleLower.includes('asi') || projectTitleLower.includes('industr')) {
    if (pastText.includes('asi') || pastText.includes('factory') || pastText.includes('iip') || pastText.includes('manufacturing')) {
      domainScore += 28;
    }
  } else if (projectTitleLower.includes('microdata') || projectTitleLower.includes('dissemination')) {
    if (pastText.includes('microdata') || pastText.includes('dissemination') || pastText.includes('api') || pastText.includes('warehouse')) {
      domainScore += 28;
    }
  }

  domainScore += Math.min(14, pastProjects.length * 5);
  domainScore = Math.min(98, Math.max(32, Math.round(domainScore)));

  // -------------------------------------------------------------
  // 5. MANAGERIAL & BEHAVIOURAL PARAMETER COMPILATION
  // -------------------------------------------------------------
  let mgmtScore = 40;
  // Seniority & role hierarchy
  if (profile.group === 'Group A') mgmtScore += 16;
  else if (profile.group === 'Group B') mgmtScore += 10;

  const leadRolesCount = pastProjects.filter((p) => {
    const r = (p.role || '').toLowerCase();
    return r.includes('lead') || r.includes('director') || r.includes('head') || r.includes('supervisor') || r.includes('coordinator');
  }).length;
  mgmtScore += Math.min(20, leadRolesCount * 8);

  if (pastText.includes('supervis') || pastText.includes('coordinat') || pastText.includes('stakeholder')) mgmtScore += 8;
  if (pastText.includes('brief') || pastText.includes('press') || pastText.includes('policy')) mgmtScore += 8;
  mgmtScore += Math.min(14, Math.floor(years * 0.9));
  mgmtScore = Math.min(96, Math.max(35, Math.round(mgmtScore)));

  // -------------------------------------------------------------
  // CONSTRUCT 5-PARAMETER COMPARISON METRICS
  // -------------------------------------------------------------
  const parameters: ParameterScore[] = [
    {
      name: 'Statistical Domain',
      key: 'statistical',
      profileScore: statScore,
      projectTarget: project.requiredLevels.statistical,
      gap: Math.max(0, project.requiredLevels.statistical - statScore),
      status:
        project.requiredLevels.statistical - statScore >= 18
          ? 'Critical Gap'
          : project.requiredLevels.statistical - statScore >= 8
          ? 'Moderate Gap'
          : 'Benchmark Met',
      rationale:
        statScore >= project.requiredLevels.statistical
          ? `Your academic qualification in ${profile.educationalQualification} and statistical project tenure fully satisfy this project benchmark.`
          : `Project mandates advanced statistical formulation (${project.requiredLevels.statistical}%), whereas your profile assesses at ${statScore}%, leaving a ${project.requiredLevels.statistical - statScore} pt gap requiring targeted methodology capacitation.`,
      subSkills: [
        { name: 'Survey Design & Sampling Frames', profile: statScore, target: project.requiredLevels.statistical, gap: Math.max(0, project.requiredLevels.statistical - statScore) },
        { name: 'Statistical Quality Assurance (NDQAF)', profile: Math.min(100, statScore + 4), target: Math.min(100, project.requiredLevels.statistical + 2), gap: Math.max(0, project.requiredLevels.statistical + 2 - (statScore + 4)) },
        { name: 'Statistical Inference & Error Modeling', profile: Math.max(20, statScore - 6), target: project.requiredLevels.statistical, gap: Math.max(0, project.requiredLevels.statistical - (statScore - 6)) }
      ]
    },
    {
      name: 'Technological Domain',
      key: 'technological',
      profileScore: techScore,
      projectTarget: project.requiredLevels.technological,
      gap: Math.max(0, project.requiredLevels.technological - techScore),
      status:
        project.requiredLevels.technological - techScore >= 18
          ? 'Critical Gap'
          : project.requiredLevels.technological - techScore >= 8
          ? 'Moderate Gap'
          : 'Benchmark Met',
      rationale:
        techScore >= project.requiredLevels.technological
          ? `Documented proficiency in tools (${allTools.slice(0, 3).join(', ') || 'modern pipelines'}) matches the project's technical ingestion requirements.`
          : `The assigned mandate requires ${project.requiredLevels.technological}% proficiency in modern computational data pipelines, leaving a ${project.requiredLevels.technological - techScore} pt technical deficit against your current ${techScore}%.`,
      subSkills: [
        { name: 'Python/R Statistical Scripting', profile: techScore, target: project.requiredLevels.technological, gap: Math.max(0, project.requiredLevels.technological - techScore) },
        { name: 'Automated Data Validation & Scrutiny', profile: Math.min(100, techScore + 6), target: project.requiredLevels.technological, gap: Math.max(0, project.requiredLevels.technological - (techScore + 6)) },
        { name: 'Field CAPI / Cloud Ingestion Pipelines', profile: hasTool('capi') ? Math.min(100, techScore + 12) : Math.max(25, techScore - 10), target: project.requiredLevels.technological, gap: Math.max(0, project.requiredLevels.technological - (hasTool('capi') ? techScore + 12 : techScore - 10)) }
      ]
    },
    {
      name: 'Digital Governance Domain',
      key: 'digitalGovernance',
      profileScore: govScore,
      projectTarget: project.requiredLevels.digitalGovernance,
      gap: Math.max(0, project.requiredLevels.digitalGovernance - govScore),
      status:
        project.requiredLevels.digitalGovernance - govScore >= 18
          ? 'Critical Gap'
          : project.requiredLevels.digitalGovernance - govScore >= 8
          ? 'Moderate Gap'
          : 'Benchmark Met',
      rationale:
        govScore >= project.requiredLevels.digitalGovernance
          ? `Institutional service record establishes strong working familiarity with e-Governance, DPDPA, and procurement compliances.`
          : `Official statutory compliances (DPDPA 2023, PFMS/GeM protocols, and CERT-In audits) demand ${project.requiredLevels.digitalGovernance}%, creating a ${project.requiredLevels.digitalGovernance - govScore} pt gap against your ${govScore}%.`,
      subSkills: [
        { name: 'DPDPA 2023 & Statistical Confidentiality', profile: govScore, target: project.requiredLevels.digitalGovernance, gap: Math.max(0, project.requiredLevels.digitalGovernance - govScore) },
        { name: 'e-Office, GeM & PFMS Compliance', profile: Math.min(100, govScore + 5), target: project.requiredLevels.digitalGovernance, gap: Math.max(0, project.requiredLevels.digitalGovernance - (govScore + 5)) },
        { name: 'Cyber Hygiene & CERT-In Protocols', profile: Math.max(30, govScore - 8), target: project.requiredLevels.digitalGovernance, gap: Math.max(0, project.requiredLevels.digitalGovernance - (govScore - 8)) }
      ]
    },
    {
      name: 'Domain-Specific / Sectoral',
      key: 'domainSpecific',
      profileScore: domainScore,
      projectTarget: project.requiredLevels.domainSpecific,
      gap: Math.max(0, project.requiredLevels.domainSpecific - domainScore),
      status:
        project.requiredLevels.domainSpecific - domainScore >= 18
          ? 'Critical Gap'
          : project.requiredLevels.domainSpecific - domainScore >= 8
          ? 'Moderate Gap'
          : 'Benchmark Met',
      rationale:
        domainScore >= project.requiredLevels.domainSpecific
          ? `Your previous posting history in related divisions provides comprehensive domain familiarity for this specific assignment.`
          : `Deep sectoral requirements for ${project.division} demand a ${project.requiredLevels.domainSpecific}% specialization, resulting in a ${project.requiredLevels.domainSpecific - domainScore} pt gap against your historical background (${domainScore}%).`,
      subSkills: [
        { name: 'Sectoral Nomenclature & Concordance', profile: domainScore, target: project.requiredLevels.domainSpecific, gap: Math.max(0, project.requiredLevels.domainSpecific - domainScore) },
        { name: 'Division Operational Protocols', profile: Math.min(100, domainScore + 4), target: project.requiredLevels.domainSpecific, gap: Math.max(0, project.requiredLevels.domainSpecific - (domainScore + 4)) },
        { name: 'Historical Time-Series Harmonization', profile: Math.max(25, domainScore - 8), target: project.requiredLevels.domainSpecific, gap: Math.max(0, project.requiredLevels.domainSpecific - (domainScore - 8)) }
      ]
    },
    {
      name: 'Managerial & Behavioural',
      key: 'managerial',
      profileScore: mgmtScore,
      projectTarget: project.requiredLevels.managerial,
      gap: Math.max(0, project.requiredLevels.managerial - mgmtScore),
      status:
        project.requiredLevels.managerial - mgmtScore >= 18
          ? 'Critical Gap'
          : project.requiredLevels.managerial - mgmtScore >= 8
          ? 'Moderate Gap'
          : 'Benchmark Met',
      rationale:
        mgmtScore >= project.requiredLevels.managerial
          ? `Demonstrated supervisory track record and civil service tenure meet the leadership requirements of this project.`
          : `Field team coordination and inter-ministerial liaison mandate ${project.requiredLevels.managerial}% managerial capacity, yielding a ${project.requiredLevels.managerial - mgmtScore} pt gap against your assessed ${mgmtScore}%.`,
      subSkills: [
        { name: 'Field Supervision & Team Leadership', profile: mgmtScore, target: project.requiredLevels.managerial, gap: Math.max(0, project.requiredLevels.managerial - mgmtScore) },
        { name: 'Inter-Agency Coordination & Briefs', profile: Math.min(100, mgmtScore + 2), target: project.requiredLevels.managerial, gap: Math.max(0, project.requiredLevels.managerial - (mgmtScore + 2)) },
        { name: 'Crisis Resolution & Field Logistics', profile: Math.max(30, mgmtScore - 6), target: project.requiredLevels.managerial, gap: Math.max(0, project.requiredLevels.managerial - (mgmtScore - 6)) }
      ]
    }
  ];

  const totalGaps = parameters.reduce((acc, p) => acc + p.gap, 0);
  const avgGap = Math.round(totalGaps / parameters.length);
  const readinessCount = parameters.filter((p) => p.gap <= 8).length;
  const overallReadiness = Math.round((readinessCount / parameters.length) * 100);

  return {
    officialId: profile.id,
    projectId: project.id,
    projectTitle: project.title,
    division: project.division,
    overallReadiness,
    averageGap: avgGap,
    parameters,
    evaluatedAt: new Date().toISOString()
  };
}
