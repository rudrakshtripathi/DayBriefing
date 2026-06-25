export interface Email {
  subject: string;
  from: string;
  date: string;
  snippet: string;
  threadId: string;
}

export interface Task {
  title: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  context: string;
  action: string;
}

export interface Briefing {
  summary: string;
  tasks: Task[];
}

// ==========================
// START NEW FEATURE
// ==========================
export interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
}

export interface FollowUp {
  threadId: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  recommendation: string;
  reason: string;
}
// ==========================
// END NEW FEATURE
// ==========================
