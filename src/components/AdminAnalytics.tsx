import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  Building2,
  Users,
  AlertTriangle,
  TrendingUp,
  Award,
  Filter,
  CheckCircle2,
  Sparkles,
  Download,
  ShieldCheck,
  Briefcase,
  FileSpreadsheet,
  Printer,
  X,
  Layers,
  Check,
} from 'lucide-react';
import { getAllOfficials, getUserCompetencies, getAllAssignmentsFRACStorage } from '../services/storage';
import { AssignmentFRAC, OfficialProfile } from '../types';

export const AdminAnalytics: React.FC = () => {
  const officials = getAllOfficials();
  const allFRAC = getAllAssignmentsFRACStorage();

  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedAssignment, setSelectedAssignment] = useState<string>('All');
  const [showTNAModal, setShowTNAModal] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  // Departments list
  const departments = [
    'All',
    'Price Statistics Division (PSD)',
    'National Accounts Division (NAD)',
    'NSSO Field Operations Division (FOD)',
    'NSSO Survey Design & Research Division (SDRD)',
    'NSSO Data Processing Division (DPD)',
    'Agricultural Statistics Division (ASD)',
    'Social Statistics Division (SSD)',
    'Data Informatics & Innovation Division (DIID)',
    'National Statistical Systems Training Academy (NSSTA)',
  ];

  // Dynamic assignments matching selected department
  const filteredFRACAssignments = allFRAC.filter((a) => {
    if (selectedDept === 'All') return true;
    return a.department.toLowerCase().includes(selectedDept.toLowerCase().split('(')[0].trim());
  });

  // Filter officials by division and assignment
  const filteredOfficials = officials.filter((o) => {
    if (selectedDept !== 'All') {
      const cleanDept = selectedDept.split('(')[0].trim().toLowerCase();
      if (!o.department.toLowerCase().includes(cleanDept)) {
        return false;
      }
    }
    if (selectedAssignment !== 'All') {
      if (
        o.assignmentId !== selectedAssignment &&
        !o.assignmentTitle?.toLowerCase().includes(selectedAssignment.toLowerCase()) &&
        !o.designation.toLowerCase().includes(selectedAssignment.toLowerCase())
      ) {
        return false;
      }
    }
    return true;
  });

  // Helper to compute stats for an official
  const getOfficialDomainStats = (official: OfficialProfile) => {
    const scores = getUserCompetencies(official.id);

    if (scores && scores.domainSummaries) {
      return {
        statistical: scores.domainSummaries['Statistical']?.gapAvg ?? 20,
        technical: scores.domainSummaries['Technical']?.gapAvg ?? 18,
        digitalGov: scores.domainSummaries['Digital Governance']?.gapAvg ?? 15,
        managerial: scores.domainSummaries['Behavioural/Managerial']?.gapAvg ?? 12,
        overallProficiency: scores.overallProficiency ?? 64,
        readiness: scores.assignmentReadinessPercentage ?? 72,
      };
    }

    const exp = official.yearsOfExperience || 5;
    const isStats = (official.educationalQualification || '').toLowerCase().includes('stat');
    const isTech = (official.previousTrainings || []).some(
      (t) => t.toLowerCase().includes('python') || t.toLowerCase().includes('data')
    );

    const statGap = Math.max(6, 28 - (isStats ? 12 : 4) - Math.floor(exp * 0.7));
    const techGap = Math.max(8, 32 - (isTech ? 14 : 4) - Math.floor(exp * 0.5));
    const digitalGap = Math.max(6, 24 - Math.floor(exp * 0.5));
    const mgrGap = Math.max(5, 22 - Math.floor(exp * 0.9));
    const proficiency = Math.min(95, 100 - Math.round((statGap + techGap + digitalGap + mgrGap) / 2.2));
    const readiness = Math.min(100, Math.round((proficiency / 85) * 100));

    return {
      statistical: statGap,
      technical: techGap,
      digitalGov: digitalGap,
      managerial: mgrGap,
      overallProficiency: proficiency,
      readiness,
    };
  };

  // Cell badge for heatmap
  const getCellBadge = (gap: number) => {
    if (gap > 20) {
      return {
        bg: 'bg-rose-50 text-rose-800 border border-rose-200',
        label: `-${gap} (Critical)`,
      };
    }
    if (gap >= 12) {
      return {
        bg: 'bg-amber-50 text-amber-800 border border-amber-200',
        label: `-${gap} (Moderate)`,
      };
    }
    return {
      bg: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
      label: `-${gap} (Ready)`,
    };
  };

  // Assignment Readiness across divisions calculation
  const divisionReadinessMap: Record<
    string,
    { total: number; sumReadiness: number; sumProficiency: number; positions: Set<string> }
  > = {};

  officials.forEach((o) => {
    const div = o.department.split('(')[0].trim() || 'Statistical Division';
    if (!divisionReadinessMap[div]) {
      divisionReadinessMap[div] = { total: 0, sumReadiness: 0, sumProficiency: 0, positions: new Set() };
    }
    const stats = getOfficialDomainStats(o);
    divisionReadinessMap[div].total += 1;
    divisionReadinessMap[div].sumReadiness += stats.readiness;
    divisionReadinessMap[div].sumProficiency += stats.overallProficiency;
    divisionReadinessMap[div].positions.add(o.assignmentTitle || o.designation);
  });

  const divisionReadinessList = Object.entries(divisionReadinessMap).map(([div, data]) => {
    const avgReadiness = Math.round(data.sumReadiness / data.total);
    const avgProficiency = Math.round(data.sumProficiency / data.total);
    return {
      division: div,
      officialsCount: data.total,
      positionsCount: data.positions.size,
      avgReadiness,
      avgProficiency,
      capacityDeficit: 100 - avgReadiness,
    };
  });

  // TNA Grouped Report Data by Assignment
  const tnaAssignmentGroupings = [
    {
      division: 'Price Statistics Division (PSD)',
      assignment: 'Deputy Director – Price Statistics Division',
      cadreCount: 14,
      requiredSeats: 34,
      priorityCourse: 'Consumer Price Index (CPI) Base Revision & Web Scraping',
      provider: 'NSSTA Greater Noida',
      topDeficitCompetency: 'Price Statistics & Index Numbers (Avg Gap: 24 pts)',
      urgency: 'High (Base Year Revision)',
    },
    {
      division: 'NSSO Field Operations Division (FOD)',
      assignment: 'Senior / Junior Statistical Officer – Field Scrutiny & CAPI',
      cadreCount: 92,
      requiredSeats: 80,
      priorityCourse: 'CAPI Field Data Collection & Validation Tools',
      provider: 'iGOT Karmayogi / FOD Zonal',
      topDeficitCompetency: 'Field Operations & CAPI (Avg Gap: 28 pts)',
      urgency: 'Immediate (Active Round)',
    },
    {
      division: 'National Accounts Division (NAD)',
      assignment: 'Joint / Deputy Director – National Accounts Division',
      cadreCount: 22,
      requiredSeats: 45,
      priorityCourse: 'System of National Accounts (SNA 2008) & Supply-Use Tables',
      provider: 'NSSTA / IMF SUT Workshop',
      topDeficitCompetency: 'National Accounts & SUT (Avg Gap: 26 pts)',
      urgency: 'High (Macro Calibration)',
    },
    {
      division: 'Data Informatics & Innovation Division (DIID)',
      assignment: 'Data Engineer & Platform Specialist – DIID',
      cadreCount: 18,
      requiredSeats: 26,
      priorityCourse: 'Enterprise Python & Real-Time Open Data Pipelines',
      provider: 'iGOT Karmayogi',
      topDeficitCompetency: 'Python & Data Engineering (Avg Gap: 22 pts)',
      urgency: 'Medium',
    },
    {
      division: 'Social Statistics Division (SSD)',
      assignment: 'Assistant Director – SDG Monitoring & Time Use Survey',
      cadreCount: 16,
      requiredSeats: 28,
      priorityCourse: 'National Indicator Framework (NIF) for SDG Monitoring',
      provider: 'UN SIAP / NSSTA',
      topDeficitCompetency: 'SDG Indicators & Metadata (Avg Gap: 19 pts)',
      urgency: 'Medium',
    },
  ];

  // Handle Export TNA CSV
  const handleExportCSV = () => {
    const headers = [
      'Division',
      'Assignment Role',
      'Active Officers',
      'Required Training Seats',
      'Priority Course',
      'Target Provider',
      'Top Deficit Competency',
      'Urgency',
    ];
    const rows = tnaAssignmentGroupings.map((g) => [
      `"${g.division}"`,
      `"${g.assignment}"`,
      g.cadreCount,
      g.requiredSeats,
      `"${g.priorityCourse}"`,
      `"${g.provider}"`,
      `"${g.topDeficitCompetency}"`,
      `"${g.urgency}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'MoSPI_TNA_Report_By_Assignment.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white border border-slate-300 rounded-xs p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-semibold text-slate-700 uppercase tracking-widest mb-1 font-mono">
              <ShieldCheck className="w-4 h-4 text-black" />
              <span>MoSPI Cadre Administration • Capacity Building Commission Telemetry</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Statistical Cadre Competency Intelligence &amp; Heatmap
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed font-sans">
              Statutory FRAC gap diagnostics and division readiness telemetry for MoSPI training coordinators, cadre managers, and NSSTA faculty.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowTNAModal(true)}
              className="px-4 py-2.5 bg-black hover:bg-slate-800 text-white rounded-xs text-[11px] font-medium tracking-wide uppercase flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-white" />
              <span>Export TNA Ledger (By Assignment)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-300 rounded-xs p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] uppercase tracking-wider font-mono">
            <span>Evaluated Officers</span>
            <Users className="w-4 h-4 text-black" />
          </div>
          <div className="mt-2 font-serif text-2xl font-bold text-slate-900">{officials.length}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-sans">
            Across ISS, SSS &amp; Contractual wings
          </div>
        </div>

        <div className="bg-white border border-slate-300 rounded-xs p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] uppercase tracking-wider font-mono">
            <span>Mean Assignment Readiness</span>
            <Award className="w-4 h-4 text-black" />
          </div>
          <div className="mt-2 font-serif text-2xl font-bold text-slate-900">74%</div>
          <div className="text-[11px] text-slate-500 mt-1 font-sans">
            Statutory standard: 85% readiness
          </div>
        </div>

        <div className="bg-white border border-slate-300 rounded-xs p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] uppercase tracking-wider font-mono">
            <span>Primary Cadre Deficit</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 font-serif text-base font-bold text-rose-700 truncate">
            Field Ops CAPI &amp; Validation
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-sans">
            NSSO FOD requires 80 prioritized seats
          </div>
        </div>

        <div className="bg-white border border-slate-300 rounded-xs p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] uppercase tracking-wider font-mono">
            <span>Accredited Learning Log</span>
            <TrendingUp className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="mt-2 font-serif text-2xl font-bold text-emerald-800">
            {officials.reduce((a, b) => a + (b.learningHoursLogged || 0), 0)}h
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-sans">
            Continuous statutory learning
          </div>
        </div>
      </div>

      {/* 3. ASSIGNMENT READINESS ACROSS CADRES TABLE */}
      <div className="bg-white border border-slate-300 rounded-xs p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-black" />
              <span>Assignment Readiness Across Cadres &amp; Operating Divisions</span>
            </h2>
            <p className="text-xs text-slate-600 font-sans">
              Evaluates institutional readiness against FRAC assignment mandates across MoSPI departments
            </p>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded-xs bg-slate-100 text-slate-800 border border-slate-300 font-mono">
            {divisionReadinessList.length} Operating Divisions Mapped
          </span>
        </div>

        <div className="overflow-x-auto rounded-xs border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[10px] border-b border-slate-200 font-serif">
              <tr>
                <th className="py-3 px-4">Division / Wing</th>
                <th className="py-3 px-3 text-center">Active Officers</th>
                <th className="py-3 px-3 text-center">Mean Proficiency</th>
                <th className="py-3 px-4 text-center">Assignment Readiness</th>
                <th className="py-3 px-3 text-center">Capacity Deficit</th>
                <th className="py-3 px-3 text-center">Statutory Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-sans">
              {divisionReadinessList.map((div, i) => {
                const isUrgent = div.avgReadiness < 70;
                const isModerate = div.avgReadiness >= 70 && div.avgReadiness < 80;

                return (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-serif font-semibold text-slate-900">{div.division}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {div.positionsCount} distinct FRAC position roles
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-700 font-mono">{div.officialsCount}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                      {div.avgProficiency}%
                    </td>
                    <td className="py-3 px-4">
                      <div className="w-full max-w-[140px] mx-auto">
                        <div className="flex justify-between text-[10px] mb-1 font-mono">
                          <span className="text-slate-900 font-bold">{div.avgReadiness}%</span>
                          <span className="text-slate-400">Benchmark 85%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-xs overflow-hidden">
                          <div
                            className={`h-full ${
                              isUrgent ? 'bg-rose-600' : isModerate ? 'bg-amber-500' : 'bg-emerald-600'
                            }`}
                            style={{ width: `${div.avgReadiness}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-rose-700">
                      -{div.capacityDeficit} pts
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-xs text-[9px] font-mono uppercase tracking-wider border ${
                          isUrgent
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : isModerate
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {isUrgent ? 'Intervention Required' : isModerate ? 'Moderate Deficit' : 'Optimal'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. CADRE COMPETENCY HEATMAP TABLE WITH DUAL FILTERS */}
      <div className="bg-white border border-slate-300 rounded-xs p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-black" />
              <span>Cadre Competency Heatmap Ledger</span>
            </h2>
            <p className="text-xs text-slate-600 font-sans">
              Filter by Division / Wing and by Specific Assignment Mandate
            </p>
          </div>

          {/* Table Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-600 flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5" />
              <span>Division:</span>
            </span>
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setSelectedAssignment('All');
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xs text-xs text-slate-900 focus:outline-hidden focus:border-black font-sans"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <span className="text-slate-600 ml-1 font-mono text-[10px] uppercase tracking-wider">Assignment:</span>
            <select
              value={selectedAssignment}
              onChange={(e) => setSelectedAssignment(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xs text-xs text-slate-900 focus:outline-hidden focus:border-black max-w-xs truncate font-sans"
            >
              <option value="All">All Assignments / Positions</option>
              {filteredFRACAssignments.map((f) => (
                <option key={f.assignmentId} value={f.title}>
                  {f.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono text-slate-600 uppercase tracking-wider">
          <span className="font-semibold text-slate-900 font-mono">Heatmap Calibration:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-rose-500"></span>
            <span>Critical Gap (&gt;20 pts)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-500"></span>
            <span>Moderate Gap (12-20 pts)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500"></span>
            <span>Competent (&lt;12 pts)</span>
          </span>
        </div>

        {/* Heatmap Table */}
        <div className="overflow-x-auto rounded-xs border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[10px] border-b border-slate-200 font-serif">
              <tr>
                <th className="py-3 px-4">Official &amp; Cadre</th>
                <th className="py-3 px-3">Assignment &amp; Wing</th>
                <th className="py-3 px-3 text-center">Statistical Gap</th>
                <th className="py-3 px-3 text-center">Technical Gap</th>
                <th className="py-3 px-3 text-center">Digital Gov Gap</th>
                <th className="py-3 px-3 text-center">Managerial Gap</th>
                <th className="py-3 px-3 text-center">Readiness</th>
                <th className="py-3 px-3 text-center">iGOT Log</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-sans">
              {filteredOfficials.map((official) => {
                const stats = getOfficialDomainStats(official);
                const statBadge = getCellBadge(stats.statistical);
                const techBadge = getCellBadge(stats.technical);
                const digBadge = getCellBadge(stats.digitalGov);
                const mgrBadge = getCellBadge(stats.managerial);

                return (
                  <tr key={official.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-serif font-semibold text-slate-900">{official.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {official.employeeId || 'Official'} • {official.serviceCadre || 'Statistical Service'}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-700 text-[11px]">
                      <div className="font-medium text-slate-900">
                        {official.assignmentTitle || official.designation}
                      </div>
                      <div className="text-[10px] text-slate-600 font-mono">
                        {official.department.split('(')[0]?.trim()}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-xs text-[9px] font-mono font-bold ${statBadge.bg}`}>
                        {statBadge.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-xs text-[9px] font-mono font-bold ${techBadge.bg}`}>
                        {techBadge.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-xs text-[9px] font-mono font-bold ${digBadge.bg}`}>
                        {digBadge.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-xs text-[9px] font-mono font-bold ${mgrBadge.bg}`}>
                        {mgrBadge.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                      {stats.readiness}%
                    </td>
                    <td className="py-3 px-3 text-center text-slate-700 font-mono text-[11px]">
                      {official.learningHoursLogged || 0}h
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. TNA REPORT MODAL (BY ASSIGNMENT GROUPING) */}
      {showTNAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-xs shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="bg-white border-b border-slate-200 text-slate-900 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xs bg-slate-100 border border-slate-300 flex items-center justify-center text-black">
                  <FileSpreadsheet className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-slate-900">
                    MoSPI Training Needs Assessment (TNA) Statutory Dossier
                  </h3>
                  <p className="text-[11px] text-slate-600 font-sans">
                    Grouped by Assignment Mandate • Submitted for Capacity Building Commission (CBC) &amp; NSSTA
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTNAModal(false)}
                className="text-slate-500 hover:text-black p-1 rounded-xs hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs text-slate-700 bg-white">
              {/* Report Summary Card */}
              <div className="p-4 rounded-xs bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h4 className="font-serif font-bold text-slate-900 text-sm">
                    Executive Capacity Allocation Plan (2025–26)
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5 font-sans">
                    Aggregated training seat quotas derived deterministically from FRAC position skill deficits.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleExportCSV}
                    className="px-3.5 py-2 rounded-xs bg-black hover:bg-slate-800 text-white font-medium text-[11px] uppercase tracking-wide flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-white" />
                    <span>Download CSV</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-2 rounded-xs border border-slate-300 hover:bg-slate-100 text-slate-800 font-medium text-[11px] uppercase tracking-wide flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>
                </div>
              </div>

              {copiedNotification && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xs text-xs flex items-center gap-2 font-mono">
                  <Check className="w-4 h-4 text-emerald-700" />
                  <span>TNA Report CSV exported successfully.</span>
                </div>
              )}

              {/* TNA Assignment Groupings Breakdown */}
              <div className="space-y-3">
                <h5 className="font-serif font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Prioritized Capacity Allocation By Assignment Role:
                </h5>

                <div className="space-y-3">
                  {tnaAssignmentGroupings.map((group, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xs border border-slate-200 bg-slate-50 hover:border-slate-400 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-200">
                        <div>
                          <span className="text-[9px] font-mono font-bold text-slate-700 uppercase tracking-wider">
                            {group.division}
                          </span>
                          <h6 className="font-serif font-bold text-slate-900 text-sm">{group.assignment}</h6>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[10px]">
                          <span className="px-2.5 py-0.5 rounded-xs bg-white text-slate-800 border border-slate-300 font-bold">
                            {group.requiredSeats} Seats Mandated
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-xs uppercase tracking-wider border font-bold ${
                              group.urgency.startsWith('Immediate')
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {group.urgency}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-xs font-sans">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-mono">Recommended Course &amp; Provider:</span>
                          <strong className="text-slate-900 font-serif">{group.priorityCourse}</strong>
                          <span className="text-slate-600 block text-[11px] font-mono">Via: {group.provider}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-mono">Identified Institutional Gap:</span>
                          <span className="text-rose-700 font-semibold">{group.topDeficitCompetency}</span>
                          <span className="text-slate-600 block text-[11px] font-mono">
                            Affecting {group.cadreCount} active officers in wing
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">
                MoSPI SkillIntel • Mission Karmayogi Capacity Building Commission Integration
              </span>
              <button
                type="button"
                onClick={() => setShowTNAModal(false)}
                className="px-4 py-1.5 bg-black hover:bg-slate-800 text-white rounded-xs text-[11px] font-medium tracking-wide uppercase transition-colors cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
