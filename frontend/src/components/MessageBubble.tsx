import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { User, Copy, Share2, MessageSquareDashed, Trash2, Check } from 'lucide-react';
import { Message } from '../hooks/useChat';

interface MessageBubbleProps {
  message: Message;
  onClear?: () => void;
  onAskAbout?: (content: string) => void;
}

export function MessageBubble({ message, onClear, onAskAbout }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [hovered, setHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      showToast('Copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Copy failed.');
    }
  }, [message.content]);

  const handleShare = useCallback(async () => {
    const text = `${isUser ? 'Me' : 'MARK 45'}: ${message.content}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'MARK 45 OS', text }); }
      catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard!');
    }
  }, [message.content, isUser]);

  const handleAskAbout = useCallback(() => {
    if (onAskAbout) onAskAbout(message.content);
  }, [message.content, onAskAbout]);

  const handleClear = useCallback(() => {
    if (onClear) onClear();
  }, [onClear]);

  const ACTIONS = isUser
    ? [
      { icon: Copy, label: 'Copy', action: handleCopy, color: '#00CFFF', active: copied },
    ]
    : [
      { icon: copied ? Check : Copy, label: copied ? 'Copied!' : 'Copy', action: handleCopy, color: '#00CFFF', active: copied },
      { icon: Share2, label: 'Share', action: handleShare, color: '#FFB347', active: false },
      { icon: MessageSquareDashed, label: 'Ask', action: handleAskAbout, color: '#a855f7', active: false },
      { icon: Trash2, label: 'Clear chat', action: handleClear, color: '#ef4444', active: false },
    ];

  return (
    <div
      className={`flex flex-col gap-1 w-full ${isUser ? 'items-end' : 'items-start'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Message row ── */}
      <div className={`flex gap-3 w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
        {/* AI avatar */}
        {!isUser && (
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 overflow-hidden"
            style={{ background: 'rgba(3,4,8,0.6)', border: '1px solid rgba(0,207,255,0.25)', boxShadow: '0 0 12px rgba(0,207,255,0.12)' }}>
            <img src="/logo.png" alt="MARK 45" className="w-full h-full object-cover rounded-full" style={{ objectPosition: '7% 50%', transform: 'scale(1.4)' }} />
          </div>
        )}

        {/* Bubble */}
        <div
          className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 sm:px-5 sm:py-4 transition-all duration-200 ${isUser
              ? 'text-gray-200'
              : 'glass-panel'
            }`}
          style={isUser ? {
            background: 'rgba(0,207,255,0.07)',
            border: '1px solid rgba(0,207,255,0.18)',
            boxShadow: hovered ? '0 0 20px rgba(0,207,255,0.08)' : 'none',
          } : {
            borderColor: hovered ? 'rgba(0,207,255,0.22)' : 'rgba(0,207,255,0.1)',
            boxShadow: hovered ? '0 0 24px rgba(0,207,255,0.06)' : 'none',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          }}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-p:mb-3 prose-p:last:mb-0">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* User avatar */}
        {isUser && (
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1"
            style={{ background: 'linear-gradient(135deg,#FFB347,#FF8C00)', boxShadow: '0 0 10px rgba(255,179,71,0.25)' }}>
            <User className="w-3.5 h-3.5 text-black" />
          </div>
        )}
      </div>

      {/* ── Action toolbar — appears below on hover ── */}
      <div
        className={`flex items-center gap-0.5 transition-all duration-200 ${isUser ? 'mr-11' : 'ml-11'}`}
        style={{
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'translateY(0px)' : 'translateY(-4px)',
          pointerEvents: hovered ? 'auto' : 'none',
        }}
      >
        {ACTIONS.map(a => (
          <button
            key={a.label}
            onClick={a.action}
            title={a.label}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-gray-600 transition-all text-[11px] font-mono"
            style={{ border: '1px solid transparent', minHeight: 32 }}
            onMouseEnter={e => {
              e.currentTarget.style.background = `${a.color}12`;
              e.currentTarget.style.borderColor = `${a.color}28`;
              e.currentTarget.style.color = a.color;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.color = '';
            }}
          >
            <a.icon
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: a.active ? a.color : undefined }}
            />
            <span className="hidden sm:inline" style={{ color: a.active ? a.color : undefined }}>
              {a.label}
            </span>
          </button>
        ))}

        {/* Timestamp */}
        <span className="ml-1 text-[10px] font-mono text-gray-700">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* ── Mini toast (per message) ── */}
      {toast && (
        <div
          className={`text-[10px] font-mono px-3 py-1.5 rounded-xl animate-fade-in ${isUser ? 'mr-11' : 'ml-11'}`}
          style={{ background: 'rgba(0,207,255,0.08)', border: '1px solid rgba(0,207,255,0.2)', color: '#00CFFF' }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
