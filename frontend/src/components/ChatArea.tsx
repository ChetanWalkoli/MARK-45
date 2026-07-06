import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Send, Loader2, Mic, MicOff, Paperclip, File, Trash2, ChevronDown, Sparkles, Cpu, Zap, BrainCircuit, X } from 'lucide-react';
import { AIMode } from '../App';
import { useChat } from '../hooks/useChat';
import { MessageBubble } from './MessageBubble';

interface ChatAreaProps { activeMode: AIMode; }

const AI_MODELS = [
  { id: 'gemini-flash', name: 'Gemini 1.5 Flash', icon: Sparkles, color: '#00CFFF', desc: 'High-speed multimodal' },
  { id: 'gpt-4o', name: 'GPT-4o', icon: Cpu, color: '#a855f7', desc: 'Most capable reasoning' },
  { id: 'claude-3.5', name: 'Claude 3.5 Sonnet', icon: Zap, color: '#f59e0b', desc: 'Advanced coding & writing' },
  { id: 'mark-45', name: 'MARK 45', icon: BrainCircuit, color: '#FFB347', desc: 'Local developer agent' },
];

const WELCOME_PROMPTS = [
  { label: 'Debug my code', icon: '🐛', prompt: 'Help me debug this code:' },
  { label: 'Build a feature', icon: '⚡', prompt: 'Help me build a new feature:' },
  { label: 'Explain concept', icon: '🧠', prompt: 'Explain this concept to me:' },
  { label: 'Review my stack', icon: '🔍', prompt: 'Review my tech stack and suggest improvements:' },
];

export function ChatArea({ activeMode }: ChatAreaProps) {
  const { messages, isLoading, sendMessage, clearMessages } = useChat(activeMode);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0]);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [askAboutOpen, setAskAboutOpen] = useState(false);
  const [askAboutContent, setAskAboutContent] = useState('');
  const [askAboutInput, setAskAboutInput] = useState('');

  const SelectedModelIcon = selectedModel.icon;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelBtnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        modelBtnRef.current && !modelBtnRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);


  // Speech recognition
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false; rec.interimResults = false; rec.lang = 'en-US';
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    rec.onresult = (e: any) => setInput(prev => prev + (prev ? ' ' : '') + e.results[0][0].transcript);
    recognitionRef.current = rec;
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return alert('Speech recognition requires Chrome, Edge, or Safari.');
    isListening ? recognitionRef.current.stop() : recognitionRef.current.start();
  };

  // File upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = ev => setFileContent(ev.target?.result as string);
    if (file.type.startsWith('image/')) { setFilePreview(URL.createObjectURL(file)); }
    else if (/\.(json|md|js|ts|tsx|py|txt|css|html)$/.test(file.name)) { reader.readAsText(file); setFilePreview(null); }
    else setFilePreview(null);
  };

  const clearFile = () => { setSelectedFile(null); setFilePreview(null); setFileContent(null); if (fileInputRef.current) fileInputRef.current.value = ''; };

  // Auto-resize textarea
  const handleTextInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = textareaRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 200) + 'px'; }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedFile) || isLoading) return;
    let full = input;
    if (selectedFile && fileContent) full = `[File: ${selectedFile.name}]\n\`\`\`\n${fileContent}\n\`\`\`\n\n${input}`;
    sendMessage(full); setInput(''); clearFile();
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };




  const handleClearChat = useCallback(() => {
    if (!messages.length) return;
    if (confirm('Clear all messages? This cannot be undone.')) { clearMessages(); }
  }, [messages, clearMessages]);

  const handleAskAboutMessage = useCallback((content: string) => {
    setAskAboutContent(content);
    setAskAboutOpen(true);
  }, []);

  const handleAskAboutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!askAboutInput.trim()) return;
    const metaPrompt = `Regarding this message:\n\n"${askAboutContent}"\n\nAnswer: ${askAboutInput}`;
    sendMessage(metaPrompt);
    setAskAboutInput(''); setAskAboutOpen(false); setAskAboutContent('');
  };



  return (
    <div className="flex flex-col h-full relative z-10 w-full max-w-4xl mx-auto" style={{ minHeight: 0 }}>



      {/* ── Ask About Message modal ── */}
      {askAboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
          onClick={e => { if (e.target === e.currentTarget) setAskAboutOpen(false); }}>
          <div className="w-full max-w-md rounded-2xl p-6"
            style={{ background: 'rgba(8,10,18,0.97)', border: '1px solid rgba(161,85,247,0.25)', boxShadow: '0 0 40px rgba(161,85,247,0.1)' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-bold text-white text-base">Ask About This Message</h3>
                <p className="text-xs text-gray-500 mt-0.5">MARK 45 will answer based on the selected message</p>
              </div>
              <button onClick={() => setAskAboutOpen(false)} className="p-1.5 text-gray-600 hover:text-gray-300 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
            </div>
            {askAboutContent && (
              <div className="mb-3 p-3 rounded-xl text-xs text-gray-400"
                style={{ background: 'rgba(161,85,247,0.05)', border: '1px solid rgba(161,85,247,0.15)' }}>
                &ldquo;{askAboutContent.slice(0, 160)}{askAboutContent.length > 160 ? '\u2026' : ''}&rdquo;
              </div>
            )}
            <form onSubmit={handleAskAboutSubmit} className="flex flex-col gap-3">
              <textarea value={askAboutInput} onChange={e => setAskAboutInput(e.target.value)}
                placeholder="E.g. Explain this further, Summarize this, What does this mean?"
                className="w-full p-3 rounded-xl text-sm text-gray-200 resize-none focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(161,85,247,0.2)', minHeight: 80 }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(161,85,247,0.5)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(161,85,247,0.2)')}
                autoFocus />
              <button type="submit" disabled={!askAboutInput.trim()}
                className="py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#a855f7,#7c3aed)', color: '#fff' }}>
                Ask MARK 45 →
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── TOP BAR ── */}
      <header className="px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2 shrink-0 relative"
        style={{ borderBottom: '1px solid rgba(0,207,255,0.08)', background: 'rgba(5,5,8,0.92)', backdropFilter: 'blur(20px)', zIndex: 40 }}>

        {/* Left: mode indicator */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse shadow-[0_0_8px_#00CFFF]" />
          <span className="font-mono text-[11px] text-brand-cyan uppercase tracking-[0.2em] hidden xs:block">{activeMode}</span>
        </div>

        {/* Centre: mode label only (actions moved to per-message hover) */}
        <div className="flex items-center gap-2 flex-1 justify-center">
          <span className="font-mono text-[10px] text-gray-600 uppercase tracking-[0.2em] hidden sm:block">/ {activeMode} mode</span>
        </div>

        {/* Right: model selector — rendered with fixed positioning via JS to escape z-index */}
        <div className="relative shrink-0" style={{ zIndex: 50 }}>
          <button ref={modelBtnRef}
            onClick={() => setModelDropdownOpen(v => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all text-xs font-semibold"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,207,255,0.15)', color: '#e5e7eb', minHeight: 36 }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,207,255,0.4)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(0,207,255,0.15)')}>
            <SelectedModelIcon className="w-3.5 h-3.5 shrink-0" style={{ color: selectedModel.color }} />
            <span className="hidden sm:inline max-w-[110px] truncate">{selectedModel.name}</span>
            <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform shrink-0 ${modelDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown — absolute from this relative wrapper, high z-index */}
          {modelDropdownOpen && (
            <div ref={dropdownRef}
              className="absolute right-0 mt-2 w-72 rounded-2xl overflow-hidden animate-fade-in"
              style={{ background: 'rgba(8,10,18,0.98)', backdropFilter: 'blur(28px)', border: '1px solid rgba(0,207,255,0.15)', boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(0,207,255,0.05)', zIndex: 9999, top: '100%' }}>
              <div className="px-4 py-2.5 text-[10px] font-mono text-gray-600 uppercase tracking-[0.2em]"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                Select intelligence model
              </div>
              {AI_MODELS.map(model => {
                const ModelIcon = model.icon;
                return (
                  <button key={model.id}
                    onClick={() => { setSelectedModel(model); setModelDropdownOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                    style={{ background: selectedModel.id === model.id ? `${model.color}08` : 'transparent' }}
                    onMouseEnter={e => (e.currentTarget.style.background = `${model.color}10`)}
                    onMouseLeave={e => (e.currentTarget.style.background = selectedModel.id === model.id ? `${model.color}08` : 'transparent')}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${model.color}12`, border: `1px solid ${model.color}22` }}>
                      <ModelIcon className="w-3.5 h-3.5" style={{ color: model.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-200 truncate">{model.name}</div>
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5">{model.desc}</div>
                    </div>
                    {selectedModel.id === model.id && (
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: model.color, boxShadow: `0 0 6px ${model.color}` }} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      {/* ── MESSAGES ── */}
      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-6 md:px-8" style={{ scrollBehavior: 'smooth', minHeight: 0 }}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 animate-fade-in">
            <div className="relative mb-6 w-44 h-16 flex items-center justify-center rounded-2xl overflow-hidden animate-glow-pulse"
              style={{ background: 'rgba(3,4,8,0.6)', border: '1px solid rgba(0,207,255,0.3)', boxShadow: '0 0 32px rgba(0,207,255,0.3)' }}>
              <img src="/logo.png" alt="MARK 45 OS Logo" className="w-40 h-12 object-contain" />
              <div className="absolute inset-0 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle,rgba(0,207,255,0.12) 0%,transparent 70%)' }} />
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-black mb-3 gradient-text tracking-tight">SYSTEM INITIALIZED</h2>
            <p className="font-mono text-sm text-gray-500 max-w-sm leading-relaxed mb-8">
              Your context is loaded. Tech stack remembered.<br />What are we building today?
            </p>
            <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
              {WELCOME_PROMPTS.map((p, i) => (
                <button key={p.label} onClick={() => setInput(p.prompt)}
                  className="glow-border rounded-xl p-3 text-left transition-all group animate-slide-up"
                  style={{ background: 'rgba(8,10,18,0.6)', animationDelay: `${i * 0.05}s` }}>
                  <div className="text-lg mb-1">{p.icon}</div>
                  <div className="text-xs font-semibold text-gray-300 group-hover:text-white transition-colors leading-snug">{p.label}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5 pb-4">
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onClear={handleClearChat}
                onAskAbout={handleAskAboutMessage}
              />
            ))}
            {isLoading && (
              <div className="flex gap-3 p-4 rounded-2xl w-[85%] animate-fade-in"
                style={{ background: 'rgba(0,207,255,0.04)', border: '1px solid rgba(0,207,255,0.12)' }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(0,207,255,0.12)', border: '1px solid rgba(0,207,255,0.2)' }}>
                  <Loader2 className="w-3.5 h-3.5 text-brand-cyan animate-spin" />
                </div>
                <div className="flex-1 py-0.5">
                  <span className="font-mono text-xs text-brand-cyan/60">{selectedModel.name} is thinking</span>
                  <div className="flex gap-1 mt-2">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-brand-cyan/40"
                        style={{ animation: 'heroPulse 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── INPUT BAR ── */}
      <div className="px-3 pb-3 pt-2 sm:px-4 sm:pb-4 md:px-8 shrink-0">
        <form onSubmit={handleSubmit} className="relative input-glow rounded-2xl transition-all"
          style={{ background: 'rgba(8,10,18,0.88)', border: '1px solid rgba(0,207,255,0.15)', backdropFilter: 'blur(20px)' }}>
          <div className="absolute top-0 left-8 right-8 h-px rounded-full"
            style={{ background: 'linear-gradient(90deg,transparent,rgba(0,207,255,0.3),transparent)' }} />

          {/* File preview */}
          {selectedFile && (
            <div className="flex items-center gap-3 mx-3 mt-3 px-3 py-2 rounded-xl animate-fade-in"
              style={{ background: 'rgba(0,207,255,0.05)', border: '1px solid rgba(0,207,255,0.15)' }}>
              {filePreview
                ? <img src={filePreview} alt="preview" className="w-8 h-8 object-cover rounded-lg" />
                : <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(0,207,255,0.1)' }}><File className="w-4 h-4 text-brand-cyan" /></div>}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-200 truncate">{selectedFile.name}</div>
                <div className="text-[10px] text-gray-500 font-mono">{(selectedFile.size / 1024).toFixed(1)} KB</div>
              </div>
              <button type="button" onClick={clearFile} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          )}

          <div className="flex items-end">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,text/*,.json,.md,.js,.ts,.tsx,.py,.css,.html" />
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="p-2.5 ml-1 mb-1 text-gray-600 hover:text-brand-cyan rounded-xl transition-colors" title="Upload file">
              <Paperclip className="w-4 h-4" />
            </button>
            <textarea ref={textareaRef} value={input} onChange={handleTextInput}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
              placeholder={isListening ? '🎤 Listening...' : `Message MARK 45 (/${activeMode} mode)`}
              className="flex-1 py-3 px-2 bg-transparent border-none focus:outline-none focus:ring-0 resize-none text-gray-200 text-sm placeholder-gray-600"
              style={{ minHeight: 48, maxHeight: 200, lineHeight: 1.6 }} rows={1} />
            <button type="button" onClick={toggleListening}
              className={`p-2.5 mb-1 mr-0.5 rounded-xl transition-all ${isListening ? 'text-red-400 animate-pulse' : 'text-gray-600 hover:text-brand-gold'}`}
              style={{ background: isListening ? 'rgba(239,68,68,0.1)' : 'transparent', border: isListening ? '1px solid rgba(239,68,68,0.25)' : '1px solid transparent' }}
              title={isListening ? 'Stop' : 'Voice input'}>
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button type="submit" disabled={(!input.trim() && !selectedFile) || isLoading}
              className="m-2 p-2.5 rounded-xl font-semibold transition-all disabled:opacity-30"
              style={{ background: (!input.trim() && !selectedFile) || isLoading ? 'rgba(0,207,255,0.15)' : 'linear-gradient(135deg,#00CFFF,#0070F3)', color: (!input.trim() && !selectedFile) || isLoading ? 'rgba(0,207,255,0.5)' : '#000' }}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
        <p className="text-center text-[9px] text-gray-700 font-mono tracking-widest uppercase mt-2">
          MARK 45 OS · {selectedModel.name}
        </p>
      </div>
    </div>
  );
}


