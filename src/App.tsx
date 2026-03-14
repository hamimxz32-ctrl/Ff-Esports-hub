import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useState, useEffect, createContext, useContext } from 'react';
import { auth, db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import Rosters from './pages/Rosters';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import Friends from './pages/Friends';
import Chat from './pages/Chat';
import Recruitment from './pages/Recruitment';
import Login from './pages/Login';
import MessageBoard from './pages/MessageBoard';
import GroupChat from './pages/GroupChat';
import EsportsPages from './pages/EsportsPages';
import TopTeams from './pages/TopTeams';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  userData: any;
  loading: boolean;
  isAdmin: boolean;
  openProfile: () => void;
}

export interface Settings {
  siteTitle: string;
  heroTitle: string;
  heroSubtitle: string;
  rosterTitle: string;
  rosterDesc: string;
  albumTitle: string;
  albumDesc: string;
  recruitmentTitle: string;
  recruitmentDesc: string;
  messageBoardTitle: string;
  messageBoardDesc: string;
  topTeamsTitle: string;
  topTeamsDesc: string;
  esportsPagesTitle: string;
  esportsPagesDesc: string;
  friendsTitle: string;
  friendsDesc: string;
  groupChatTitle: string;
  groupChatDesc: string;
  fontFamily: string;
  supportTelegram: string;
  creatorName: string;
  creatorLink: string;
}

const DEFAULT_SETTINGS: Settings = {
  siteTitle: 'FF Esports Hub',
  heroTitle: 'Free Fire Esports Hub',
  heroSubtitle: 'Register your squad, share your epic booyahs, and dominate the leaderboard.',
  rosterTitle: 'Team Rosters',
  rosterDesc: 'Browse and register official team rosters for the upcoming tournaments.',
  albumTitle: 'Esports Album',
  albumDesc: 'Capture and share the most intense moments from our matches.',
  recruitmentTitle: 'Recruitment',
  recruitmentDesc: 'Find your next team or recruit top talent for your squad.',
  messageBoardTitle: 'Message Board',
  messageBoardDesc: 'Share your thoughts, announcements, and tips with the community.',
  topTeamsTitle: 'Top Teams',
  topTeamsDesc: 'The elite squads dominating the current competitive scene.',
  esportsPagesTitle: 'Esports Pages',
  esportsPagesDesc: 'Official pages for news, production, management, memes, and more.',
  friendsTitle: 'Community Friends',
  friendsDesc: 'Connect with other players and build your esports network.',
  groupChatTitle: 'Global Group Chat',
  groupChatDesc: 'Real-time conversation with the entire community.',
  fontFamily: 'Inter',
  supportTelegram: 'https://t.me/admin',
  creatorName: 'hamim miah',
  creatorLink: 'https://t.me/hamimmiahh',
};

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  userData: null,
  loading: true, 
  isAdmin: false,
  openProfile: () => {}
});

const SettingsContext = createContext<Settings>(DEFAULT_SETTINGS);
const ThemeContext = createContext<{ darkMode: boolean; toggleDarkMode: () => void }>({ darkMode: false, toggleDarkMode: () => {} });

export const useAuth = () => useContext(AuthContext);
export const useSettings = () => useContext(SettingsContext);
export const useTheme = () => useContext(ThemeContext);

import { setDoc, serverTimestamp, addDoc, collection, getDoc, updateDoc } from 'firebase/firestore';
import { User as FirebaseUser, updateProfile } from 'firebase/auth';

function AppContent() {
  const { user, loading } = useAuth();
  const settings = useSettings();
  const { darkMode } = useTheme();
  const location = useLocation();

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-zinc-950' : 'bg-[#fafafa]'}`}>
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-12 h-12 border-4 border-pink-400 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div 
      className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-[#fafafa] text-zinc-800'} selection:bg-pink-200`}
      style={{ fontFamily: settings.fontFamily === 'Mono' ? 'JetBrains Mono, monospace' : 'Inter, sans-serif' }}
    >
      <Navbar />
      <main className="pt-20 pb-12 px-4 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/rosters" element={<Rosters />} />
              <Route path="/album" element={<Gallery />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/chat/:chatId" element={<Chat />} />
              <Route path="/recruitment" element={<Recruitment />} />
              <Route path="/message-board" element={<MessageBoard />} />
              <Route path="/group-chat" element={<GroupChat />} />
              <Route path="/esports-pages" element={<EsportsPages />} />
              <Route path="/top-teams" element={<TopTeams />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/login" element={<Login />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAdmin(u?.email === 'hamimxz32@gmail.com');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setUserData(null);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    
    // Listen to user data in Firestore
    const unsubscribeUserDoc = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setUserData(doc.data());
      }
    });

    // Track visit and update profile
    const trackUser = async () => {
      try {
        const userSnap = await getDoc(userRef);
        const currentData = userSnap.exists() ? userSnap.data() : null;

        await addDoc(collection(db, 'visits'), {
          uid: user.uid,
          displayName: currentData?.displayName || user.displayName || 'Anonymous',
          photoURL: currentData?.photoURL || user.photoURL || '',
          timestamp: serverTimestamp()
        });
        
        const updateData: any = {
          uid: user.uid,
          isOnline: true,
          lastActive: serverTimestamp()
        };

        // Only set displayName and photoURL if they don't exist in Firestore
        // This prevents overwriting custom profile data with stale Auth data
        if (!userSnap.exists()) {
          updateData.displayName = user.displayName || 'Anonymous';
          updateData.photoURL = user.photoURL || '';
        }
        
        await setDoc(userRef, updateData, { merge: true });
      } catch (error) {
        console.error('User tracking failed:', error);
      }
    };

    trackUser();

    const handleVisibilityChange = () => {
      updateDoc(userRef, { 
        isOnline: document.visibilityState === 'visible', 
        lastActive: serverTimestamp() 
      }).catch(console.error);
    };

    const handleUnload = () => {
      updateDoc(userRef, { isOnline: false, lastActive: serverTimestamp() }).catch(console.error);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleUnload);
    
    return () => {
      unsubscribeUserDoc();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleUnload);
      updateDoc(userRef, { isOnline: false, lastActive: serverTimestamp() }).catch(console.error);
    };
  }, [user]);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        setSettings({ ...DEFAULT_SETTINGS, ...doc.data() });
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading, isAdmin, openProfile: () => {} }}>
      <ThemeContext.Provider value={{ darkMode, toggleDarkMode: () => setDarkMode(!darkMode) }}>
        <SettingsContext.Provider value={settings}>
          <Router>
            <AppContent />
          </Router>
        </SettingsContext.Provider>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}

