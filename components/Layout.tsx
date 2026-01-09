import React from 'react';
import { TestType } from '../types';
import { 
  LayoutDashboard, 
  ImageIcon, 
  Mic, 
  PenTool, 
  HelpCircle,
  ShieldCheck,
  ClipboardList,
  MessageSquare,
  Map,
  Bot,
  LogOut,
  LogIn,
  User
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTest: TestType;
  onNavigate: (test: TestType) => void;
  onLogout?: () => void;
  onLogin?: () => void;
  user?: string;
  isLoggedIn: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTest, onNavigate, onLogout, onLogin, user, isLoggedIn }) => {
  const navItems = [
    { id: TestType.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: TestType.STAGES, label: 'SSB Journey', icon: Map },
    { id: TestType.AI_BOT, label: 'SSB AI Guide', icon: Bot },
    { id: TestType.PIQ, label: 'PIQ Form', icon: ClipboardList },
    { id: TestType.PPDT, label: 'PPDT Round', icon: ImageIcon },
    { id: TestType.TAT, label: 'TAT (Psychology)', icon: PenTool },
    { id: TestType.WAT, label: 'WAT (Psychology)', icon: HelpCircle },
    { id: TestType.SRT, label: 'SRT (Psychology)', icon: HelpCircle },
    { id: TestType.INTERVIEW, label: 'AI Interview', icon: Mic },
    { id: TestType.CONTACT, label: 'Support Desk', icon: MessageSquare },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 military-gradient text-white flex flex-col shadow-xl shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <ShieldCheck className="w-8 h-8 text-yellow-400" />
          <h1 className="text-xl font-bold tracking-tight">SSBprep.online</h1>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-6 py-3 transition-colors text-left ${
                activeTest === item.id 
                  ? 'bg-white/10 text-yellow-400 border-r-4 border-yellow-400' 
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
        
        {/* User & Logout Section */}
        <div className="p-4 bg-black/20 border-t border-white/10">
           {isLoggedIn ? (
             <div className="mb-4 px-2">
               <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Logged in as</p>
               <p className="text-xs font-bold text-slate-300 truncate">{user}</p>
             </div>
           ) : (
             <div className="mb-4 px-2">
               <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Status</p>
               <p className="text-xs font-bold text-slate-300">Guest User</p>
             </div>
           )}
           
           {isLoggedIn ? (
             <button 
               onClick={onLogout}
               className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-white/5 rounded-xl transition-all text-xs font-black uppercase tracking-widest"
             >
               <LogOut size={14} /> Logout
             </button>
           ) : (
             <button 
               onClick={onLogin}
               className="w-full flex items-center gap-3 px-4 py-2 text-yellow-400 hover:text-yellow-300 hover:bg-white/5 rounded-xl transition-all text-xs font-black uppercase tracking-widest"
             >
               <LogIn size={14} /> Login / Signup
             </button>
           )}
        </div>

        <div className="p-4 text-[10px] text-slate-500 uppercase tracking-widest text-center">
          <p>© 2024 SSBprep.online Platform</p>
          <p className="mt-1">Guided by Gemini AI</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white h-16 border-b flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">
            {navItems.find(i => i.id === activeTest)?.label}
          </h2>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                {isLoggedIn ? 'Deployment Ready' : 'Guest Access'}
              </span>
              <span className={`text-[10px] font-bold uppercase flex items-center gap-1.5 ${isLoggedIn ? 'text-green-600' : 'text-slate-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isLoggedIn ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                {isLoggedIn ? 'Aspirant Handshake Active' : 'Limited Preview'}
              </span>
            </div>
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-white font-black text-xs ${isLoggedIn ? 'bg-slate-900 border-slate-700' : 'bg-slate-200 border-slate-300 text-slate-400'}`}>
              {isLoggedIn ? (user ? user.substring(0,2).toUpperCase() : 'JD') : <User size={18}/>}
            </div>
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