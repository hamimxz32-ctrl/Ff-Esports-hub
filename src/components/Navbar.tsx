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
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${darkMode ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white/80 border-zinc-100'} backdrop-blur-md border-b`}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <span className={`font-black text-2xl tracking-tighter uppercase italic ${darkMode ? 'text-pink-400' : 'text-pink-500'}`}>{settings.siteTitle}</span>
        </Link>

          <div className="flex items-center gap-1 sm:gap-2">
            <button 
              onClick={() => setShowSearch(true)}
              className={`p-2 rounded-full transition-colors ${darkMode ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'}`}
              title="Search Hub"
            >
              <Search className="w-5 h-5" />
            </button>

            <div className="hidden lg:flex items-center gap-1">
            <Link to="/rosters" className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${location.pathname === '/rosters' ? 'text-pink-500 bg-pink-50 dark:bg-pink-900/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
              <Users className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase italic tracking-widest">Rosters</span>
            </Link>
            <Link to="/album" className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${location.pathname === '/album' ? 'text-pink-500 bg-pink-50 dark:bg-pink-900/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
              <Image className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase italic tracking-widest">Album</span>
            </Link>
            <Link to="/recruitment" className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${location.pathname === '/recruitment' ? 'text-pink-500 bg-pink-50 dark:bg-pink-900/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
              <UserPlus className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase italic tracking-widest">Recruit</span>
            </Link>
            <Link to="/message-board" className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${location.pathname === '/message-board' ? 'text-pink-500 bg-pink-50 dark:bg-pink-900/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
              <LayoutGrid className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase italic tracking-widest">Board</span>
            </Link>
            <Link to="/group-chat" className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${location.pathname === '/group-chat' ? 'text-pink-500 bg-pink-50 dark:bg-pink-900/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
              <MessagesSquare className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase italic tracking-widest">Chat</span>
            </Link>
            <Link to="/top-teams" className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${location.pathname === '/top-teams' ? 'text-pink-500 bg-pink-50 dark:bg-pink-900/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
              <Trophy className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase italic tracking-widest">Top Teams</span>
            </Link>
          </div>

          <div className="flex lg:hidden items-center gap-1">
            <Link to="/message-board" className="p-2 text-zinc-500"><LayoutGrid className="w-5 h-5" /></Link>
            <Link to="/group-chat" className="p-2 text-zinc-500"><MessagesSquare className="w-5 h-5" /></Link>
          </div>
            {user && (
              <Link to="/friends" className={`p-2 rounded-full transition-colors ${location.pathname === '/friends' ? 'text-pink-400 bg-pink-50 dark:bg-pink-900/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`} title="Friends & Messages">
                <MessageSquare className="w-5 h-5" />
              </Link>
            )}

          <button 
            onClick={toggleDarkMode}
            className={`p-2 rounded-full transition-colors ${darkMode ? 'text-amber-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'}`}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {location.pathname !== '/' && (
            <Link to="/" className={`p-2 rounded-full transition-colors ${darkMode ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-600 hover:bg-zinc-100'}`}>
              <Home className="w-5 h-5" />
            </Link>
          )}
          
          {isAdmin && (
            <Link 
              to="/admin" 
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                location.pathname === '/admin' 
                ? 'bg-pink-400 text-white' 
                : darkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              Admin
            </Link>
          )}

          {user ? (
            <div className="flex items-center gap-3">
              <Link 
                to="/profile"
                className={`flex items-center gap-2 p-1 pr-3 rounded-full transition-all border ${darkMode ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700' : 'bg-zinc-50 border-zinc-100 hover:bg-zinc-100'} ${location.pathname === '/profile' ? 'border-pink-400 ring-1 ring-pink-400' : ''}`}
              >
                <img 
                  src={userData?.photoURL || user.photoURL || ''} 
                  alt={userData?.displayName || user.displayName || ''} 
                  className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-600"
                  referrerPolicy="no-referrer"
                />
                <span className={`text-xs font-bold hidden sm:block ${darkMode ? 'text-zinc-300' : 'text-zinc-600'}`}>{userData?.displayName || user.displayName}</span>
              </Link>
              <button 
                onClick={handleLogout}
                className={`p-2 rounded-full transition-all ${darkMode ? 'text-zinc-500 hover:text-red-400 hover:bg-zinc-800' : 'text-zinc-400 hover:text-red-500 hover:bg-red-50'}`}
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="flex items-center gap-2 px-4 py-1.5 bg-pink-400 text-white rounded-full text-sm font-bold hover:bg-pink-500 transition-all active:scale-95 shadow-sm"
            >
              <LogIn className="w-4 h-4" />
              Login
            </button>
          )}
        </div>
      </div>
      <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} darkMode={darkMode} />
    </nav>
  );
}
