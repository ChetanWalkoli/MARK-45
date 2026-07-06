import { useState, useRef, useEffect } from 'react';
import { SquarePen, Search, MoreHorizontal, ChevronRight, User, Settings, HelpCircle, LogOut, Maximize, Zap, Clock, FolderOpen } from 'lucide-react';

interface SidebarProps {
  onToggleSidebar: () => void;
  currentView: string;
  onViewChange: (view: string) => void;
  onOpenModal: (modal: 'settings' | 'personalization' | 'profile') => void;
}

const NAV_ITEMS = [
  { id: 'chat', icon: SquarePen, label: 'New chat' },
  { id: 'search', icon: Search, label: 'Search' },
];

const SECTION_ITEMS = [
  { id: 'projects', icon: FolderOpen, label: 'Projects' },
  { id: 'recents', icon: Clock, label: 'Recents' },
];

export function Sidebar({ onToggleSidebar, currentView, onViewChange, onOpenModal }: SidebarProps) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <aside
      style={{
        width: 252,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        background: 'rgba(3,4,8,0.97)',
        borderRight: '1px solid rgba(0,207,255,0.08)',
        flexShrink: 0,
      }}
    >
      {/* Scan line texture */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.3,
        backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.04) 3px,rgba(0,0,0,0.04) 6px)',
      }} />

      {/* Cyan glow at top */}
      <div style={{ position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)', width: 180, height: 80, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,207,255,0.07) 0%,transparent 70%)', pointerEvents: 'none' }} />

      {/* ── LOGO + TOGGLE ── */}
      <div className="flex items-center justify-between p-3 relative z-10">
        <button
          onClick={() => window.location.reload()}
          className="flex items-center hover:opacity-80 transition-opacity h-8 pl-1"
        >
          <img src="/logo.png" alt="MARK 45" className="h-6 object-contain" />
        </button>

        <button
          onClick={onToggleSidebar}
          className="p-1.5 text-gray-600 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-all"
          title="Collapse sidebar"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>

      {/* Separator */}
      <div className="mx-3 mb-1" style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(0,207,255,0.1),transparent)' }} />

      {/* ── NAVIGATION ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: 2, position: 'relative', zIndex: 10 }}>
        {NAV_ITEMS.map(item => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className="flex items-center gap-3 rounded-xl text-left transition-all group"
              style={{
                minHeight: 44,
                padding: '10px 12px',
                background: isActive ? 'rgba(0,207,255,0.08)' : 'transparent',
                border: isActive ? '1px solid rgba(0,207,255,0.18)' : '1px solid transparent',
                color: isActive ? '#e2e8f0' : '#6b7280',
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#d1d5db'; } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b7280'; } }}
            >
              <Icon className="w-4 h-4 shrink-0" style={{ color: isActive ? '#00CFFF' : undefined }} />
              <span className="text-sm font-medium">{item.label}</span>
              {isActive && <div className="ml-auto w-1 h-4 rounded-full" style={{ background: '#00CFFF', boxShadow: '0 0 8px #00CFFF' }} />}
            </button>
          );
        })}

        {/* Section divider */}
        <div className="mt-4 mb-2 px-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.2em]">Workspace</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
          </div>
        </div>

        {SECTION_ITEMS.map(item => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className="flex items-center gap-3 rounded-xl text-left transition-all"
              style={{
                minHeight: 44,
                padding: '10px 12px',
                background: isActive ? 'rgba(255,179,71,0.06)' : 'transparent',
                border: isActive ? '1px solid rgba(255,179,71,0.15)' : '1px solid transparent',
                color: isActive ? '#e2e8f0' : '#6b7280',
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#d1d5db'; } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b7280'; } }}
            >
              <Icon className="w-4 h-4 shrink-0" style={{ color: isActive ? '#FFB347' : undefined }} />
              <span className="text-sm font-medium">{item.label}</span>
              <ChevronRight className="w-3.5 h-3.5 ml-auto text-gray-700" />
            </button>
          );
        })}

        {/* More */}
        <button
          onClick={() => alert('More options coming soon')}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-gray-600 hover:text-gray-300 hover:bg-white/4 transition-all mt-1"
          style={{ border: '1px solid transparent' }}
        >
          <MoreHorizontal className="w-4 h-4 shrink-0" />
          <span className="text-sm font-medium">More</span>
        </button>
      </div>

      {/* ── BOTTOM PROFILE ── */}
      <div className="p-2 relative z-10" ref={profileMenuRef}>
        {/* Separator */}
        <div className="mb-2" style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(0,207,255,0.08),transparent)' }} />

        {/* Profile popover */}
        {isProfileMenuOpen && (
          <div
            className="absolute bottom-[calc(100%+6px)] left-2 right-2 rounded-2xl shadow-2xl overflow-hidden py-1.5 animate-fade-in z-50"
            style={{ background: 'rgba(8,10,18,0.97)', backdropFilter: 'blur(24px)', border: '1px solid rgba(0,207,255,0.12)' }}
          >
            {/* User header */}
            <div className="px-3 py-2.5 mb-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-black font-bold text-sm shrink-0"
                  style={{ background: 'linear-gradient(135deg,#FFB347,#FF8C00)' }}>CW</div>
                <div>
                  <div className="text-sm font-semibold text-white">Chetan Walkoli</div>
                  <div className="text-[10px] font-mono text-gray-500">Free Plan</div>
                </div>
              </div>
            </div>

            {[
              { icon: Zap, label: 'Personalization', modal: 'personalization' as const, color: '#FFB347' },
              { icon: User, label: 'Profile', modal: 'profile' as const, color: '#00CFFF' },
              { icon: Settings, label: 'Settings', modal: 'settings' as const, color: '#9CA3AF' },
            ].map(item => (
              <button key={item.label} onClick={() => { onOpenModal(item.modal); setIsProfileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white transition-colors hover:bg-white/5 text-left">
                <item.icon className="w-4 h-4 shrink-0" style={{ color: item.color }} />
                <span>{item.label}</span>
              </button>
            ))}

            <div className="my-1 mx-3" style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

            <button onClick={() => alert('Help center coming soon!')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white transition-colors hover:bg-white/5 text-left">
              <HelpCircle className="w-4 h-4 text-gray-500" /> <span>Help</span>
            </button>
            <button onClick={() => alert('Logged out!')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 transition-colors hover:bg-red-500/5 text-left">
              <LogOut className="w-4 h-4" /> <span>Log out</span>
            </button>
          </div>
        )}

        {/* Profile button */}
        <button
          onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          className="flex items-center gap-2.5 w-full px-2 py-2 rounded-xl transition-all"
          style={{ border: '1px solid transparent' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-black font-bold text-xs shrink-0"
            style={{ background: 'linear-gradient(135deg,#FFB347,#FF8C00)', boxShadow: '0 0 10px rgba(255,179,71,0.3)' }}>
            CW
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-sm font-semibold text-gray-200 truncate">Chetan Walkoli</div>
            <div className="text-[10px] font-mono text-gray-500">Free Plan</div>
          </div>
          <ChevronRight className={`w-3.5 h-3.5 text-gray-600 transition-transform ${isProfileMenuOpen ? '-rotate-90' : ''}`} />
        </button>
      </div>
    </aside>
  );
}
