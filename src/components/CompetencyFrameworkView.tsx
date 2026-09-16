import React, { useState } from 'react';
import { BookOpen, Search, Target, Shield, CheckCircle } from 'lucide-react';
import { COMPETENCY_FRAMEWORK } from '../data/seedData';
import { CompetencyDomain } from '../types';

export const CompetencyFrameworkView: React.FC = () => {
  const [selectedDomain, setSelectedDomain] = useState<CompetencyDomain | 'All'>('All');
  const [search, setSearch] = useState<string>('');

  const domains: CompetencyDomain[] = [
    'Statistical',
    'Technical',
    'Digital Governance',
    'Behavioural/Managerial',
  ];

  const filtered = COMPETENCY_FRAMEWORK.filter((item) => {
    if (selectedDomain !== 'All' && item.domain !== selectedDomain) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.domain.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Banner */}
      <div className="bg-white border border-slate-200 rounded-xs p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-semibold text-slate-700 uppercase tracking-widest mb-1">
              <Shield className="w-3.5 h-3.5 text-black" />
              <span>National Statistical Capacity Framework</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              MoSPI Official Statistics Competency Framework
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Standardized taxonomy of 33 professional competencies across 4 foundational domains for India&apos;s Official Statistical System.
            </p>
          </div>

          <div className="px-3.5 py-1.5 bg-slate-100 border border-slate-300 rounded-xs text-xs text-slate-800 font-mono font-medium shrink-0">
            33 Total Standard Competencies
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white border border-slate-200 rounded-xs p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setSelectedDomain('All')}
            className={`px-3 py-1.5 rounded-xs transition-colors cursor-pointer text-[11px] font-medium ${
              selectedDomain === 'All'
                ? 'bg-black text-white font-semibold shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            All Domains (33)
          </button>
          {domains.map((dom) => {
            const count = COMPETENCY_FRAMEWORK.filter((c) => c.domain === dom).length;
            return (
              <button
                key={dom}
                type="button"
                onClick={() => setSelectedDomain(dom)}
                className={`px-3 py-1.5 rounded-xs transition-colors cursor-pointer text-[11px] font-medium ${
                  selectedDomain === dom
                    ? 'bg-black text-white font-semibold shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <span>{dom}</span> <span className="text-[10px] opacity-75 font-mono">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search competencies..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xs text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-black font-sans"
          />
        </div>
      </div>

      {/* Grid of Competencies */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-white border border-slate-200 rounded-xs p-5 flex flex-col justify-between shadow-xs hover:border-slate-400 transition-all group"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span
                  className="px-2 py-0.5 rounded-xs text-[9px] font-mono font-semibold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-300"
                >
                  {item.domain}
                </span>
                <span className="text-[10px] font-mono text-slate-500 font-semibold">{item.code || item.id}</span>
              </div>

              <h3 className="font-serif text-sm font-bold text-slate-900 leading-snug group-hover:text-black">
                {item.name}
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-sans line-clamp-3">
                {item.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600 font-mono">
              <span className="flex items-center gap-1 text-slate-900 font-semibold">
                <Target className="w-3.5 h-3.5 text-black" />
                <span>Target: {item.standardTargetLevel}/100</span>
              </span>
              <span className="text-slate-500 font-mono text-[10px]">MoSPI-CBC</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
