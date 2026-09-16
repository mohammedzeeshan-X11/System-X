import { AssignedProject } from '../types';

export const ASSIGNED_PROJECTS_CATALOG: AssignedProject[] = [
  {
    id: 'proj-nsso-80',
    title: '80th Round NSSO Multi-Subject Survey: Field CAPI & Real-Time Geo-Audit',
    division: 'NSSO Field Operations Division (FOD)',
    description: 'Directing the nationwide canvassing of 80th Round socio-economic schedules across 14,000 First Stage Units (FSUs) using handheld Computer-Assisted Personal Interviewing (CAPI) tablets with GPS verification and automated validation scripts.',
    keyDeliverables: [
      'Design and rollout automated field CAPI validation logic on Android tablets.',
      'Establish real-time enumerator geo-fencing and 5% supervisor re-interview sampling.',
      'Supervise 450+ field statistical officers across rural and urban survey sub-rounds.',
      'Perform high-speed scrutiny on microdata submissions before weekly cloud ingestion.'
    ],
    requiredLevels: {
      statistical: 88,
      technological: 92,
      digitalGovernance: 78,
      domainSpecific: 90,
      managerial: 86,
    },
    mandatedCompetencies: [
      'Survey Design & Sampling Frames',
      'CAPI & Field Data Automation',
      'Data Scrutiny & Validation Pipelines',
      'Field Team Supervision & Leadership',
      'Digital Data Confidentiality (DPDPA 2023)'
    ]
  },
  {
    id: 'proj-cpi-rev-2024',
    title: 'All-India Consumer Price Index (CPI): Base Year Revision to 2024',
    division: 'Price Statistics Division (PSD)',
    description: 'Execution of the comprehensive base year revision for All-India CPI (Rural, Urban, Combined) incorporating Household Consumption Expenditure Survey (HCES 2022-23) weighting diagrams, digital price collection, and online item substitution tracking.',
    keyDeliverables: [
      'Formulate Laspeyres/Jevons geometric mean weighting diagrams for 300+ item basket.',
      'Standardize digital price quotation scrutiny across 1,181 village and 1,114 urban markets.',
      'Deploy automated price outlier detection scripts using Python and R.',
      'Draft Cabinet briefing dossiers and RBI monetary policy consultation papers.'
    ],
    requiredLevels: {
      statistical: 95,
      technological: 84,
      digitalGovernance: 80,
      domainSpecific: 96,
      managerial: 82,
    },
    mandatedCompetencies: [
      'Price Statistics & Index Number Theory',
      'Econometric Modeling & Substitution Bias',
      'R & Python for Large Price Matrices',
      'Public Policy Briefs & Press Releases',
      'e-Office & Government Administrative Workflows'
    ]
  },
  {
    id: 'proj-nad-sut-2025',
    title: 'Modernization of National Accounts: Dynamic SUT & Double Deflation Engine',
    division: 'National Accounts Division (NAD)',
    description: 'Transitioning the Indian System of National Accounts (SNA) to dynamic Supply and Use Tables (SUT), implementing Double Deflation for manufacturing Gross Value Added (GVA), and integrating high-frequency MCA21 corporate filings.',
    keyDeliverables: [
      'Compile dynamic 140x140 Supply-Use Tables balancing product flows across industries.',
      'Develop automated Double Deflation algorithms linking WPI/CPI deflators with input matrices.',
      'Harmonize state-level GSDP estimates with national macroeconomic aggregates.',
      'Liaise with IMF, World Bank, and National Accounts Advisory Committee.'
    ],
    requiredLevels: {
      statistical: 96,
      technological: 86,
      digitalGovernance: 82,
      domainSpecific: 95,
      managerial: 88,
    },
    mandatedCompetencies: [
      'System of National Accounts (SNA 2008)',
      'Macroeconomic Aggregates & GDP Compilation',
      'Advanced Econometrics & Matrix Algebra',
      'Cross-Wing Ministerial Coordination',
      'Open Data & Secure SDMX Dissemination'
    ]
  },
  {
    id: 'proj-asi-cloud-2025',
    title: 'Annual Survey of Industries (ASI): Cloud Data Ingestion & Digital Auditing',
    division: 'Industrial Statistics Wing (ISW)',
    description: 'Overhauling the Annual Survey of Industries census and sample sector data collection pipeline, moving to a secure cloud-native factory return portal with automated balance sheet validation and NIC/ASICC cross-referencing.',
    keyDeliverables: [
      'Implement multi-tier digital scrutiny for 70,000+ factory industrial returns.',
      'Map National Industrial Classification (NIC-2008) automated concordance tables.',
      'Establish cloud-hosted secure staging databases complying with CERT-In standards.',
      'Conduct zonal capacity workshops for industrial unit accountants and field staff.'
    ],
    requiredLevels: {
      statistical: 86,
      technological: 90,
      digitalGovernance: 88,
      domainSpecific: 92,
      managerial: 84,
    },
    mandatedCompetencies: [
      'Industrial Statistics & IIP Compilation',
      'SQL & Enterprise Relational Databases',
      'Government Cloud (MeghRaj) Governance',
      'Factory Census Sampling Methodologies',
      'Vendor SLA & Project Milestone Tracking'
    ]
  },
  {
    id: 'proj-diid-open-api',
    title: 'National Microdata Dissemination Gateway & Open API Architecture',
    division: 'Data Informatics & Innovation Division (DIID)',
    description: 'Architecting a unified, secure national microdata dissemination portal with automated microdata anonymization, high-throughput REST APIs, and role-based access for researchers, university faculties, and international bodies.',
    keyDeliverables: [
      'Implement statistical disclosure control (SDC) algorithms for anonymizing survey records.',
      'Build scalable RESTful API endpoints for Data.gov.in and international open data access.',
      'Audit cyber hygiene and compliance with DPDPA 2023 and CERT-In mandates.',
      'Monitor API usage SLAs, server load balancing, and researcher credentials.'
    ],
    requiredLevels: {
      statistical: 76,
      technological: 96,
      digitalGovernance: 95,
      domainSpecific: 80,
      managerial: 84,
    },
    mandatedCompetencies: [
      'Cloud Architecture & Server Infrastructure',
      'Statistical Disclosure Control & Anonymization',
      'DPDPA 2023 & Official Data Governance',
      'API Design & High-Volume Data Streaming',
      'Cybersecurity Hygiene & Threat Auditing'
    ]
  }
];

export function getAssignedProjectById(id: string): AssignedProject | undefined {
  return ASSIGNED_PROJECTS_CATALOG.find((p) => p.id === id);
}
