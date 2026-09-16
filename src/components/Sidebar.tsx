import React from 'react';
import {
  LayoutDashboard,
  GraduationCap,
  FileQuestion,
  BarChart3,
  BookOpen,
  ShieldCheck,
  Building2,
  UserCheck,
  FileText,
  Compass,
  Sliders,
  Shield,
  Sparkles,
  PhoneCall,
} from 'lucide-react';
import { OfficialProfile, UserRole } from '../types';

export type NavTab =
  | 'intake'
  | 'callingAgent'
  | 'gapAnalysis'
  | 'igot'
  | 'dashboard'
  | 'competencies'
  | 'recommendations'
  | 'quiz'
  | 'analytics'
  | 'framework'
  | 'admin';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  activeRole: UserRole;
  currentProfile: OfficialProfile;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  activeRole,
  currentProfile,
}) => {
  const navItems: {
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    adminOnly?: boolean;
  }[] = [
    {
      id: 'callingAgent',
      label: 'AI Calling Agent',
      icon: PhoneCall,
      badge: 'Voice Intake',
    },
    {
      id: 'intake',
      label: 'Profile & Project Intake',
      icon: FileText,
      badge: 'Long Form',
    },
    {
      id: 'gapAnalysis',
      label: '5-Parameter Gap Analysis',
      icon: Compass,
      badge: 'Mandate Delta',
    },
    {
      id: 'igot',
      label: 'iGOT Karmayogi Portal',
      icon: GraduationCap,
      badge: 'Clone',
    },
    {
      id: 'dashboard',
      label: 'Officer Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'competencies',
      label: 'My Competencies',
      icon: UserCheck,
      badge: 'FRAC Triad',
    },
    {
      id: 'recommendations',
      label: 'Course Recommendations',
      icon: GraduationCap,
      badge: 'iGOT/NSSTA',
    },
    {
      id: 'quiz',
      label: 'Assessment & AI Chatbot',
      icon: FileQuestion,
      badge: 'Quiz + Chat',
    },
    {
      id: 'analytics',
      label: 'Cadre Skill Analytics',
      icon: BarChart3,
      badge: 'Heatmap',
    },
    {
      id: 'framework',
      label: 'Statutory FRAC Dictionary',
      icon: BookOpen,
      badge: '33 Roles',
    },
  ];

  return (
    <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
      {/* Official Cadre Dossier Summary in Sidebar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xs bg-black text-white flex items-center justify-center font-serif font-bold text-sm shrink-0 shadow-xs">
            {currentProfile.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-slate-900 truncate font-serif">
              {currentProfile.name}
            </div>
            <div className="text-[11px] text-slate-600 truncate flex items-center gap-1 mt-0.5">
              <Building2 className="w-3 h-3 inline text-slate-700" />
              <span className="truncate">{currentProfile.department.split('(')[1]?.replace(')', '') || 'MoSPI Cadre'}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
          <span className="uppercase tracking-wider text-[9px] font-bold text-slate-500">Service Cadre:</span>
          <span className="px-2 py-0.5 rounded-xs font-mono text-[10px] font-semibold tracking-wide uppercase bg-white text-slate-800 border border-slate-300">
            {currentProfile.serviceCadre || 'Indian Statistical Service'}
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-serif border-b border-slate-200 mb-1.5">
          Institutional Sections
        </div>
        {navItems.map((item) => {
          if (item.adminOnly && activeRole !== 'admin') return null;

          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xs text-xs transition-colors text-left ${
                isActive
                  ? 'bg-black text-white border-l-4 border-black font-semibold shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-black border-l-4 border-transparent font-normal'
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-500'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`px-1.5 py-0.5 rounded-xs text-[9px] font-mono tracking-wider uppercase shrink-0 ${
                    isActive
                      ? 'bg-slate-800 text-slate-100 border border-slate-700'
                      : 'bg-slate-100 text-slate-600 border border-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Statutory Standard Seal Card */}
      <div className="p-3 m-3 rounded-xs bg-slate-50 border border-slate-200 text-xs">
        <div className="flex items-center space-x-2 text-slate-900 mb-1 font-serif font-semibold text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-black" />
          <span>Statutory Alignment</span>
        </div>
        <p className="text-[10px] text-slate-600 leading-relaxed font-sans">
          Curated under Mission Karmayogi Capacity Building Commission guidelines &amp; NSSTA curriculum standards.
        </p>
      </div>
    </aside>
  );
};
