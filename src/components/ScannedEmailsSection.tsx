import React from 'react';
import { Clock, MessageSquare, Check, Plus } from 'lucide-react';
import { Email } from '../types';

interface ScannedEmailsSectionProps {
  emails: Email[];
  loading: boolean;
  onDraftReply: (from: string, subject: string, snippet: string, threadId: string) => void;
  onAddTask: (title: string, notes: string, btnKey: string) => void;
  addedTasks: Record<string, string>;
}

export default function ScannedEmailsSection({
  emails,
  loading,
  onDraftReply,
  onAddTask,
  addedTasks
}: ScannedEmailsSectionProps) {
  if (loading) {
    return (
      <div id="scannedEmailsLoading" className="p-8 bg-[#090b11]/60 border border-[#1d202f]/40 rounded-2xl text-center text-[#8b8fa8] text-sm animate-pulse flex flex-col items-center justify-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-[#4f8ef7] border-t-transparent animate-spin"></div>
        <span className="font-mono text-xs text-slate-400">Syncing and parsing workspace communications...</span>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const getInitials = (fromStr: string) => {
    const cleanName = fromStr.replace(/<.*>/, '').trim();
    if (!cleanName) return '?';
    const parts = cleanName.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).slice(0, 2).toUpperCase();
    }
    return cleanName.slice(0, 2).toUpperCase();
  };

  const getGradientClass = (fromStr: string) => {
    const charCode = fromStr.charCodeAt(0) || 0;
    const gradients = [
      'from-[#3b82f6]/20 to-[#1d4ed8]/20 text-[#60a5fa]', 
      'from-[#8b5cf6]/20 to-[#6d28d9]/20 text-[#a78bfa]', 
      'from-[#10b981]/20 to-[#047857]/20 text-[#34d399]', 
      'from-[#f59e0b]/20 to-[#b45309]/20 text-[#fbbf24]', 
      'from-[#ec4899]/20 to-[#be185d]/20 text-[#f472b6]', 
    ];
    return gradients[charCode % gradients.length];
  };

  const getBorderColorClass = (fromStr: string) => {
    const charCode = fromStr.charCodeAt(0) || 0;
    const colors = [
      'border-blue-500/20',
      'border-purple-500/20',
      'border-emerald-500/20',
      'border-amber-500/20',
      'border-pink-500/20',
    ];
    return colors[charCode % colors.length];
  };

  return (
    <div id="scannedEmailsSection" className="mb-8">
      {/* Modern, clean header replacing the heavy DEV title */}
      <div className="flex items-baseline justify-between mb-4 pb-2 border-b border-slate-800/30">
        <h3 className="text-[14px] font-semibold text-slate-200 tracking-tight flex items-center gap-2">
          Inbox
        </h3>
        <span className="text-[12px] font-semibold text-slate-500 font-mono">
          {emails.length} entries scanned
        </span>
      </div>

      <div className="space-y-3">
        {emails.length === 0 ? (
          <div id="noEmailsBox" className="bg-[#090b11]/40 border border-slate-800/40 rounded-2xl p-8 text-center">
            <p className="text-[#94a3b8] text-sm italic">Workspace communications fully caught up.</p>
          </div>
        ) : (
          emails.map((email, idx) => {
            const btnKey = `scanned-email-${idx}`;
            const taskStatus = addedTasks[btnKey] || 'Create Task';
            const isTaskDone = taskStatus === '✓ Added';

            return (
              <div 
                key={email.threadId + '-' + idx} 
                className="email-item-card bg-[#090b11]/30 hover:bg-[#11131c]/70 border border-transparent hover:border-slate-800/80 rounded-2xl p-5 transition-all duration-200 relative group"
              >
                {/* Micro accent lines representing smart priorities */}
                <div className={`absolute left-0 top-1/4 bottom-1/4 w-[2px] rounded-r bg-gradient-to-b ${getGradientClass(email.from)} opacity-0 group-hover:opacity-100 transition-opacity duration-200`}></div>

                <div className="flex items-start gap-4">
                  {/* Circle Avatar (40x40 with slight gradient) */}
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getGradientClass(email.from)} border ${getBorderColorClass(email.from)} flex items-center justify-center font-bold text-[13px] tracking-tight shadow-inner shrink-0 mt-0.5`}>
                    {getInitials(email.from)}
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Subject Line (16px, Semibold) */}
                    <h4 className="text-[16px] font-semibold text-[#f8fafc] leading-snug tracking-tight mb-1 truncate group-hover:text-[#4f8ef7] transition-colors duration-150">
                      {email.subject || '(No Subject)'}
                    </h4>

                    {/* Sender & Time (Sender: 13px, Time: 12px) */}
                    <div className="flex items-center gap-2 text-xs mb-2">
                      <span className="text-[13px] font-medium text-slate-300">
                        {email.from.replace(/<.*>/, '').trim() || email.from}
                      </span>
                      <span className="text-slate-600 font-mono">•</span>
                      <span className="text-[12px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {formatDate(email.date)}
                      </span>
                    </div>

                    {/* Preview snippet (13px, single line, ellipsis) */}
                    <p className="email-preview-snippet text-[13px] text-slate-400 leading-normal mb-4 truncate italic pr-4">
                      "{email.snippet}"
                    </p>

                    {/* Compact actions row (height <= 36px) */}
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        className="btn-draft px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-slate-800/40 text-slate-300 border border-transparent hover:bg-slate-800/80 hover:text-white transition-all duration-200 flex items-center gap-1.5 h-8"
                        onClick={() => onDraftReply(email.from, email.subject, email.snippet, email.threadId)}
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[#38bdf8]" />
                        Draft Reply
                      </button>
                      <button
                        className={`btn-task px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all duration-200 flex items-center gap-1.5 h-8 ${
                          isTaskDone 
                            ? 'bg-emerald-950/20 text-emerald-400 border-emerald-500/20 cursor-not-allowed' 
                            : 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600/20 hover:border-indigo-400/50 hover:text-white'
                        }`}
                        onClick={() => onAddTask(`Handle Email: ${email.subject}`, email.snippet, btnKey)}
                        disabled={isTaskDone || taskStatus === 'Adding...'}
                      >
                        {isTaskDone ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            Added
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            {taskStatus}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
