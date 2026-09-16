import React, { useState } from 'react';
import {
  Shield,
  Building2,
  Lock,
  ArrowRight,
  CheckCircle2,
  User,
  Eye,
  EyeOff,
  Key,
  AlertCircle,
} from 'lucide-react';
import { OfficialProfile, UserRole } from '../types';
import { getAllOfficials, saveOfficialProfile, setActiveUserId, setRoleOverride } from '../services/storage';

interface PortalAuthModalProps {
  isOpen: boolean;
  onLoginSuccess: (profile: OfficialProfile, role: UserRole) => void;
  onClose?: () => void;
}

export const PortalAuthModal: React.FC<PortalAuthModalProps> = ({
  isOpen,
  onLoginSuccess,
  onClose,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('official');
  const officials = getAllOfficials();
  const [selectedOfficialId, setSelectedOfficialId] = useState<string>(officials[0]?.id || '');
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newDesignation, setNewDesignation] = useState('');
  const [newCadre, setNewCadre] = useState('Indian Statistical Service');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Authentication credentials state with Password = 1234
  const [officialPassword, setOfficialPassword] = useState<string>('1234');
  const [showOfficialPassword, setShowOfficialPassword] = useState<boolean>(true);
  const [officialError, setOfficialError] = useState<string>('');

  const [adminEmail, setAdminEmail] = useState<string>('admin@mospi.gov.in');
  const [adminPassword, setAdminPassword] = useState<string>('1234');
  const [showAdminPassword, setShowAdminPassword] = useState<boolean>(true);
  const [adminError, setAdminError] = useState<string>('');

  if (!isOpen) return null;

  const handleOfficialLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (officialPassword !== '1234') {
      setOfficialError('Invalid password. The prototype password is: 1234');
      return;
    }
    setOfficialError('');

    if (isCreatingNew) {
      if (!newEmployeeName.trim()) return;
      const newProfile: OfficialProfile = {
        id: `user-${Date.now()}`,
        uid: `uid-${Date.now()}`,
        name: newEmployeeName.trim(),
        email: `${newEmployeeName.toLowerCase().replace(/\s+/g, '.')}@mospi.gov.in`,
        employeeId: `ISS-2025-${Math.floor(1000 + Math.random() * 9000)}`,
        serviceCadre: newCadre as any,
        group: 'Group A',
        dateOfJoiningGovt: '2024-01-01',
        department: 'NSSO Field Operations Division (FOD)',
        assignmentId: 'frac-fod-01',
        assignmentTitle: newDesignation.trim() || 'Senior Statistical Officer',
        datePostedToAssignment: '2024-06-01',
        yearsInCurrentAssignment: 1,
        designation: newDesignation.trim() || 'Senior Statistical Officer',
        jobRole: 'Statistical Cadre Officer',
        currentAssignment: newDesignation.trim() || 'Senior Statistical Officer',
        educationalQualification: 'Master of Statistics (M.Stat)',
        specialization: 'Sample Survey Design & Data Analytics',
        yearsOfExperience: 3,
        previousAssignments: [],
        pastProjectExperiences: [
          {
            id: 'proj-init-1',
            projectTitle: 'Field Pre-Testing & Schedule Finalization for Periodic Labour Force Survey',
            ministryOrWing: 'NSSO (FOD)',
            role: 'Statistical Officer / Field Coordinator',
            durationYears: 1.5,
            toolsUsed: ['Field CAPI', 'SQL', 'Excel'],
            description: 'Canvassed 400+ household schedules and supervised CAPI validation error routines in 3 regional zones.',
            keyDeliverables: 'Submitted field validation report with 98.4% error-free completion.'
          }
        ],
        priorTrainings: [],
        previousTrainings: [],
        role: 'official',
        learningHoursLogged: 0,
        enrolledCourseIds: [],
        createdAt: new Date().toISOString(),
        onboardingCompleted: false,
        intakeFormCompleted: false,
      };
      saveOfficialProfile(newProfile);
      setActiveUserId(newProfile.id);
      setRoleOverride('official');
      onLoginSuccess(newProfile, 'official');
    } else {
      const found = officials.find((o) => o.id === selectedOfficialId) || officials[0];
      setActiveUserId(found.id);
      setRoleOverride('official');
      onLoginSuccess(found, 'official');
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword !== '1234') {
      setAdminError('Invalid password. The prototype password is: 1234');
      return;
    }
    setAdminError('');

    // Admin login: Use primary administrative profile or cadre controller
    const adminOfficial = officials.find((o) => o.group === 'Group A' && o.yearsOfExperience >= 10) || officials[0];
    setActiveUserId(adminOfficial.id);
    setRoleOverride('admin');
    onLoginSuccess({ ...adminOfficial, role: 'admin' }, 'admin');
  };

  const currentOfficial = officials.find((o) => o.id === selectedOfficialId) || officials[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-300 rounded-xs max-w-3xl w-full text-slate-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* National Banner Header */}
        <div className="bg-slate-50 border-b border-slate-200 p-5 sm:p-6 text-center relative">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-xs bg-white border border-slate-300 text-slate-800 text-[10px] font-mono uppercase tracking-widest mb-2.5 font-semibold shadow-xs">
            <Building2 className="w-3.5 h-3.5 text-black" />
            <span>Government of India • Ministry of Statistics &amp; Programme Implementation</span>
          </div>

          <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Mission Karmayogi Portal Access
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-lg mx-auto">
            Civil Services Capacity Building System • Dual Portal Authentication
          </p>

          {/* CREDENTIALS CALLOUT BOX - PROMINENTLY SHOWING PASSWORDS FOR BOTH */}
          <div className="mt-4 max-w-2xl mx-auto p-3.5 bg-black text-white rounded-xs border border-slate-800 text-left shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
              <div className="flex items-center space-x-2 text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                <Key className="w-4 h-4 text-emerald-400" />
                <span>Portal Login Credentials (Password: 1234)</span>
              </div>
              <span className="text-[10px] font-mono bg-white text-black font-bold px-2 py-0.5 rounded-xs uppercase">
                Universal Pass: 1234
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              {/* Employee Credentials */}
              <div
                onClick={() => {
                  setSelectedRole('official');
                  setOfficialPassword('1234');
                  setOfficialError('');
                }}
                className={`p-2.5 rounded-xs border cursor-pointer transition-colors ${
                  selectedRole === 'official'
                    ? 'bg-slate-900 border-emerald-500 ring-1 ring-emerald-500'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="text-[10px] text-slate-400 uppercase font-sans font-bold flex items-center justify-between">
                  <span>1. Government Employee</span>
                  {selectedRole === 'official' && (
                    <span className="text-emerald-400 text-[9px]">● Active Tab</span>
                  )}
                </div>
                <div className="text-white text-[11px] mt-1 truncate">
                  User: <span className="font-semibold text-slate-200">amit.sharma@mospi.gov.in</span>
                </div>
                <div className="text-emerald-400 text-[11px] font-bold mt-0.5 flex items-center gap-1.5">
                  <span>Password:</span>
                  <span className="bg-emerald-950/80 text-emerald-300 px-1.5 py-0.2 rounded-xs border border-emerald-800">1234</span>
                  <span className="text-[10px] text-slate-400 font-normal">(shown)</span>
                </div>
              </div>

              {/* Admin Credentials */}
              <div
                onClick={() => {
                  setSelectedRole('admin');
                  setAdminPassword('1234');
                  setAdminError('');
                }}
                className={`p-2.5 rounded-xs border cursor-pointer transition-colors ${
                  selectedRole === 'admin'
                    ? 'bg-slate-900 border-emerald-500 ring-1 ring-emerald-500'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="text-[10px] text-slate-400 uppercase font-sans font-bold flex items-center justify-between">
                  <span>2. Cadre Administrator</span>
                  {selectedRole === 'admin' && (
                    <span className="text-emerald-400 text-[9px]">● Active Tab</span>
                  )}
                </div>
                <div className="text-white text-[11px] mt-1 truncate">
                  User: <span className="font-semibold text-slate-200">admin@mospi.gov.in</span>
                </div>
                <div className="text-emerald-400 text-[11px] font-bold mt-0.5 flex items-center gap-1.5">
                  <span>Password:</span>
                  <span className="bg-emerald-950/80 text-emerald-300 px-1.5 py-0.2 rounded-xs border border-emerald-800">1234</span>
                  <span className="text-[10px] text-slate-400 font-normal">(shown)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Role Mode Selector Tabs */}
          <div className="grid grid-cols-2 max-w-md mx-auto mt-4 bg-slate-100 p-1 rounded-xs border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setSelectedRole('official');
                setOfficialError('');
              }}
              className={`py-2 px-4 rounded-xs text-xs font-serif font-medium tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer ${
                selectedRole === 'official'
                  ? 'bg-black text-white border border-black shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-black'
              }`}
            >
              <User className={`w-3.5 h-3.5 ${selectedRole === 'official' ? 'text-white' : 'text-slate-500'}`} />
              <span>Government Employee</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedRole('admin');
                setAdminError('');
              }}
              className={`py-2 px-4 rounded-xs text-xs font-serif font-medium tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer ${
                selectedRole === 'admin'
                  ? 'bg-black text-white border border-black shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-black'
              }`}
            >
              <Shield className={`w-3.5 h-3.5 ${selectedRole === 'admin' ? 'text-white' : 'text-slate-500'}`} />
              <span>Cadre Administrator</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-7 bg-white">
          {selectedRole === 'official' ? (
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
                <div className="space-y-0.5">
                  <h3 className="font-serif text-base font-bold text-slate-900">
                    Government Employee Sign-In
                  </h3>
                  <p className="text-xs text-slate-600">
                    Login with your MoSPI employee credentials to access your 5-parameter audit and iGOT courses.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(!isCreatingNew)}
                  className="text-xs text-slate-900 hover:underline font-mono font-semibold cursor-pointer"
                >
                  {isCreatingNew ? '← Select Existing Dossier' : '+ New Officer Intake'}
                </button>
              </div>

              {!isCreatingNew ? (
                <form onSubmit={handleOfficialLogin} className="space-y-4">
                  {/* Select Profile */}
                  <div>
                    <label className="block text-[11px] font-mono text-slate-700 uppercase tracking-wider mb-2 font-semibold">
                      Select Gazetted Officer Account
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 border border-slate-200 p-2 rounded-xs">
                      {officials.map((official) => (
                        <label
                          key={official.id}
                          className={`flex items-start gap-3 p-2.5 rounded-xs border cursor-pointer transition-all ${
                            selectedOfficialId === official.id
                              ? 'bg-slate-50 border-black ring-1 ring-black text-slate-900'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="officialDossier"
                            value={official.id}
                            checked={selectedOfficialId === official.id}
                            onChange={() => {
                              setSelectedOfficialId(official.id);
                              setOfficialError('');
                            }}
                            className="mt-1 accent-black focus:ring-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-serif font-bold text-xs text-slate-900">
                                {official.name}
                              </span>
                              <span className="text-[10px] font-mono text-slate-800 bg-slate-100 border border-slate-300 px-1.5 py-0.2 rounded-xs font-semibold">
                                {official.email || `${official.id}@mospi.gov.in`}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600 mt-0.5">
                              {official.designation} • {official.department}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Password Input with Show Password Option */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-mono text-slate-700 uppercase tracking-wider font-semibold">
                        Employee Password *
                      </label>
                      <span className="text-[11px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 border border-emerald-200 rounded-xs">
                        Default: 1234
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type={showOfficialPassword ? 'text' : 'password'}
                        required
                        value={officialPassword}
                        onChange={(e) => {
                          setOfficialPassword(e.target.value);
                          setOfficialError('');
                        }}
                        placeholder="Enter password (1234)"
                        className="w-full bg-white border border-slate-300 rounded-xs px-3 py-2 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black pr-24"
                      />

                      <button
                        type="button"
                        onClick={() => setShowOfficialPassword(!showOfficialPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xs text-[10px] font-mono flex items-center gap-1 cursor-pointer border border-slate-300"
                        title={showOfficialPassword ? 'Hide Password' : 'Show Password'}
                      >
                        {showOfficialPassword ? (
                          <>
                            <EyeOff className="w-3 h-3" />
                            <span>Hide</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3" />
                            <span>Show</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span className="font-mono">
                        Password is: <strong className="text-slate-900 font-mono">1234</strong> ({showOfficialPassword ? 'shown above' : 'hidden'})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setOfficialPassword('1234');
                          setShowOfficialPassword(true);
                          setOfficialError('');
                        }}
                        className="text-black font-semibold underline hover:text-slate-700 cursor-pointer"
                      >
                        Auto-fill 1234
                      </button>
                    </div>

                    {officialError && (
                      <div className="p-2 bg-rose-50 border border-rose-200 rounded-xs text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>{officialError}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xs text-xs text-slate-700 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-black shrink-0 mt-0.5" />
                    <span>
                      Logging in as <strong>{currentOfficial.name}</strong> will load your gazetted dossier and the 5-Parameter Gap Analysis against your assigned mandate.
                    </span>
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    {onClose && (
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-mono text-slate-600 hover:text-black cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xs bg-black hover:bg-slate-800 text-white border border-black font-serif text-xs font-bold tracking-wide uppercase transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                    >
                      <span>Sign In as Official (1234)</span>
                      <ArrowRight className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleOfficialLogin} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-mono text-slate-700 uppercase tracking-wider mb-1 font-semibold">
                        Full Name of Official *
                      </label>
                      <input
                        type="text"
                        required
                        value={newEmployeeName}
                        onChange={(e) => setNewEmployeeName(e.target.value)}
                        placeholder="e.g. Dr. Arindam Sen"
                        className="w-full bg-white border border-slate-300 rounded-xs px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-slate-700 uppercase tracking-wider mb-1 font-semibold">
                        Official Designation *
                      </label>
                      <input
                        type="text"
                        required
                        value={newDesignation}
                        onChange={(e) => setNewDesignation(e.target.value)}
                        placeholder="e.g. Deputy Director"
                        className="w-full bg-white border border-slate-300 rounded-xs px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-700 uppercase tracking-wider mb-1 font-semibold">
                      Service Cadre
                    </label>
                    <select
                      value={newCadre}
                      onChange={(e) => setNewCadre(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xs px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    >
                      <option value="Indian Statistical Service">Indian Statistical Service (ISS - Group A)</option>
                      <option value="Subordinate Statistical Service">Subordinate Statistical Service (SSS - Group B)</option>
                      <option value="State Statistical Service">State Statistical Service (DES Cadre)</option>
                      <option value="Central Secretariat Service">Central Secretariat Service (CSS)</option>
                      <option value="Other">Other Gazetted Cadre</option>
                    </select>
                  </div>

                  {/* Password for new profile */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono text-slate-700 uppercase tracking-wider font-semibold">
                      Password (Preset: 1234)
                    </label>
                    <div className="relative">
                      <input
                        type={showOfficialPassword ? 'text' : 'password'}
                        value={officialPassword}
                        onChange={(e) => setOfficialPassword(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xs px-3 py-2 text-xs font-mono text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOfficialPassword(!showOfficialPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-100 text-slate-700 rounded-xs text-[10px] font-mono"
                      >
                        {showOfficialPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsCreatingNew(false)}
                      className="px-4 py-2 text-xs font-mono text-slate-600 hover:text-black cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xs bg-black hover:bg-slate-800 text-white border border-black font-serif text-xs font-bold tracking-wide uppercase transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                    >
                      <span>Create Profile &amp; Open Long Form</span>
                      <ArrowRight className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-1 pb-2 border-b border-slate-200">
                <h3 className="font-serif text-base font-bold text-slate-900">
                  Cadre Administration &amp; Training Directorate Sign-In
                </h3>
                <p className="text-xs text-slate-600">
                  Authorized access for cadre controllers, division heads, and NSSTA training coordinators.
                </p>
              </div>

              {/* Admin Username / Email */}
              <div className="space-y-1">
                <label className="block text-[11px] font-mono text-slate-700 uppercase tracking-wider font-semibold">
                  Administrator Username / Email *
                </label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@mospi.gov.in"
                  className="w-full bg-white border border-slate-300 rounded-xs px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              {/* Admin Password with Show Toggle */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-mono text-slate-700 uppercase tracking-wider font-semibold">
                    Administrator Password *
                  </label>
                  <span className="text-[11px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 border border-emerald-200 rounded-xs">
                    Default: 1234
                  </span>
                </div>

                <div className="relative">
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    required
                    value={adminPassword}
                    onChange={(e) => {
                      setAdminPassword(e.target.value);
                      setAdminError('');
                    }}
                    placeholder="Enter password (1234)"
                    className="w-full bg-white border border-slate-300 rounded-xs px-3 py-2 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black pr-24"
                  />

                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xs text-[10px] font-mono flex items-center gap-1 cursor-pointer border border-slate-300"
                    title={showAdminPassword ? 'Hide Password' : 'Show Password'}
                  >
                    {showAdminPassword ? (
                      <>
                        <EyeOff className="w-3 h-3" />
                        <span>Hide</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" />
                        <span>Show</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                  <span className="font-mono">
                    Password is: <strong className="text-slate-900 font-mono">1234</strong> ({showAdminPassword ? 'shown above' : 'hidden'})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAdminPassword('1234');
                      setShowAdminPassword(true);
                      setAdminError('');
                    }}
                    className="text-black font-semibold underline hover:text-slate-700 cursor-pointer"
                  >
                    Auto-fill 1234
                  </button>
                </div>

                {adminError && (
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-xs text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{adminError}</span>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xs border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-serif text-slate-700">Authorized Division:</span>
                  <span className="font-mono text-slate-900 font-semibold">MoSPI Training Directorate / NSSTA</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-serif text-slate-700">Statutory Role:</span>
                  <span className="font-mono text-emerald-800 font-semibold">Cadre Controller &amp; Project Reassignment</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-mono text-slate-600 hover:text-black cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xs bg-black hover:bg-slate-800 text-white border border-black font-serif text-xs font-bold tracking-wide uppercase transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-white" />
                  <span>Sign In as Administrator (1234)</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
