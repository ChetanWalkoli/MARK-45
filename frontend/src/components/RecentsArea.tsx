import { useState } from 'react';
import { MessageSquare, Search, Upload, Trash2, Clock, X, FileText, BrainCircuit } from 'lucide-react';

interface ChatEntry {
  id: string; title: string; preview: string; time: string; model: string; msgCount: number;
}

const SAMPLE_CHATS: ChatEntry[] = [
  { id: '1', title: 'React Query vs SWR', preview: 'Compared both libraries for data fetching, cache invalidation strategies...', time: '2h ago', model: 'Gemini Flash', msgCount: 12 },
  { id: '2', title: 'JWT Refresh Token Flow', preview: 'Implemented rotating refresh tokens with httpOnly cookie storage...', time: '1d ago', model: 'GPT-4o', msgCount: 28 },
  { id: '3', title: 'Postgres Full-text Search', preview: 'GIN indexes, tsvector columns, pg_search integration with Rails...', time: '2d ago', model: 'Gemini Flash', msgCount: 9 },
  { id: '4', title: 'Docker Compose Networking', preview: 'Multi-container setup with custom bridge networks and health checks...', time: '4d ago', model: 'Claude 3.5', msgCount: 17 },
  { id: '5', title: 'Tailwind v4 Migration', preview: 'Breaking changes from v3, new engine, configuration differences...', time: '1w ago', model: 'Gemini Flash', msgCount: 6 },
];

const MODEL_COLOR: Record<string, string> = {
  'Gemini Flash': '#00CFFF',
  'GPT-4o':       '#a855f7',
  'Claude 3.5':   '#f59e0b',
};

export function RecentsArea() {
  const [chats,    setChats]    = useState<ChatEntry[]>(SAMPLE_CHATS);
  const [query,    setQuery]    = useState('');
  const [focused,  setFocused]  = useState(false);

  const filtered = query.trim()
    ? chats.filter(c => c.title.toLowerCase().includes(query.toLowerCase()) || c.preview.toLowerCase().includes(query.toLowerCase()))
    : chats;

  const deleteChat = (id: string) => setChats(prev => prev.filter(c => c.id !== id));

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (Array.isArray(data)) {
          const imported: ChatEntry[] = data.map((d: any, i: number) => ({
            id: `imp-${Date.now()}-${i}`, title: d.title || 'Imported Chat',
            preview: d.preview || d.content || 'Imported from backup',
            time: 'Just now', model: d.model || 'Unknown', msgCount: d.messages?.length || 0,
          }));
          setChats(prev => [...imported, ...prev]);
        }
      } catch { alert('Invalid JSON backup file.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full relative z-10 w-full max-w-3xl mx-auto px-3 py-5 sm:px-4 sm:py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-brand-cyan" />
            <span className="font-mono text-xs text-brand-cyan uppercase tracking-[0.25em]">History</span>
          </div>
          <h1 className="font-display font-black text-3xl gradient-text">RECENTS</h1>
        </div>

        <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs text-gray-400 cursor-pointer glow-border transition-all hover:text-brand-gold"
          style={{ background: 'rgba(8,10,18,0.7)', backdropFilter: 'blur(12px)' }}>
          <Upload className="w-3.5 h-3.5" />
          Import backup
          <input type="file" accept=".json" onChange={handleImport} className="hidden" />
        </label>
      </div>

      {/* Search bar */}
      <div className="relative mb-5 rounded-2xl transition-all animate-slide-up input-glow"
        style={{
          background: 'rgba(8,10,18,0.85)', backdropFilter: 'blur(20px)',
          border: focused ? '1px solid rgba(0,207,255,0.35)' : '1px solid rgba(0,207,255,0.1)',
          transition: 'all 0.3s ease',
        }}>
        <div className="flex items-center px-4">
          <Search className="w-4 h-4 text-gray-600 shrink-0 mr-3" />
          <input
            type="text" value={query} onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            placeholder="Filter recent conversations..."
            className="flex-1 py-3.5 bg-transparent border-none focus:outline-none text-gray-200 placeholder-gray-600 text-sm"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1.5 text-gray-600 hover:text-gray-300 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 mb-6 animate-slide-up" style={{ animationDelay: '0.05s' }}>
        <div className="text-center">
          <div className="font-display font-black text-2xl text-brand-cyan">{chats.length}</div>
          <div className="font-mono text-[10px] text-gray-600 uppercase tracking-[0.15em]">Conversations</div>
        </div>
        <div className="h-8 w-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="text-center">
          <div className="font-display font-black text-2xl text-brand-gold">{chats.reduce((a, c) => a + c.msgCount, 0)}</div>
          <div className="font-mono text-[10px] text-gray-600 uppercase tracking-[0.15em]">Total messages</div>
        </div>
        <div className="h-8 w-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="text-center">
          <div className="font-display font-black text-2xl" style={{ color: '#a855f7' }}>{new Set(chats.map(c => c.model)).size}</div>
          <div className="font-mono text-[10px] text-gray-600 uppercase tracking-[0.15em]">Models used</div>
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto space-y-2.5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center animate-fade-in">
            <BrainCircuit className="w-8 h-8 text-gray-700 mb-3" />
            <p className="text-gray-600 text-sm">No conversations match &ldquo;{query}&rdquo;</p>
          </div>
        ) : filtered.map((chat, i) => (
          <div key={chat.id}
            className="flex items-start gap-3 p-4 rounded-2xl cursor-pointer glow-border transition-all animate-slide-up group"
            style={{ background: 'rgba(8,10,18,0.75)', backdropFilter: 'blur(12px)', animationDelay: `${i * 0.04}s` }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,207,255,0.04)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(8,10,18,0.75)')}
          >
            {/* Icon */}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${MODEL_COLOR[chat.model] || '#00CFFF'}10`, border: `1px solid ${MODEL_COLOR[chat.model] || '#00CFFF'}20` }}>
              <MessageSquare className="w-4 h-4" style={{ color: MODEL_COLOR[chat.model] || '#00CFFF' }} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3 className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors truncate">{chat.title}</h3>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[9px] font-mono text-gray-600 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> {chat.time}
                  </span>
                  <button onClick={e => { e.stopPropagation(); deleteChat(chat.id); }}
                    className="p-1.5 text-gray-700 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-2">{chat.preview}</p>
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full"
                  style={{ background: `${MODEL_COLOR[chat.model] || '#00CFFF'}10`, color: MODEL_COLOR[chat.model] || '#00CFFF', border: `1px solid ${MODEL_COLOR[chat.model] || '#00CFFF'}20` }}>
                  {chat.model}
                </span>
                <span className="flex items-center gap-1 text-[9px] font-mono text-gray-700">
                  <FileText className="w-2.5 h-2.5" /> {chat.msgCount} messages
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
