import { useState, useRef } from 'react';
import { Search, Mic, MicOff, Upload, X, FileText, MessageSquare, Clock, Zap } from 'lucide-react';

interface SearchResult {
  id: string; title: string; excerpt: string; time: string; type: 'chat' | 'file';
}

const SAMPLE_RESULTS: SearchResult[] = [
  { id: '1', title: 'React State Management Deep Dive', excerpt: 'Discussed Zustand vs Redux for global state in large-scale React apps...', time: '2h ago', type: 'chat' },
  { id: '2', title: 'API Authentication Patterns', excerpt: 'JWT vs session tokens, refresh token rotation strategy...', time: '1d ago', type: 'chat' },
  { id: '3', title: 'System Design: Social Feed', excerpt: 'Fanout on read vs write, CDN caching, infinite scroll implementation...', time: '3d ago', type: 'chat' },
];

export function SearchArea() {
  const [query,       setQuery]       = useState('');
  const [results,     setResults]     = useState<SearchResult[]>(SAMPLE_RESULTS);
  const [isListening, setIsListening] = useState(false);
  const [selectedFile,setSelectedFile]= useState<File | null>(null);
  const [focused,     setFocused]     = useState(false);
  const recognitionRef = useRef<any>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);

  const handleSearch = (q: string) => {
    setQuery(q);
    if (!q.trim()) { setResults(SAMPLE_RESULTS); return; }
    setResults(SAMPLE_RESULTS.filter(r =>
      r.title.toLowerCase().includes(q.toLowerCase()) ||
      r.excerpt.toLowerCase().includes(q.toLowerCase())
    ));
  };

  const toggleListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return alert('Speech recognition requires Chrome, Edge, or Safari.');
    if (!recognitionRef.current) {
      const rec = new SR();
      rec.continuous = false; rec.interimResults = false; rec.lang = 'en-US';
      rec.onstart  = () => setIsListening(true);
      rec.onend    = () => setIsListening(false);
      rec.onerror  = () => setIsListening(false);
      rec.onresult = (e: any) => handleSearch(e.results[0][0].transcript);
      recognitionRef.current = rec;
    }
    isListening ? recognitionRef.current.stop() : recognitionRef.current.start();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  return (
    <div className="flex flex-col h-full relative z-10 w-full max-w-3xl mx-auto px-3 py-5 sm:px-4 sm:py-8 overflow-y-auto">

      {/* ── HEADER ── */}
      <div className="text-center mb-6 sm:mb-10 animate-fade-in">
        <div className="inline-flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-brand-gold" />
          <span className="font-mono text-xs text-brand-gold uppercase tracking-[0.25em]">Knowledge Search</span>
        </div>
        <h1 className="font-display font-black text-3xl md:text-4xl text-white mb-3 gradient-text">
          FIND ANYTHING.
        </h1>
        <p className="font-mono text-sm text-gray-500">Search your conversations, files, and knowledge base.</p>
      </div>

      {/* ── SEARCH BAR ── */}
      <div
        className="relative rounded-2xl transition-all mb-4 animate-slide-up input-glow"
        style={{
          background: 'rgba(8,10,18,0.85)', backdropFilter: 'blur(20px)',
          border: focused ? '1px solid rgba(0,207,255,0.35)' : '1px solid rgba(0,207,255,0.12)',
          boxShadow: focused ? '0 0 32px rgba(0,207,255,0.08)' : 'none',
          transition: 'all 0.3s ease',
        }}
      >
        <div className="absolute top-0 left-12 right-12 h-px rounded-full"
          style={{ background: 'linear-gradient(90deg,transparent,rgba(0,207,255,0.25),transparent)' }} />

        <div className="flex items-center px-4 py-1">
          <Search className="w-4.5 h-4.5 text-gray-500 shrink-0 mr-3" />
          <input
            type="text"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search conversations, files, topics..."
            className="flex-1 py-3.5 bg-transparent border-none focus:outline-none text-gray-200 placeholder-gray-600 text-sm"
          />
          {query && (
            <button onClick={() => handleSearch('')} className="p-1.5 text-gray-600 hover:text-gray-300 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="w-px h-5 mx-2" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <button onClick={toggleListening}
            className={`p-2 rounded-xl transition-all ${isListening ? 'text-red-400 animate-pulse' : 'text-gray-500 hover:text-brand-gold'}`}
            style={{ background: isListening ? 'rgba(239,68,68,0.1)' : 'transparent', border: isListening ? '1px solid rgba(239,68,68,0.2)' : '1px solid transparent' }}
            title="Voice search">
            {isListening ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
          </button>
        </div>
      </div>

      {/* File upload strip */}
      <div className="flex items-center gap-3 mb-6 animate-slide-up" style={{ animationDelay: '0.05s' }}>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
        <button onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono text-gray-500 hover:text-brand-cyan transition-all glow-border"
          style={{ background: 'rgba(8,10,18,0.7)' }}>
          <Upload className="w-3.5 h-3.5" /> Upload document to search
        </button>
        {selectedFile && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs animate-fade-in"
            style={{ background: 'rgba(0,207,255,0.06)', border: '1px solid rgba(0,207,255,0.2)' }}>
            <FileText className="w-3.5 h-3.5 text-brand-cyan" />
            <span className="text-gray-300 font-mono">{selectedFile.name}</span>
            <button onClick={() => setSelectedFile(null)} className="text-gray-600 hover:text-red-400 transition-colors"><X className="w-3 h-3" /></button>
          </div>
        )}
      </div>

      {/* ── RESULTS ── */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center animate-fade-in">
            <Search className="w-8 h-8 text-gray-700 mb-3" />
            <p className="text-gray-600 text-sm">No results found for &ldquo;{query}&rdquo;</p>
          </div>
        ) : results.map((r, i) => (
          <div key={r.id}
            className="p-4 rounded-2xl cursor-pointer glow-border transition-all animate-slide-up group"
            style={{ background: 'rgba(8,10,18,0.70)', backdropFilter: 'blur(12px)', animationDelay: `${i * 0.06}s` }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,207,255,0.04)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(8,10,18,0.70)'; }}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: r.type === 'chat' ? 'rgba(0,207,255,0.1)' : 'rgba(255,179,71,0.1)', border: `1px solid ${r.type === 'chat' ? 'rgba(0,207,255,0.2)' : 'rgba(255,179,71,0.2)'}` }}>
                {r.type === 'chat'
                  ? <MessageSquare className="w-3.5 h-3.5 text-brand-cyan" />
                  : <FileText className="w-3.5 h-3.5 text-brand-gold" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors truncate">{r.title}</h3>
                  <div className="flex items-center gap-1 shrink-0 text-[10px] font-mono text-gray-600">
                    <Clock className="w-3 h-3" /> {r.time}
                  </div>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{r.excerpt}</p>
              </div>
            </div>
          </div>
        ))}

        {/* Stats row */}
        <div className="pt-4 pb-2 flex items-center justify-center gap-6">
          {[{ label: 'Conversations', val: '24' }, { label: 'Files indexed', val: '8' }, { label: 'Topics', val: '47' }].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-xl font-black text-brand-cyan font-display">{s.val}</div>
              <div className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.15em]">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
