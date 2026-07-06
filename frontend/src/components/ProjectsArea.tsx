import { useState } from 'react';
import { FolderOpen, Plus, Trash2, CheckCircle, Circle, ChevronDown, ChevronRight, Zap, Clock } from 'lucide-react';

interface Milestone { id: string; title: string; done: boolean; }
interface Project {
  id: string; title: string; description: string; color: string;
  milestones: Milestone[]; createdAt: string; tag: string;
}

const INITIAL_PROJECTS: Project[] = [
  {
    id: '1', title: 'MARK 45 OS', tag: 'Active',
    description: 'AI-powered developer workspace with voice, memory, and agentic features.',
    color: '#00CFFF', createdAt: 'May 2025',
    milestones: [
      { id: 'm1', title: 'Build sidebar & navigation', done: true },
      { id: 'm2', title: 'Implement chat + voice AI', done: true },
      { id: 'm3', title: 'Add 3D scroll hero', done: true },
      { id: 'm4', title: 'Connect Gemini API backend', done: false },
      { id: 'm5', title: 'Deploy to production', done: false },
    ],
  },
  {
    id: '2', title: 'CivicConnect', tag: 'Paused',
    description: 'Citizen engagement platform with real-time issue tracking and AI analysis.',
    color: '#FFB347', createdAt: 'Apr 2025',
    milestones: [
      { id: 'm1', title: 'User auth & roles', done: true },
      { id: 'm2', title: 'Feed + upvote system', done: true },
      { id: 'm3', title: 'PDF policy analysis', done: false },
    ],
  },
];

export function ProjectsArea() {
  const [projects, setProjects]   = useState<Project[]>(INITIAL_PROJECTS);
  const [expanded, setExpanded]   = useState<string | null>('1');
  const [newTitle,  setNewTitle]  = useState('');
  const [showNew,   setShowNew]   = useState(false);

  const addProject = () => {
    if (!newTitle.trim()) return;
    const p: Project = {
      id: Date.now().toString(), title: newTitle.toUpperCase(), tag: 'New',
      description: 'New project workspace.', color: '#00CFFF', createdAt: 'May 2025', milestones: [],
    };
    setProjects(prev => [p, ...prev]);
    setNewTitle(''); setShowNew(false); setExpanded(p.id);
  };

  const toggleMilestone = (pid: string, mid: string) => {
    setProjects(prev => prev.map(p => p.id !== pid ? p : {
      ...p, milestones: p.milestones.map(m => m.id !== mid ? m : { ...m, done: !m.done }),
    }));
  };

  const deleteProject = (id: string) => setProjects(prev => prev.filter(p => p.id !== id));

  const addMilestone = (pid: string) => {
    const title = prompt('Milestone title:');
    if (!title?.trim()) return;
    setProjects(prev => prev.map(p => p.id !== pid ? p : {
      ...p, milestones: [...p.milestones, { id: Date.now().toString(), title, done: false }],
    }));
  };

  return (
    <div className="flex flex-col h-full relative z-10 w-full max-w-3xl mx-auto px-3 py-5 sm:px-4 sm:py-8 overflow-y-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-brand-gold" />
            <span className="font-mono text-xs text-brand-gold uppercase tracking-[0.25em]">Project Roadmap</span>
          </div>
          <h1 className="font-display font-black text-3xl text-white" style={{ background: 'linear-gradient(90deg,#FFB347,#00CFFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            PROJECTS
          </h1>
        </div>
        <button onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all"
          style={{ background: 'linear-gradient(135deg,#00CFFF,#0070F3)', color: '#000', boxShadow: '0 0 20px rgba(0,207,255,0.25)' }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 32px rgba(0,207,255,0.5)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 20px rgba(0,207,255,0.25)')}
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {/* New project form */}
      {showNew && (
        <div className="mb-5 p-4 rounded-2xl animate-fade-in"
          style={{ background: 'rgba(8,10,18,0.85)', border: '1px solid rgba(0,207,255,0.2)', backdropFilter: 'blur(20px)' }}>
          <div className="flex gap-2">
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addProject()}
              placeholder="Project name..."
              className="flex-1 py-2.5 px-4 rounded-xl text-sm bg-transparent text-gray-200 placeholder-gray-600 focus:outline-none"
              style={{ border: '1px solid rgba(0,207,255,0.2)' }}
              autoFocus
            />
            <button onClick={addProject} className="px-5 py-2.5 rounded-xl text-sm font-bold text-black"
              style={{ background: 'linear-gradient(135deg,#00CFFF,#0070F3)' }}>
              Create
            </button>
            <button onClick={() => setShowNew(false)} className="p-2.5 rounded-xl text-gray-600 hover:text-gray-300 transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6 animate-slide-up">
        {[
          { label: 'Active', val: projects.filter(p => p.tag === 'Active').length, color: '#00CFFF' },
          { label: 'Total',  val: projects.length, color: '#FFB347' },
          { label: 'Done', val: projects.reduce((a, p) => a + p.milestones.filter(m => m.done).length, 0), color: '#10b981' },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-2xl text-center glow-border"
            style={{ background: 'rgba(8,10,18,0.7)', backdropFilter: 'blur(12px)' }}>
            <div className="text-2xl font-black font-display" style={{ color: s.color }}>{s.val}</div>
            <div className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.15em] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Projects list */}
      <div className="space-y-4">
        {projects.map((proj, i) => {
          const done  = proj.milestones.filter(m => m.done).length;
          const total = proj.milestones.length;
          const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
          const isExp = expanded === proj.id;

          return (
            <div key={proj.id} className="rounded-2xl overflow-hidden animate-slide-up group"
              style={{ animationDelay: `${i * 0.07}s`, background: 'rgba(8,10,18,0.80)', backdropFilter: 'blur(16px)', border: `1px solid ${isExp ? proj.color + '25' : 'rgba(255,255,255,0.05)'}`, transition: 'border-color 0.3s ease' }}>

              {/* Project header */}
              <div className="flex items-center justify-between p-4 cursor-pointer select-none"
                onClick={() => setExpanded(isExp ? null : proj.id)}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: `${proj.color}12`, border: `1px solid ${proj.color}22` }}>
                    <FolderOpen className="w-4 h-4" style={{ color: proj.color }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-200">{proj.title}</span>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider"
                        style={{ background: `${proj.color}12`, color: proj.color, border: `1px solid ${proj.color}20` }}>
                        {proj.tag}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-gray-600">
                      <Clock className="w-3 h-3" /> {proj.createdAt} · {done}/{total} milestones
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={e => { e.stopPropagation(); deleteProject(proj.id); }}
                    className="p-1.5 text-gray-700 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {isExp ? <ChevronDown className="w-4 h-4 text-gray-600" /> : <ChevronRight className="w-4 h-4 text-gray-600" />}
                </div>
              </div>

              {/* Progress bar */}
              <div className="px-4 pb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono text-gray-600">Progress</span>
                  <span className="text-[10px] font-mono" style={{ color: proj.color }}>{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: `linear-gradient(90deg,${proj.color},${proj.color}99)`, boxShadow: `0 0 8px ${proj.color}60` }} />
                </div>
              </div>

              {/* Expanded milestones */}
              {isExp && (
                <div className="px-4 pb-4 animate-fade-in" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <p className="text-xs text-gray-500 mt-3 mb-4 leading-relaxed">{proj.description}</p>
                  <div className="space-y-2">
                    {proj.milestones.map(m => (
                      <button key={m.id} onClick={() => toggleMilestone(proj.id, m.id)}
                        className="flex items-center gap-3 w-full text-left p-3 rounded-xl transition-all"
                        style={{ background: m.done ? `${proj.color}05` : 'rgba(255,255,255,0.02)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = `${proj.color}08`)}
                        onMouseLeave={e => (e.currentTarget.style.background = m.done ? `${proj.color}05` : 'rgba(255,255,255,0.02)')}
                      >
                        {m.done
                          ? <CheckCircle className="w-4 h-4 shrink-0" style={{ color: proj.color }} />
                          : <Circle className="w-4 h-4 shrink-0 text-gray-700" />}
                        <span className={`text-xs ${m.done ? 'text-gray-500 line-through' : 'text-gray-300'}`}>{m.title}</span>
                      </button>
                    ))}
                    <button onClick={() => addMilestone(proj.id)}
                      className="flex items-center gap-2 w-full text-left p-3 rounded-xl text-xs text-gray-600 hover:text-gray-400 transition-colors"
                      style={{ border: '1px dashed rgba(255,255,255,0.06)' }}>
                      <Plus className="w-3.5 h-3.5" /> Add milestone
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
