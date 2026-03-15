import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings, useAuth, useTheme } from '../App';
import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, limit, onSnapshot, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { Users, Camera, Gamepad2, Trophy, X, Play, Heart, MessageCircle, Eye, Swords, Globe, Star, Medal, ArrowRight, ExternalLink, ShieldCheck, UserPlus, Image as ImageIcon, Facebook, Youtube } from 'lucide-react';
import ProfileModal from '../components/ProfileModal';

interface Stats {
  totalRosters: number;
  totalPhotos: number;
  onlinePlayers: number;
  totalVisits: number;
}

interface Champion {
  id: string;
  teamName: string;
  tournamentName?: string;
  imageUrl: string;
  caption: string;
  createdAt: any;
}

interface TopTeam {
  id: string;
  name: string;
  rank: number;
  logoUrl: string;
  description: string;
}

interface Roster {
  id: string;
  teamName: string;
  teamLogo?: string;
  players: any[];
}

interface RecruitmentPost {
  id: string;
  authorName: string;
  authorPhoto: string;
  type: 'player' | 'team';
  requirements?: { role?: string };
  createdAt: any;
}

interface Photo {
  id: string;
  imageUrl: string;
  caption?: string;
}

interface EsportsPage {
  id: string;
  title: string;
  description: string;
  logoUrl?: string;
  socialLinks: { facebook?: string; whatsapp?: string; youtube?: string };
}

export default function Home() {
  const settings = useSettings();
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ totalRosters: 0, totalPhotos: 0, onlinePlayers: 0, totalVisits: 0 });
  const [visitors, setVisitors] = useState<any[]>([]);
  const [selectedUserUid, setSelectedUserUid] = useState<string | null>(null);
  const [champions, setChampions] = useState<Champion[]>([]);
  const [topTeams, setTopTeams] = useState<TopTeam[]>([]);
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [recruitment, setRecruitment] = useState<RecruitmentPost[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pages, setPages] = useState<EsportsPage[]>([]);

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
    const unsubscribeVisitors = onSnapshot(vq, (snapshot) => {
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

    // Fetch Champions
    const cq = query(collection(db, 'champions'), orderBy('createdAt', 'desc'), limit(10));
    const unsubscribeChampions = onSnapshot(cq, (snapshot) => {
      setChampions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Champion)));
    });

    // Fetch Top Teams
    const ttq = query(collection(db, 'topTeams'), orderBy('rank', 'asc'), limit(6));
    const unsubscribeTopTeams = onSnapshot(ttq, (snapshot) => {
      setTopTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TopTeam)));
    });

    // Fetch Rosters
    const rq = query(collection(db, 'rosters'), where('status', '==', 'approved'), orderBy('createdAt', 'desc'), limit(6));
    const unsubscribeRosters = onSnapshot(rq, (snapshot) => {
      setRosters(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Roster)));
    });

    // Fetch Recruitment
    const recq = query(collection(db, 'recruitment'), where('status', '==', 'approved'), orderBy('createdAt', 'desc'), limit(6));
    const unsubscribeRecruitment = onSnapshot(recq, (snapshot) => {
      setRecruitment(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecruitmentPost)));
    });

    // Fetch Photos
    const pq = query(collection(db, 'gallery'), where('status', '==', 'approved'), orderBy('createdAt', 'desc'), limit(6));
    const unsubscribePhotos = onSnapshot(pq, (snapshot) => {
      setPhotos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Photo)));
    });

    // Fetch Pages
    const pageq = query(collection(db, 'esportsPages'), orderBy('createdAt', 'desc'), limit(6));
    const unsubscribePages = onSnapshot(pageq, (snapshot) => {
      setPages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EsportsPage)));
    });

    return () => {
      unsubscribeVisitors();
      unsubscribeChampions();
      unsubscribeTopTeams();
      unsubscribeRosters();
      unsubscribeRecruitment();
      unsubscribePhotos();
      unsubscribePages();
    };
  }, []);

  const handleViewUser = (uid: string) => {
    setSelectedUserUid(uid);
  };

  return (
    <div className="space-y-20">
      {/* Hero Section */}
      <section className="relative h-[600px] rounded-[3rem] overflow-hidden group">
        <div className="absolute inset-0">
          <img 
            src={settings.heroImageUrl || champions[0]?.imageUrl || "https://picsum.photos/seed/esports/1920/1080"} 
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            alt="Hero Banner"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-esports-bg via-esports-bg/40 to-transparent" />
        </div>
        
        <div className="relative h-full flex flex-col justify-center items-center text-center px-6 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h1 className="text-5xl md:text-8xl font-black uppercase italic tracking-tighter text-white drop-shadow-2xl">
              {settings.heroTitle.split(' ').map((word, i) => (
                <span key={i} className={i === 1 ? 'text-esports-primary' : ''}>{word} </span>
              ))}
            </h1>
            <p className="text-esports-text-muted text-lg md:text-xl max-w-2xl mx-auto font-medium">
              {settings.heroSubtitle}
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <Link to="/rosters" className="px-8 py-4 bg-esports-primary text-white rounded-2xl font-black uppercase italic tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 active:scale-95">
              Upload Roster
            </Link>
            <Link to="/recruitment" className="px-8 py-4 bg-esports-card text-esports-text rounded-2xl font-black uppercase italic tracking-widest hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shadow-lg active:scale-95 border border-white/5">
              Recruit Players
            </Link>
            <Link to="/top-teams" className="px-8 py-4 bg-zinc-800 text-white rounded-2xl font-black uppercase italic tracking-widest hover:bg-zinc-700 transition-all shadow-lg active:scale-95">
              Explore Teams
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Top Teams Section */}
      <section className="space-y-10 py-20">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h2 className="text-4xl font-black uppercase italic tracking-tighter flex items-center gap-3">
              <Trophy className="text-esports-primary w-8 h-8" />
              Top <span className="text-esports-primary">Teams</span>
            </h2>
            <p className="text-esports-text-muted text-xs font-bold uppercase tracking-widest">The elite squads of the community</p>
          </div>
          <Link to="/top-teams" className="text-esports-primary font-black uppercase italic text-xs tracking-widest hover:translate-x-2 transition-transform flex items-center gap-2">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {topTeams.map((team) => (
            <Link 
              key={team.id} 
              to="/top-teams"
              className="bg-esports-card rounded-[2.5rem] p-8 border border-white/5 hover:border-esports-primary/30 transition-all hover:shadow-2xl hover:shadow-red-500/5 group"
            >
              <div className="flex items-center gap-6">
                <div className="relative">
                  <img src={team.logoUrl} className="w-20 h-20 rounded-2xl object-cover border-2 border-white/10 group-hover:border-esports-primary transition-colors" alt={team.name} />
                  <div className="absolute -top-3 -left-3 w-8 h-8 bg-esports-primary text-white rounded-lg flex items-center justify-center font-black italic shadow-lg">
                    #{team.rank}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase italic text-esports-text">{team.name}</h3>
                  <p className="text-xs text-esports-text-muted line-clamp-2 mt-1">{team.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Team Rosters Section */}
      <section className="space-y-10 py-20">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h2 className="text-4xl font-black uppercase italic tracking-tighter flex items-center gap-3">
              <Users className="text-esports-secondary w-8 h-8" />
              Team <span className="text-esports-secondary">Rosters</span>
            </h2>
            <p className="text-esports-text-muted text-xs font-bold uppercase tracking-widest">Official registered squads</p>
          </div>
          <Link to="/rosters" className="text-esports-secondary font-black uppercase italic text-xs tracking-widest hover:translate-x-2 transition-transform flex items-center gap-2">
            Explore All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {rosters.map((roster) => (
            <div key={roster.id} className="bg-esports-card rounded-[2.5rem] p-8 border border-white/5 hover:border-esports-secondary/30 transition-all group">
              <div className="flex flex-col items-center text-center space-y-6">
                <img src={roster.teamLogo || "https://picsum.photos/seed/team/200/200"} className="w-24 h-24 rounded-[2rem] object-cover border-4 border-white/5 group-hover:border-esports-secondary transition-all" alt={roster.teamName} />
                <h3 className="text-2xl font-black uppercase italic text-esports-text">{roster.teamName}</h3>
                <div className="flex gap-3 w-full">
                  <Link to="/rosters" className="flex-1 py-3 bg-zinc-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-esports-secondary transition-colors">
                    View Roster
                  </Link>
                  <Link to="/friends" className="flex-1 py-3 border border-white/10 text-esports-text rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                    Challenge
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recruitment Section */}
      <section className="space-y-10 py-20">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h2 className="text-4xl font-black uppercase italic tracking-tighter flex items-center gap-3">
              <UserPlus className="text-esports-primary w-8 h-8" />
              Recruitment <span className="text-esports-primary">Center</span>
            </h2>
            <p className="text-esports-text-muted text-xs font-bold uppercase tracking-widest">Find your next squad or player</p>
          </div>
          <Link to="/recruitment" className="text-esports-primary font-black uppercase italic text-xs tracking-widest hover:translate-x-2 transition-transform flex items-center gap-2">
            Join Now <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {recruitment.map((post) => (
            <div key={post.id} className="bg-esports-card rounded-[2.5rem] p-8 border border-white/5 hover:border-esports-primary/30 transition-all">
              <div className="flex items-center gap-4 mb-6">
                <img src={post.authorPhoto} className="w-12 h-12 rounded-xl object-cover" alt={post.authorName} />
                <div>
                  <h4 className="text-sm font-black uppercase italic text-esports-text">{post.authorName}</h4>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${post.type === 'player' ? 'text-blue-400' : 'text-esports-primary'}`}>
                    Looking for {post.type === 'player' ? 'Team' : 'Players'}
                  </span>
                </div>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl mb-6">
                <p className="text-xs text-esports-text-muted font-medium">
                  Role: <span className="text-esports-text font-bold">{post.requirements?.role || 'Any'}</span>
                </p>
              </div>
              <Link to="/recruitment" className="block w-full py-4 bg-zinc-800 text-white rounded-2xl text-center text-[10px] font-black uppercase tracking-widest hover:bg-esports-primary transition-all">
                View Details
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Album Section */}
      <section className="space-y-10 py-20">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h2 className="text-4xl font-black uppercase italic tracking-tighter flex items-center gap-3">
              <Camera className="text-esports-secondary w-8 h-8" />
              Community <span className="text-esports-secondary">Album</span>
            </h2>
            <p className="text-esports-text-muted text-xs font-bold uppercase tracking-widest">Epic moments captured by players</p>
          </div>
          <Link to="/album" className="text-esports-secondary font-black uppercase italic text-xs tracking-widest hover:translate-x-2 transition-transform flex items-center gap-2">
            View Gallery <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {photos.map((photo) => (
            <Link 
              key={photo.id} 
              to="/album"
              className="group relative aspect-square rounded-[2rem] overflow-hidden border border-white/5"
            >
              <img src={photo.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={photo.caption} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-6">
                <p className="text-white text-[10px] font-black uppercase italic truncate">{photo.caption}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Pages Section */}
      <section className="space-y-10 py-20">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h2 className="text-4xl font-black uppercase italic tracking-tighter flex items-center gap-3">
              <Globe className="text-blue-400 w-8 h-8" />
              Esports <span className="text-blue-400">Pages</span>
            </h2>
            <p className="text-esports-text-muted text-xs font-bold uppercase tracking-widest">Official community resources</p>
          </div>
          <Link to="/esports-pages" className="text-blue-400 font-black uppercase italic text-xs tracking-widest hover:translate-x-2 transition-transform flex items-center gap-2">
            Explore All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {pages.map((page) => (
            <div key={page.id} className="bg-esports-card rounded-[2.5rem] p-8 border border-white/5 hover:border-blue-500/30 transition-all group">
              <div className="flex flex-col items-center text-center space-y-6">
                <img src={page.logoUrl || "https://picsum.photos/seed/page/200/200"} className="w-20 h-20 rounded-2xl object-cover" alt={page.title} />
                <div>
                  <h3 className="text-xl font-black uppercase italic text-esports-text">{page.title}</h3>
                  <p className="text-xs text-esports-text-muted line-clamp-2 mt-2">{page.description}</p>
                </div>
                <div className="flex gap-4">
                  {page.socialLinks.facebook && <a href={page.socialLinks.facebook} target="_blank" rel="noreferrer" className="p-3 bg-zinc-800 rounded-xl text-blue-500 hover:bg-blue-500 hover:text-white transition-all"><Facebook className="w-4 h-4" /></a>}
                  {page.socialLinks.youtube && <a href={page.socialLinks.youtube} target="_blank" rel="noreferrer" className="p-3 bg-zinc-800 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all"><Youtube className="w-4 h-4" /></a>}
                  {page.socialLinks.whatsapp && <a href={page.socialLinks.whatsapp} target="_blank" rel="noreferrer" className="p-3 bg-zinc-800 rounded-xl text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all"><MessageCircle className="w-4 h-4" /></a>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Champions Section */}
      <section className="space-y-10 py-20">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-4">
            <Medal className="w-10 h-10 text-esports-secondary animate-bounce" />
            <h2 className="text-5xl font-black uppercase italic tracking-tighter text-esports-secondary">Recent Champions</h2>
          </div>
          <p className="text-esports-text-muted text-xs font-bold uppercase tracking-[0.4em]">Celebrating the legends of Bangladesh Free Fire</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {champions.map((champ, idx) => (
            <motion.div
              key={champ.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="group relative rounded-[3rem] overflow-hidden border border-white/5 bg-esports-card shadow-xl hover:shadow-esports-secondary/10 transition-all duration-500"
            >
              <div className="aspect-video overflow-hidden relative">
                <img 
                  src={champ.imageUrl} 
                  alt={champ.teamName}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-8">
                  <p className="text-white text-sm font-medium italic mb-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">{champ.caption}</p>
                  <div className="flex items-center gap-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-75">
                    <Star className="w-4 h-4 text-esports-secondary fill-esports-secondary" />
                    <span className="text-esports-secondary text-[10px] font-black uppercase tracking-widest">Champion Highlight</span>
                  </div>
                </div>
                <div className="absolute top-4 right-4 bg-esports-secondary text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase italic shadow-lg">
                  {champ.tournamentName || 'Tournament Winner'}
                </div>
              </div>
              <div className="p-8">
                <h3 className="text-2xl font-black uppercase italic tracking-tight text-esports-text">{champ.teamName}</h3>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-esports-text-muted uppercase tracking-widest">Recent Victory</span>
                  <Trophy className="w-5 h-5 text-esports-secondary" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Recent Visitors */}
      <section className="bg-esports-card rounded-[3.5rem] p-16 border border-white/5 shadow-2xl space-y-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-esports-primary/5 blur-[120px] -mr-48 -mt-48" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <Users className="text-esports-primary w-8 h-8" />
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-esports-text">Recent Visitors</h2>
          </div>
          <span className="text-[11px] font-black text-esports-text-muted uppercase tracking-[0.3em] bg-white/5 px-6 py-3 rounded-full border border-white/10">{visitors.length} Squad Members</span>
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
                className="w-16 h-16 rounded-2xl object-cover border-2 border-white/5 group-hover:border-esports-primary group-hover:shadow-[0_0_20px_rgba(230,57,70,0.4)] transition-all duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-black uppercase italic px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-500 whitespace-nowrap z-20 shadow-2xl border border-white/10 translate-y-4 group-hover:translate-y-0">
                {visitor.displayName}
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {/* User Profile Modal */}
      <AnimatePresence>
        {selectedUserUid && (
          <ProfileModal 
            uid={selectedUserUid} 
            onClose={() => setSelectedUserUid(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
