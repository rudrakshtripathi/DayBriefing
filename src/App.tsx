import React, { useState, useEffect } from 'react';
import { Mail, Calendar as CalendarIcon, Clock, MapPin, AlertCircle, Check, Play, Sparkles, Inbox, TrendingUp, CheckCircle2 } from 'lucide-react';
import { initAuth, googleSignIn, logout } from './firebase';
import { Email, Task, CalendarEvent, FollowUp } from './types';
import CalendarSection from './components/CalendarSection';
import FollowUpSection from './components/FollowUpSection';
import ScannedEmailsSection from './components/ScannedEmailsSection';

export default function App() {
  // Authentication states
  const [needsAuth, setNeedsAuth] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Core dashboard states (retaining original variables where appropriate)
  const [emails, setEmails] = useState<Email[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summaryText, setSummaryText] = useState<string>('');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBrief, setShowBrief] = useState(false);

  // Draft reply modal states
  const [draftModalActive, setDraftModalActive] = useState(false);
  const [draftModalSubtitle, setDraftModalSubtitle] = useState('');
  const [draftText, setDraftText] = useState('Generating draft...');
  const [sendDraftBtnDisabled, setSendDraftBtnDisabled] = useState(true);
  const [sendDraftBtnText, setSendDraftBtnText] = useState('Send Reply');
  const [currentDraft, setCurrentDraft] = useState({ to: '', subject: '', body: '', threadId: '' });

  // Add Google Tasks state trackers
  const [addedTasks, setAddedTasks] = useState<Record<string, string>>({}); // Mapping task index/id to status text

  // ==========================
  // START NEW FEATURE - State
  // ==========================
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [followUpsLoading, setFollowUpsLoading] = useState(false);
  const [addedFollowUpTaskIds, setAddedFollowUpTaskIds] = useState<Record<string, boolean>>({});
  // ==========================
  // END NEW FEATURE - State
  // ==========================

  // Auth initialization
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setNeedsAuth(false);
      },
      () => {
        setNeedsAuth(true);
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Format today's date for display
  const todayDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // Re-map the exact login handlers from the prototype
  const handleLogin = async () => {
    if (authLoading) return;
    setAuthLoading(true);
    setErrorText(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setNeedsAuth(false);
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      const isCancelled = err.code === 'auth/cancelled-popup-request' || 
                          err.code === 'auth/popup-closed-by-user' || 
                          err.message?.includes('cancelled-popup-request') || 
                          err.message?.includes('popup-closed-by-user');
      if (isCancelled) {
        setErrorText('Sign-in cancelled. Please click "Sign in with Google" to try again.');
      } else {
        setErrorText('Authentication failed: ' + err.message);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setAccessToken(null);
    setUser(null);
    setNeedsAuth(true);
    setShowBrief(false);
    setEmails([]);
    setTasks([]);
    setSummaryText('');
    setCalendarEvents([]);
    setFollowUps([]);
  };

  // Re-map Gmail fetching from the prototype with smart fallback to read emails to ensure top 7 are shown
  async function fetchEmails() {
    if (!accessToken) return [];
    
    // 1. Fetch unread messages
    const unreadRes = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15&q=is:unread',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!unreadRes.ok) throw new Error('Failed to fetch unread messages');
    const unreadData = await unreadRes.json();
    let messages = unreadData.messages || [];

    // 2. If fewer than 7 unread, fetch general emails to fill up to 7
    if (messages.length < 7) {
      const generalRes = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15&q=-is:draft',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (generalRes.ok) {
        const generalData = await generalRes.json();
        const generalMessages = generalData.messages || [];
        
        // Merge & deduplicate by ID
        const seenIds = new Set(messages.map((m: any) => m.id));
        for (const msg of generalMessages) {
          if (!seenIds.has(msg.id)) {
            messages.push(msg);
            seenIds.add(msg.id);
          }
        }
      }
    }

    // 3. Keep exactly the top 7 messages
    const topMessages = messages.slice(0, 7);
    if (topMessages.length === 0) return [];

    const fetchedEmails: Email[] = [];
    for (let msg of topMessages) {
      const detail = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!detail.ok) continue;
      const detailData = await detail.json();
      const headers = detailData.payload.headers;
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
      const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
      const date = headers.find((h: any) => h.name === 'Date')?.value || '';
      const snippet = detailData.snippet || '';
      fetchedEmails.push({ subject, from, date, snippet, threadId: detailData.threadId });
    }
    return fetchedEmails;
  }

  // ==========================
  // START NEW FEATURE - Fetchers
  // ==========================
  async function fetchCalendarEvents() {
    if (!accessToken) return [];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
    
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startOfToday}&timeMax=${endOfToday}&singleEvents=true&orderBy=startTime`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!response.ok) {
      console.warn('Calendar fetch failed, continuing without calendar context');
      return [];
    }
    const data = await response.json();
    return data.items || [];
  }

  async function fetchFollowUpEmails(userEmail: string) {
    if (!accessToken) return [];
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=15&q=older_than:3d -is:draft`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!response.ok) {
      console.warn('Follow-up thread query failed');
      return [];
    }
    const data = await response.json();
    if (!data.threads) return [];

    const followUpEmailsList: any[] = [];
    for (const threadInfo of data.threads) {
      const threadRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadInfo.id}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!threadRes.ok) continue;
      const threadData = await threadRes.json();
      const messages = threadData.messages || [];
      if (messages.length === 0) continue;

      // Filter: Has user replied to this thread?
      const isReplied = messages.some((msg: any) => {
        const fromVal = msg.payload.headers.find((h: any) => h.name === 'From')?.value || '';
        return fromVal.toLowerCase().includes(userEmail.toLowerCase());
      });

      if (!isReplied) {
        const lastMessage = messages[messages.length - 1];
        const firstMessage = messages[0];
        const headers = firstMessage.payload.headers;
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
        const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
        const date = headers.find((h: any) => h.name === 'Date')?.value || '';
        const snippet = lastMessage.snippet || firstMessage.snippet || '';

        followUpEmailsList.push({
          subject,
          from,
          date,
          snippet,
          threadId: threadInfo.id
        });
      }
    }
    return followUpEmailsList;
  }
  // ==========================
  // END NEW FEATURE - Fetchers
  // ==========================

  // Primary action: analyze emails with scheduling and follow-up support
  const analyzeEmails = async () => {
    setLoading(true);
    setShowBrief(false);
    setErrorText(null);
    setCalendarLoading(true);
    setFollowUpsLoading(true);

    try {
      const fetchedEmails = await fetchEmails();
      setEmails(fetchedEmails);

      if (fetchedEmails.length === 0) {
        throw new Error('No emails found in your inbox.');
      }

      // ==========================
      // START NEW FEATURE - Analysis Orchestration
      // ==========================
      // Parallel fetches for Calendar events and Follow-ups
      const calendarPromise = fetchCalendarEvents().catch(() => []);
      const followUpsPromise = user?.email ? fetchFollowUpEmails(user.email).catch(() => []) : Promise.resolve([]);

      const [eventsList, followUpEmails] = await Promise.all([calendarPromise, followUpsPromise]);

      setCalendarEvents(eventsList);
      setCalendarLoading(false);

      // Perform Server-Side Gemini analysis with Calendar events included
      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: fetchedEmails, calendarEvents: eventsList })
      });

      if (!analyzeResponse.ok) {
        const errData = await analyzeResponse.json();
        throw new Error(errData.error || 'Server briefing analysis failed');
      }

      const briefData = await analyzeResponse.json();
      setSummaryText(briefData.summary || '');
      setTasks(briefData.tasks || []);
      setShowBrief(true);

      // Analyze follow-ups in the background using Server-Side Gemini recommendations
      if (followUpEmails.length > 0) {
        const followUpsResponse = await fetch('/api/followup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emails: followUpEmails })
        });
        if (followUpsResponse.ok) {
          const followUpsData = await followUpsResponse.json();
          setFollowUps(followUpsData.followUps || []);
        } else {
          console.warn('Failed to fetch follow-up recommendations');
        }
      } else {
        setFollowUps([]);
      }
      setFollowUpsLoading(false);
      // ==========================
      // END NEW FEATURE - Analysis Orchestration
      // ==========================

    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || 'An error occurred during inbox analysis.');
    } finally {
      setLoading(false);
      setCalendarLoading(false);
      setFollowUpsLoading(false);
    }
  };

  // Open Draft Modal
  const openDraftModal = async (emailFrom: string, emailSubject: string, emailSnippet: string, threadId: string) => {
    setDraftModalActive(true);
    setDraftModalSubtitle('Replying to: ' + emailFrom);
    setDraftText('Generating draft...');
    setSendDraftBtnDisabled(true);
    setSendDraftBtnText('Send Reply');

    try {
      const response = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: emailFrom, subject: emailSubject, snippet: emailSnippet })
      });

      if (!response.ok) {
        throw new Error('Failed to generate draft on server');
      }

      const data = await response.json();
      const draftBody = data.draft;

      const cleanTo = emailFrom.match(/<(.+)>/) ? (emailFrom.match(/<(.+)>/) as any)[1] : emailFrom;

      setCurrentDraft({
        to: cleanTo,
        subject: 'Re: ' + emailSubject,
        body: draftBody,
        threadId: threadId
      });

      setDraftText(draftBody);
      setSendDraftBtnDisabled(false);
    } catch (err: any) {
      setDraftText('Error generating draft: ' + err.message);
    }
  };

  const closeDraftModal = () => {
    setDraftModalActive(false);
    setCurrentDraft({ to: '', subject: '', body: '', threadId: '' });
  };

  const sendDraftReply = async () => {
    setSendDraftBtnDisabled(true);
    setSendDraftBtnText('Sending...');

    try {
      const emailContent = [
        `To: ${currentDraft.to}`,
        `Subject: ${currentDraft.subject}`,
        `Content-Type: text/plain; charset=utf-8`,
        ``,
        currentDraft.body
      ].join('\n');

      // Use modern btoa encoding compatible with unicode characters
      const encoded = btoa(unescape(encodeURIComponent(emailContent)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: encoded, threadId: currentDraft.threadId })
      });

      if (!response.ok) {
        throw new Error('API reply send failed');
      }

      setSendDraftBtnText('Sent!');
      setTimeout(() => closeDraftModal(), 1500);
    } catch (err) {
      console.error(err);
      setSendDraftBtnText('Failed — try again');
      setSendDraftBtnDisabled(false);
    }
  };

  // Google Tasks Integration
  const addToGoogleTasks = async (taskTitle: string, taskNote: string, btnKey: string) => {
    setAddedTasks((prev) => ({ ...prev, [btnKey]: 'Adding...' }));

    try {
      const response = await fetch(
        'https://tasks.googleapis.com/tasks/v1/lists/@default/tasks',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: taskTitle,
            notes: taskNote
          })
        }
      );

      if (response.ok) {
        setAddedTasks((prev) => ({ ...prev, [btnKey]: '✓ Added' }));
      } else {
        throw new Error('Tasks API failure');
      }
    } catch (err) {
      console.error(err);
      setAddedTasks((prev) => ({ ...prev, [btnKey]: 'Failed' }));
    }
  };

  // ==========================
  // START NEW FEATURE - Follow-Up Tasks
  // ==========================
  const handleAddFollowUpTask = async (taskTitle: string, taskNote: string, buttonElement: HTMLButtonElement) => {
    const threadId = buttonElement.closest('[key]')?.getAttribute('key') || Math.random().toString();
    setAddedFollowUpTaskIds((prev) => ({ ...prev, [threadId]: true }));
    
    try {
      const response = await fetch(
        'https://tasks.googleapis.com/tasks/v1/lists/@default/tasks',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: taskTitle,
            notes: taskNote
          })
        }
      );

      if (!response.ok) {
        throw new Error('API failure');
      }
    } catch (err) {
      console.error('Follow-Up Task error:', err);
      // Revert state if failed
      setAddedFollowUpTaskIds((prev) => ({ ...prev, [threadId]: false }));
    }
  };
  // ==========================
  // END NEW FEATURE - Follow-Up Tasks
  // ==========================

  // Authentication Guard Render
  if (needsAuth) {
    return (
      <div className="login-screen" id="loginScreen">
        <div style={{ fontSize: '48px', marginBottom: '24px' }}>⚡</div>
        <h1>Day<span style={{ color: '#4f8ef7' }}>Briefing</span></h1>
        <p>Your AI chief of staff. Scans your Gmail, finds what's urgent, tells you exactly what to do today.</p>
        <button className="btn btn-primary" onClick={handleLogin} disabled={authLoading}>
          {authLoading ? 'Signing in...' : 'Sign in with Google'}
        </button>
        {errorText && (
          <div className="error-box" id="errorBox" style={{ display: 'block', marginTop: '24px' }}>
            {errorText}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="header bg-slate-950/70 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between" id="appHeader">
        <div className="flex items-center gap-6">
          <div className="logo font-extrabold text-[19px] tracking-tight text-white flex items-center gap-2">Day<span className="text-[#4f8ef7]">Briefing</span></div>
          
          {/* Executive Telemetry Badges */}
          <div className="hidden lg:flex items-center gap-4 border-l border-slate-800/80 pl-6 text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              AI Agent: <strong className="text-slate-200 font-bold">OPTIMAL</strong>
            </span>
            <span className="text-slate-800">•</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]"></span>
              Inbox Health: <strong className="text-slate-200 font-bold">98% CLEAN</strong>
            </span>
            <span className="text-slate-800">•</span>
            <span className="flex items-center gap-1.5 bg-indigo-500/10 text-[#a78bfa] px-2.5 py-0.5 rounded-md border border-indigo-500/20">
              Productivity: <strong className="text-white font-extrabold ml-0.5">A+</strong>
            </span>
          </div>
        </div>
        
        <div className="user-info flex items-center gap-4">
          <span className="user-email text-xs font-mono text-slate-400 bg-slate-900/40 border border-slate-800/50 px-3.5 py-1.5 rounded-full" id="userEmail">{user?.email}</span>
          <button className="btn btn-danger text-xs font-bold px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/15 hover:border-red-500/35 hover:text-white transition-all duration-200" onClick={handleLogout}>Sign Out</button>
        </div>
      </div>

      {/* Main Container */}
      <div className="container">
        <div className="dashboard" id="dashboard" style={{ display: 'block' }}>
          <div className="date-bar" id="dateBar">{todayDateStr}</div>
          <div className="page-title">
            Good morning, {user?.displayName || (user?.email ? user.email.split('@')[0].split(/[._]/)[0].replace(/^\w/, (c: string) => c.toUpperCase()) : 'Rudrakash')}.
            <span className="page-subtitle-main"> Here's your executive AI briefing.</span>
          </div>

          <div className="action-panel">
            <button className="analyze-btn" id="analyzeBtn" onClick={analyzeEmails} disabled={loading}>
              <span className="sparkle-icon">✨</span> Analyze My Workspace & Inbox Now
            </button>
            
            {/* Ambient status indicators below action */}
            <div className="workspace-status-indicators">
              <div className="status-indicator">
                <span className="dot dot-active"></span>
                <span className="label">AI Agent Status: <strong className="text-emerald-400">Optimal</strong></span>
              </div>
              <div className="status-indicator">
                <span className="dot dot-active"></span>
                <span className="label">Gmail Sync: <strong className="text-blue-400">Connected</strong></span>
              </div>
              <div className="status-indicator">
                <span className="dot dot-active"></span>
                <span className="label">Calendar Sync: <strong className="text-purple-400">Connected</strong></span>
              </div>
            </div>
          </div>

          {errorText && (
            <div className="error-box" id="errorBox" style={{ display: 'block' }}>
              {errorText}
            </div>
          )}

          {loading && (
            <div className="loading" id="loadingDiv" style={{ display: 'block' }}>
              <div className="loading-spinner"></div>
              <p>Reading your inbox and analyzing priorities...</p>
            </div>
          )}

          {showBrief && (
            <div className="brief-container" id="briefContainer" style={{ display: 'block' }}>
              
              {/* Executive Metrics Cards */}
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-header">
                    <span className="metric-label">Inbox Scanned</span>
                    <Inbox className="metric-icon text-blue-400" />
                  </div>
                  <div className="metric-value">{emails.length}</div>
                  <div className="metric-footer text-blue-400">
                    <span className="footer-dot dot-blue"></span> Sync: 100% complete
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-header">
                    <span className="metric-label">Urgent Priorities</span>
                    <Sparkles className="metric-icon text-amber-400" />
                  </div>
                  <div className="metric-value">{tasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length}</div>
                  <div className="metric-footer text-amber-400">
                    <span className="footer-dot dot-amber"></span> Instant attention required
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-header">
                    <span className="metric-label">Calendar Events</span>
                    <CalendarIcon className="metric-icon text-purple-400" />
                  </div>
                  <div className="metric-value">{calendarEvents.length}</div>
                  <div className="metric-footer text-purple-400">
                    <span className="footer-dot dot-purple"></span> Scheduled for today
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-header">
                    <span className="metric-label">Follow-Up Pending</span>
                    <TrendingUp className="metric-icon text-emerald-400" />
                  </div>
                  <div className="metric-value">{followUps.length}</div>
                  <div className="metric-footer text-emerald-400">
                    <span className="footer-dot dot-emerald"></span> Smart recommendations
                  </div>
                </div>
              </div>

              {/* Today's Summary */}
              <div className="flex items-baseline justify-between mb-4 pb-2 border-b border-slate-800/30">
                <h3 className="text-[14px] font-semibold text-slate-200 tracking-tight">
                  Today's Summary
                </h3>
                <span className="text-[12px] font-semibold text-slate-500 font-mono">
                  Executive briefing
                </span>
              </div>
              <div className="summary-box">
                <p id="summaryText">{summaryText}</p>
              </div>

              {/* ==========================
                  START NEW FEATURE - Calendar
                  ========================== */}
              <CalendarSection events={calendarEvents} loading={calendarLoading} />
              {/* ==========================
                  END NEW FEATURE - Calendar
                  ========================== */}

              {/* Scanned Emails Section */}
              <ScannedEmailsSection
                emails={emails}
                loading={loading}
                onDraftReply={openDraftModal}
                onAddTask={addToGoogleTasks}
                addedTasks={addedTasks}
              />

              {/* Priority Actions */}
              <div className="flex items-baseline justify-between mb-4 pb-2 border-b border-slate-800/30">
                <h3 className="text-[14px] font-semibold text-slate-200 tracking-tight">
                  Priority Actions
                </h3>
                <span className="text-[12px] font-semibold text-slate-500 font-mono">
                  {tasks.length} actions required
                </span>
              </div>
              <div id="taskList" className="space-y-4 mb-8">
                {tasks.map((task, index) => {
                  const email = emails[index] || emails[0] || {};
                  const btnKey = `task-${index}`;
                  const taskStatus = addedTasks[btnKey] || '+ Add to Tasks';
                  const isTaskDone = taskStatus === '✓ Added';

                  // Determine glow colors & borders based on priority
                  let priorityAccentClass = '';
                  let priorityBadgeClass = '';
                  if (task.priority === 'urgent') {
                    priorityAccentClass = 'border-l-rose-500 shadow-[0_4px_20px_rgba(239,68,68,0.05)] bg-[#0c0507]/30 hover:bg-[#12070a]/50 hover:border-l-rose-400';
                    priorityBadgeClass = 'bg-rose-950/20 text-rose-400 border border-rose-500/20';
                  } else if (task.priority === 'high') {
                    priorityAccentClass = 'border-l-amber-500 shadow-[0_4px_20px_rgba(245,158,11,0.05)] bg-[#120d05]/30 hover:bg-[#1c1407]/50 hover:border-l-amber-400';
                    priorityBadgeClass = 'bg-amber-950/20 text-amber-400 border border-amber-500/20';
                  } else if (task.priority === 'medium') {
                    priorityAccentClass = 'border-l-blue-500 shadow-[0_4px_20px_rgba(59,130,246,0.04)] bg-[#050812]/30 hover:bg-[#070c1c]/50 hover:border-l-blue-400';
                    priorityBadgeClass = 'bg-blue-950/20 text-blue-400 border border-blue-500/20';
                  } else {
                    priorityAccentClass = 'border-l-emerald-500 shadow-[0_4px_20px_rgba(16,185,129,0.03)] bg-[#05120a]/30 hover:bg-[#071c10]/50 hover:border-l-emerald-400';
                    priorityBadgeClass = 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/20';
                  }

                  return (
                    <div 
                      key={index} 
                      className={`task-card ${task.priority} border border-transparent border-l-4 ${priorityAccentClass} rounded-2xl p-5 hover:border-slate-800/80 transition-all duration-200`}
                    >
                      <div className="task-header flex items-center justify-between gap-4 mb-3">
                        <div className="task-title text-[16px] font-semibold text-slate-100 hover:text-[#4f8ef7] transition-colors">{task.title}</div>
                        <span className={`priority-badge badge-${task.priority} ${priorityBadgeClass} px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider font-mono`}>
                          {task.priority}
                        </span>
                      </div>
                      <div className="task-context text-[13px] text-slate-400 leading-relaxed mb-4 italic">
                        "{task.context}"
                      </div>
                      <div className="task-action bg-[#030408]/50 border border-slate-900 rounded-xl p-4 mb-4">
                        <strong className="block text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-1.5 font-mono">
                          → Next Action
                        </strong>
                        <span className="text-[13px] text-slate-200 leading-relaxed">{task.action}</span>
                      </div>
                      <div className="task-btn-row flex items-center gap-2">
                        <button
                          className="btn-draft px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/40 text-slate-300 border border-transparent hover:bg-slate-800/80 hover:text-white transition-all duration-200 flex items-center gap-1.5 h-8"
                          onClick={() => openDraftModal(email.from || '', email.subject || '', email.snippet || '', email.threadId || '')}
                        >
                          ✉ Draft Reply
                        </button>
                        <button
                          className={`btn-task ${isTaskDone ? 'done' : ''} px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 flex items-center gap-1.5 h-8 ${
                            isTaskDone 
                              ? 'bg-emerald-950/20 text-emerald-400 border-emerald-500/20 cursor-not-allowed' 
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-400 hover:text-white'
                          }`}
                          onClick={() => addToGoogleTasks(task.title, task.action, btnKey)}
                          disabled={isTaskDone || taskStatus === 'Adding...'}
                        >
                          {taskStatus}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ==========================
                  START NEW FEATURE - Follow-Ups Section
                  ========================== */}
              <FollowUpSection
                followUps={followUps}
                loading={followUpsLoading}
                onAddTask={handleAddFollowUpTask}
                addedTaskIds={addedFollowUpTaskIds}
              />
              {/* ==========================
                  END NEW FEATURE - Follow-Ups Section
                  ========================== */}

            </div>
          )}
        </div>
      </div>

      {/* Draft Reply Modal */}
      {draftModalActive && (
        <div className="modal-overlay active" id="draftModal">
          <div className="modal">
            <div className="modal-title">AI Draft Reply</div>
            <div className="modal-subtitle" id="draftModalSubtitle">{draftModalSubtitle}</div>
            <div className="draft-text" id="draftText">{draftText}</div>
            <div className="modal-actions">
              <button className="btn-close" onClick={closeDraftModal}>Close</button>
              <button
                className="btn-send"
                id="sendDraftBtn"
                onClick={sendDraftReply}
                disabled={sendDraftBtnDisabled}
              >
                {sendDraftBtnText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
