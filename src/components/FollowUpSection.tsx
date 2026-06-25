import React from 'react';
import { ArrowRight, Check, Calendar } from 'lucide-react';
import { FollowUp } from '../types';

interface FollowUpSectionProps {
  followUps: FollowUp[];
  loading: boolean;
  onAddTask: (title: string, note: string, element: HTMLButtonElement) => void;
  addedTaskIds: Record<string, boolean>;
}

export default function FollowUpSection({ followUps, loading, onAddTask, addedTaskIds }: FollowUpSectionProps) {
  if (loading) {
    return (
      <div id="followUpsLoading" className="p-8 bg-[#090b11]/60 border border-[#1d202f]/40 rounded-2xl text-center text-[#8b8fa8] text-sm animate-pulse flex flex-col items-center justify-center gap-2">
        <div className="w-5 h-5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></div>
        <span className="font-mono text-xs text-slate-400">Analyzing thread histories for missing follow-ups...</span>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div id="followUpsSection" className="mb-8">
      {/* Modern, clean header */}
      <div className="flex items-baseline justify-between mb-4 pb-2 border-b border-slate-800/30">
        <h3 className="text-[14px] font-semibold text-slate-200 tracking-tight flex items-center gap-2">
          Smart Follow-Up Assistant
        </h3>
        <span className="text-[12px] font-semibold text-slate-500 font-mono">
          {followUps.length} recommendations
        </span>
      </div>

      <div className="space-y-4">
        {followUps.length === 0 ? (
          <div id="noFollowUpsBox" className="bg-[#090b11]/40 border border-slate-800/40 rounded-2xl p-8 text-center">
            <p className="text-slate-400 text-sm italic">You are completely caught up! No unreplied emails require follow-up attention today.</p>
          </div>
        ) : (
          followUps.map((item) => {
            const isAdded = addedTaskIds[item.threadId];
            return (
              <div 
                key={item.threadId} 
                className="bg-[#090b11]/30 hover:bg-[#11131c]/70 border border-transparent hover:border-slate-800/80 border-l-4 hover:border-l-amber-500 border-l-amber-500/80 rounded-2xl p-5 transition-all duration-200 relative overflow-hidden"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[16px] font-semibold text-[#f8fafc] leading-snug tracking-tight mb-1">{item.subject}</h4>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#94a3b8]">
                      <span className="font-semibold text-slate-300 bg-slate-800/40 px-2 py-0.5 rounded border border-slate-800/50">
                        {item.from}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="flex items-center gap-1 text-slate-400 font-mono text-[12px]">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {formatDate(item.date)}
                      </span>
                    </div>
                  </div>
                  <button
                    className={`btn-task flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-250 h-8 ${
                      isAdded 
                        ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/20 cursor-not-allowed' 
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-400 hover:text-white'
                    }`}
                    onClick={(e) => {
                      if (!isAdded) {
                        onAddTask(
                          `Follow up: ${item.subject}`,
                          `Suggested follow-up action:\n${item.recommendation}\n\nOriginal Email snippet:\n${item.snippet}`,
                          e.currentTarget as HTMLButtonElement
                        );
                      }
                    }}
                    disabled={isAdded}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Task Created
                      </>
                    ) : (
                      <>+ Create Follow-Up Task</>
                    )}
                  </button>
                </div>

                <p className="text-slate-400 text-[13px] italic bg-[#040508]/30 p-3 rounded-xl border border-slate-900/50 mb-3 leading-relaxed">
                  "{item.snippet}"
                </p>

                <div className="bg-[#1f1a0f]/40 border border-[#f39c12]/15 rounded-xl p-3.5 relative overflow-hidden">
                  <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 font-mono">
                    <ArrowRight className="w-3 h-3" />
                    Recommended Action
                  </div>
                  <p className="text-white text-[13px] font-semibold leading-relaxed mb-1">{item.recommendation}</p>
                  <p className="text-slate-400 text-[11px] leading-relaxed">{item.reason}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
