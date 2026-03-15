import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth, useSettings, useTheme } from '../App';
import { LogIn, LogOut, Home, Sun, Moon, Users, Image, MessageSquare, UserPlus, HelpCircle, LayoutGrid, MessagesSquare, Globe, Trophy, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SearchModal from './SearchModal';

export default function Navbar() {
  const { user, userData, isAdmin } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const settings = useSettings();
  const location = useLocation();
  const navigate = useNavigate();

  const [showSearch, setShowSearch] = useState(false);

  const handleLogout = () => signOut(auth);

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-esports-bg/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-[1200px] mx-auto px-4 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="font-black text-2xl tracking-tighter uppercase italic text-esports-primary">{settings.siteTitle}</span>
        </Link>

          <div className="flex items-center gap-1 sm:gap-2">
            <button 
              onClick={toggleDarkMode}
              className="p-3 rounded-xl text-esports-text-muted hover:bg-white/5 transition-colors"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button 
              onClick={() => setShowSearch(true)}
              className="p-3 rounded-xl text-esports-text-muted hover:bg-white/5 transition-colors"
              title="Search Hub"
            >
              <Search className="w-5 h-5" />
            </button>

            <div className="hidden lg:flex items-center gap-1">
            <Link to="/rosters" className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${location.pathname === '/rosters' ? 'text-esports-primary bg-esports-primary/10' : 'text-esports-text-muted hover:bg-white/5'}`}>
              <Users className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase italic tracking-widest">Rosters</span>
            </Link>
            <Link to="/album" className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${location.pathname === '/album' ? 'text-esports-primary bg-esports-primary/10' : 'text-esports-text-muted hover:bg-white/5'}`}>
              <Image className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase italic tracking-widest">Album</span>
            </Link>
            <Link to="/recruitment" className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${location.pathname === '/recruitment' ? 'text-esports-primary bg-esports-primary/10' : 'text-esports-text-muted hover:bg-white/5'}`}>
              <UserPlus className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase italic tracking-widest">Recruit</span>
            </Link>
            <Link to="/message-board" className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${location.pathname === '/message-board' ? 'text-esports-primary bg-esports-primary/10' : 'text-esports-text-muted hover:bg-white/5'}`}>
              <LayoutGrid className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase italic tracking-widest">Board</span>
            </Link>
            <Link to="/group-chat" className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${location.pathname === '/group-chat' ? 'text-esports-primary bg-esports-primary/10' : 'text-esports-text-muted hover:bg-white/5'}`}>
              <MessagesSquare className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase italic tracking-widest">Chat</span>
            </Link>
            <Link to="/top-teams" className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${location.pathname === '/top-teams' ? 'text-esports-primary bg-esports-primary/10' : 'text-esports-text-muted hover:bg-white/5'}`}>
              <Trophy className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase italic tracking-widest">Top Teams</span>
            </Link>
          </div>

          <div className="flex lg:hidden items-center gap-1">
            <Link to="/message-board" className="p-2 text-esports-text-muted"><LayoutGrid className="w-5 h-5" /></Link>
            <Link to="/group-chat" className="p-2 text-esports-text-muted"><MessagesSquare className="w-5 h-5" /></Link>
          </div>
            {user && (
              <Link to="/friends" className={`p-3 rounded-xl transition-colors ${location.pathname === '/friends' ? 'text-esports-primary bg-esports-primary/10' : 'text-esports-text-muted hover:bg-white/5'}`} title="Friends & Messages">
                <MessageSquare className="w-5 h-5" />
              </Link>
            )}

          {location.pathname !== '/' && (
            <Link to="/" className="p-3 rounded-xl text-esports-text-muted hover:bg-white/5 transition-colors">
              <Home className="w-5 h-5" />
            </Link>
          )}
          
          {isAdmin && (
            <Link 
              to="/admin" 
              className={`px-5 py-2 rounded-xl text-xs font-black uppercase italic tracking-widest transition-all ${
                location.pathname === '/admin' 
                ? 'bg-esports-primary text-white' 
                : 'bg-white/5 text-esports-text-muted hover:bg-white/10'
              }`}
            >
              Admin
            </Link>
          )}

          {user ? (
            <div className="flex items-center gap-3">
              <Link 
                to="/profile"
                className={`flex items-center gap-2 p-1 pr-4 rounded-xl transition-all border ${location.pathname === '/profile' ? 'bg-esports-primary/10 border-esports-primary/50' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
              >
                <img 
                  src={userData?.photoURL || user.photoURL || ''} 
                  alt={userData?.displayName || user.displayName || ''} 
                  className="w-8 h-8 rounded-lg border border-white/10"
                  referrerPolicy="no-referrer"
                />
                <span className="text-[10px] font-black uppercase italic tracking-widest hidden sm:block text-esports-text">{userData?.displayName || user.displayName}</span>
              </Link>
              <button 
                onClick={handleLogout}
                className="p-3 rounded-xl text-esports-text-muted hover:text-esports-primary hover:bg-esports-primary/10 transition-all"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="flex items-center gap-2 px-6 py-2.5 bg-esports-primary text-white rounded-xl text-xs font-black uppercase italic tracking-widest hover:bg-red-600 transition-all active:scale-95 shadow-lg shadow-red-500/20"
            >
              <LogIn className="w-4 h-4" />
              Login
            </button>
          )}
        </div>
      </div>
      <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} darkMode={true} />
    </nav>
  );
}
