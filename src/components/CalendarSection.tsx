import React from 'react';
import { Clock, MapPin } from 'lucide-react';
import { CalendarEvent } from '../types';

interface CalendarSectionProps {
  events: CalendarEvent[];
  loading: boolean;
}

export default function CalendarSection({ events, loading }: CalendarSectionProps) {
  if (loading) {
    return (
      <div id="calendarLoading" className="p-6 bg-[#090b11]/60 border border-[#1d202f]/40 rounded-2xl text-center text-[#8b8fa8] text-sm animate-pulse flex flex-col items-center justify-center gap-2">
        <div className="w-5 h-5 rounded-full border-2 border-[#4f8ef7] border-t-transparent animate-spin"></div>
        <span className="font-mono text-xs text-slate-400">Syncing executive calendar schedules...</span>
      </div>
    );
  }

  const formatTime = (dateTimeStr?: string, dateStr?: string) => {
    if (dateTimeStr) {
      return new Date(dateTimeStr).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
    if (dateStr) {
      return 'All Day';
    }
    return 'N/A';
  };

  return (
    <div id="calendarSection" className="mb-8">
      {/* Modern, clean header matching the Inbox section */}
      <div className="flex items-baseline justify-between mb-4 pb-2 border-b border-slate-800/30">
        <h3 className="text-[14px] font-semibold text-slate-200 tracking-tight">
          Schedule
        </h3>
        <span className="text-[12px] font-semibold text-slate-500 font-mono">
          Today
        </span>
      </div>

      <div className="bg-[#090b11]/30 border border-transparent rounded-2xl p-5 hover:bg-[#11131c]/50 hover:border-slate-800/50 transition-all duration-200 relative">
        {events.length === 0 ? (
          <p id="noEventsText" className="text-slate-500 text-xs text-center py-4 font-medium italic">
            Calendar clear for the remainder of today.
          </p>
        ) : (
          <div id="calendarEventsList" className="space-y-3">
            {events.map((event) => (
              <div 
                key={event.id} 
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800/20 last:border-b-0 pb-3 last:pb-0"
              >
                <div className="flex-1 min-w-0 pr-4">
                  <h4 className="text-[14px] font-semibold text-slate-100 hover:text-[#4f8ef7] transition-colors truncate">
                    {event.summary || 'Untitled Event'}
                  </h4>
                  {event.location && (
                    <span className="flex items-center gap-1 text-[12px] text-slate-400 mt-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-rose-400/80 shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-[#38bdf8] font-bold font-mono whitespace-nowrap bg-[#38bdf8]/10 border border-[#38bdf8]/10 px-2.5 py-1 rounded-full self-start sm:self-auto">
                  <Clock className="w-3 h-3 text-[#38bdf8]" />
                  <span>{formatTime(event.start?.dateTime, event.start?.date)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
