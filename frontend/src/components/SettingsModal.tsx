import { useState } from 'react';
import { X, Settings, Sparkles, User, Shield, Volume2, Moon, Keyboard } from 'lucide-react';

interface SettingsModalProps {
  activeTab: 'settings' | 'personalization' | 'profile' | null;
  onClose: () => void;
}

const TABS = [
  { id: 'settings'        as const, icon: Settings,    label: 'Settings',         color: '#9CA3AF' },
  { id: 'personalization' as const, icon: Sparkles,    label: 'Personalization',  color: '#FFB347' },
  { id: 'profile'         as const, icon: User,        label: 'Profile',          color: '#00CFFF' },
];

export function SettingsModal({ activeTab: initialTab, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'settings' | 'personalization' | 'profile'>(initialTab || 'settings');
  const [personalizationText, setPersonalizationText] = useState(
    'Preferred tech stack is MERN (MongoDB, Express, React, Node.js) with Tailwind CSS and TypeScript.'
  );
  const [userName, setUserName] = useState('Chetan Walkoli');
  const [apiKey,   setApiKey]   = useState('');

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(12px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full sm:max-w-2xl flex flex-col overflow-hidden animate-slide-up settings-modal-inner"
        style={{
          background: 'rgba(8,10,18,0.98)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(0,207,255,0.12)',
          borderRadius: '24px 24px 0 0',
          maxHeight: '90vh',
          // On sm+ screens become a centered modal
        }}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 sm:pt-6 sm:px-7"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-3">
            <div className="w-16 h-8 rounded-lg flex items-center justify-center overflow-hidden"
              style={{ background: 'rgba(3,4,8,0.6)', border: '1px solid rgba(0,207,255,0.25)' }}>
              <img src="/logo.png" alt="MARK 45" className="w-14 h-6 object-contain" />
            </div>
            <div>
              <h2 className="font-display font-black text-white text-base tracking-wide">System Config</h2>
              <p className="font-mono text-[10px] text-gray-600 uppercase tracking-[0.2em]">MARK 45 OS v1.0</p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 text-gray-500 hover:text-white hover:bg-white/8 rounded-xl transition-all"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab bar (horizontal on all screens) */}
        <div className="flex gap-1 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: isActive ? `${tab.color}10` : 'transparent',
                  border: isActive ? `1px solid ${tab.color}25` : '1px solid transparent',
                  color: isActive ? tab.color : '#6b7280',
                }}>
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden xs:inline sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">

          {/* ── SETTINGS ── */}
          {activeTab === 'settings' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="mb-1">
                <h3 className="font-display font-bold text-white text-base mb-1">General Settings</h3>
                <p className="text-xs text-gray-500">Configure visual themes, sound, and navigation.</p>
              </div>

              {[
                { icon: Moon,     label: 'Aesthetic Dark Mode',   sub: 'Toggle sleek neon aesthetics.',             checked: true  },
                { icon: Volume2,  label: 'Voice Response Audio',  sub: 'Enable spoken audio in voice mode.',         checked: true  },
                { icon: Keyboard, label: 'Enter to send',         sub: 'Use Ctrl+Enter to send instead.',           checked: false },
              ].map(row => {
                const Icon = row.icon;
                return (
                  <label key={row.label}
                    className="flex items-center justify-between p-4 rounded-2xl cursor-pointer glow-border transition-all"
                    style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(0,207,255,0.08)', border: '1px solid rgba(0,207,255,0.15)' }}>
                        <Icon className="w-4 h-4 text-brand-cyan" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-200">{row.label}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5 leading-snug">{row.sub}</div>
                      </div>
                    </div>
                    <div className="ml-4 shrink-0">
                      <input type="checkbox" defaultChecked={row.checked}
                        className="w-9 h-5 rounded-full cursor-pointer accent-brand-cyan" />
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          {/* ── PERSONALIZATION ── */}
          {activeTab === 'personalization' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="mb-1">
                <h3 className="font-display font-bold text-white text-base mb-1">Personalization Blueprints</h3>
                <p className="text-xs text-gray-500">Custom instructions appended to every system prompt.</p>
              </div>
              <label className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.2em]">Your context</label>
              <textarea
                value={personalizationText}
                onChange={e => setPersonalizationText(e.target.value)}
                placeholder="Tell me about your preferred frameworks, tools, and coding style..."
                className="resize-none rounded-2xl p-4 text-sm text-gray-200 focus:outline-none leading-relaxed"
                style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,207,255,0.15)',
                  minHeight: 160, transition: 'border-color 0.3s ease',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,207,255,0.4)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(0,207,255,0.15)')}
              />
              <button onClick={() => alert('Personalization saved!')}
                className="self-end px-5 py-2.5 rounded-xl text-sm font-bold text-black transition-all"
                style={{ background: 'linear-gradient(135deg,#00CFFF,#0070F3)', boxShadow: '0 0 20px rgba(0,207,255,0.3)' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 32px rgba(0,207,255,0.5)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 20px rgba(0,207,255,0.3)')}>
                Save settings
              </button>
            </div>
          )}

          {/* ── PROFILE ── */}
          {activeTab === 'profile' && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <div className="mb-1">
                <h3 className="font-display font-bold text-white text-base mb-1">User Profile</h3>
                <p className="text-xs text-gray-500">Manage account info and integration keys.</p>
              </div>

              {/* Avatar + name */}
              <div className="flex items-center gap-4 p-4 rounded-2xl"
                style={{ background: 'rgba(255,179,71,0.04)', border: '1px solid rgba(255,179,71,0.12)' }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center font-black text-xl text-black shrink-0"
                  style={{ background: 'linear-gradient(135deg,#FFB347,#FF8C00)', boxShadow: '0 0 20px rgba(255,179,71,0.4)' }}>
                  {userName.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <input type="text" value={userName} onChange={e => setUserName(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 focus:outline-none text-base font-bold text-white w-full p-0"
                    style={{ caretColor: '#00CFFF' }} />
                  <div className="font-mono text-[11px] text-gray-500 mt-1">Workspace Creator · Free Plan</div>
                </div>
              </div>

              {/* API key */}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-1.5 text-[10px] font-mono text-gray-600 uppercase tracking-[0.2em]">
                  <Shield className="w-3 h-3" /> Gemini API Key
                </label>
                <div className="flex gap-2">
                  <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                    placeholder="AIza•••••••••••••••••••••••••••"
                    className="flex-1 min-w-0 rounded-xl px-4 py-3 text-sm text-gray-200 focus:outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,207,255,0.15)' }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,207,255,0.4)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(0,207,255,0.15)')} />
                  <button onClick={() => alert('API Key updated!')}
                    className="px-4 py-3 rounded-xl text-xs font-bold text-black shrink-0 transition-all"
                    style={{ background: 'linear-gradient(135deg,#00CFFF,#0070F3)' }}>
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (min-width: 640px) {
          /* On desktop, make it a centered card, not a bottom sheet */
          .settings-modal-inner {
            border-radius: 24px !important;
            max-height: 580px !important;
          }
        }
      `}</style>
    </div>
  );
}
