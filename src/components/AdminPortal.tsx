import React, { useState } from 'react';
import {
  Shield,
  Building2,
  Users,
  Compass,
  BarChart3,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Download,
  Filter,
  FileSpreadsheet,
  Award,
  Layers,
} from 'lucide-react';
import { AssignedProject, OfficialProfile } from '../types';
import { ASSIGNED_PROJECTS_CATALOG } from '../data/assignedProjects';
import { getAllOfficials, saveOfficialProfile } from '../services/storage';
import { computeFramework5Analysis } from '../services/framework5Engine';

interface AdminPortalProps {
  onSelectOfficial: (profile: OfficialProfile) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onSelectOfficial }) => {
  const [officials, setOfficials] = useState<OfficialProfile[]>(getAllOfficials());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOfficialForReassign, setSelectedOfficialForReassign] = useState<OfficialProfile | null>(null);
  const [newProjectId, setNewProjectId] = useState<string>(ASSIGNED_PROJECTS_CATALOG[0].id);

  // Filter officials
  const filteredOfficials = officials.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.name.toLowerCase().includes(q) ||
      o.designation.toLowerCase().includes(q) ||
      o.department.toLowerCase().includes(q) ||
      o.educationalQualification?.toLowerCase().includes(q)
    );
  });

  const handleReassignProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOfficialForReassign) return;

    const chosenProject = ASSIGNED_PROJECTS_CATALOG.find((p) => p.id === newProjectId) || ASSIGNED_PROJECTS_CATALOG[0];
    const updated: OfficialProfile = {
      ...selectedOfficialForReassign,
      assignedProjectId: chosenProject.id,
      department: chosenProject.division,
    };
    const newGap = computeFramework5Analysis(updated, chosenProject);
    updated.gapAnalysis = newGap;
    updated.parameterScores = newGap.parameters;

    saveOfficialProfile(updated);
    setOfficials(getAllOfficials());
    setSelectedOfficialForReassign(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Admin Header */}
      <div className="bg-white border border-slate-200 p-6 rounded-xs shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-xs bg-slate-100 border border-slate-300 text-slate-800 text-[10px] font-mono uppercase tracking-widest mb-1.5 font-semibold">
              <Shield className="w-3.5 h-3.5 text-black" />
              <span>Cadre Administration &amp; Directorate Oversight • MoSPI</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 tracking-tight">
              Cadre Competency Directorate &amp; Mandate Allocations
            </h1>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Inspect submitted employee long forms, review 5-parameter gaps against assigned projects, re-allocate operational mandates, and generate Training Needs Analysis (TNA).
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right font-mono text-xs">
              <span className="text-slate-500 block text-[10px] uppercase">Registered Cadre</span>
              <span className="text-slate-900 font-bold">{officials.length} Gazetted Officers</span>
            </div>
          </div>
        </div>

        {/* Aggregated Cadre 5-Parameter Readiness Heatmap */}
        <div className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="font-serif text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-black" />
              <span>Cadre-Wide Competency Benchmark Fulfillment across 5 Domains</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-700 font-semibold">Target Standard: 85%+</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-2.5 bg-white border border-slate-200 rounded-xs text-center shadow-xs">
              <span className="text-[10px] font-mono text-slate-500 block uppercase">1. Statistical</span>
              <span className="text-lg font-serif font-bold text-slate-900">82%</span>
              <span className="text-[9px] font-mono text-slate-600 block mt-0.5">High Academic Base</span>
            </div>
            <div className="p-2.5 bg-white border border-slate-200 rounded-xs text-center shadow-xs">
              <span className="text-[10px] font-mono text-slate-500 block uppercase">2. Technological</span>
              <span className="text-lg font-serif font-bold text-slate-900">64%</span>
              <span className="text-[9px] font-mono text-rose-700 font-semibold block mt-0.5">Critical Deficit (CAPI/Python)</span>
            </div>
            <div className="p-2.5 bg-white border border-slate-200 rounded-xs text-center shadow-xs">
              <span className="text-[10px] font-mono text-slate-500 block uppercase">3. Digital Governance</span>
              <span className="text-lg font-serif font-bold text-slate-900">76%</span>
              <span className="text-[9px] font-mono text-amber-700 font-semibold block mt-0.5">Moderate Deficit (DPDPA)</span>
            </div>
            <div className="p-2.5 bg-white border border-slate-200 rounded-xs text-center shadow-xs">
              <span className="text-[10px] font-mono text-slate-500 block uppercase">4. Domain-Specific</span>
              <span className="text-lg font-serif font-bold text-slate-900">86%</span>
              <span className="text-[9px] font-mono text-emerald-700 font-semibold block mt-0.5">Benchmark Met</span>
            </div>
            <div className="p-2.5 bg-white border border-slate-200 rounded-xs text-center shadow-xs">
              <span className="text-[10px] font-mono text-slate-500 block uppercase">5. Managerial</span>
              <span className="text-lg font-serif font-bold text-slate-900">79%</span>
              <span className="text-[9px] font-mono text-slate-600 block mt-0.5">Supervisory Solid</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cadre Officers Roster & Long Form Profiles */}
      <div className="bg-white border border-slate-200 rounded-xs p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h2 className="font-serif text-base font-bold text-slate-900">
              Official Cadre Intake Dossiers &amp; Project Allocations
            </h2>
            <p className="text-xs text-slate-600">
              Review full long forms, educational background, past project records, and gap profiles.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search officer name, degree..."
              className="w-full bg-white border border-slate-300 rounded-xs pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>
        </div>

        {/* Officers List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-mono uppercase tracking-wider text-slate-700 bg-slate-50">
                <th className="py-2.5 px-3">Officer Details</th>
                <th className="py-2.5 px-3">Educational Qualification</th>
                <th className="py-2.5 px-3">Past Projects</th>
                <th className="py-2.5 px-3">Assigned Mandate</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredOfficials.map((officer) => {
                const assignedProj =
                  ASSIGNED_PROJECTS_CATALOG.find((p) => p.id === officer.assignedProjectId) ||
                  ASSIGNED_PROJECTS_CATALOG[0];

                const gap =
                  officer.gapAnalysis || computeFramework5Analysis(officer, assignedProj);

                return (
                  <tr key={officer.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-serif font-bold text-slate-900 text-sm">
                        {officer.name}
                      </div>
                      <div className="text-[11px] text-slate-600">
                        {officer.designation} • {officer.serviceCadre}
                      </div>
                      <div className="text-[10px] font-mono text-slate-700 mt-0.5 font-medium">
                        ID: {officer.employeeId || 'ISS Cadre'} • {officer.yearsOfExperience} Yrs Exp
                      </div>
                    </td>

                    <td className="py-3 px-3 max-w-xs">
                      <div className="font-medium text-slate-900 truncate">
                        {officer.educationalQualification || 'M.Stat (ISI)'}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        {officer.specialization || 'Sample Survey Design'}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-xs bg-slate-100 border border-slate-200 font-mono text-[11px] text-slate-700 font-medium">
                        {officer.pastProjectExperiences?.length || 1} Recorded
                      </span>
                    </td>

                    <td className="py-3 px-3 max-w-xs">
                      <div className="font-serif font-bold text-slate-900 text-xs truncate">
                        {assignedProj.title}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {assignedProj.division}
                      </div>
                      <div className="text-[10px] font-mono mt-0.5 flex items-center gap-2">
                        <span className={gap.overallReadiness >= 80 ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
                          Readiness: {gap.overallReadiness}%
                        </span>
                        <span>•</span>
                        <span className="text-rose-700 font-semibold">Deficit: -{gap.averageGap} pts</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => setSelectedOfficialForReassign(officer)}
                        className="px-2.5 py-1 bg-black hover:bg-slate-800 text-white border border-black rounded-xs text-[11px] font-mono cursor-pointer shadow-xs"
                      >
                        Re-assign Project
                      </button>

                      <button
                        type="button"
                        onClick={() => onSelectOfficial(officer)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xs text-[11px] font-mono cursor-pointer shadow-xs"
                      >
                        View Dossier
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* RE-ASSIGN PROJECT MODAL */}
      {selectedOfficialForReassign && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xs max-w-xl w-full text-slate-900 shadow-2xl p-6 space-y-4">
            <div className="border-b border-slate-200 pb-3">
              <span className="text-[10px] font-mono text-slate-600 uppercase tracking-wider block font-semibold">
                Cadre Administration Directive
              </span>
              <h3 className="font-serif text-lg font-bold text-slate-900">
                Re-assign Gazetted Project Mandate
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Assigning a new project will re-compile {selectedOfficialForReassign.name}'s profile and update the 5-parameter gap analysis.
              </p>
            </div>

            <form onSubmit={handleReassignProject} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-slate-700 uppercase tracking-wider mb-2 font-semibold">
                  Select New Operational Project Mandate:
                </label>
                <select
                  value={newProjectId}
                  onChange={(e) => setNewProjectId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xs px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                >
                  {ASSIGNED_PROJECTS_CATALOG.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.title} ({proj.division})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedOfficialForReassign(null)}
                  className="px-4 py-2 text-xs font-mono text-slate-600 hover:text-black cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-black hover:bg-slate-800 text-white border border-black rounded-xs font-serif text-xs font-bold tracking-wide uppercase cursor-pointer shadow-xs"
                >
                  Confirm Re-assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
