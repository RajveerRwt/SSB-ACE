
import React, { useState, useEffect } from 'react';
import { TestType } from '../types';
import { SSBLogo } from './Logo';
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
  User,
  Menu,
  X,
  Lock,
  ChevronLeft,
  FileSignature
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTest: TestType;
  onNavigate: (test: TestType) => void;
  onLogout?: () => void;
  onLogin?: () => void;
  user?: string;
  isLoggedIn: boolean;
  isAdmin?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTest, onNavigate, onLogout, onLogin, user, isLoggedIn, isAdmin }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    
    // Initial check
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { id: TestType.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: TestType.STAGES, label: 'SSB Journey', icon: Map },
    { id: TestType.AI_BOT, label: 'SSB AI Guide', icon: Bot },
    { id: TestType.PIQ, label: 'PIQ Form', icon: ClipboardList },
    { id: TestType.PPDT, label: 'PPDT Round', icon: ImageIcon },
    { id: TestType.TAT, label: 'TAT (Psychology)', icon: PenTool },
    { id: TestType.WAT, label: 'WAT (Psychology)', icon: HelpCircle },
    { id: TestType.SRT, label: 'SRT (Psychology)', icon: HelpCircle },
    { id: TestType.SDT, label: 'Self Description', icon: FileSignature },
    { id: TestType.INTERVIEW, label: 'AI Interview', icon: Mic },
    { id: TestType.CONTACT, label: 'Support Desk', icon: MessageSquare },
  ];

  const handleNavClick = (id: TestType) => {
    onNavigate(id);
    if (isMobile) setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 md:hidden ${
          isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 
        military-gradient text-white shadow-xl 
        transition-all duration-300 ease-in-out shrink-0
        ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64 md:w-0 md:translate-x-0 md:overflow-hidden'}
      `}>
        {/* Sidebar Content Wrapper to prevent squashing during width transition */}
        <div className="w-64 h-full flex flex-col">
          <div className="p-6 flex items-center justify-between border-b border-white/10 h-24 shrink-0">
            <div className="flex items-center gap-3">
              <SSBLogo className="w-10 h-10" />
              <div className="flex flex-col">
                <h1 className="text-xl font-black tracking-tighter uppercase leading-none text-white">
                  SSB<span className="text-yellow-400">PREP</span>.ONLINE
                </h1>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Prepare. Lead. Succeed
                </p>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-white/70 hover:text-white p-1"
            >
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-6 py-3 transition-colors text-left ${
                  activeTest === item.id 
                    ? 'bg-white/10 text-yellow-400 border-r-4 border-yellow-400' 
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="font-medium text-sm truncate">{item.label}</span>
              </button>
            ))}
            
            {/* Admin Link - Only Visible to Admins */}
            {isAdmin && (
              <>
                <div className="my-2 border-t border-white/10 mx-6" />
                <button
                    onClick={() => handleNavClick(TestType.ADMIN)}
                    className={`w-full flex items-center gap-3 px-6 py-3 transition-colors text-left ${
                      activeTest === TestType.ADMIN
                        ? 'bg-white/10 text-red-400 border-r-4 border-red-500' 
                        : 'text-slate-400 hover:bg-white/5 hover:text-red-400'
                    }`}
                  >
                    <Lock className="w-4 h-4 shrink-0" />
                    <span className="font-medium text-xs truncate uppercase tracking-widest">Admin Panel</span>
                </button>
              </>
            )}
          </nav>
          
          {/* User & Logout Section */}
          <div className="p-4 bg-black/20 border-t border-white/10 shrink-0">
             {isLoggedIn ? (
               <div className="mb-4 px-2">
                 <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Logged in as</p>
                 <p className="text-xs font-bold text-slate-300 truncate">{user}</p>
                 {isAdmin && <span className="text-[8px] bg-red-600 px-1.5 py-0.5 rounded text-white font-black uppercase tracking-widest mt-1 inline-block">Admin</span>}
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
                 <LogIn size={14} /> Login
               </button>
             )}
          </div>

          <div className="p-4 text-[10px] text-slate-500 uppercase tracking-widest text-center shrink-0 border-t border-white/5 bg-black/40">
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mb-2">
              <button onClick={() => handleNavClick(TestType.TERMS)} className="hover:text-white transition-colors">Terms</button>
              <button onClick={() => handleNavClick(TestType.PRIVACY)} className="hover:text-white transition-colors">Privacy</button>
              <button onClick={() => handleNavClick(TestType.REFUND)} className="hover:text-white transition-colors">Refunds</button>
            </div>
            <p className="mb-2">© 2024 SSBPREP.ONLINE</p>
            <p className="text-[8px] opacity-50 leading-relaxed normal-case border-t border-white/5 pt-2">
                Not affiliated with Indian Army/Govt. "Major Veer" & "Col Arjun Singh" are fictional AI personas for simulation only.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        <header className="bg-white h-16 border-b flex items-center justify-between px-4 md:px-8 shrink-0 z-10 shadow-sm sticky top-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
            >
               <Menu size={24} />
            </button>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest truncate max-w-[150px] md:max-w-none">
              {navItems.find(i => i.id === activeTest)?.label 
               || (activeTest === TestType.ADMIN ? 'Admin Command' : '')
               || (activeTest === TestType.TERMS ? 'Terms of Service' : '')
               || (activeTest === TestType.PRIVACY ? 'Privacy Policy' : '')
               || (activeTest === TestType.REFUND ? 'Refund Policy' : '')}
            </h2>

            {/* Back to Dashboard Button */}
            {activeTest !== TestType.DASHBOARD && (
                <button 
                    onClick={() => onNavigate(TestType.DASHBOARD)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg transition-all ml-2 group"
                    title="Return to Dashboard"
                >
                    <X size={16} />
                    <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">Close</span>
                </button>
            )}
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <div className="flex flex-col items-end hidden md:flex">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                {isLoggedIn ? (isAdmin ? 'Admin Access' : 'Deployment Ready') : 'Guest Access'}
              </span>
              <span className={`text-[10px] font-bold uppercase flex items-center gap-1.5 ${isLoggedIn ? 'text-green-600' : 'text-slate-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isLoggedIn ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                {isLoggedIn ? 'Active' : 'Preview'}
              </span>
            </div>
            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl border flex items-center justify-center text-white font-black text-xs ${isLoggedIn ? (isAdmin ? 'bg-red-600 border-red-500' : 'bg-slate-900 border-slate-700') : 'bg-slate-200 border-slate-300 text-slate-400'}`}>
              {isLoggedIn ? (user ? user.substring(0,2).toUpperCase() : 'JD') : <User size={16}/>}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
