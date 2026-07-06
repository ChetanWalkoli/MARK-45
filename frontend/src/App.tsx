import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { SearchArea } from './components/SearchArea';
import { ProjectsArea } from './components/ProjectsArea';
import { RecentsArea } from './components/RecentsArea';
import { SettingsModal } from './components/SettingsModal';
import { HeroScroll } from './components/HeroScroll';
import { Menu } from 'lucide-react';

export type AIMode = 'developer' | 'teacher' | 'startup' | 'coach' | 'interview' | 'hackathon';

// Detect initial viewport
const isMobileViewport = () => window.innerWidth < 768;

function App() {
  const [activeMode] = useState<AIMode>('developer');
  // On mobile, sidebar starts closed
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobileViewport());
  const [currentView, setCurrentView] = useState('chat');
  const [activeModal, setActiveModal] = useState<'settings' | 'personalization' | 'profile' | null>(null);
  const [showApp, setShowApp] = useState(false);
  const [isMobile, setIsMobile] = useState(isMobileViewport());

  // Track viewport width
  useEffect(() => {
    const onResize = () => {
      const mobile = isMobileViewport();
      setIsMobile(mobile);
      // Auto-close sidebar when screen shrinks to mobile
      if (mobile) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Body overflow management
  useEffect(() => {
    document.body.style.overflowY = showApp ? 'hidden' : 'auto';
    document.body.style.overflowX = 'hidden';
    return () => { document.body.style.overflowY = 'auto'; };
  }, [showApp]);

  const handleEnterApp = () => {
    document.body.style.overflowY = 'hidden';
    window.scrollTo(0, 0);
    setShowApp(true);
  };

  const handleViewChange = (view: string) => {
    setCurrentView(view);
    // Auto-close sidebar on mobile after navigation
    if (isMobile) setIsSidebarOpen(false);
  };

  // ── HERO ─────────────────────────────────────────────────────────────────────
  if (!showApp) {
    return (
      <div style={{ background: '#000', width: '100%' }}>
        <HeroScroll onEnterApp={handleEnterApp} />
      </div>
    );
  }

  // ── MAIN APP ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen w-full bg-dark-bg text-gray-200 font-sans selection:bg-brand-cyan/30" style={{ overflow: 'hidden' }}>

      {/* ── Mobile backdrop (tap to close sidebar) ── */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          style={{ animation: 'fadeIn 0.2s ease' }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar: absolute overlay on mobile, static on desktop ── */}
      {isSidebarOpen && (
        <div
          className={isMobile ? 'fixed inset-y-0 left-0 z-50' : 'relative z-10 flex-shrink-0'}
          style={isMobile ? { animation: 'slideInLeft 0.25s cubic-bezier(0.16,1,0.3,1)' } : {}}
        >
          <Sidebar
            onToggleSidebar={() => setIsSidebarOpen(false)}
            currentView={currentView}
            onViewChange={handleViewChange}
            onOpenModal={(modal) => { setActiveModal(modal); if (isMobile) setIsSidebarOpen(false); }}
          />
        </div>
      )}

      {/* ── Main content ── */}
      <main className="flex-1 relative flex flex-col h-full min-w-0"
        style={{ background: 'radial-gradient(ellipse at 70% 0%, #0A0A14 0%, #050505 60%)' }}>

        {/* Mobile top bar */}
        {isMobile && (
          <div className="flex items-center justify-between px-4 py-3 shrink-0 z-30"
            style={{ borderBottom: '1px solid rgba(0,207,255,0.08)', background: 'rgba(3,4,8,0.95)', backdropFilter: 'blur(20px)' }}>
            <button onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-gray-400 hover:text-white rounded-xl transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Menu className="w-4.5 h-4.5" />
            </button>
            <div className="flex items-center h-6">
              <img src="/logo.png" alt="MARK 45" className="h-5.5 object-contain" />
            </div>
            {/* Right spacer */}
            <div className="w-9" />
          </div>
        )}

        {/* Desktop: hamburger when sidebar is closed */}
        {!isMobile && !isSidebarOpen && (
          <button onClick={() => setIsSidebarOpen(true)}
            className="absolute top-5 left-5 z-50 p-2 text-gray-500 hover:text-white hover:bg-white/8 rounded-xl transition-all"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <Menu className="w-4.5 h-4.5" />
          </button>
        )}

        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-64 h-64 md:w-[500px] md:h-[500px] bg-brand-cyan/5 blur-[80px] md:blur-[120px] rounded-full pointer-events-none" />

        {/* View router */}
        <div className="flex-1 overflow-hidden min-h-0">
          {currentView === 'chat' && <ChatArea activeMode={activeMode} />}
          {currentView === 'search' && <SearchArea />}
          {currentView === 'projects' && <ProjectsArea />}
          {currentView === 'recents' && <RecentsArea />}
        </div>

        {/* Mobile bottom navigation */}
        {isMobile && (
          <nav className="shrink-0 flex items-center justify-around px-4 py-2"
            style={{
              borderTop: '1px solid rgba(0,207,255,0.08)',
              background: 'rgba(3,4,8,0.97)',
              backdropFilter: 'blur(20px)',
            }}>
            {[
              { id: 'chat', label: 'Chat', emoji: '💬' },
              { id: 'search', label: 'Search', emoji: '🔍' },
              { id: 'projects', label: 'Projects', emoji: '📁' },
              { id: 'recents', label: 'Recents', emoji: '🕐' },
            ].map(tab => (
              <button key={tab.id} onClick={() => handleViewChange(tab.id)}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all"
                style={{
                  color: currentView === tab.id ? '#00CFFF' : '#6b7280',
                  background: currentView === tab.id ? 'rgba(0,207,255,0.08)' : 'transparent',
                }}>
                <span className="text-base">{tab.emoji}</span>
                <span className="text-[9px] font-mono uppercase tracking-wider">{tab.label}</span>
              </button>
            ))}
          </nav>
        )}
      </main>

      {/* Settings modal */}
      {activeModal && (
        <SettingsModal activeTab={activeModal} onClose={() => setActiveModal(null)} />
      )}

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

export default App;
