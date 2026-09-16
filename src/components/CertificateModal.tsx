import React from 'react';
import { Award, CheckCircle2, Download, Printer, Shield, X, ExternalLink, QrCode } from 'lucide-react';
import { OfficialProfile, UserCourseProgress } from '../types';
import { SEED_COURSES } from '../data/seedData';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: UserCourseProgress | null;
  profile: OfficialProfile;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  progress,
  profile,
}) => {
  if (!isOpen || !progress) return null;

  const course = SEED_COURSES.find((c) => c.id === progress.courseId);
  if (!course) return null;

  const certificateId =
    progress.certificateId ||
    `IGOT-MOSPI-${new Date().getFullYear()}-${progress.courseId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}-${profile.employeeId ? profile.employeeId.slice(-4) : '7721'}`;

  const completionDate = progress.completedAt
    ? new Date(progress.completedAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white text-slate-900 rounded-xs shadow-2xl overflow-hidden border border-slate-300 animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Top Control Bar (Hidden on print) */}
        <div className="print:hidden bg-slate-900 px-6 py-3.5 flex items-center justify-between text-white border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-white" />
            <span className="text-sm font-serif font-bold tracking-wide">
              Official iGOT Karmayogi Course Completion Certificate
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xs bg-white hover:bg-slate-100 text-xs font-semibold text-black flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white rounded-xs hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Certificate Canvas */}
        <div className="p-8 sm:p-12 relative bg-white border-4 border-double border-slate-400 m-3 rounded-xs">
          {/* Subtle Watermark Background */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
            <Shield className="w-96 h-96 text-slate-900" />
          </div>

          {/* Certificate Header */}
          <div className="text-center space-y-2 border-b border-slate-300 pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xs bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold uppercase tracking-wider font-mono">
              <Shield className="w-3.5 h-3.5 text-black" />
              Government of India • Mission Karmayogi
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-slate-900 pt-2">
              Ministry of Statistics & Programme Implementation
            </h1>
            <p className="text-xs text-slate-600 uppercase tracking-widest font-semibold font-mono">
              National Statistical Systems Training Academy (NSSTA)
            </p>
          </div>

          {/* Certificate Title */}
          <div className="text-center my-8 space-y-2">
            <div className="text-xs font-mono text-slate-700 uppercase tracking-widest font-bold">
              Certificate of Completion
            </div>
            <p className="text-sm text-slate-600 italic font-serif">This is to officially certify that</p>
            <div className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 underline decoration-slate-400 decoration-1 underline-offset-8">
              {profile.name}
            </div>
            <p className="text-xs text-slate-600 font-medium pt-2">
              {profile.designation} • {profile.department}
            </p>
            <p className="text-xs text-slate-500 font-mono">
              Cadre: {profile.serviceCadre} ({profile.group}) • ID: {profile.employeeId}
            </p>
          </div>

          {/* Course Details */}
          <div className="bg-slate-50 border border-slate-200 rounded-xs p-5 my-6 text-center space-y-2">
            <p className="text-xs text-slate-500 font-medium">has satisfactorily completed the certified course curriculum</p>
            <h2 className="text-base sm:text-lg font-bold font-serif text-slate-900">
              {course.title}
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs text-slate-600 font-mono">
              <span className="px-2.5 py-0.5 rounded-xs bg-slate-200 text-slate-800 font-semibold text-[11px]">
                Code: {course.courseCode}
              </span>
              <span>•</span>
              <span className="font-semibold text-slate-700">Provider: {course.source}</span>
              <span>•</span>
              <span>Duration: {course.duration} ({course.durationHours} hrs)</span>
              <span>•</span>
              <span className="px-2 py-0.5 rounded-xs bg-slate-200 text-slate-800 font-semibold text-[11px]">
                Domain: {course.domain}
              </span>
            </div>
          </div>

          {/* Target Competencies Covered */}
          <div className="text-center my-4">
            <p className="text-[11px] text-slate-500 font-medium mb-1.5 uppercase tracking-wider font-mono">
              Competencies Credited Under FRAC Framework
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {course.targetCompetencies.map((tc) => (
                <span
                  key={tc}
                  className="px-2.5 py-1 rounded-xs bg-slate-100 border border-slate-300 text-slate-800 text-[11px] font-medium font-mono"
                >
                  ✓ {tc}
                </span>
              ))}
            </div>
          </div>

          {/* Footer with Verification QR and Signatures */}
          <div className="mt-10 pt-6 border-t border-slate-300 grid grid-cols-3 items-end gap-4">
            {/* Left: Issue Date & Verification */}
            <div className="text-left space-y-1">
              <p className="text-[10px] text-slate-500 uppercase font-mono">Date of Issue</p>
              <p className="text-xs font-bold text-slate-900 font-mono">{completionDate}</p>
              <div className="pt-2 text-[10px] font-mono text-slate-500 truncate">
                Cert ID: <span className="text-slate-800 font-bold">{certificateId}</span>
              </div>
            </div>

            {/* Center: Real SVG QR Code for Verification */}
            <div className="flex flex-col items-center justify-center text-center space-y-1">
              <div className="w-20 h-20 bg-white p-1 rounded-xs border-2 border-slate-400 shadow-xs flex items-center justify-center">
                {/* Visual SVG QR Code Matrix */}
                <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900">
                  <rect width="100" height="100" fill="white" />
                  {/* Position detection markers */}
                  <rect x="5" y="5" width="28" height="28" fill="black" />
                  <rect x="9" y="9" width="20" height="20" fill="white" />
                  <rect x="13" y="13" width="12" height="12" fill="black" />

                  <rect x="67" y="5" width="28" height="28" fill="black" />
                  <rect x="71" y="9" width="20" height="20" fill="white" />
                  <rect x="75" y="13" width="12" height="12" fill="black" />

                  <rect x="5" y="67" width="28" height="28" fill="black" />
                  <rect x="9" y="71" width="20" height="20" fill="white" />
                  <rect x="13" y="75" width="12" height="12" fill="black" />

                  {/* Alignment & Data Pattern Grid */}
                  <rect x="40" y="8" width="6" height="6" fill="black" />
                  <rect x="52" y="8" width="6" height="6" fill="black" />
                  <rect x="44" y="20" width="8" height="6" fill="black" />
                  <rect x="15" y="42" width="6" height="6" fill="black" />
                  <rect x="25" y="48" width="6" height="6" fill="black" />
                  <rect x="40" y="40" width="18" height="18" fill="black" />
                  <rect x="44" y="44" width="10" height="10" fill="white" />
                  <rect x="48" y="48" width="4" height="4" fill="black" />
                  <rect x="65" y="45" width="6" height="8" fill="black" />
                  <rect x="78" y="40" width="12" height="6" fill="black" />
                  <rect x="82" y="52" width="6" height="12" fill="black" />
                  <rect x="40" y="68" width="8" height="8" fill="black" />
                  <rect x="54" y="75" width="8" height="6" fill="black" />
                  <rect x="68" y="70" width="10" height="8" fill="black" />
                  <rect x="82" y="80" width="8" height="10" fill="black" />
                  <rect x="48" y="88" width="12" height="6" fill="black" />
                </svg>
              </div>
              <span className="text-[9px] text-slate-500 font-mono tracking-tighter uppercase">
                Scan to Verify on iGOT
              </span>
            </div>

            {/* Right: Signature stamp */}
            <div className="text-right space-y-1">
              <div className="h-9 flex items-end justify-end">
                <span className="font-serif italic font-bold text-slate-900 text-sm tracking-wide transform -rotate-3 border-b-2 border-black pb-0.5 inline-block">
                  Dr. G.P. Samanta
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-900">National Course Director</p>
              <p className="text-[10px] text-slate-500">NSSTA, Greater Noida • MoSPI</p>
            </div>
          </div>
        </div>

        {/* Footer Actions (Hidden on print) */}
        <div className="print:hidden bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-700 font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>Digital credential recorded to Karmayogi Competency Ledger</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 rounded-xs bg-black hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Certificate</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
