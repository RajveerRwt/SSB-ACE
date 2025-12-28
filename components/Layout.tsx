
import React from 'react';
import { TestType } from '../types';
import { 
  LayoutDashboard, 
  BrainCircuit, 
  Image as ImageIcon, 
  Mic, 
  PenTool, 
  HelpCircle,
  ShieldCheck 
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTest: TestType;
  onNavigate: (test: TestType) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTest, onNavigate }) => {
  const navItems = [
    { id: TestType.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: TestType.PPDT, label: 'PPDT Round', icon: ImageIcon },
    { id: TestType.TAT, label: 'TAT (Psychology)', icon: PenTool },
    { id: TestType.WAT, label: 'WAT (Psychology)', icon: HelpCircle },
    { id: TestType.SRT, label: 'SRT (Psychology)', icon: HelpCircle },
    { id: TestType.INTERVIEW, label: 'AI Interview', icon: Mic },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 military-gradient text-white flex flex-col shadow-xl">
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <ShieldCheck className="w-8 h-8 text-yellow-400" />
          <h1 className="text-xl font-bold tracking-tight">SSB ACE</h1>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-6 py-3 transition-colors ${
                activeTest === item.id 
                  ? 'bg-white/10 text-yellow-400 border-r-4 border-yellow-400' 
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 bg-black/20 text-xs text-slate-400">
          <p>© 2024 SSB Ace Platform</p>
          <p>Guided by Gemini AI</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white h-16 border-b flex items-center justify-between px-8 sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-slate-800">
            {navItems.find(i => i.id === activeTest)?.label}
          </h2>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider">Aspirant Status: Ready</span>
            <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300"></div>
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
