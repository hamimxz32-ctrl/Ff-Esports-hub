import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings, useAuth, useTheme } from '../App';
import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, limit, onSnapshot, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { Users, Camera, Gamepad2, Trophy, X, Play, Heart, MessageCircle, Eye, Swords, Globe } from 'lucide-react';
import ProfileModal from '../components/ProfileModal';

interface Stats {
  totalRosters: number;
  totalPhotos: number;
  onlinePlayers: number;
  totalVisits: number;
}

export default function Home() {
  const settings = useSettings();
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const [stats, setStats] = useState<Stats>({ totalRosters: 0, totalPhotos: 0, onlinePlayers: 0, totalVisits: 0 });
  const [visitors, setVisitors] = useState<any[]>([]);
  const [selectedUserUid, setSelectedUserUid] = useState<string | null>(null);

  useEffect(() => {
    // Fetch stats
    const fetchStats = async () => {
      const rostersSnap = await getDocs(query(collection(db, 'rosters'), where('status', '==', 'approved')));
      const photosSnap = await getDocs(query(collection(db, 'gallery'), where('status', '==', 'approved')));
      const usersSnap = await getDocs(query(collection(db, 'users'), where('isOnline', '==', true)));
      const visitsSnap = await getDocs(collection(db, 'visits'));
      
      setStats({
        totalRosters: rostersSnap.docs.length,
        totalPhotos: photosSnap.docs.length,
        onlinePlayers: usersSnap.docs.length,
        totalVisits: visitsSnap.docs.length,
      });
    };
    fetchStats();

    // Fetch Recent Visitors
    const vq = query(collection(db, 'visits'), orderBy('timestamp', 'desc'), limit(20));
    const unsubscribe = onSnapshot(vq, (snapshot) => {
      const uniqueVisitors: any[] = [];
      const seenUids = new Set();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!seenUids.has(data.uid)) {
          seenUids.add(data.uid);
          uniqueVisitors.push(data);
        }
      });
      setVisitors(uniqueVisitors);
    });
  }, []);

  const handleViewUser = (uid: string) => {
    setSelectedUserUid(uid);
  };

  const SECTIONS = [
    { id: 'rosters', name: settings.rosterTitle, desc: settings.rosterDesc, color: darkMode ? 'bg-orange-900/20 text-orange-400 border-orange-500/30' : 'bg-orange-100 text-orange-600 border-orange-200', path: '/rosters' },
    { id: 'album', name: settings.albumTitle, desc: settings.albumDesc, color: darkMode ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-600 border-emerald-200', path: '/album' },
    { id: 'topTeams', name: settings.topTeamsTitle, desc: settings.topTeamsDesc, color: darkMode ? 'bg-yellow-900/20 text-yellow-500 border-yellow-500/30' : 'bg-yellow-50 text-yellow-600 border-yellow-100', path: '/top-teams' },
    { id: 'recruitment', name: settings.recruitmentTitle, desc: settings.recruitmentDesc, color: darkMode ? 'bg-pink-900/20 text-pink-400 border-pink-500/30' : 'bg-pink-100 text-pink-600 border-pink-200', path: '/recruitment' },
    { id: 'profile', name: 'My Profile', desc: 'Manage your esports identity.', color: darkMode ? 'bg-blue-900/20 text-blue-400 border-blue-500/30' : 'bg-blue-100 text-blue-600 border-blue-200', path: '/profile' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-16"
    >
      {/* User Instruction */}
      <div className={`text-center py-4 px-8 rounded-3xl border ${darkMode ? 'bg-zinc-900/80 border-blue-500/50 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'bg-blue-50 border-blue-100 text-blue-600'} max-w-3xl mx-auto backdrop-blur-md relative overflow-hidden group`}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        <p className="text-xs font-black uppercase tracking-[0.25em] italic relative z-10">
          All main features and pages can be accessed from the navigation bar above. Scroll down to explore more sections of the platform.
        </p>
      </div>

      {/* Hero Section */}
      <div className="text-center space-y-6 pt-4">
        <h1 className={`text-6xl sm:text-9xl font-black tracking-tighter uppercase italic leading-none ${darkMode ? 'text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]' : 'text-zinc-900'}`}>
          {settings.heroTitle}
        </h1>
        <p className={`font-medium max-w-xl mx-auto text-lg ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
          {settings.heroSubtitle}
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
        {SECTIONS.map((section, idx) => (
          <Link 
            key={section.id} 
            to={section.path}
            className={`group relative overflow-hidden rounded-[3rem] p-12 h-72 flex flex-col justify-center items-center transition-all hover:scale-[1.03] active:scale-95 ${section.color} border-2 shadow-sm hover:shadow-2xl ${darkMode ? 'hover:shadow-blue-500/10' : 'hover:shadow-pink-100'}`}
          >
            <div className="text-center space-y-3 relative z-10">
              <h2 className="text-4xl font-black uppercase italic leading-none tracking-tighter">{section.name}</h2>
              <p className="text-[11px] font-bold opacity-60 tracking-[0.25em] uppercase">{section.desc}</p>
            </div>
            <span className="absolute top-8 right-10 text-5xl font-black opacity-5 italic">0{idx + 1}</span>
            <div className={`absolute -right-8 -bottom-8 w-40 h-40 ${darkMode ? 'bg-white/5' : 'bg-white/40'} rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000`} />
          </Link>
        ))}

        {/* Esports Stats Card */}
        <div className={`rounded-[3rem] p-12 text-white flex flex-col justify-center space-y-8 border-2 shadow-2xl ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-900 border-zinc-800'}`}>
          <div className="flex items-center gap-4">
            <Trophy className="text-blue-400 w-8 h-8 drop-shadow-[0_0_12px_rgba(96,165,250,0.8)]" />
            <h2 className="text-3xl font-black uppercase italic tracking-tighter">Hub Stats</h2>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Team Rosters</p>
              <p className="text-4xl font-black italic text-white">{stats.totalRosters}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Album Photos</p>
              <p className="text-4xl font-black italic text-orange-400">{stats.totalPhotos}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Players Online</p>
              <p className="text-4xl font-black italic text-emerald-400">{stats.onlinePlayers}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Total Visits</p>
              <p className="text-4xl font-black italic text-blue-400">{stats.totalVisits}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Link 
          to="/esports-pages"
          className={`group relative overflow-hidden rounded-[2.5rem] p-8 border-2 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-between ${darkMode ? 'bg-zinc-950 border-blue-500/30 hover:border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'bg-blue-50 border-blue-100 hover:border-blue-200'}`}
        >
          <div className="flex items-center gap-6 relative z-10">
            <div className="p-4 bg-blue-500 rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.5)]">
              <Globe className="w-8 h-8 text-white animate-spin-slow" />
            </div>
            <div>
              <h3 className={`text-2xl font-black uppercase italic tracking-tighter ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Visit Pages</h3>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Access all esports community pages</p>
            </div>
          </div>
          <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-blue-500/10 to-transparent" />
        </Link>

        <a 
          href={settings.supportTelegram}
          target="_blank"
          rel="noreferrer"
          className={`group relative overflow-hidden rounded-[2.5rem] p-8 border-2 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-between ${darkMode ? 'bg-zinc-950 border-emerald-500/30 hover:border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-emerald-50 border-emerald-100 hover:border-emerald-200'}`}
        >
          <div className="flex items-center gap-6 relative z-10">
            <div className="p-4 bg-emerald-500 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.5)]">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className={`text-2xl font-black uppercase italic tracking-tighter ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Support System</h3>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Get help from our management team</p>
            </div>
          </div>
          <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-emerald-500/10 to-transparent" />
        </a>
      </div>

      {/* FF Esports Hub Section */}
      <div className="space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-5xl font-black uppercase italic tracking-tighter text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.4)]">FF Esports Hub</h2>
          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.4em]">Everything you need for the competitive scene</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { name: 'Team Management', icon: Users, path: '/rosters', color: 'text-emerald-500' },
            { name: 'Top Rankings', icon: Trophy, path: '/top-teams', color: 'text-yellow-500' },
            { name: 'Recruitment Center', icon: Gamepad2, path: '/recruitment', color: 'text-purple-500' },
            { name: 'Global Community', icon: MessageCircle, path: '/group-chat', color: 'text-amber-500' },
            { name: 'Team Challenges', icon: Swords, path: '/friends', color: 'text-red-500' },
            { name: 'Media Gallery', icon: Camera, path: '/album', color: 'text-cyan-500' },
          ].map((item, idx) => (
            <Link 
              key={idx}
              to={item.path}
              className={`group p-10 rounded-[3rem] border ${darkMode ? 'bg-zinc-900 border-zinc-800 hover:border-blue-500/50' : 'bg-white border-zinc-100 hover:bg-zinc-50'} transition-all shadow-sm hover:shadow-2xl flex flex-col items-center text-center gap-8 relative overflow-hidden`}
            >
              <div className={`p-6 rounded-3xl ${darkMode ? 'bg-zinc-800' : 'bg-zinc-50'} group-hover:scale-110 group-hover:rotate-12 transition-all duration-700 relative z-10`}>
                <item.icon className={`w-12 h-12 ${item.color} drop-shadow-[0_0_10px_currentColor]`} />
              </div>
              <h3 className="font-black uppercase italic text-lg tracking-tight relative z-10">{item.name}</h3>
              <div className={`absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-${item.color.split('-')[1]}-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Visitors */}
      <div className={`${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-100'} rounded-[3.5rem] p-16 border shadow-2xl space-y-12 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 blur-[120px] -mr-48 -mt-48" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <Users className="text-blue-400 w-8 h-8 drop-shadow-[0_0_12px_rgba(96,165,250,0.8)]" />
            <h2 className={`text-3xl font-black uppercase italic tracking-tighter ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Recent Visitors</h2>
          </div>
          <span className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.3em] bg-zinc-800/50 px-6 py-3 rounded-full border border-zinc-700/50">{visitors.length} Squad Members</span>
        </div>
        
        <div className="flex flex-wrap gap-6 relative z-10">
          {visitors.map((visitor, idx) => (
            <motion.button 
              key={idx}
              onClick={() => handleViewUser(visitor.uid)}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: idx * 0.02, type: 'spring', stiffness: 260, damping: 20 }}
              className="group relative active:scale-90 transition-transform"
            >
              <img 
                src={visitor.photoURL || `https://picsum.photos/seed/${visitor.uid}/100/100`} 
                alt={visitor.displayName} 
                className={`w-16 h-16 rounded-2xl object-cover border-2 ${darkMode ? 'border-zinc-800' : 'border-zinc-50'} group-hover:border-blue-500 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all duration-500`}
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] font-black uppercase italic px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-500 whitespace-nowrap z-20 shadow-2xl border border-white/10 translate-y-4 group-hover:translate-y-0">
                {visitor.displayName}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* User Profile Modal */}
      <AnimatePresence>
        {selectedUserUid && (
          <ProfileModal 
            uid={selectedUserUid} 
            onClose={() => setSelectedUserUid(null)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
