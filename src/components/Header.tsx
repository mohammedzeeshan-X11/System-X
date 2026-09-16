import React, { useState } from 'react';
import {
  Shield,
  UserCheck,
  RotateCcw,
  UserPlus,
  ChevronDown,
  SlidersHorizontal,
  Building2,
  Award,
  Lock,
  PhoneCall,
} from 'lucide-react';
import { OfficialProfile, UserRole } from '../types';
import { getAllOfficials, setActiveUserId, setRoleOverride } from '../services/storage';

interface HeaderProps {
  currentProfile: OfficialProfile;
  activeRole: UserRole;
  onRoleToggle: (role: UserRole) => void;
  onProfileChange: (profile: OfficialProfile) => void;
  onOpenOnboarding: () => void;
  onResetData: () => void;
  onOpenAuthModal?: () => void;
  onOpenCallingAgent?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentProfile,
  activeRole,
  onRoleToggle,
  onProfileChange,
  onOpenOnboarding,
  onResetData,
  onOpenAuthModal,
  onOpenCallingAgent,
}) => {
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [showDemoDrawer, setShowDemoDrawer] = useState(false);
  const officials = getAllOfficials();

  const handleSelectOfficial = (official: OfficialProfile) => {
    setActiveUserId(official.id);
    onProfileChange(official);
    setShowPersonaMenu(false);
  };

  return (
    <header className="bg-white border-b border-slate-200 text-slate-900 sticky top-0 z-40 shadow-xs">
      {/* Top Institutional Letterhead Sub-Bar */}
      <div className="bg-black px-4 sm:px-8 py-1.5 border-b border-slate-900 text-[11px] tracking-wider text-slate-300">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <span className="font-bold text-white tracking-widest text-[10px] uppercase">
              Government of India
            </span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-200 font-medium truncate hidden md:inline">
              Ministry of Statistics &amp; Programme Implementation
            </span>
            <span className="text-slate-500 hidden md:inline">/</span>
            <span className="text-slate-300 truncate hidden lg:inline">
              National Statistical Systems Training Academy (NSSTA)
            </span>
          </div>

          <div className="flex items-center space-x-3 text-[11px]">
            <span className="hidden sm:inline-block px-2 py-0.5 border border-slate-700 bg-slate-900 text-slate-200 font-mono text-[10px] rounded-xs">
              SIH-2024 • SIH26101
            </span>
            <span className="flex items-center text-emerald-400 font-medium text-[10px] tracking-wide uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
              Mission Karmayogi Live
            </span>
          </div>
        </div>
      </div>

      {/* Main Masthead / Institutional Letterhead Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5">
        <div className="flex items-center justify-between">
          {/* Institutional Seal & Title Hierarchy */}
          <div className="flex items-center space-x-3.5">
            {/* Seal / Crest Placeholder */}
            <div className="w-10 h-10 border border-black bg-black rounded-xs flex items-center justify-center text-white shadow-xs shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>

            <div className="border-l border-slate-200 pl-3.5">
              <div className="flex items-baseline space-x-2">
                <h1 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-black">
                  Karmayogi Bharat
                </h1>
                <span className="text-[10px] tracking-widest uppercase font-semibold text-black px-1.5 py-0.2 border border-slate-300 rounded-xs bg-slate-100">
                  MoSPI Cadre
                </span>
              </div>
              <p className="text-[11px] text-slate-600 tracking-wide mt-0.5">
                Competency Assessment, FRAC Verification &amp; Civil Services Capacity Building Portal
              </p>
            </div>
          </div>

          {/* Institutional Persona Ledger & Actions */}
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            {/* Quick Role Switcher */}
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-300 rounded-xs px-2.5 py-1.5 shadow-2xs">
              <Shield className="w-3.5 h-3.5 text-black shrink-0" />
              <label htmlFor="top-role-toggle" className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-700 shrink-0">
                Role:
              </label>
              <select
                id="top-role-toggle"
                value={activeRole === 'admin' ? 'admin' : currentProfile.id}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'admin') {
                    setRoleOverride('admin');
                    onRoleToggle('admin');
                  } else {
                    setRoleOverride('official');
                    onRoleToggle('official');
                    const target = officials.find((o) => o.id === val);
                    if (target) {
                      handleSelectOfficial(target);
                    }
                  }
                }}
                className="text-xs font-semibold text-slate-900 bg-transparent focus:outline-hidden cursor-pointer font-serif max-w-[150px] sm:max-w-[230px] md:max-w-[270px] truncate"
              >
                <option value="user-amit">Senior Statistical Officer (SSO)</option>
                <option value="user-rajesh">Joint Director – NAD (ISS)</option>
                <option value="user-sunita">Lead Sampling Director (SDRD)</option>
                <option value="user-priya">Deputy Director – DQID (ISS)</option>
                <option value="admin">Cadre Administrator (Directorate)</option>
              </select>
            </div>

            {/* Official Persona Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                className="flex items-center space-x-2.5 bg-white hover:bg-slate-50 px-3 py-1.5 border border-slate-300 rounded-xs text-left transition-colors text-xs text-slate-900 shadow-xs"
                title="Switch Gazetted Official Dossier"
              >
                <div className="w-6 h-6 rounded-xs bg-black text-white flex items-center justify-center font-serif font-bold text-xs">
                  {currentProfile.name.charAt(0)}
                </div>
                <div className="hidden md:block">
                  <div className="font-semibold text-slate-900 truncate max-w-[150px]">
                    {currentProfile.name}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                    {currentProfile.designation}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 ml-0.5" />
              </button>

              {/* Persona Dropdown Ledger */}
              {showPersonaMenu && (
                <div className="absolute right-0 mt-1.5 w-80 bg-white border border-slate-300 rounded-xs shadow-xl py-2 z-50 animate-in fade-in duration-100 text-slate-900">
                  <div className="px-3.5 py-1.5 text-[10px] font-bold text-black uppercase tracking-widest border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <span>Gazetted Cadre Dossiers</span>
                    <span className="text-slate-500 font-mono">MoSPI Registry</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {officials.map((official) => (
                      <button
                        key={official.id}
                        type="button"
                        onClick={() => handleSelectOfficial(official)}
                        className={`w-full text-left px-3.5 py-2.5 flex items-start space-x-2.5 transition-colors hover:bg-slate-50 ${
                          official.id === currentProfile.id
                            ? 'bg-slate-100 border-l-2 border-black font-semibold'
                            : ''
                        }`}
                      >
                        <div className="w-6 h-6 mt-0.5 rounded-xs bg-slate-100 border border-slate-300 flex items-center justify-center font-serif text-[11px] font-bold text-slate-800 shrink-0">
                          {official.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-900 truncate">
                            {official.name}
                          </div>
                          <div className="text-[11px] text-slate-600 truncate">
                            {official.designation}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate mt-0.5">
                            {official.department}
                          </div>
                        </div>
                        {official.id === currentProfile.id && (
                          <span className="text-[10px] font-bold text-black uppercase tracking-wider self-center bg-white px-1.5 py-0.5 border border-slate-300 rounded-xs">
                            Current
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="p-2 border-t border-slate-200 bg-slate-50">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPersonaMenu(false);
                        const pendingOfficial = officials.find((o) => o.id === 'user-new-intake');
                        if (pendingOfficial) {
                          handleSelectOfficial(pendingOfficial);
                        } else {
                          onOpenOnboarding();
                        }
                      }}
                      className="w-full py-1.5 px-2.5 bg-black hover:bg-slate-800 text-white rounded-xs text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-white" />
                      <span>Induct New Official (Assessment Wizard)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Role Switcher Pill */}
            <div className="inline-flex rounded-xs p-0.5 bg-slate-100 border border-slate-300 text-xs">
              <button
                type="button"
                onClick={() => {
                  setRoleOverride('official');
                  onRoleToggle('official');
                }}
                className={`px-3 py-1 rounded-xs font-medium text-[11px] tracking-wide transition-all ${
                  activeRole === 'official'
                    ? 'bg-black text-white shadow-xs'
                    : 'text-slate-600 hover:text-black'
                }`}
              >
                Official
              </button>
              <button
                type="button"
                onClick={() => {
                  setRoleOverride('admin');
                  onRoleToggle('admin');
                }}
                className={`px-3 py-1 rounded-xs font-medium text-[11px] tracking-wide transition-all ${
                  activeRole === 'admin'
                    ? 'bg-black text-white shadow-xs'
                    : 'text-slate-600 hover:text-black'
                }`}
              >
                Cadre Admin
              </button>
            </div>

            {/* AI Calling Agent Voice Launcher Button */}
            {onOpenCallingAgent && (
              <button
                type="button"
                id="header-call-agent-btn"
                onClick={onOpenCallingAgent}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 rounded-xs text-[11px] font-mono flex items-center space-x-1.5 transition-colors shadow-xs"
                title="Launch Humanized AI Calling Agent (Voice Profile Intake)"
              >
                <PhoneCall className="w-3.5 h-3.5 text-black" />
                <span className="hidden md:inline font-semibold">Voice Intake</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </button>
            )}

            {/* Portal Access / Dual Login Button */}
            {onOpenAuthModal && (
              <button
                type="button"
                id="portal-auth-btn"
                onClick={onOpenAuthModal}
                className="px-2.5 py-1.5 bg-black hover:bg-slate-800 text-white rounded-xs text-[11px] font-mono flex items-center space-x-1.5 transition-colors shadow-xs"
                title="Switch Portal Mode: Government Employee vs Cadre Admin (Password: 1234)"
              >
                <Lock className="w-3 h-3 text-white" />
                <span className="hidden sm:inline font-semibold">Dual Login</span>
                <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.2 rounded-xs font-mono font-bold">1234</span>
              </button>
            )}

            {/* Institutional Settings / Demo Drawer */}
            <button
              type="button"
              onClick={() => setShowDemoDrawer(!showDemoDrawer)}
              className={`p-2 rounded-xs border text-xs transition-colors ${
                showDemoDrawer
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
              title="Assessment Protocol Settings"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Institutional Demo Tray */}
      {showDemoDrawer && (
        <div className="bg-slate-100 border-b border-slate-200 px-4 sm:px-8 py-2.5 text-xs text-slate-800">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2 text-slate-800 text-[11px]">
              <Award className="w-4 h-4 text-black" />
              <span className="font-bold text-black tracking-wide uppercase">Institutional Audit Tools:</span>
              <span className="text-slate-600 hidden sm:inline">
                Evaluate statutory FRAC competencies, test proficiency rubrics, or reset local audit state.
              </span>
            </div>
            <div className="flex items-center flex-wrap gap-2">
              <button
                type="button"
                onClick={onOpenOnboarding}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-800 rounded-xs border border-slate-300 flex items-center space-x-1.5 text-xs shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5 text-black" />
                <span>Re-run Officer Intake</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Reset all audit state to baseline gazetted MoSPI records?')) {
                    onResetData();
                  }
                }}
                className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 rounded-xs border border-rose-300 flex items-center space-x-1.5 text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                <span>Reset Audit State</span>
              </button>

              <div className="px-2.5 py-1 bg-white text-slate-700 rounded-xs border border-slate-300 flex items-center space-x-1 text-[11px]">
                <UserCheck className="w-3 h-3 text-emerald-600" />
                <span>Authority Mode: <strong className="text-black capitalize">{activeRole}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
