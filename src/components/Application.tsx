declare global {
  namespace JSX {
    interface IntrinsicElements {
      'lord-icon': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src?: string; trigger?: string; delay?: string; state?: string;
        colors?: string; style?: React.CSSProperties;
      }, HTMLElement>;
    }
  }
}

import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import React, { useState, useEffect, useRef } from 'react';
import { ai } from '../lib/gemini';
import Markdown from 'react-markdown';
import { motion, useScroll, useTransform } from 'motion/react';
import {
  MessageSquare, LayoutDashboard, Activity, Zap, TrendingUp,
  Send, User, ShieldAlert, Flame, CheckCircle2, Circle, ArrowRight,
  Mic, Phone, Paperclip, Plus, Crosshair, Trophy, Star, LogOut,
  ChevronLeft, ChevronRight, Target, Brain, Map, Lock
} from 'lucide-react';
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, Legend
} from 'recharts';

// ── Types ──────────────────────────────────────────────────────────────────
type AppState = 'landing' | 'onboarding' | 'dashboard' | 'chat' | 'progress';

// ── Memory System ──────────────────────────────────────────────────────────
const MEMORY_KEY = 'mirror_memory';
const CHAT_HISTORY_KEY = 'mirror_chats';

function saveMemory(userData: any, analysis: any) {
  const prev = getMemory();
  const memory = {
    user: userData,
    analysis,
    lastSeen: new Date().toISOString(),
    sessions: (prev?.sessions || 0) + 1,
  };
  try { localStorage.setItem(MEMORY_KEY, JSON.stringify(memory)); } catch {}
}

function getMemory() {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveChatSession(session: { id: string; title: string; messages: any[]; timestamp: string }) {
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const updated = [session, ...existing.filter((c: any) => c.id !== session.id)].slice(0, 10);
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(updated));
  } catch {}
}

function getChatHistory(): { id: string; title: string; messages: any[]; timestamp: string }[] {
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ── Logo ───────────────────────────────────────────────────────────────────
function MirrorLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
      <path d="M12 2L20 12L12 22L4 12L12 2Z" stroke="currentColor" strokeWidth="1" className="text-white" />
      <circle cx="12" cy="12" r="3" fill="currentColor" className="text-blue-400 opacity-80" />
      <path d="M12 5V19" stroke="currentColor" strokeWidth="1" className="text-white/30" strokeDasharray="2 2" />
    </svg>
  );
}

// ── SVG Animated Background (shared) ──────────────────────────────────────
function AnimatedBg({ id1, id2 }: { id1: string; id2: string }) {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id={id1} cx="25%" cy="25%" r="55%">
            <stop offset="0%" stopColor="#1a3a6e" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#030305" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={id2} cx="80%" cy="80%" r="55%">
            <stop offset="0%" stopColor="#3b1f6e" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#030305" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id1})`} />
        <rect width="100%" height="100%" fill={`url(#${id2})`} />
        <g stroke="rgba(99,102,241,0.05)" strokeWidth="1" fill="none">
          {[20, 40, 60, 80].map((y, i) => (
            <line key={`h${i}`} x1="0" y1={`${y}%`} x2="100%" y2={`${y}%`}>
              <animate attributeName="opacity" values="0.3;0.8;0.3" dur={`${7 + i * 2}s`} repeatCount="indefinite" />
            </line>
          ))}
          {[25, 50, 75].map((x, i) => (
            <line key={`v${i}`} x1={`${x}%`} y1="0" x2={`${x}%`} y2="100%">
              <animate attributeName="opacity" values="0.2;0.6;0.2" dur={`${9 + i * 3}s`} repeatCount="indefinite" />
            </line>
          ))}
        </g>
        {[
          { cx: '15%', cy: '20%', r: 1.5, dur: '7s' },
          { cx: '85%', cy: '75%', r: 1.5, dur: '9s' },
          { cx: '60%', cy: '15%', r: 1, dur: '6s' },
          { cx: '30%', cy: '70%', r: 1, dur: '11s' },
          { cx: '75%', cy: '40%', r: 1.2, dur: '8s' },
        ].map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill="rgba(139,92,246,0.5)">
            <animate attributeName="opacity" values="0.2;0.7;0.2" dur={d.dur} repeatCount="indefinite" />
          </circle>
        ))}
      </svg>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] mix-blend-overlay" />
    </div>
  );
}

// ── Application (root) ─────────────────────────────────────────────────────
export default function Application({ onExit }: { onExit: () => void }) {
  const [view, setView] = useState<AppState>('landing');
  const [userData, setUserData] = useState<any>(null);
  const [onboardingPath, setOnboardingPath] = useState<'knows' | 'lost'>('knows');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [roadmap, setRoadmap] = useState<string[]>([]);
  const [geminiAnalysis, setGeminiAnalysis] = useState<any>(null);
  const [chatHistory, setChatHistory] = useState(getChatHistory());
  const [activeChat, setActiveChat] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);

  const refreshHistory = () => setChatHistory(getChatHistory());

  // Run Gemini analysis after onboarding
  const handleOnboardingComplete = async (data: any) => {
    setUserData(data);
    try {
      const res = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: `Analyze this person and return ONLY a JSON object (no markdown, no backticks):
{
  "gapPercent": <number 0-100>,
  "executionScore": <number 0-10>,
  "disciplineScore": <number 0-100>,
  "visionScore": <number 0-100>,
  "honestyScore": <number 0-100>,
  "actionScore": <number 0-100>,
  "willpowerScore": <number 0-100>,
  "weeklyActions": [<7 numbers 0-100>],
  "weeklyExcuses": [<7 numbers 0-100>],
  "trajectoryWithout": [<7 declining numbers>],
  "trajectoryWith": [<7 improving numbers>],
  "primaryBarrier": "<one word>",
  "streakLikelihood": <number 0-30>
}
Goal: ${data.goal}
Obstacle: ${data.discrepancy}
Excuse: ${data.excuse}
Energy: ${data.energy}
Fear: ${data.fear}`,
      });
      const text = res.text?.replace(/```json|```/g, '').trim();
      const analysis = JSON.parse(text || '{}');
      setGeminiAnalysis(analysis);
      saveMemory(data, analysis);
    } catch {
      const excuse = data.excuse?.toLowerCase() || '';
      const analysis = {
        gapPercent: excuse.includes('tomorrow') ? 15 : 28,
        executionScore: excuse.includes('tired') ? 3 : 5,
        disciplineScore: excuse.includes('tomorrow') ? 20 : 40,
        visionScore: data.goal?.includes('lasting') ? 75 : 50,
        honestyScore: data.fear?.includes('stupid') ? 25 : 55,
        actionScore: excuse.includes('plan') ? 15 : 35,
        willpowerScore: excuse.includes('time') ? 30 : 50,
        weeklyActions: [20, 15, 30, 10, 25, 40, 35],
        weeklyExcuses: [60, 70, 50, 80, 55, 30, 40],
        trajectoryWithout: [70, 75, 80, 85, 60, 50, 40],
        trajectoryWith: [20, 35, 50, 65, 80, 85, 90],
        primaryBarrier: 'Avoidance',
        streakLikelihood: 7,
      };
      setGeminiAnalysis(analysis);
      saveMemory(data, analysis);
    }
    setView('dashboard');
  };

  if (view === 'landing') {
    return <Landing onSelectPath={(path) => { setOnboardingPath(path); setView('onboarding'); }} />;
  }

  if (view === 'onboarding') {
    return <Onboarding path={onboardingPath} onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="flex h-screen w-full bg-[#030305] text-white overflow-hidden font-sans">

      {/* ── Sidebar Desktop ── */}
      <div className={`${sidebarCollapsed ? 'w-20' : 'w-64'} border-r border-white/5 bg-[#050505] flex-col justify-between hidden md:flex z-50 transition-all duration-300 relative flex-shrink-0`}>
        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-8 w-6 h-6 bg-[#111118] border border-white/10 rounded-full flex items-center justify-center text-white/50 hover:text-white z-50 transition-all">
          {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        <div className="p-4 flex flex-col h-full overflow-hidden">
          <div className={`text-xl font-light tracking-[0.4em] uppercase text-white mb-8 flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <MirrorLogo />
            {!sidebarCollapsed && 'Mirror'}
          </div>

          {/* Nav */}
          <div className="space-y-2 mb-4">
            {[
              { id: 'dashboard', icon: <LayoutDashboard size={18} />, label: 'Psy-Profile' },
              { id: 'chat', icon: <MessageSquare size={18} />, label: 'Chat Session' },
              { id: 'progress', icon: <Activity size={18} />, label: 'Progress Dash' },
            ].map(item => (
              <button key={item.id}
                onClick={() => { setView(item.id as AppState); setShowHistory(false); setActiveChat(null); }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${sidebarCollapsed ? 'justify-center' : ''} ${view === item.id && !showHistory ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
                title={sidebarCollapsed ? item.label : ''}>
                {item.icon}
                {!sidebarCollapsed && <span className="text-xs uppercase tracking-widest">{item.label}</span>}
              </button>
            ))}
          </div>

          {/* Chat History */}
          {!sidebarCollapsed && (
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <button onClick={() => setShowHistory(!showHistory)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all mb-2 ${showHistory ? 'text-purple-400 bg-purple-500/10' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
                <div className="flex items-center gap-2">
                  <MessageSquare size={14} />
                  <span className="text-[10px] uppercase tracking-widest">Recent Chats</span>
                </div>
                <ChevronRight size={12} className={`transition-transform ${showHistory ? 'rotate-90' : ''}`} />
              </button>

              {showHistory && (
                <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0">
                  {chatHistory.length === 0
                    ? <p className="text-[10px] text-white/20 font-mono px-3 py-2">No chats yet</p>
                    : chatHistory.map((chat) => (
                      <button key={chat.id}
                        onClick={() => { setActiveChat(chat); setView('chat'); setShowHistory(false); }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 transition-all group">
                        <p className="text-[11px] text-white/60 truncate group-hover:text-white">{chat.title}</p>
                        <p className="text-[9px] text-white/20 font-mono mt-0.5">{new Date(chat.timestamp).toLocaleDateString()}</p>
                      </button>
                    ))}
                </div>
              )}

              {/* Memory indicator */}
              {getMemory() && (
                <div className="mt-auto pt-3 border-t border-white/5">
                  <div className="px-3 py-2 rounded-lg bg-purple-500/5 border border-purple-500/10">
                    <p className="text-[9px] text-purple-400 font-mono uppercase tracking-wider flex items-center gap-1">
                      <Brain size={10} /> Mirror Remembers
                    </p>
                    <p className="text-[9px] text-white/30 mt-1 font-mono">
                      {getMemory()?.sessions || 1} session{getMemory()?.sessions !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User + Exit */}
        <div className="p-4 border-t border-white/5 bg-[#030305]/50 flex-shrink-0">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3 mb-4 relative">
              <div className="absolute -left-1 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-r-full" />
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600/30 to-purple-600/30 border border-white/20 flex items-center justify-center overflow-hidden ml-2 flex-shrink-0">
  <lord-icon
    src="https://cdn.lordicon.com/zogbvydd.json"
    trigger="in"
    delay="1500"
    state="in-reveal"
    colors="primary:#17171c,secondary:#c69cf4,tertiary:#1b1091,quaternary:#ffffff"
    style={{ width: '36px', height: '36px' }}
  />
</div>
              <div>
                <div className="text-sm font-medium flex items-center gap-2">
                  {userData?.name || 'User'}
                  <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">LVL {Math.floor((1200) / 400)}</span>
                </div>
                <div className="text-[10px] text-white/40 uppercase tracking-widest">Initiate</div>
              </div>
            </div>
          )}
          <button onClick={onExit}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-400/70 hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20 transition-all ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <LogOut size={16} />
            {!sidebarCollapsed && <span className="text-xs uppercase tracking-widest">Exit Mirror</span>}
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 relative overflow-y-auto custom-scrollbar bg-gradient-to-br from-[#030305] to-[#0A0A0F] pb-20 md:pb-0 min-w-0">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none mix-blend-overlay z-0" />
        {view === 'dashboard' && <AppDashboard userData={userData} setView={setView} geminiAnalysis={geminiAnalysis} />}
        {view === 'chat' && <AppChat userData={userData} setView={setView} onRoadmapGenerated={setRoadmap} onChatSaved={refreshHistory} activeChat={activeChat} geminiAnalysis={geminiAnalysis} />}
        {view === 'progress' && <AppProgress userData={userData} roadmap={roadmap} geminiAnalysis={geminiAnalysis} />}
      </div>

      {/* ── Mobile Bottom Nav ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#050505]/95 backdrop-blur-xl border-t border-white/10 flex justify-around p-3 z-50">
        {[
          { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Profile' },
          { id: 'chat', icon: <MessageSquare size={20} />, label: 'Chat' },
          { id: 'progress', icon: <Activity size={20} />, label: 'Dash' },
        ].map(item => (
          <button key={item.id} onClick={() => setView(item.id as AppState)}
            className={`flex flex-col items-center gap-1 p-2 w-16 rounded-lg transition-all ${view === item.id ? 'text-blue-400 bg-blue-500/10' : 'text-white/40'}`}>
            {item.icon}
            <span className="text-[9px] uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
        <button onClick={() => { if (window.confirm('Exit Mirror?')) onExit(); }}
          className="flex flex-col items-center gap-1 p-2 w-16 rounded-lg transition-all text-white/40 hover:text-red-400">
          <LogOut size={20} />
          <span className="text-[9px] uppercase tracking-wider">Exit</span>
        </button>
      </div>
    </div>
  );
}

// ── Landing ────────────────────────────────────────────────────────────────
function Landing({ onSelectPath }: { onSelectPath: (path: 'knows' | 'lost') => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: containerRef });
  const yHeroContent = useTransform(scrollY, [0, 800], [0, 250]);
  const opacityHero = useTransform(scrollY, [0, 600], [1, 0]);
  const yHeroModel = useTransform(scrollY, [0, 800], [0, 450]);

  return (
    <div ref={containerRef} className="flex flex-col h-screen w-full bg-[#030305] text-white relative font-sans overflow-y-auto overflow-x-hidden custom-scrollbar scroll-smooth">
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay z-10" />

      {/* Navbar */}
      <nav className="w-full px-6 lg:px-12 py-6 flex items-center justify-between z-50 fixed top-0 left-0 border-b border-white/5 bg-[#030305]/80 backdrop-blur-md">
        <div className="flex items-center gap-3 text-lg font-light tracking-[0.2em] uppercase cursor-pointer"
          onClick={() => containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}>
          <MirrorLogo /> Mirror
        </div>
        <div className="hidden md:flex items-center gap-8 text-[13px] uppercase tracking-widest font-mono">
          <button onClick={() => document.getElementById('manifesto')?.scrollIntoView({ behavior: 'smooth' })} className="text-white/85 hover:text-white transition-colors">Manifesto</button>
          <button onClick={() => document.getElementById('methodology')?.scrollIntoView({ behavior: 'smooth' })} className="text-white/85 hover:text-white transition-colors">Methodology</button>
          <button onClick={() => containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })} className="relative text-white backdrop-blur-md bg-white/5 border border-white/10 px-5 py-2.5 rounded-full hover:bg-white/10 transition-all font-bold tracking-widest uppercase text-[10px] shadow-[inset_3px_0_10px_rgba(59,130,246,0.3),inset_-3px_0_10px_rgba(59,130,246,0.3)] hover:shadow-[inset_3px_0_15px_rgba(59,130,246,0.5),inset_-3px_0_15px_rgba(59,130,246,0.5),0_0_15px_rgba(59,130,246,0.4)]">Access Portal</button>
        </div>
      </nav>

      {/* Hero */}
      <div id="hero" className="min-h-screen flex flex-col pt-24 relative z-20 overflow-hidden">
        <div className="flex-1 flex flex-col max-lg:justify-center lg:flex-row items-center w-full max-w-7xl mx-auto px-6 lg:px-12 relative h-full">
          <motion.div style={{ y: yHeroContent, opacity: opacityHero }} className="w-full lg:w-1/2 flex flex-col justify-center text-left z-30 pt-16 lg:pt-0">
            <h1 className="text-6xl md:text-8xl font-display font-light tracking-tight mb-4 animate-[fadeInUp_0.8s_ease-out]">
              Meet <span className="font-medium text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.3)]">Mirror</span>
            </h1>
            <p className="text-xl md:text-2xl font-light text-white/70 mb-10 lg:mb-14 tracking-wide animate-[fadeInUp_1s_ease-out]">
              The AI that knows you better than you know yourself.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full animate-[fadeInUp_1.2s_ease-out] max-w-lg">
              <button onClick={() => onSelectPath('knows')}
                className="group flex-1 p-6 bg-[#05050A]/80 backdrop-blur-xl border border-white/10 rounded-2xl hover:bg-[#0A0A14] hover:border-blue-500/50 hover:shadow-[0_10px_30px_rgba(59,130,246,0.15)] transition-all duration-300 relative overflow-hidden text-left hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute top-0 left-0 w-1 h-0 bg-blue-400 group-hover:h-full transition-all duration-300" />
                <h3 className="text-lg font-display font-medium mb-2 relative z-10 flex items-center gap-2"><Crosshair size={16} className="text-blue-400" />I know my goal</h3>
                <p className="text-xs font-light text-white/40 relative z-10 leading-relaxed">I have a vision. I just need the discipline & truth to get there.</p>
                <div className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-blue-400 opacity-50 group-hover:opacity-100 transition-opacity relative z-10">Initiate <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" /></div>
              </button>
              <button onClick={() => onSelectPath('lost')}
                className="group flex-1 p-6 bg-[#05050A]/80 backdrop-blur-xl border border-white/10 rounded-2xl hover:bg-[#0A0A14] hover:border-purple-500/50 hover:shadow-[0_10px_30px_rgba(168,85,247,0.15)] transition-all duration-300 relative overflow-hidden text-left hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute top-0 left-0 w-1 h-0 bg-purple-400 group-hover:h-full transition-all duration-300" />
                <h3 className="text-lg font-display font-medium mb-2 relative z-10 flex items-center gap-2"><Zap size={16} className="text-purple-400" />I am lost</h3>
                <p className="text-xs font-light text-white/40 relative z-10 leading-relaxed">I am drifting without purpose. I need to uncover what I actually want.</p>
                <div className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-purple-400 opacity-50 group-hover:opacity-100 transition-opacity relative z-10">Seek <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" /></div>
              </button>
            </div>
          </motion.div>

          <motion.div style={{ y: yHeroModel, opacity: opacityHero }}
            className="absolute lg:relative top-0 right-0 w-full lg:w-1/2 h-full lg:h-[80vh] z-10 flex justify-center items-center pointer-events-none lg:pointer-events-auto opacity-30 lg:opacity-100">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none hidden lg:block" />
            <div className="w-full h-full absolute top-0 left-0 flex items-center justify-center"
              style={{ clipPath: 'inset(0 0 0 0)', WebkitClipPath: 'inset(0 0 0 0)' }}>
              <iframe title="Character Cyber Woman Blue By Oscar Creativo" frameBorder="0" allowFullScreen
                src="https://sketchfab.com/models/1e164c92e19a4041b8b06413a0aa92e1/embed?autostart=1&ui_controls=0&ui_infos=0&ui_inspector=0&ui_watermark_link=0&ui_watermark=0&transparent=1&preload=1&ui_hint=0&dnt=1&camera=0"
                className="w-[140%] h-[140%] pointer-events-auto scale-110" style={{ marginTop: '60px' }} />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Manifesto */}
      <div id="manifesto" className="min-h-screen py-32 flex items-center relative z-20 bg-[#05050A] overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center">
          <motion.div initial={{ height: 0, opacity: 0 }} whileInView={{ height: 96, opacity: 1 }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 0.8 }} className="w-full flex justify-center mb-12">
            <div className="w-px h-24 bg-gradient-to-b from-transparent to-blue-500/50" />
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }} className="text-sm font-mono tracking-[0.4em] text-blue-400 uppercase mb-8">The Manifesto</motion.h2>
          <motion.h3 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.3 }} className="text-4xl md:text-6xl font-display font-light leading-snug tracking-tight mb-12 text-white/90">
            Most self-improvement tools just give you more <span className="text-blue-400 font-medium font-sans italic">busywork</span> so you feel productive.
          </motion.h3>
          <motion.p
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 1.2, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
  className="text-xl md:text-2xl font-light text-white/50 leading-relaxed max-w-3xl mx-auto"
>
  Mirror is not a to-do list. It is a relentless mechanism designed to break down your excuses, expose the friction in your actions, and aggressively course-correct you towards reality.
</motion.p>
        </div>
      </div>

      {/* Methodology */}
      <div id="methodology" className="min-h-screen py-20 md:py-32 pb-32 flex items-start md:items-center relative z-20 bg-[#030305]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-12 w-full py-8 md:py-0 pb-24 md:pb-0">
          <div className="text-center mb-20">
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-sm font-mono tracking-[0.4em] text-purple-400 uppercase mb-4">Methodology</motion.h2>
            <motion.h3 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.2 }} className="text-4xl font-display font-light">How Mirror Rebuilds You</motion.h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
  {[
    { num: '1', title: 'Interrogation', color: 'blue', shadow: 'rgba(59,130,246,0.2)', desc: 'You enter. Mirror asks hyper-specific questions to extract your actual desires vs what you tell yourself you want. It identifies the root of your stagnation.' },
    { num: '2', title: 'Confrontation', color: 'orange', shadow: 'rgba(249,115,22,0.2)', desc: 'Mirror throws your own words back at you, exposing inconsistencies, laziness, and false barriers blocking your execution.' },
    { num: '3', title: 'Enforcement', color: 'purple', shadow: 'rgba(168,85,247,0.2)', desc: 'It builds a merciless priority tracker. Deep work is rewarded. Excuses result in negative feedback loops. You are graded daily on your commitment.' },
  ].map((item, i) => (
    <motion.div key={item.num}
      initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.2 }}
      style={{ '--glow': item.shadow } as React.CSSProperties}
      className={`p-8 border border-white/5 bg-white/[0.02] rounded-3xl relative overflow-hidden group hover:-translate-y-2 hover:bg-white/[0.05] transition-all duration-500 cursor-default
        ${item.color === 'blue' ? 'hover:border-blue-500/40 hover:shadow-[0_15px_40px_rgba(59,130,246,0.2)]' : ''}
        ${item.color === 'orange' ? 'hover:border-orange-500/40 hover:shadow-[0_15px_40px_rgba(249,115,22,0.2)]' : ''}
        ${item.color === 'purple' ? 'hover:border-purple-500/40 hover:shadow-[0_15px_40px_rgba(168,85,247,0.2)]' : ''}
      `}
    >
      {/* Inner glow overlay */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none
        ${item.color === 'blue' ? 'bg-gradient-to-br from-blue-500/8 to-transparent' : ''}
        ${item.color === 'orange' ? 'bg-gradient-to-br from-orange-500/8 to-transparent' : ''}
        ${item.color === 'purple' ? 'bg-gradient-to-br from-purple-500/8 to-transparent' : ''}
      `} />
      {/* Corner orb */}
      <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-[30px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none
        ${item.color === 'blue' ? 'bg-blue-500/20' : ''}
        ${item.color === 'orange' ? 'bg-orange-500/20' : ''}
        ${item.color === 'purple' ? 'bg-purple-500/20' : ''}
      `} />
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 w-[2px] h-0 group-hover:h-full transition-all duration-500 rounded-r pointer-events-none
        ${item.color === 'blue' ? 'bg-gradient-to-b from-blue-400 to-blue-600' : ''}
        ${item.color === 'orange' ? 'bg-gradient-to-b from-orange-400 to-orange-600' : ''}
        ${item.color === 'purple' ? 'bg-gradient-to-b from-purple-400 to-purple-600' : ''}
      `} />
      {/* Number watermark */}
      <div className={`absolute top-0 right-0 p-8 text-9xl font-display font-bold pointer-events-none text-white/5 group-hover:scale-110 transition-all duration-500
        ${item.color === 'blue' ? 'group-hover:text-blue-500/15' : ''}
        ${item.color === 'orange' ? 'group-hover:text-orange-500/15' : ''}
        ${item.color === 'purple' ? 'group-hover:text-purple-500/15' : ''}
      `}>{item.num}</div>
      <h4 className={`text-xl font-medium mb-4 relative z-10 transition-colors duration-300
        ${item.color === 'blue' ? 'group-hover:text-blue-400' : ''}
        ${item.color === 'orange' ? 'group-hover:text-orange-400' : ''}
        ${item.color === 'purple' ? 'group-hover:text-purple-400' : ''}
      `}>{item.title}</h4>
      <motion.p
  initial={{ opacity: 0, y: 12 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: '-40px' }}
  transition={{ duration: 0.6, delay: i * 0.2 + 0.3, ease: 'easeOut' }}
  className="text-white/50 text-sm leading-relaxed relative z-10 group-hover:text-white/70 transition-colors duration-300"
>{item.desc}</motion.p>
    </motion.div>
  ))}
</div>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.6 }} className="mt-12 md:mt-24 text-center pb-16 md:pb-0">
            <button onClick={() => containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center gap-3 px-8 py-4 bg-white/5 backdrop-blur-md border border-white/10 border-x-blue-500/50 text-white font-bold text-xs uppercase tracking-widest rounded-full transition-all hover:scale-[1.02] hover:bg-white/10 shadow-[inset_4px_0_15px_rgba(59,130,246,0.3),inset_-4px_0_15px_rgba(59,130,246,0.3),0_0_20px_rgba(59,130,246,0.1)] hover:shadow-[inset_4px_0_20px_rgba(59,130,246,0.6),inset_-4px_0_20px_rgba(59,130,246,0.6),0_0_40px_rgba(59,130,246,0.4)]">
              Access Portal <ArrowRight size={16} />
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ── Onboarding ─────────────────────────────────────────────────────────────
type QuestionConfig = { question: string; options: string[] };

function Onboarding({ path, onComplete }: { path: 'knows' | 'lost'; onComplete: (data: any) => void }) {
  const [step, setStep] = useState(-1);
  const [name, setName] = useState('');
  const [answers, setAnswers] = useState<string[][]>([]);
  const [currentValues, setCurrentValues] = useState<string[]>([]);
  const [customValue, setCustomValue] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const questions: QuestionConfig[] = path === 'knows'
    ? [
      { question: 'What do you want to achieve?', options: ['Be my own boss', 'Master my craft', 'Make serious money', 'Build something lasting', 'Other'] },
      { question: "What's stopping you right now?", options: ['Not acting consistently', 'No clear plan', 'I sabotage myself', 'Doing the wrong things', 'Other'] },
      { question: 'What excuse do you tell yourself the most?', options: ['I have no time', 'I need more money first', "I'll do it tomorrow", "I'm just too tired", 'Other'] },
      { question: 'When do you waste the most time?', options: ['First thing in the morning', 'Afternoon slumps', 'Late at night', 'Doomscrolling anytime', 'Other'] },
      { question: 'What scares you the most?', options: ['Looking stupid', 'Putting my work out there', 'Committing to one path', 'Leaving my comfort zone', 'Other'] },
    ]
    : [
      { question: "What do you do when you're bored?", options: ['Scroll phones/Watch TV', 'Plan but never do', 'Play video games', 'Worry about life', 'Other'] },
      { question: 'What are you settling for?', options: ['A boring job', 'Bad relationships', 'Poor health', 'Living for the weekends', 'Other'] },
      { question: "If you couldn't fail, what would you do?", options: ['Start my own business', 'Make art', 'Change my career completely', 'Travel and start over', 'Other'] },
      { question: 'What drains your brain for no reason?', options: ['Overthinking everything', 'Worrying what others think', 'Regretting the past', 'Useless news', 'Other'] },
      { question: 'What are you afraid to admit?', options: ['I might just be average', 'I lack discipline', 'I wasted a lot of time', 'I am the problem', 'Other'] },
    ];

  const handleToggleOption = (opt: string) => {
    if (opt === 'Other') {
      if (currentValues.includes('Other')) { setCurrentValues(currentValues.filter(v => v !== 'Other')); setCustomValue(''); }
      else setCurrentValues(prev => [...prev, 'Other']);
      return;
    }
    if (currentValues.includes(opt)) setCurrentValues(currentValues.filter(v => v !== opt));
    else setCurrentValues(prev => [...prev, opt]);
  };

  const handleNext = () => {
    if (currentValues.length === 0) return;
    const finalizedStepAnswers = currentValues.map(v => v === 'Other' && customValue.trim() !== '' ? customValue : v);
    const newAnswers = [...answers, finalizedStepAnswers];
    setAnswers(newAnswers);
    setCurrentValues([]);
    setCustomValue('');
    if (step < questions.length - 1) setStep(step + 1);
    else finalize(newAnswers);
  };

  const finalize = (finalAnswers: string[][]) => {
    setIsAnalyzing(true);
    setTimeout(() => {
      onComplete({
        name,
        goal: finalAnswers[0]?.join(', ') || '',
        discrepancy: finalAnswers[1]?.join(', ') || '',
        excuse: finalAnswers[2]?.join(', ') || '',
        energy: finalAnswers[3]?.join(', ') || '',
        fear: finalAnswers[4]?.join(', ') || '',
      });
    }, 3000);
  };

  if (isAnalyzing) {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#030305] text-white relative overflow-hidden font-sans">
      <AnimatedBg id1="an-g1" id2="an-g2" />
      <div className="z-10 flex flex-col items-center gap-6 px-6 text-center">
        
        {/* Lottie Animation */}
        <div className="w-68 h-68 sm:w-100 sm:h-100 opacity-90">
          <DotLottieReact
            src="https://lottie.host/f2a79884-4cdf-450e-b022-12ae40404914/1Xic7tgYhM.lottie"
            loop
            autoplay
          />
        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-3">
          <h2 className="text-2xl font-light tracking-[0.2em] animate-pulse">
            ANALYZING PSYCHOLOGY...
          </h2>
          <div className="text-xs text-blue-400 uppercase tracking-widest font-mono flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping" /> 
            Detecting inconsistencies
          </div>
        </div>

      </div>
    </div>
  );
}

  const progressPercent = step <= 0 ? 0 : (step / questions.length) * 100;

  // Name screen
  if (step === -1) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#030305] text-white relative font-sans overflow-y-auto overflow-x-hidden">
      <AnimatedBg id1="ns-g1" id2="ns-g2" />
      <div className="relative z-10 w-full max-w-4xl px-6 py-16 flex flex-col lg:flex-row items-center justify-center gap-12">

        {/* Lottie Animation - Left Side */}
        <video
  src="/Bot.webm"
  autoPlay
  loop
  muted
  playsInline
  className="w-85 h-74 lg:w-[460px] lg:h-[460px] flex-shrink-0"
  style={{ pointerEvents: 'none', mixBlendMode: 'screen' }}
/>

        {/* Form - Right Side */}
        <div className="flex flex-col items-center text-center w-full max-w-md">
          <div className="mb-6 text-[10px] text-blue-400 uppercase tracking-[0.3em] flex items-center gap-2 font-mono">
            <User size={14} /> Identity Verification
          </div>
          <h2 className="text-4xl md:text-5xl font-display font-light leading-tight tracking-tight mb-10 animate-[fadeInUp_0.5s_ease-out]">
            What should Mirror<br />call you?
          </h2>
          <div className="w-full mb-4 bg-white/[0.03] px-6 py-4 rounded-2xl border border-white/10 focus-within:border-blue-500/40 transition-all">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && name.trim()) setStep(0); }}
              placeholder="Enter your name..."
              autoFocus
              className="w-full bg-transparent text-xl font-light outline-none text-white placeholder:text-white/20 text-center"
            />
          </div>
          <button
            disabled={!name.trim()}
            onClick={() => setStep(0)}
            className="w-full py-4 text-xs font-bold uppercase tracking-widest bg-white text-black rounded-xl hover:bg-white/90 disabled:opacity-25 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 mt-2"
          >
            Initiate Protocol <ArrowRight size={14} />
          </button>
        </div>

      </div>
    </div>
  );
}

  // Question screen
  return (
    <div className="min-h-screen w-full bg-[#030305] text-white relative font-sans overflow-y-auto overflow-x-hidden">
      <AnimatedBg id1="qs-g1" id2="qs-g2" />
      <div className="fixed top-0 left-0 w-full h-[2px] bg-white/5 z-20">
        <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-700 ease-in-out" style={{ width: `${progressPercent}%` }} />
      </div>
      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row items-center justify-center px-4 sm:px-6 py-16 gap-6 max-w-6xl mx-auto w-full">

  {/* Lottie — top on mobile, left on desktop */}
  <div className="w-56 h-56 sm:w-56 sm:h-56 lg:w-90 lg:h-90 flex-shrink-0 opacity-80">
    <DotLottieReact
      src="https://lottie.host/9b4df62b-e7b9-4367-8497-a85633d819ed/wfJsDlB71t.lottie"
      loop
      autoplay
    />
  </div>

  {/* Questions */}
  <div className="w-full max-w-lg">
          <div className="flex items-center justify-between mb-8 max-w-lg mx-auto w-full">
  <div className="flex items-center gap-3">
    {step > 0 && (
      <button
        onClick={() => {
          setStep(step - 1);
          setCurrentValues(answers[step - 1] || []);
          setAnswers(prev => prev.slice(0, step - 1));
        }}
        className="w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
      >
        <ArrowRight size={12} className="rotate-180" />
      </button>
    )}
    <div className="text-[10px] text-blue-400 uppercase tracking-[0.3em] flex items-center gap-2 font-mono">
      <Target size={11} /> Calibration Protocol
    </div>
  </div>
  <div className="text-[10px] text-white/30 uppercase tracking-widest font-mono bg-white/5 px-3 py-1 rounded-full border border-white/10">
    {step + 1} / {questions.length}
  </div>
</div>
          <div className="text-center mb-10 max-w-lg mx-auto w-full">
            <h2 key={step} className="text-3xl sm:text-4xl md:text-5xl font-display font-light leading-snug tracking-tight animate-[fadeInUp_0.5s_ease-out]">
              {questions[step].question}
            </h2>
            <p className="mt-4 text-[10px] text-white/25 uppercase tracking-widest font-mono">Select one or multiple truths</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 max-w-lg mx-auto w-full">
            {questions[step].options.map((opt, idx) => {
              const isSelected = currentValues.includes(opt);
              return (
                <button key={opt + step} onClick={() => handleToggleOption(opt)} style={{ animationDelay: `${idx * 80}ms` }}
                  className={`w-full text-left px-5 py-4 rounded-2xl border transition-all duration-300 animate-[fadeInUp_0.4s_ease-out_both] flex items-center justify-between gap-3 relative overflow-hidden group ${isSelected ? 'border-blue-500/50 bg-blue-500/10 text-white' : 'border-white/8 bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:border-white/20 hover:text-white'}`}>
                  <div className={`absolute left-0 top-0 h-full w-[2px] bg-gradient-to-b from-blue-400 to-purple-500 transition-opacity duration-300 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                  <span className={`font-light text-sm relative z-10 ${isSelected ? 'text-white' : ''}`}>{opt}</span>
                  <div className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-all relative z-10 ${isSelected ? 'bg-blue-500 border-blue-400' : 'border-white/20 group-hover:border-white/40'}`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>
          {currentValues.includes('Other') && (
            <div className="w-full animate-[fadeIn_0.3s_ease-out] mb-6 bg-white/[0.03] px-5 py-4 rounded-2xl border border-white/10 focus-within:border-blue-500/40 transition-all">
              <input type="text" value={customValue} onChange={e => setCustomValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNext()} placeholder="Type your own truth..." autoFocus
                className="w-full bg-transparent text-base font-light outline-none text-white placeholder:text-white/20" />
            </div>
          )}
          <div className="flex justify-end mt-2 max-w-lg mx-auto w-full">
            <button onClick={handleNext} disabled={currentValues.length === 0 || (currentValues.includes('Other') && !customValue.trim())}
              className="group flex items-center gap-3 px-8 py-4 bg-white text-black font-bold text-[11px] uppercase tracking-widest rounded-full disabled:opacity-20 transition-all hover:shadow-[0_0_25px_rgba(255,255,255,0.25)] hover:scale-[1.02] active:scale-[0.98]">
              Commit Truth <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AppDashboard ───────────────────────────────────────────────────────────
function AppDashboard({ userData, setView, geminiAnalysis }: { userData: any; setView: (v: AppState) => void; geminiAnalysis: any }) {
  const [quote, setQuote] = useState('');
  const [isLoadingQuote, setIsLoadingQuote] = useState(true);

  // Use Gemini analysis scores if available, otherwise derive from answers
  const radarData = React.useMemo(() => {
    if (geminiAnalysis) {
      return [
        { subject: 'Discipline', current: geminiAnalysis.disciplineScore || 40, optimal: 90, fullMark: 100 },
        { subject: 'Honesty', current: geminiAnalysis.honestyScore || 30, optimal: 100, fullMark: 100 },
        { subject: 'Vision', current: geminiAnalysis.visionScore || 60, optimal: 100, fullMark: 100 },
        { subject: 'Action', current: geminiAnalysis.actionScore || 20, optimal: 95, fullMark: 100 },
        { subject: 'Willpower', current: geminiAnalysis.willpowerScore || 45, optimal: 90, fullMark: 100 },
      ];
    }
    const excuse = userData?.excuse?.toLowerCase() || '';
    const goal = userData?.goal?.toLowerCase() || '';
    const fear = userData?.fear?.toLowerCase() || '';
    return [
      { subject: 'Discipline', current: excuse.includes('tomorrow') || excuse.includes('tired') ? 20 : 45, optimal: 90, fullMark: 100 },
      { subject: 'Honesty', current: fear.includes('stupid') ? 25 : 55, optimal: 100, fullMark: 100 },
      { subject: 'Vision', current: goal.includes('lasting') || goal.includes('master') ? 75 : 50, optimal: 100, fullMark: 100 },
      { subject: 'Action', current: excuse.includes('plan') ? 15 : 35, optimal: 95, fullMark: 100 },
      { subject: 'Willpower', current: excuse.includes('time') ? 30 : 55, optimal: 90, fullMark: 100 },
    ];
  }, [userData, geminiAnalysis]);

  const barData = React.useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    if (geminiAnalysis?.weeklyActions && geminiAnalysis?.weeklyExcuses) {
      return days.map((day, i) => ({
        day,
        Actions: geminiAnalysis.weeklyActions[i] ?? 20,
        Excuses: geminiAnalysis.weeklyExcuses[i] ?? 50,
      }));
    }
    return days.map(day => ({
      day,
      Actions: Math.floor(Math.random() * 40) + 5,
      Excuses: Math.floor(Math.random() * 60) + 10,
    }));
  }, [geminiAnalysis]);

  const gapPercent = geminiAnalysis?.gapPercent || 28;
  const executionScore = geminiAnalysis?.executionScore || 4;

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const res = await ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: `You are Mirror. Write ONE brutally honest observation (2 sentences max) specific to this person.
Goal: "${userData?.goal}" | Excuse: "${userData?.excuse}" | Fear: "${userData?.fear}" | Energy drain: "${userData?.energy}"
Be specific to their answers. No generic phrases. No emojis. No quotes. No preamble.`,
        });
        setQuote(res.text?.trim() || '');
      } catch {
        setQuote(`Wanting "${userData?.goal}" while consistently choosing "${userData?.excuse}" is not bad luck — it is a decision you make every single day.`);
      } finally { setIsLoadingQuote(false); }
    };
    if (userData) fetchQuote();
  }, [userData]);

  if (!userData) return null;

  return (
    <div className="p-4 md:p-8 lg:p-12 w-full max-w-7xl mx-auto animate-[fadeIn_0.5s_ease-out] relative z-10 pb-32">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <p className="text-[10px] text-blue-400 uppercase tracking-[0.3em] font-mono mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse inline-block" /> Active Profile
          </p>
          <h1 className="text-3xl md:text-4xl font-display font-light tracking-tight mb-4">Psy-Profile Dashboard</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-blue-400 text-[10px] tracking-widest uppercase font-mono bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20">◎ {userData.goal}</span>
            <span className="text-red-400 text-[10px] tracking-widest uppercase font-mono bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20">⚠ High Friction</span>
            <span className="text-purple-400 text-[10px] tracking-widest uppercase font-mono bg-purple-500/10 px-3 py-1.5 rounded-lg border border-purple-500/20">Fear: {userData.fear}</span>
          </div>
        </div>
        <button onClick={() => setView('chat')}
          className="group relative overflow-hidden bg-white text-black px-8 py-3 w-full md:w-auto rounded-full text-[11px] font-bold uppercase tracking-widest transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2">
          Initiate Mentoring <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </header>

      {/* Mirror Quote */}
      <div className="mb-8 relative rounded-3xl border border-purple-500/20 bg-gradient-to-r from-purple-500/5 via-blue-500/5 to-transparent p-6 md:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute top-4 left-6 text-7xl font-display text-white/5 select-none leading-none">"</div>
        {isLoadingQuote ? (
          <div className="flex items-center gap-3 py-4">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            <span className="text-white/30 text-sm font-light">Mirror is reading you...</span>
          </div>
        ) : (
          <p className="text-lg md:text-xl font-light italic text-white/80 leading-relaxed relative z-10 pl-4">{quote}</p>
        )}
        <div className="mt-4 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-purple-400 relative z-10">
          <Activity size={12} /> Avoidance Pattern Detected
        </div>
      </div>

      {/* Stats Row — dynamic from geminiAnalysis */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Execution Rate', value: `${gapPercent}%`, color: 'text-red-400', bg: 'bg-red-500/5 border-red-500/10' },
          { label: 'Execution Score', value: `${executionScore}/10`, color: 'text-orange-400', bg: 'bg-orange-500/5 border-orange-500/10' },
          { label: 'Streak Target', value: `${geminiAnalysis?.streakLikelihood || 7} days`, color: 'text-blue-400', bg: 'bg-blue-500/5 border-blue-500/10' },
          { label: 'Potential', value: `${100 - gapPercent}%`, color: 'text-green-400', bg: 'bg-green-500/5 border-green-500/10' },
        ].map((stat, i) => (
          <div key={i} className={`rounded-2xl border p-4 ${stat.bg}`}>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono mb-2">{stat.label}</p>
            <p className={`text-2xl font-display font-light ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Cognitive Balance */}
        <div className="bg-[#05050A] border border-white/8 rounded-3xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Crosshair size={13} className="text-purple-400" />
            <h3 className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Cognitive Balance</h3>
          </div>
          <p className="text-[9px] text-white/20 font-mono uppercase tracking-wider -mt-2">Reality vs Potential</p>
          {radarData.map((item, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">{item.subject}</span>
                <span className="text-[10px] font-mono text-white/30">{item.current}%</span>
              </div>
              <div className="relative w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="absolute top-0 left-0 h-full rounded-full bg-blue-500/20" style={{ width: `${item.optimal}%` }} />
                <div className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                  style={{ width: `${item.current}%`, transition: 'width 1s ease' }} />
              </div>
              <div className="flex justify-between">
                <span className="text-[8px] text-rose-400/60 font-mono">Reality</span>
                <span className="text-[8px] text-blue-400/60 font-mono">Potential: {item.optimal}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Right 2x2 */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mirror Verdict */}
          <div className="bg-[#05050A] border border-white/8 rounded-3xl p-6 flex flex-col justify-between group hover:border-red-500/25 transition-all duration-500">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                <ShieldAlert size={18} className="text-red-400" />
              </div>
              <h3 className="text-[10px] uppercase tracking-widest text-white/40 mb-1 font-bold">Mirror's Verdict</h3>
              <p className="text-xl font-display font-light text-white mb-3">{geminiAnalysis?.primaryBarrier || 'Self-Deception'}</p>
              <div className="p-3 bg-red-500/5 rounded-xl border border-red-500/10">
                <p className="text-[11px] text-white/60 leading-relaxed font-mono">"{userData.goal}" + "{userData.excuse}" = persistent stagnation disguised as planning.</p>
              </div>
            </div>
            <p className="text-[9px] mt-4 text-red-400/50 uppercase tracking-widest font-mono">Status: Highly Inefficient</p>
          </div>

          {/* Next Protocol */}
          <div className="bg-[#05050A] border border-white/8 rounded-3xl p-6 flex flex-col justify-between group hover:border-blue-500/25 transition-all duration-500">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                <Target size={18} className="text-blue-400" />
              </div>
              <h3 className="text-[10px] uppercase tracking-widest text-white/40 mb-1 font-bold">Next Protocol</h3>
              <p className="text-xl font-display font-light text-white mb-3">Execution Mode</p>
              <div className="space-y-2.5">
                {[
                  { text: `Stop: ${userData.excuse}`, color: 'bg-red-500' },
                  { text: `Face: ${userData.fear}`, color: 'bg-blue-500' },
                  { text: 'Lock roadmap in chat session', color: 'bg-purple-500' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.color}`} />
                    <p className="text-[11px] text-white/70 leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 w-full bg-white/5 rounded-full h-[2px] overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-full w-[10%]" />
            </div>
          </div>

          {/* Gap Analysis — dynamic */}
          <div className="bg-[#05050A] border border-white/8 rounded-3xl p-6 flex flex-col group hover:border-orange-500/25 transition-all duration-500">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={13} className="text-orange-400" />
              <h3 className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Gap Analysis</h3>
            </div>
            <div className="flex items-center justify-center my-2">
              <div className="relative w-28 h-28">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#ffffff08" strokeWidth="8" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="url(#gapGrad)" strokeWidth="8"
                    strokeLinecap="round" strokeDasharray={`${gapPercent * 2.51} ${100 * 2.51}`} />
                  <defs>
                    <linearGradient id="gapGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f97316" />
                      <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-display font-light text-orange-400">{gapPercent}%</span>
                  <span className="text-[8px] text-white/30 font-mono uppercase">done</span>
                </div>
              </div>
            </div>
            <p className="text-center text-[10px] text-white/40 font-mono mt-2">toward claimed goal</p>
            <div className="mt-4 space-y-2">
              {[
                { label: 'Current', value: `${gapPercent}%`, color: 'text-orange-400' },
                { label: 'Target', value: '100%', color: 'text-blue-400' },
                { label: 'Gap', value: `${100 - gapPercent}%`, color: 'text-red-400' },
              ].map((r, i) => (
                <div key={i} className="flex justify-between text-[9px] font-mono">
                  <span className="text-white/30">{r.label}</span>
                  <span className={r.color}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths */}
          <div className="bg-[#05050A] border border-white/8 rounded-3xl p-6 flex flex-col group hover:border-green-500/25 transition-all duration-500">
            <div className="flex items-center gap-2 mb-4">
              <Brain size={13} className="text-green-400" />
              <h3 className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Strengths Identified</h3>
            </div>
            <div className="space-y-3 mt-1">
              {['Self-awareness', 'Ambition intact', 'Seeking accountability'].map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="text-xs text-white/70 font-light">{s}</span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>
              ))}
            </div>
            <div className="mt-auto pt-4 grid grid-cols-3 gap-2">
              {[
                geminiAnalysis?.visionScore || 75,
                geminiAnalysis?.honestyScore || 88,
                geminiAnalysis?.willpowerScore || 62,
              ].map((val, i) => (
                <div key={i} className="text-center">
                  <div className="text-lg font-display font-light text-green-400">{val}</div>
                  <div className="text-[8px] text-white/30 uppercase font-mono">score</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Execution Metrics */}
      <div className="w-full bg-[#05050A] border border-white/8 rounded-3xl p-6 md:p-8 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp size={13} className="text-blue-400" />
            <h3 className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Weekly Execution Metrics</h3>
          </div>
          <span className="text-[9px] text-white/30 font-mono uppercase tracking-widest bg-white/5 px-2 py-1 rounded border border-white/10">Actions vs Excuses</span>
        </div>
        <div className="flex flex-col gap-3">
          {barData.map((d, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-white/30 w-8 shrink-0">{d.day}</span>
              <div className="flex-1 flex flex-col gap-1">
                <div className="relative h-3 bg-white/5 rounded-full overflow-hidden">
                  <div className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400"
                    style={{ width: `${d.Actions}%`, transition: `width 1s ease ${i * 0.1}s` }} />
                </div>
                <div className="relative h-3 bg-white/5 rounded-full overflow-hidden">
                  <div className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-rose-600 to-rose-400"
                    style={{ width: `${d.Excuses}%`, transition: `width 1s ease ${i * 0.1}s` }} />
                </div>
              </div>
              <div className="flex flex-col items-end w-16 shrink-0">
                <span className="text-[8px] text-blue-400 font-mono">{d.Actions}% act</span>
                <span className="text-[8px] text-rose-400 font-mono">{d.Excuses}% exc</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-6">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-400" /><span className="text-[9px] text-white/40 font-mono uppercase">Actions</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-400" /><span className="text-[9px] text-white/40 font-mono uppercase">Excuses</span></div>
        </div>
      </div>
    </div>
  );
}

// ── AppChat ────────────────────────────────────────────────────────────────
function AppChat({ userData, setView, onRoadmapGenerated, onChatSaved, activeChat, geminiAnalysis }: {
  userData: any; setView: (v: AppState) => void;
  onRoadmapGenerated: (tasks: string[]) => void;
  onChatSaved: () => void;
  activeChat: any;
  geminiAnalysis: any;
}) {
  const sessionId = useRef(Date.now().toString());
  const memory = getMemory();
  const isReturning = (memory?.sessions || 0) > 1;

  const getInitialMessages = () => {
    if (activeChat?.messages) return activeChat.messages;
    return [{
      role: 'mirror' as const,
      content: isReturning
        ? `Welcome back, ${userData?.name}. Last time we spoke about **${userData?.goal}**. Have you done anything about it since then?`
        : `I am here to mirror your reality, ${userData?.name}.\n\nYour goal: **${userData?.goal}**.\nYour pattern: **${userData?.excuse}**.\n\nLet's cut the noise. What is actually holding you back right now?`,
    }];
  };

  const [messages, setMessages] = useState<{ role: 'user' | 'mirror'; content: string | { parts: any[] } }[]>(getInitialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const isCallingRef = useRef(false);
  const [chatCount, setChatCount] = useState(0);
  const [attachments, setAttachments] = useState<{ data: string; mimeType: string; name: string }[]>([]);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
  const [roadmapGenerated, setRoadmapGenerated] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

  // Save chat history whenever messages change
  useEffect(() => {
    if (messages.length > 1) {
      const firstUserMsg = messages.find(m => m.role === 'user');
      const title = typeof firstUserMsg?.content === 'string'
        ? firstUserMsg.content.slice(0, 40) + '...'
        : 'Chat session';
      saveChatSession({ id: sessionId.current, title, messages, timestamp: new Date().toISOString() });
      onChatSaved();
    }
  }, [messages]);

  useEffect(() => {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return;
  
  const recognition = new SR();
  recognition.continuous = false; // changed to false — more stable
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  
  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    setInput(prev => prev + (prev ? ' ' : '') + transcript);
    setIsRecording(false);
  };
  
  recognition.onerror = (e: any) => {
    console.error('Speech error:', e.error);
    setIsRecording(false);
  };
  
  recognition.onend = () => {
    setIsRecording(false);
  };
  
  recognitionRef.current = recognition;
  
  return () => {
    recognitionRef.current?.abort();
  };
}, []);

  const handleSend = async () => {
  if ((!input.trim() && attachments.length === 0) || isLoading) return;
  const userMsg = input.trim();
  const currentAttachments = [...attachments];
  let contentsForModel: any = userMsg;
  if (currentAttachments.length > 0) {
    const parts: any[] = [];
    if (userMsg) parts.push({ text: userMsg });
    currentAttachments.forEach(att => { parts.push({ inlineData: { data: att.data.split(',')[1], mimeType: att.mimeType } }); });
    contentsForModel = { parts };
    setMessages(prev => [...prev, { role: 'user', content: contentsForModel }]);
  } else {
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
  }
  setInput(''); setAttachments([]); setIsLoading(true); setChatCount(prev => prev + 1);

  try {
    const memCtx = memory ? `Memory: ${memory.sessions} sessions. Last seen: ${memory.lastSeen}.` : '';
    const systemInstruction = `You are MIRROR, a brutally honest AI mentor who genuinely cares.
${memCtx}
User: ${userData?.name} | Goal: ${userData?.goal} | Excuse: ${userData?.excuse} | Fear: ${userData?.fear}
Barrier identified: ${geminiAnalysis?.primaryBarrier || 'Avoidance'}
Address them as ${userData?.name}. Be direct, perspective-shifting, personal. No emojis. Max 3 paragraphs.`;

    
        const res = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: contentsForModel,
      config: { systemInstruction }
    });

    
    const reply = res.text || 'Mirror requires recalibration.';
    setMessages(prev => [...prev, { role: 'mirror', content: reply }]);

    if (isCallingRef.current) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(reply);
      u.rate = 0.92; u.pitch = 0.85; u.volume = 1;
      window.speechSynthesis.speak(u);
    }
  } catch (error) {
    console.error('Gemini error:', error);
    setMessages(prev => [...prev, { role: 'mirror', content: 'Mirror requires recalibration. Signal lost.' }]);
  } finally { setIsLoading(false); }
};

  const generateRoadmap = async () => {
    setIsGeneratingRoadmap(true);
    try {
      const res = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: `Profile: Name: ${userData?.name} | Goal: ${userData?.goal} | Obstacle: ${userData?.discrepancy} | Excuse: ${userData?.excuse} | Fear: ${userData?.fear}
Generate exactly 5 specific actionable daily tasks as a JSON array of strings. Return ONLY the JSON array.
Example: ["Task 1","Task 2","Task 3","Task 4","Task 5"]`,
      });
      const cleaned = (res.text || '[]').replace(/```json|```/g, '').trim();
      const tasks = JSON.parse(cleaned);
      onRoadmapGenerated(tasks);
      setRoadmapGenerated(true);
      setMessages(prev => [...prev, { role: 'mirror', content: `Roadmap locked, ${userData?.name}. 5 tasks generated for your Progress Dashboard. Your excuses end here. Go execute.` }]);
    } catch {
      onRoadmapGenerated([
        `Spend 90 mins working on ${userData?.goal} — no distractions`,
        `Write 3 specific blockers and one action to fix each`,
        `Eliminate ${userData?.energy} for 24 hours`,
        `Do the thing you fear most first today`,
        `Track every hour — where did your time actually go?`,
      ]);
      setRoadmapGenerated(true);
    } finally { setIsGeneratingRoadmap(false); }
  };

  const handleVoiceToggle = () => {
  if (!recognitionRef.current) {
    alert('Speech recognition not supported in this browser. Try Chrome.');
    return;
  }
  if (isRecording) {
    recognitionRef.current.abort();
    setIsRecording(false);
  } else {
    try {
      recognitionRef.current.start();
      setIsRecording(true);
    } catch(e) {
      setIsRecording(false);
    }
  }
};

  const toggleCallMode = () => {
  if (isCalling) {
    window.speechSynthesis.cancel();
    setIsCalling(false);
    isCallingRef.current = false;
  } else {
    setIsCalling(true);
    isCallingRef.current = true;
    const u = new SpeechSynthesisUtterance('Call mode initiated. Mirror is listening.');
    u.rate = 0.95;
    u.pitch = 0.85;
    u.volume = 1;
    window.speechSynthesis.speak(u);
  }
};

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto relative z-10 w-full">
      <div className="absolute top-0 w-full p-4 flex justify-between items-center bg-gradient-to-b from-[#030305] to-transparent z-20">
        <div className="text-[10px] text-white/40 uppercase tracking-widest font-mono flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /> Live Analysis Mode
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {chatCount >= 1 && !roadmapGenerated && (
            <button onClick={generateRoadmap} disabled={isGeneratingRoadmap}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-widest rounded flex items-center gap-2 transition-colors shadow-[0_0_15px_rgba(168,85,247,0.4)]">
              {isGeneratingRoadmap ? <><span>Generating...</span><div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /></> : <><Map size={12} /> Generate Roadmap</>}
            </button>
          )}
          {roadmapGenerated && (
            <button onClick={() => setView('progress')} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-[10px] font-bold uppercase tracking-widest rounded flex items-center gap-2 transition-colors">
              <Lock size={12} /> View Progress Dash
            </button>
          )}
          {chatCount >= 1 && (
            <button onClick={() => { setMessages([{ role: 'mirror', content: `Restarting. Speak truthfully, ${userData?.name}.` }]); setChatCount(0); setRoadmapGenerated(false); }}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 text-[10px] font-bold uppercase tracking-widest rounded flex items-center gap-2 transition-colors border border-white/10">
              New Chat <Plus size={14} />
            </button>
          )}
          </div>
          </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-12 md:pt-20 space-y-10 custom-scrollbar pb-52 w-full">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full animate-[fadeInUp_0.3s_ease-out]`}>
            <div className={`max-w-[95%] md:max-w-[85%] flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs overflow-hidden ${msg.role === 'user' ? 'bg-gradient-to-br from-blue-600/30 to-purple-600/30 border border-white/20' : 'bg-[#05050A] border border-white/10'}`}>
  {msg.role === 'user' 
    ? <lord-icon
        src="https://cdn.lordicon.com/zogbvydd.json"
        trigger="in"
        delay="100"
        state="in-reveal"
        colors="primary:#17171c,secondary:#c69cf4,tertiary:#1b1091,quaternary:#ffffff"
        style={{ width: '36px', height: '36px' }}
      />
    : <MirrorLogo />
  }
</div>
              <div className={`pt-1 w-full ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                {msg.role === 'user' ? (
                  <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-3xl rounded-tr-sm text-white/90 font-light border border-white/10 inline-block text-left text-sm md:text-base">
                    {typeof msg.content === 'object'
                      ? (msg.content as any).parts?.filter((p: any) => !!p.text).map((p: any) => p.text).join('\n') || '[Sent files]'
                      : msg.content}
                  </div>
                ) : (
                  <div className="markdown-body text-white/80 font-light text-base md:text-lg leading-relaxed p-2">
                    <Markdown>{typeof msg.content === 'string' ? msg.content : ''}</Markdown>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-[fadeIn_0.3s_ease-out]">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-[#05050A] border border-white/10 flex items-center justify-center"><MirrorLogo /></div>
              <div className="pt-2 flex gap-1 items-center px-4">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="absolute bottom-0 left-0 w-full p-3 pb-4 bg-gradient-to-t from-[#030305] via-[#030305]/95 to-transparent backdrop-blur-sm z-30">
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
          {attachments.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-2">
              {attachments.map((att, idx) => (
                <div key={idx} className="bg-[#111118] border border-white/20 rounded-lg p-2 text-xs text-white/80 flex items-center gap-2 max-w-[200px] relative group">
                  {att.mimeType.startsWith('image/') && <img src={att.data} alt={att.name} className="w-8 h-8 object-cover rounded" />}
                  <span className="truncate flex-1">{att.name}</span>
                  <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Plus size={10} className="rotate-45" /></button>
                </div>
              ))}
            </div>
          )}
          <div className="relative flex items-center gap-2 w-full">
  {/* Image input */}
  <input type="file" ref={fileInputRef} hidden multiple accept="image/*" onChange={(e) => {
    if (!e.target.files) return;
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => { if (ev.target?.result) setAttachments(prev => [...prev, { data: ev.target!.result as string, mimeType: file.type, name: file.name }]); };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }} />

  {/* Doc input */}
  <input type="file" ref={docInputRef} hidden multiple accept=".pdf,.doc,.docx,.txt,.csv" onChange={(e) => {
    if (!e.target.files) return;
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => { if (ev.target?.result) setAttachments(prev => [...prev, { data: ev.target!.result as string, mimeType: file.type, name: file.name }]); };
      reader.readAsDataURL(file);
    });
    if (docInputRef.current) docInputRef.current.value = '';
  }} />

  {/* Image button */}
  <button type="button" onClick={() => fileInputRef.current?.click()}
    className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-[#111118] border border-white/10 text-white/50 hover:text-blue-400 hover:bg-white/10 transition-all"
    title="Attach Image">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  </button>

  {/* Doc button */}
  <button type="button" onClick={() => docInputRef.current?.click()}
    className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-[#111118] border border-white/10 text-white/50 hover:text-purple-400 hover:bg-white/10 transition-all"
    title="Attach Document">
    <Paperclip size={18} />
  </button>

  {/* Text input */}
  <div className="relative flex-1">
    <textarea value={input} onChange={e => setInput(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
      placeholder={isRecording ? '🎤 Listening...' : 'Message Mirror...'}
      className={`w-full bg-[#111118] border rounded-2xl pl-4 pr-12 py-3 text-white outline-none focus:bg-[#151520] transition-all resize-none overflow-hidden h-12 min-h-[48px] leading-[24px] text-sm placeholder:text-[13px] placeholder:truncate ${isRecording ? 'border-red-500/50 placeholder:text-red-400/70' : 'border-white/10 focus:border-blue-500/50'}`}
      rows={1} />
    <button onClick={handleSend} disabled={(!input.trim() && attachments.length === 0) || isLoading}
      className="absolute right-2 top-1.5 w-9 h-9 flex items-center justify-center bg-white hover:bg-blue-100 text-black rounded-full disabled:opacity-30 transition-all">
      <Send size={15} className="-ml-0.5" />
    </button>
  </div>

  {/* Mic button — transcribes speech to text */}
  <button type="button" onClick={handleVoiceToggle}
    className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl border transition-all ${
      isRecording
        ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.3)]'
        : 'bg-[#111118] text-white/50 border-white/10 hover:text-blue-400 hover:bg-white/10'
    }`}
    title={isRecording ? 'Stop recording' : 'Speak to Mirror'}>
    <Mic size={18} />
  </button>
</div>
</div>
</div>
</div>
  );
}

// ── AppProgress ────────────────────────────────────────────────────────────
function AppProgress({ userData, roadmap, geminiAnalysis }: { userData: any; roadmap: string[]; geminiAnalysis: any }) {
  const defaultTasks = [
    { id: 1, title: 'Deep Work Block (90 mins without distraction)', completed: false, xp: 150 },
    { id: 2, title: 'Write down 3 things you are avoiding today', completed: false, xp: 50 },
    { id: 3, title: 'Face the fear task (Just 5 minutes of setup)', completed: false, xp: 200 },
  ];

  const roadmapTasks = roadmap.length > 0
    ? roadmap.map((title, i) => ({ id: i + 100, title, completed: false, xp: 150 }))
    : defaultTasks;

  const [tasks, setTasks] = useState(roadmapTasks);
  const [dopamineHit, setDopamineHit] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);
  const [customTask, setCustomTask] = useState('');
  const [showTaskInput, setShowTaskInput] = useState(false);

  // Update tasks if roadmap changes after initial render
  useEffect(() => {
    if (roadmap.length > 0) {
      setTasks(roadmap.map((title, i) => ({ id: i + 100, title, completed: false, xp: 150 })));
    }
  }, [roadmap]);

  const currentXP = 1200 + earnedXP;
  const xpForNextLevel = 1500;
  const level = Math.floor(currentXP / 400);
  const levelProgress = (currentXP / xpForNextLevel) * 100;
  const completedCount = tasks.filter(t => t.completed).length;
  const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const toggleTask = (id: number) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      if (!t.completed) { setEarnedXP(p => p + t.xp); setDopamineHit(true); setTimeout(() => setDopamineHit(false), 2000); }
      else setEarnedXP(p => p - t.xp);
      return { ...t, completed: !t.completed };
    }));
  };

  const handleAddCustomTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTask.trim()) return;
    setTasks(prev => [...prev, { id: Date.now(), title: customTask, completed: false, xp: 100 }]);
    setCustomTask(''); setShowTaskInput(false);
  };

  const streakTarget = geminiAnalysis?.streakLikelihood || 21;
  const streakDays = Array.from({ length: 30 }).map((_, i) => ({
    day: i + 1,
    active: Math.random() > 0.3,
    today: i === 20,
  }));

  const weeklyProgressData = [
    { day: 'Mon', completion: 40 },
    { day: 'Tue', completion: 55 },
    { day: 'Wed', completion: 30 },
    { day: 'Thu', completion: 70 },
    { day: 'Fri', completion: 85 },
    { day: 'Sat', completion: completionRate },
    { day: 'Sun', completion: 0 },
  ];

  // Dynamic trajectory from geminiAnalysis
  const trajectoryData = React.useMemo(() => {
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const without = geminiAnalysis?.trajectoryWithout || [70, 75, 80, 85, 60, 50, 40];
    const withM = geminiAnalysis?.trajectoryWith || [20, 35, 50, 65, 80, 85, 90];
    return days.map((day, i) => ({ day, doingNothing: without[i], withMirror: withM[i] }));
  }, [geminiAnalysis]);

  return (
    <div className="p-6 md:p-12 w-full max-w-7xl mx-auto animate-[fadeIn_0.5s_ease-out] relative z-10 pb-32">
      <div className={`fixed inset-0 pointer-events-none bg-blue-500 mix-blend-overlay transition-opacity duration-1000 z-50 ${dopamineHit ? 'opacity-10' : 'opacity-0'}`} />

      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-display font-light tracking-tight mb-2 flex items-center gap-4 flex-wrap mt-4">
            Progress Dashboard
            <span className="flex items-center gap-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-xs px-2 py-1 rounded-sm uppercase tracking-widest font-bold">
              <Trophy size={14} /> Level {level}
            </span>
          </h1>
          <p className="text-blue-400 text-sm tracking-widest uppercase font-mono mt-2">Execute your roadmap. Earn your identity.</p>
          {roadmap.length > 0 && (
            <div className="mt-2 flex items-center gap-2 text-xs text-green-400 font-mono">
              <Lock size={12} /> Roadmap locked from chat session — {roadmap.length} tasks
            </div>
          )}
        </div>
        <div className="bg-[#05050A] border border-white/5 p-4 rounded-2xl w-full md:w-64 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <span className="text-white/50 flex items-center gap-1"><Star size={10} /> XP: {currentXP}</span>
            <span className="text-blue-400">/{xpForNextLevel}</span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-1000" style={{ width: `${levelProgress}%` }} />
          </div>
        </div>
      </header>

      {dopamineHit && (
        <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] animate-[floatUpFade_2s_ease-out_forwards] pointer-events-none flex flex-col items-center">
          <div className="text-4xl md:text-6xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-blue-400 drop-shadow-[0_0_30px_rgba(59,130,246,0.8)]">+EXP GAINED</div>
          <div className="text-blue-300 font-mono mt-2 animate-bounce">Execution Achieved.</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 w-full">
        {/* Tasks */}
        <div className="flex flex-col h-full w-full">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 w-full">
            <div className="flex items-center gap-3">
              <Target className="text-blue-400" size={20} />
              <h2 className="text-sm font-bold uppercase tracking-widest text-white">Daily Crucible Tasks</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-green-400 font-mono">{completedCount}/{tasks.length} done</span>
              <span className="text-[10px] text-white/40 uppercase font-mono tracking-widest bg-white/5 px-2 py-1 rounded border border-white/10">
                {roadmap.length > 0 ? 'AI Roadmap' : 'Demo Tasks'}
              </span>
            </div>
          </div>
          <div className="space-y-3 flex-1 w-full">
            {tasks.map(task => (
              <div key={task.id} onClick={() => toggleTask(task.id)}
                className={`flex items-center gap-4 p-5 rounded-2xl border cursor-pointer transition-all duration-300 group ${task.completed ? 'bg-blue-500/5 border-blue-500/20 text-white/40' : 'bg-[#05050A]/80 backdrop-blur-md border-white/10 hover:border-blue-500/50 hover:bg-white/5'}`}>
                {task.completed ? <CheckCircle2 className="text-blue-500 flex-shrink-0" /> : <Circle className="text-white/20 flex-shrink-0 group-hover:text-blue-400 transition-colors" />}
                <span className={`font-light flex-1 overflow-hidden text-ellipsis text-sm ${task.completed ? 'line-through decoration-white/20' : ''}`}>{task.title}</span>
                <span className={`flex-shrink-0 text-[10px] font-mono tracking-widest px-2 py-1 rounded ${task.completed ? 'bg-white/5 text-white/30' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:bg-blue-500 group-hover:text-white transition-colors'}`}>+{task.xp} XP</span>
              </div>
            ))}
            {showTaskInput ? (
              <form onSubmit={handleAddCustomTask} className="p-1 mt-2 animate-[fadeIn_0.2s_ease-out] w-full">
                <input type="text" autoFocus value={customTask} onChange={e => setCustomTask(e.target.value)}
                  onBlur={() => !customTask && setShowTaskInput(false)} placeholder="Define your own trial..."
                  className="w-full bg-[#05050A] border border-blue-500/50 rounded-2xl p-5 text-sm outline-none text-white" />
              </form>
            ) : (
              <button onClick={() => setShowTaskInput(true)}
                className="mt-4 w-full p-4 rounded-2xl border border-white/5 border-dashed text-xs uppercase tracking-widest text-white/30 hover:text-white/80 hover:border-white/20 transition-all flex items-center justify-center gap-2 hover:bg-white/5">
                <Plus size={14} /> Add Custom Trial
              </button>
            )}
          </div>
        </div>

        {/* Streaks + Weekly */}
        <div className="space-y-6 flex flex-col h-full w-full">
          <div className="bg-[#05050A]/80 backdrop-blur-md border border-white/10 p-8 rounded-3xl relative group hover:border-orange-500/30 transition-colors">
            <div className="flex items-center gap-3 mb-6">
              <Flame className="text-orange-400" size={20} />
              <h2 className="text-sm font-bold uppercase tracking-widest text-white">Commitment Streaks</h2>
            </div>
            <div className="flex items-end gap-4 mb-6 relative z-10">
              <div className="text-5xl font-display font-light text-white">{streakTarget}</div>
              <div className="text-xs uppercase tracking-widest text-white/50 pb-1">Day Target</div>
            </div>
            <div className="grid grid-cols-10 gap-1.5 relative z-10">
              {streakDays.map((d, i) => (
                <div key={i}
                  className={`aspect-square w-full rounded-sm transition-all duration-300 ${d.today ? 'border border-blue-500 bg-blue-500/20 animate-pulse' : d.active ? 'bg-gradient-to-br from-blue-500 to-purple-500 opacity-80' : 'bg-white/5'}`}
                  title={`Day ${d.day}`} />
              ))}
            </div>
            <p className="text-[10px] text-white/40 mt-6 uppercase tracking-widest font-mono">A streak is fragile. One day of excuses resets your identity.</p>
          </div>

          {/* Weekly Completion */}
          <div className="bg-[#05050A]/80 backdrop-blur-md border border-white/10 p-6 rounded-3xl hover:border-green-500/30 transition-colors">
            <h3 className="text-[10px] uppercase tracking-widest text-white/50 mb-5 font-bold flex items-center gap-2">
              <Activity size={14} className="text-green-400" /> Weekly Completion Rate
            </h3>
            <div className="flex items-end gap-2 h-24 w-full">
              {weeklyProgressData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                    <div className="w-full rounded-t-sm relative overflow-hidden"
                      style={{
                        height: `${Math.max(d.completion, 4)}%`,
                        background: d.completion > 60 ? 'linear-gradient(to top,#16a34a,#22c55e)' : d.completion > 30 ? 'linear-gradient(to top,#ca8a04,#eab308)' : 'linear-gradient(to top,#dc2626,#ef4444)',
                        transition: `height 1s ease ${i * 0.1}s`, minHeight: '4px',
                      }}>
                      <div className="absolute inset-0 bg-white/10" />
                    </div>
                  </div>
                  <span className="text-[8px] font-mono text-white/30">{d.day.slice(0, 3)}</span>
                  <span className="text-[8px] font-mono text-white/20">{d.completion}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Trajectory — dynamic from geminiAnalysis */}
      <div className="w-full bg-[#05050A]/80 backdrop-blur-md border border-white/10 rounded-3xl p-6 lg:p-8 hover:border-purple-500/30 transition-colors relative mt-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Activity className="text-purple-400" size={20} />
            <h2 className="text-sm font-bold uppercase tracking-widest text-white">Trajectory Simulation</h2>
          </div>
          <span className="text-[10px] bg-white/5 border border-white/10 px-3 py-1 rounded text-white/50 uppercase font-mono tracking-widest">What if you do vs don't</span>
        </div>
        <div className="w-full overflow-hidden">
          <svg viewBox="0 0 700 200" className="w-full" preserveAspectRatio="none" style={{ height: '200px' }}>
            <defs>
              <linearGradient id="trajMirror" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="trajNothing" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3, 4].map(i => (
              <line key={i} x1="0" y1={i * 50} x2="700" y2={i * 50} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            ))}
            {/* With Mirror path — uses gemini trajectory */}
            {(() => {
              const pts = trajectoryData.map((d, i) => `${i * 116},${200 - d.withMirror * 2}`).join(' ');
              const first = `0,${200 - trajectoryData[0].withMirror * 2}`;
              const last = `${6 * 116},${200 - trajectoryData[6].withMirror * 2}`;
              return (
                <>
                  <polyline points={pts} fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <polygon points={`${pts} 700,200 0,200`} fill="url(#trajMirror)" />
                </>
              );
            })()}
            {/* Without Mirror */}
            {(() => {
              const pts = trajectoryData.map((d, i) => `${i * 116},${200 - d.doingNothing * 2}`).join(' ');
              return (
                <>
                  <polyline points={pts} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 3" />
                  <polygon points={`${pts} 700,200 0,200`} fill="url(#trajNothing)" />
                </>
              );
            })()}
            <text x="10" y="20" fill="#8b5cf6" fontSize="10" fontFamily="monospace" opacity="0.7">With Mirror</text>
            <text x="10" y="195" fill="#ef4444" fontSize="10" fontFamily="monospace" opacity="0.7">Without Mirror</text>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <text key={i} x={i * 100 + 10} y="198" fill="rgba(255,255,255,0.2)" fontSize="9" fontFamily="monospace">{d}</text>
            ))}
          </svg>
        </div>
        <div className="flex gap-6 mt-4">
          <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-purple-400" /><span className="text-[9px] text-white/40 font-mono uppercase">With Mirror</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-red-400" /><span className="text-[9px] text-white/40 font-mono uppercase">Without Mirror</span></div>
        </div>
      </div>
    </div>
  );
}