
import React, { useState, useEffect, useRef } from 'react';
import { TestType, Announcement, UserSubscription } from '../types';
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
  FileSignature,
  BookOpenCheck,
  Globe,
  Clock,
  Megaphone,
  Bell,
  Info,
  CheckCircle,
  AlertTriangle,
  Instagram,
  Youtube,
  Crown,
  Library,
  BookOpen,
  Zap,
  Coins,
  Plus,
  Lightbulb
} from 'lucide-react';
import { getRecentAnnouncements, subscribeToAnnouncements, getTickerConfig, subscribeToTicker, TEST_RATES } from '../services/supabaseService';

interface LayoutProps {
  children: React.ReactNode;
  activeTest: TestType;
  onNavigate: (test: TestType, params?: any) => void;
  onLogout?: () => void;
  onLogin?: () => void;
  user?: string;
  isLoggedIn: boolean;
  isAdmin?: boolean;
  subscription?: UserSubscription | null;
  onOpenPayment?: () => void; // Added callback to open payment modal from header
}

const Layout: React.FC<LayoutProps> = ({ children, activeTest, onNavigate, onLogout, onLogin, user, isLoggedIn, isAdmin, subscription, onOpenPayment }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  // Announcement State
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  
  // Ticker State
  const [tickerConfig, setTickerConfig] = useState({ message: '', is_active: false, speed: 25 });

  // Notifications History
  const [notifications, setNotifications] = useState<Announcement[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to top on navigation change
  useEffect(() => {
    if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
    }
  }, [activeTest]);

  useEffect(() => {
    // 1. Fetch recent history on mount
    getRecentAnnouncements().then(data => {
        setNotifications(data);
        
        // Calculate Unread
        const lastCheck = localStorage.getItem('ssb_last_notif_check') || '0';
        const lastCheckTime = parseInt(lastCheck);
        const newItems = data.filter(n => new Date(n.created_at).getTime() > lastCheckTime);
        setUnreadCount(newItems.length);
    });

    // 2. Fetch Initial Ticker State
    getTickerConfig().then(config => {
        setTickerConfig({ ...config, speed: config.speed || 25 });
    });

    // 3. Subscribe to real-time updates (Announcements + Ticker)
    const unsubscribeAnnouncements = subscribeToAnnouncements((newAnnouncement) => {
        // Add to history list immediately
        setNotifications(prev => [newAnnouncement, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Show Toaster
        setAnnouncement(newAnnouncement);
        setShowAnnouncement(true);
        
        // Play notification sound
        try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); 
            audio.volume = 0.5;
            audio.play().catch(e => console.log("Audio play blocked", e));
        } catch(e) {}
    });

    const unsubscribeTicker = subscribeToTicker((newConfig) => {
        if (newConfig) {
            setTickerConfig({ ...newConfig, speed: newConfig.speed || 25 });
        }
    });

    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setShowNotifications(false);
        }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('mousedown', handleClickOutside);
        if (unsubscribeAnnouncements) unsubscribeAnnouncements();
        if (unsubscribeTicker) unsubscribeTicker();
    };
  }, []);

  const handleBellClick = () => {
      if (!showNotifications) {
          // Opening dropdown: Mark all as read
          setUnreadCount(0);
          localStorage.setItem('ssb_last_notif_check', Date.now().toString());
      }
      setShowNotifications(!showNotifications);
  };

  // Updated Navigation Order based on user request
  const navItems = [
    { id: TestType.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: TestType.GUIDE, label: 'Platform Guide (SOP)', icon: BookOpenCheck },
    { id: TestType.STAGES, label: 'SSB Journey', icon: Map },
    { id: TestType.DAILY_PRACTICE, label: 'Daily Practice', icon: Clock },
    { id: TestType.CURRENT_AFFAIRS, label: 'Daily News', icon: Globe },
    { id: TestType.RESOURCES, label: 'Free Resources', icon: Library }, 
    { id: TestType.PIQ, label: 'PIQ Form', icon: ClipboardList },
    { id: TestType.SCREENING_TEST, label: 'Full Screening Test', icon: ShieldCheck },
    { id: TestType.OIR, label: 'OIR Test', icon: Lightbulb },
    { id: TestType.PPDT, label: 'PPDT Round', icon: ImageIcon },
    { id: TestType.TAT, label: 'TAT (Psychology)', icon: PenTool },
    { id: TestType.WAT, label: 'WAT (Psychology)', icon: HelpCircle },
    { id: TestType.SRT, label: 'SRT (Psychology)', icon: HelpCircle },
    { id: TestType.SDT, label: 'Self Description', icon: FileSignature },
    { id: TestType.GPE, label: 'GPE (Group Planning)', icon: Map },
    { id: TestType.LECTURETTE, label: 'Lecturette', icon: BookOpen },
    { id: TestType.INTERVIEW, label: '1:1 Personal Interview (Virtual)', icon: Mic }, 
    { id: TestType.AI_BOT, label: 'SSB AI Guide', icon: Bot },
    { id: TestType.CONTACT, label: 'Support Desk', icon: MessageSquare },
  ];

  const handleNavClick = (id: TestType) => {
    // Redirect to login if trying to access Interview while not logged in
    if (id === TestType.INTERVIEW && !isLoggedIn) {
        onLogin?.();
        if (isMobile) setSidebarOpen(false);
        return;
    }

    let cost = 0;
    
    // Apply costs specifically for tests that deduct on entry, consistent with Dashboard
    if (id === TestType.PPDT) cost = TEST_RATES.PPDT;
    else if (id === TestType.TAT) cost = TEST_RATES.TAT;
    else if (id === TestType.WAT) cost = TEST_RATES.WAT;
    else if (id === TestType.SRT) cost = TEST_RATES.SRT;
    else if (id === TestType.SDT) cost = TEST_RATES.SDT;
    // OIR handles cost internally inside the component start action now
    
    // NOTE: Lecturette and Interview deduct internally or are 0 on navigation
    // NOTE: Free resources, Guide, etc., default to 0

    onNavigate(id, { cost });
    if (isMobile) setSidebarOpen(false);
  };

  const getAnnouncementStyles = (type: string) => {
      switch(type) {
          case 'URGENT': return 'bg-red-600 text-white';
          case 'WARNING': return 'bg-yellow-400 text-black';
          case 'SUCCESS': return 'bg-green-600 text-white';
          default: return 'bg-blue-600 text-white';
      }
  };

  const getAnnouncementIcon = (type: string) => {
      switch(type) {
          case 'URGENT': return <Megaphone size={14} className="animate-pulse" />;
          case 'WARNING': return <AlertTriangle size={14} />;
          case 'SUCCESS': return <CheckCircle size={14} />;
          default: return <Info size={14} />;
      }
  };

  // Repeated text for seamless loop effect
  const marqueeContent = Array(10).fill(tickerConfig.message).map((msg, i) => (
      <span key={i} className="flex items-center">
          {msg}
          <span className="mx-8 opacity-50">&bull;</span>
      </span>
  ));

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
                className={`w-full flex items-center gap-3 px-6 py-3 transition-colors text-left relative group ${
                  activeTest === item.id 
                    ? 'bg-white/10 text-yellow-400 border-r-4 border-yellow-400' 
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="font-medium text-sm truncate" title={item.label}>{item.label}</span>
                {item.id === TestType.SCREENING_TEST && (
                    <span className="absolute right-4 bg-emerald-600 text-white text-[8px] px-1.5 py-0.5 rounded font-bold uppercase animate-pulse">NEW</span>
                )}
                {item.id === TestType.INTERVIEW && (
                    <span className="absolute right-4 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" title="Live Core Feature" />
                )}
                {item.id === TestType.CURRENT_AFFAIRS && (
                    <span className="absolute right-4 bg-green-600 text-white text-[8px] px-1.5 py-0.5 rounded font-bold uppercase">LIVE</span>
                )}
                {item.id === TestType.RESOURCES && (
                    <span className="absolute right-4 bg-yellow-400 text-black text-[8px] px-1.5 py-0.5 rounded font-bold uppercase">FREE</span>
                )}
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
                 <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-300 truncate">{user}</p>
                 </div>
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
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        
        {/* HEADER */}
        <header className="bg-white h-16 border-b flex items-center justify-between px-4 md:px-8 shrink-0 z-30 shadow-sm sticky top-0">
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
               || (activeTest === TestType.REFUND ? 'Refund Policy' : '')
               || (activeTest === TestType.GUIDE ? 'Platform Guide' : '')
               || (activeTest === TestType.CURRENT_AFFAIRS ? 'Intelligence Brief' : '')
               || (activeTest === TestType.DAILY_PRACTICE ? 'Daily Challenge' : '')
               || (activeTest === TestType.RESOURCES ? 'SSB Knowledge Bank' : '')
               || (activeTest === TestType.LECTURETTE ? 'Lecturette Simulator' : '')
               || (activeTest === TestType.SCREENING_TEST ? 'Full Screening Simulation' : '')
               || (activeTest === TestType.OIR ? 'OIR Test' : '')}
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
            
            {/* COIN WALLET DISPLAY */}
            {isLoggedIn && (
                <div 
                    onClick={onOpenPayment}
                    className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-full cursor-pointer hover:bg-yellow-100 transition-all group"
                    title="Coin Balance"
                >
                    <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-yellow-900 shadow-sm group-hover:scale-110 transition-transform">
                        <Coins size={12} strokeWidth={3} />
                    </div>
                    <span className="text-xs font-black">{subscription?.coins || 0}</span>
                    <div className="w-4 h-4 bg-slate-900 text-white rounded-full flex items-center justify-center ml-1">
                        <Plus size={10} />
                    </div>
                </div>
            )}

            <div className="flex flex-col items-end hidden md:flex">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                {isLoggedIn ? (isAdmin ? 'Admin Access' : 'Deployment Ready') : 'Guest Access'}
              </span>
              <span className={`text-[10px] font-bold uppercase flex items-center gap-1.5 ${isLoggedIn ? 'text-green-600' : 'text-slate-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isLoggedIn ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                {isLoggedIn ? 'Active' : 'Preview'}
              </span>
            </div>
            
            {/* Notification Bell Dropdown */}
            <div className="relative" ref={dropdownRef}>
                <button 
                    onClick={handleBellClick}
                    className="p-2 hover:bg-slate-100 rounded-xl relative transition-colors"
                >
                    <Bell size={20} className="text-slate-600" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 bg-red-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce shadow-sm">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>

                {showNotifications && (
                    <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[100] animate-in slide-in-from-top-2">
                        <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <h4 className="text-xs font-black uppercase text-slate-900 tracking-widest">Notifications</h4>
                            <span className="text-[10px] font-bold text-slate-400">{notifications.length} recent</span>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">
                                    <Bell size={24} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest">No recent alerts</p>
                                </div>
                            ) : (
                                <ul>
                                    {notifications.map((notif) => (
                                        <li key={notif.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors relative">
                                            <div className="flex gap-3">
                                                <div className={`mt-1 p-1.5 rounded-full h-fit shrink-0 ${
                                                    notif.type === 'URGENT' ? 'bg-red-100 text-red-600' : 
                                                    notif.type === 'SUCCESS' ? 'bg-green-100 text-green-600' :
                                                    notif.type === 'WARNING' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'
                                                }`}>
                                                    {getAnnouncementIcon(notif.type)}
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xs font-bold text-slate-800 leading-snug">{notif.message}</p>
                                                    <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">
                                                        {new Date(notif.created_at).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl border flex items-center justify-center text-white font-black text-xs ${isLoggedIn ? (isAdmin ? 'bg-red-600 border-red-500' : 'bg-slate-900 border-slate-700') : 'bg-slate-200 border-slate-300 text-slate-400'}`}>
              {isLoggedIn ? (user ? user.substring(0,2).toUpperCase() : 'JD') : <User size={16}/>}
            </div>
          </div>
        </header>

        {/* NEWS TICKER (Theme Matched: Navy/Yellow) */}
        {tickerConfig.is_active && activeTest === TestType.DASHBOARD && tickerConfig.message && (
            <div className="w-full bg-slate-900 text-slate-200 overflow-hidden relative z-20 shadow-md h-10 flex items-center border-b border-white/10">
                <div className="absolute left-0 top-0 bottom-0 bg-yellow-400 text-slate-900 px-4 text-[10px] font-black uppercase tracking-widest shrink-0 flex items-center gap-2 z-20 shadow-lg skew-x-[-10deg] -ml-2 pl-6">
                    <span className="w-2 h-2 bg-slate-900 rounded-full animate-pulse skew-x-[10deg]"></span> 
                    <span className="skew-x-[10deg]">Notice</span>
                </div>
                
                {/* Seamless Marquee Container */}
                <div className="flex overflow-hidden w-full h-full items-center relative mask-linear-gradient pl-20">
                    <div 
                        className="animate-marquee flex gap-0 shrink-0 items-center text-xs font-bold uppercase tracking-wide whitespace-nowrap"
                        style={{ '--marquee-duration': `${tickerConfig.speed}s` } as React.CSSProperties}
                    >
                       {marqueeContent}
                    </div>
                    <div 
                        className="animate-marquee flex gap-0 shrink-0 items-center text-xs font-bold uppercase tracking-wide whitespace-nowrap"
                        style={{ '--marquee-duration': `${tickerConfig.speed}s` } as React.CSSProperties}
                    >
                       {marqueeContent}
                    </div>
                </div>
            </div>
        )}

        {/* REAL-TIME ANNOUNCEMENT BANNER (TOASTER) */}
        {showAnnouncement && announcement && (
            <div className={`w-full px-4 py-3 flex items-center justify-between shadow-md relative z-20 animate-in slide-in-from-top duration-500 ${getAnnouncementStyles(announcement.type)}`}>
                <div className="flex items-center gap-3 md:gap-4 container mx-auto max-w-6xl">
                    <div className="p-2 bg-white/20 rounded-full shrink-0">
                        {getAnnouncementIcon(announcement.type)}
                    </div>
                    <div className="flex-1">
                        <p className="text-xs md:text-sm font-bold uppercase tracking-wide leading-tight">
                            {announcement.message}
                        </p>
                        <p className="text-[9px] opacity-80 font-mono mt-0.5">
                            {new Date(announcement.created_at).toLocaleTimeString()}
                        </p>
                    </div>
                    <button 
                        onClick={() => setShowAnnouncement(false)}
                        className="p-1 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
        )}

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
