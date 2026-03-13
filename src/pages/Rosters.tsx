import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, updateDoc, doc, increment, serverTimestamp, deleteDoc, getDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth, useTheme, useSettings } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, X, Trash2, MessageCircle, Send, Heart, ThumbsUp, Shield, User as UserIcon, Search, Globe, Instagram, Youtube, Facebook, Camera, Briefcase, Award, Swords, HelpCircle, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import ProfileModal from '../components/ProfileModal';
import imageCompression from 'browser-image-compression';

interface Player {
  fullName?: string;
  ign: string;
  role: string;
  uid: string;
  facebookId?: string;
  photoURL?: string;
}

interface Roster {
  id: string;
  teamName: string;
  teamLogo?: string;
  players: Player[];
  coach?: { name: string; ign: string; photoURL?: string };
  manager?: { name: string; ign: string; photoURL?: string };
  sponsor?: { name: string; logo?: string };
  socialLinks?: { facebook?: string; instagram?: string; youtube?: string };
  status: 'pending' | 'approved';
  authorName: string;
  authorUid: string;
  createdAt: any;
  reactions: Record<string, number>;
  isEdited?: boolean;
}

interface Comment {
  id: string;
  targetId: string;
  targetType: 'roster' | 'gallery';
  text: string;
  authorName: string;
  authorUid: string;
  authorPhoto: string;
  status: 'pending' | 'approved';
  createdAt: any;
}

const ROLES = ['Captain', 'Sniper', 'Rusher', 'Support', 'Flanker', 'IGL'];

export default function Rosters() {
  const { user, isAdmin } = useAuth();
  const { darkMode } = useTheme();
  const settings = useSettings();
  const navigate = useNavigate();
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [showRegister, setShowRegister] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRoster, setSelectedRoster] = useState<Roster | null>(null);
  const [selectedUserUid, setSelectedUserUid] = useState<string | null>(null);
  const [isChallenging, setIsChallenging] = useState<string | null>(null);
  const [editingRoster, setEditingRoster] = useState<Roster | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [formData, setFormData] = useState({
    teamName: '',
    teamLogo: '',
    players: [
      { fullName: '', ign: '', role: 'Captain', uid: '', facebookId: '', photoURL: '' },
      { fullName: '', ign: '', role: 'Sniper', uid: '', facebookId: '', photoURL: '' },
      { fullName: '', ign: '', role: 'Rusher', uid: '', facebookId: '', photoURL: '' },
      { fullName: '', ign: '', role: 'Support', uid: '', facebookId: '', photoURL: '' }
    ],
    coach: { name: '', ign: '', photoURL: '' },
    manager: { name: '', ign: '', photoURL: '' },
    sponsor: { name: '', logo: '' },
    socialLinks: { facebook: '', instagram: '', youtube: '' },
    enabledSections: {
      coach: false,
      manager: false,
      sponsor: false
    }
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'teams' | 'players'>('teams');
  const [allUsers, setAllUsers] = useState<any[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'rosters'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Roster));
      setRosters(data);
    });

    // Fetch all users for player search
    const usersQ = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(usersQ, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      setAllUsers(data);
    });

    return () => {
      unsubscribe();
      unsubscribeUsers();
    };
  }, []);

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const options = {
        maxSizeMB: 0.1,
        maxWidthOrHeight: 400,
        useWebWorker: true,
      };
      try {
        const compressedFile = await imageCompression(file, options);
        const reader = new FileReader();
        reader.readAsDataURL(compressedFile);
        reader.onloadend = () => {
          callback(reader.result as string);
        };
      } catch (error) {
        console.error('Image upload failed:', error);
      }
    }
  };

  const handleAddPlayer = () => {
    if (formData.players.length < 6) {
      setFormData({
        ...formData,
        players: [...formData.players, { fullName: '', ign: '', role: 'Support', uid: '', facebookId: '', photoURL: '' }]
      });
    }
  };

  const handleRemovePlayer = (index: number) => {
    if (formData.players.length > 4) {
      const newPlayers = [...formData.players];
      newPlayers.splice(index, 1);
      setFormData({ ...formData, players: newPlayers });
    }
  };

  const handlePlayerChange = (index: number, field: keyof Player, value: string) => {
    const newPlayers = [...formData.players];
    newPlayers[index] = { ...newPlayers[index], [field]: value };
    setFormData({ ...formData, players: newPlayers });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !formData.teamName.trim()) return;

    // Validate players
    if (formData.players.some(p => !p.ign.trim() || !p.uid.trim())) {
      showToast('Please fill in all player IGNs and UIDs.', 'error');
      return;
    }

    try {
      const { enabledSections, ...dataToSave } = formData;
      await addDoc(collection(db, 'rosters'), {
        ...dataToSave,
        coach: enabledSections.coach ? formData.coach : null,
        manager: enabledSections.manager ? formData.manager : null,
        sponsor: enabledSections.sponsor ? formData.sponsor : null,
        status: 'pending',
        authorName: user.displayName || 'Anonymous',
        authorUid: user.uid,
        createdAt: serverTimestamp(),
        reactions: { like: 0, heart: 0 }
      });
      setFormData({
        teamName: '',
        teamLogo: '',
        players: [
          { fullName: '', ign: '', role: 'Captain', uid: '', facebookId: '', photoURL: '' },
          { fullName: '', ign: '', role: 'Sniper', uid: '', facebookId: '', photoURL: '' },
          { fullName: '', ign: '', role: 'Rusher', uid: '', facebookId: '', photoURL: '' },
          { fullName: '', ign: '', role: 'Support', uid: '', facebookId: '', photoURL: '' }
        ],
        coach: { name: '', ign: '', photoURL: '' },
        manager: { name: '', ign: '', photoURL: '' },
        sponsor: { name: '', logo: '' },
        socialLinks: { facebook: '', instagram: '', youtube: '' },
        enabledSections: { coach: false, manager: false, sponsor: false }
      });
      setShowRegister(false);
      showToast('Roster submitted! Waiting for admin approval.', 'success');
    } catch (error) {
      console.error('Registration failed:', error);
      showToast('Failed to submit roster.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReact = async (rosterId: string, reactionKey: string) => {
    if (!user) return;
    const rosterRef = doc(db, 'rosters', rosterId);
    const roster = rosters.find(r => r.id === rosterId);
    if (!roster) return;

    const currentReactions = roster.reactions?.[reactionKey] || [];
    const hasReacted = Array.isArray(currentReactions) && currentReactions.includes(user.uid);

    try {
      if (hasReacted) {
        await updateDoc(rosterRef, {
          [`reactions.${reactionKey}`]: arrayRemove(user.uid)
        });
      } else {
        await updateDoc(rosterRef, {
          [`reactions.${reactionKey}`]: arrayUnion(user.uid)
        });
      }
    } catch (error) {
      console.error('Reaction failed:', error);
    }
  };

  const handleViewUser = (uid: string) => {
    setSelectedUserUid(uid);
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleChallenge = async (targetRoster: Roster) => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Check if user has an approved roster
    const myRoster = rosters.find(r => r.authorUid === user.uid && r.status === 'approved');
    if (!myRoster) {
      showToast('You must have an approved full roster to challenge another team.', 'error');
      return;
    }

    if (myRoster.id === targetRoster.id) {
      showToast('You cannot challenge your own team.', 'error');
      return;
    }

    setIsChallenging(targetRoster.id);
    try {
      await addDoc(collection(db, 'challenges'), {
        challengerRosterId: myRoster.id,
        challengerTeamName: myRoster.teamName,
        challengerUid: user.uid,
        targetRosterId: targetRoster.id,
        targetTeamName: targetRoster.teamName,
        targetUid: targetRoster.authorUid,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      // Create notification
      await addDoc(collection(db, 'notifications'), {
        userId: targetRoster.authorUid,
        title: 'New Challenge!',
        message: `You received a challenge from ${myRoster.teamName}.`,
        type: 'challenge',
        link: `/friends`, // Or a challenges page
        read: false,
        createdAt: serverTimestamp(),
      });

      showToast(`Challenge sent to ${targetRoster.teamName}!`, 'success');
    } catch (error) {
      console.error('Challenge failed:', error);
      showToast('Failed to send challenge.', 'error');
    } finally {
      setIsChallenging(null);
    }
  };

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !editingRoster) return;

    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'rosters', editingRoster.id), {
        teamName: editingRoster.teamName,
        teamLogo: editingRoster.teamLogo || '',
        players: editingRoster.players,
        coach: editingRoster.coach || { name: '', ign: '', photoURL: '' },
        manager: editingRoster.manager || { name: '', ign: '', photoURL: '' },
        sponsor: editingRoster.sponsor || { name: '', logo: '' },
        socialLinks: editingRoster.socialLinks || { facebook: '', instagram: '', youtube: '' },
        isEdited: true,
        lastEditedAt: serverTimestamp()
      });
      setEditingRoster(null);
      showToast('Roster updated successfully!', 'success');
    } catch (error) {
      console.error('Update failed:', error);
      showToast('Failed to update roster.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };
  const filteredRosters = rosters.filter(r => {
    const matchesSearch = r.teamName.toLowerCase().includes(searchTerm.toLowerCase());
    const isVisible = isAdmin || r.status === 'approved' || r.authorUid === user?.uid;
    return matchesSearch && isVisible;
  });

  const filteredPlayers = allUsers.filter(u => {
    const search = playerSearchTerm.toLowerCase();
    const matchesSearch = (
      u.displayName?.toLowerCase().includes(search) ||
      u.gameUID?.toLowerCase().includes(search) ||
      u.bio?.toLowerCase().includes(search) ||
      u.username?.toLowerCase().includes(search)
    );
    const matchesRole = !roleFilter || u.role === roleFilter;
    const matchesCountry = !countryFilter || u.country?.toLowerCase().includes(countryFilter.toLowerCase());
    
    return matchesSearch && matchesRole && matchesCountry;
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-12"
    >
      {/* Support & Visit Pages Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Support Bar */}
        <div className={`p-8 rounded-[2.5rem] border ${darkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-emerald-50/50 border-emerald-100'} flex flex-col sm:flex-row items-center gap-6 group transition-all hover:shadow-xl`}>
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0 group-hover:scale-110 transition-transform">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
          <div className="text-center sm:text-left flex-1">
            <h3 className="text-xl font-black uppercase italic tracking-tighter mb-1">Support System</h3>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Need help? Our team is here 24/7.</p>
            <a 
              href={settings.supportTelegram} 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase italic tracking-widest hover:bg-emerald-600 transition-all"
            >
              Contact Support <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Visit Pages Bar */}
        <div className={`p-8 rounded-[2.5rem] border ${darkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-blue-50/50 border-blue-100'} flex flex-col sm:flex-row items-center gap-6 group transition-all hover:shadow-xl`}>
          <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0 group-hover:scale-110 transition-transform">
            <Globe className="w-8 h-8 text-white" />
          </div>
          <div className="text-center sm:text-left flex-1">
            <h3 className="text-xl font-black uppercase italic tracking-tighter mb-1">Visit Pages</h3>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Explore the ecosystem pages.</p>
            <Link 
              to="/esports-pages"
              className="inline-flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase italic tracking-widest hover:bg-blue-600 transition-all"
            >
              View All Pages <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
        <div className="space-y-2 text-center sm:text-left">
          <h1 className={`text-5xl font-black uppercase italic tracking-tighter leading-none ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
            {settings.rosterTitle}
          </h1>
          <p className="text-zinc-500 font-medium max-w-md">{settings.rosterDesc}</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl">
            <button 
              onClick={() => setActiveTab('teams')}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'teams' ? 'bg-pink-400 text-white shadow-lg' : 'text-zinc-500'}`}
            >
              Teams
            </button>
            <button 
              onClick={() => setActiveTab('players')}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'players' ? 'bg-pink-400 text-white shadow-lg' : 'text-zinc-500'}`}
            >
              Players
            </button>
          </div>
          <button 
            onClick={() => user ? setShowRegister(true) : navigate('/login')}
            className="flex items-center gap-2 px-8 py-4 bg-pink-400 text-white rounded-[2rem] font-black uppercase italic tracking-wider hover:bg-pink-500 transition-all active:scale-95 shadow-lg shadow-pink-400/20"
          >
            <Plus className="w-5 h-5" />
            Register
          </button>
        </div>
      </div>

      {activeTab === 'teams' ? (
        <div className="space-y-8">
          <div className="relative max-w-md mx-auto sm:mx-0">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search teams by name..."
              className={`w-full rounded-2xl pl-14 pr-6 py-4 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-100 text-zinc-800'} border-2`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredRosters.map((roster) => (
              <motion.div 
                key={roster.id}
                layout
                className={`group relative ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'} rounded-[2.5rem] overflow-hidden border-2 shadow-sm hover:shadow-2xl transition-all p-8 space-y-6`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-4 items-center">
                    <div className={`w-16 h-16 rounded-2xl overflow-hidden border-2 ${darkMode ? 'border-zinc-800' : 'border-zinc-50'} shadow-md`}>
                      <img 
                        src={roster.teamLogo || `https://picsum.photos/seed/${roster.id}/200/200`} 
                        alt={roster.teamName} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="space-y-1">
                      <h2 className={`text-2xl font-black uppercase italic leading-none ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
                        {roster.teamName}
                      </h2>
                      <button 
                        onClick={() => handleViewUser(roster.authorUid)}
                        className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-zinc-500' : 'text-zinc-400'} hover:text-pink-400 transition-colors flex items-center gap-2`}
                      >
                        by {roster.authorName}
                        {roster.isEdited && <span className="text-pink-400/50">(Edited)</span>}
                      </button>
                    </div>
                  </div>
                  {roster.status === 'pending' && (
                    <span className="px-3 py-1 bg-amber-400 text-white text-[9px] font-black uppercase italic rounded-full animate-pulse">Pending</span>
                  )}
                </div>

                <div className="space-y-3">
                  {roster.players.map((player, idx) => (
                    <div 
                      key={idx}
                      className={`flex justify-between items-center p-3 rounded-xl border ${darkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-100'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                          <img 
                            src={player.photoURL || `https://picsum.photos/seed/${player.ign}/100/100`} 
                            alt={player.ign} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-sm font-bold ${darkMode ? 'text-zinc-300' : 'text-zinc-800'}`}>{player.ign}</span>
                          <span className="text-[9px] text-zinc-500 font-medium">UID: {player.uid}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {allUsers.find(u => u.gameUID === player.uid) && (
                          <button 
                            onClick={() => handleViewUser(allUsers.find(u => u.gameUID === player.uid).uid)}
                            className="p-1.5 rounded-lg bg-pink-400/10 text-pink-400 hover:bg-pink-400 hover:text-white transition-all"
                            title="View Profile"
                          >
                            <UserIcon className="w-3 h-3" />
                          </button>
                        )}
                        <span className="text-[10px] font-black uppercase tracking-widest text-pink-400">{player.role}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {(roster.coach?.name || roster.manager?.name || roster.sponsor?.name) && (
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    {roster.coach?.name && (
                      <div className="text-center space-y-1">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto border border-zinc-700">
                          <UserIcon className="w-4 h-4 text-zinc-500" />
                        </div>
                        <p className="text-[8px] font-black uppercase text-zinc-500">Coach</p>
                      </div>
                    )}
                    {roster.manager?.name && (
                      <div className="text-center space-y-1">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto border border-zinc-700">
                          <UserIcon className="w-4 h-4 text-zinc-500" />
                        </div>
                        <p className="text-[8px] font-black uppercase text-zinc-500">Manager</p>
                      </div>
                    )}
                    {roster.sponsor?.name && (
                      <div className="text-center space-y-1">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto border border-zinc-700">
                          <Briefcase className="w-4 h-4 text-zinc-500" />
                        </div>
                        <p className="text-[8px] font-black uppercase text-zinc-500">Sponsor</p>
                      </div>
                    )}
                  </div>
                )}

                  <div className="flex items-center justify-between pt-4 border-t border-dashed border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => handleReact(roster.id, 'like')}
                        className="flex items-center gap-1.5 group/btn"
                      >
                        <ThumbsUp className={`w-4 h-4 ${Array.isArray(roster.reactions?.like) && roster.reactions.like.includes(user?.uid) ? 'text-blue-500 fill-blue-500' : 'text-blue-400'} group-hover/btn:scale-125 transition-all`} />
                        <span className={`text-xs font-black ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          {Array.isArray(roster.reactions?.like) ? roster.reactions.like.length : (roster.reactions?.like || 0)}
                        </span>
                      </button>
                      <button 
                        onClick={() => handleReact(roster.id, 'heart')}
                        className="flex items-center gap-1.5 group/btn"
                      >
                        <Heart className={`w-4 h-4 ${Array.isArray(roster.reactions?.heart) && roster.reactions.heart.includes(user?.uid) ? 'text-red-500 fill-red-500' : 'text-red-400'} group-hover/btn:scale-125 transition-all`} />
                        <span className={`text-xs font-black ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          {Array.isArray(roster.reactions?.heart) ? roster.reactions.heart.length : (roster.reactions?.heart || 0)}
                        </span>
                      </button>
                    </div>

                  <div className="flex items-center gap-2">
                    {roster.socialLinks?.facebook && (
                      <a href={roster.socialLinks.facebook} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-blue-500 transition-colors" title="Facebook">
                        <Facebook className="w-4 h-4" />
                      </a>
                    )}
                    {roster.socialLinks?.instagram && (
                      <a href={roster.socialLinks.instagram} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-pink-500 transition-colors" title="Instagram">
                        <Instagram className="w-4 h-4" />
                      </a>
                    )}
                    {roster.socialLinks?.youtube && (
                      <a href={roster.socialLinks.youtube} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-red-500 transition-colors" title="YouTube">
                        <Youtube className="w-4 h-4" />
                      </a>
                    )}
                    <button 
                      onClick={() => handleChallenge(roster)}
                      disabled={isChallenging === roster.id}
                      className={`p-2 rounded-xl transition-colors ${darkMode ? 'text-zinc-500 hover:bg-zinc-800' : 'text-zinc-400 hover:bg-zinc-100'} ${isChallenging === roster.id ? 'animate-pulse' : ''}`}
                      title="Challenge Team"
                    >
                      <Swords className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setSelectedRoster(roster)}
                      className={`p-2 rounded-xl transition-colors ${darkMode ? 'text-zinc-500 hover:bg-zinc-800' : 'text-zinc-400 hover:bg-zinc-100'}`}
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>
                    {(user?.uid === roster.authorUid || isAdmin) && (
                      <button 
                        onClick={() => setEditingRoster(roster)}
                        className={`p-2 rounded-xl transition-colors ${darkMode ? 'text-zinc-500 hover:bg-zinc-800' : 'text-zinc-400 hover:bg-zinc-100'}`}
                      >
                        <Shield className="w-5 h-5" />
                      </button>
                    )}
                    {(user?.uid === roster.authorUid || isAdmin) && (
                      <button
                        onClick={() => setDeleteConfirm(roster.id)}
                        className={`p-2 transition-colors ${darkMode ? 'text-zinc-600 hover:text-red-400' : 'text-zinc-300 hover:text-red-400'}`}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input 
                type="text"
                value={playerSearchTerm}
                onChange={(e) => setPlayerSearchTerm(e.target.value)}
                placeholder="Search players by name, IGN or UID..."
                className={`w-full rounded-2xl pl-14 pr-6 py-4 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-100 text-zinc-800'} border-2`}
              />
            </div>
            
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={`px-6 py-4 rounded-2xl border-2 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-100 text-zinc-800'} font-bold min-w-[150px]`}
            >
              <option value="">All Roles</option>
              {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
            </select>

            <input 
              type="text"
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              placeholder="Filter by Country..."
              className={`px-6 py-4 rounded-2xl border-2 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-100 text-zinc-800'} font-bold min-w-[150px]`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredPlayers.map((p) => (
              <motion.div 
                key={p.uid}
                onClick={() => handleViewUser(p.uid)}
                className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all hover:scale-105 ${darkMode ? 'bg-zinc-900 border-zinc-800 hover:border-pink-400' : 'bg-white border-zinc-100 hover:border-pink-400'} text-center space-y-4`}
              >
                <div className="relative inline-block">
                  <img 
                    src={p.photoURL || `https://picsum.photos/seed/${p.uid}/200/200`} 
                    alt={p.displayName} 
                    className="w-20 h-20 rounded-2xl object-cover mx-auto shadow-md"
                    referrerPolicy="no-referrer"
                  />
                  {p.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white dark:border-zinc-900" />
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className={`font-black uppercase italic ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{p.displayName}</h3>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">UID: {p.gameUID || 'N/A'}</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    {p.role && (
                      <span className="px-2 py-0.5 rounded-lg bg-pink-400/10 text-pink-400 text-[9px] font-black uppercase tracking-widest">
                        {p.role}
                      </span>
                    )}
                    {p.country && (
                      <span className="px-2 py-0.5 rounded-lg bg-blue-400/10 text-blue-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                        <Globe className="w-2 h-2" />
                        {p.country}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingRoster && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'} w-full max-w-2xl rounded-[3rem] p-10 border shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar`}
            >
              <button 
                onClick={() => setEditingRoster(null)}
                className={`absolute top-8 right-8 p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-zinc-100 text-zinc-400'}`}
              >
                <X className="w-6 h-6" />
              </button>

              <div className="text-center space-y-4 mb-10">
                <div className="w-16 h-16 bg-pink-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-pink-400/20">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h2 className={`text-3xl font-black uppercase italic tracking-tighter ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Edit Roster</h2>
                <p className="text-zinc-500 font-medium">Update your squad information.</p>
              </div>

              <form onSubmit={handleEdit} className="space-y-10">
                <div className="space-y-8">
                  {/* Team Info */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-pink-400 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Team Identity
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Team Name</label>
                        <input 
                          required
                          value={editingRoster.teamName}
                          onChange={(e) => setEditingRoster({ ...editingRoster, teamName: e.target.value })}
                          placeholder="Enter team name..."
                          className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} rounded-2xl px-6 py-4 focus:outline-none focus:border-pink-400 transition-all font-bold`}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Team Logo</label>
                        <div className="flex items-center gap-4">
                          {editingRoster.teamLogo && (
                            <img src={editingRoster.teamLogo} className="w-12 h-12 rounded-xl object-cover" alt="Logo Preview" />
                          )}
                          <label className={`flex-1 flex items-center justify-center gap-2 py-4 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 hover:border-pink-400' : 'bg-zinc-50 border-zinc-200 hover:border-pink-400'}`}>
                            <Camera className="w-5 h-5 text-zinc-400" />
                            <span className="text-xs font-bold text-zinc-500">Upload Logo</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (b) => setEditingRoster({...editingRoster, teamLogo: b}))} />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Players */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-pink-400 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Active Roster
                    </h3>
                    <div className="space-y-6">
                      {editingRoster.players.map((player, idx) => (
                        <div key={idx} className={`p-6 rounded-3xl border-2 ${darkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-100'} space-y-4`}>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <input required value={player.ign} onChange={(e) => {
                              const newPlayers = [...editingRoster.players];
                              newPlayers[idx] = { ...newPlayers[idx], ign: e.target.value };
                              setEditingRoster({ ...editingRoster, players: newPlayers });
                            }} placeholder="In-Game Name (IGN)" className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} rounded-xl px-4 py-3 focus:outline-none focus:border-pink-400 transition-all font-bold text-sm`} />
                            <input required value={player.uid} onChange={(e) => {
                              const newPlayers = [...editingRoster.players];
                              newPlayers[idx] = { ...newPlayers[idx], uid: e.target.value };
                              setEditingRoster({ ...editingRoster, players: newPlayers });
                            }} placeholder="Game UID" className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} rounded-xl px-4 py-3 focus:outline-none focus:border-pink-400 transition-all font-bold text-sm`} />
                            <select value={player.role} onChange={(e) => {
                              const newPlayers = [...editingRoster.players];
                              newPlayers[idx] = { ...newPlayers[idx], role: e.target.value };
                              setEditingRoster({ ...editingRoster, players: newPlayers });
                            }} className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} rounded-xl px-4 py-3 focus:outline-none focus:border-pink-400 transition-all font-bold text-sm`}>
                              {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                            </select>
                            <div className="flex items-center gap-3">
                              {player.photoURL && <img src={player.photoURL} className="w-10 h-10 rounded-lg object-cover" alt="Player" />}
                              <label className={`flex-1 flex items-center justify-center gap-2 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 hover:border-pink-400' : 'bg-zinc-50 border-zinc-200 hover:border-pink-400'}`}>
                                <Camera className="w-4 h-4 text-zinc-400" />
                                <span className="text-[10px] font-bold text-zinc-500">Player Photo</span>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (b) => {
                                  const newPlayers = [...editingRoster.players];
                                  newPlayers[idx] = { ...newPlayers[idx], photoURL: b };
                                  setEditingRoster({ ...editingRoster, players: newPlayers });
                                })} />
                              </label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-5 bg-pink-400 text-white rounded-[2rem] font-black uppercase italic tracking-wider hover:bg-pink-500 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-pink-400/20"
                >
                  {isSubmitting ? 'Updating...' : 'Save Changes'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Registration Modal */}
      <AnimatePresence>
        {showRegister && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'} w-full max-w-2xl rounded-[3rem] p-10 border shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar`}
            >
              <button 
                onClick={() => setShowRegister(false)}
                className={`absolute top-8 right-8 p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-zinc-100 text-zinc-400'}`}
              >
                <X className="w-6 h-6" />
              </button>

              <div className="text-center space-y-4 mb-10">
                <div className="w-16 h-16 bg-pink-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-pink-400/20">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h2 className={`text-3xl font-black uppercase italic tracking-tighter ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Register Team</h2>
                <p className="text-zinc-500 font-medium">Submit your squad for the hub.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-10">
                <div className="space-y-8">
                  {/* Team Info */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-pink-400 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Team Identity
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Team Name</label>
                        <input 
                          required
                          value={formData.teamName}
                          onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                          placeholder="Enter team name..."
                          className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} rounded-2xl px-6 py-4 focus:outline-none focus:border-pink-400 transition-all font-bold`}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Team Logo</label>
                        <div className="flex items-center gap-4">
                          {formData.teamLogo && (
                            <img src={formData.teamLogo} className="w-12 h-12 rounded-xl object-cover" alt="Logo Preview" />
                          )}
                          <label className={`flex-1 flex items-center justify-center gap-2 py-4 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 hover:border-pink-400' : 'bg-zinc-50 border-zinc-200 hover:border-pink-400'}`}>
                            <Camera className="w-5 h-5 text-zinc-400" />
                            <span className="text-xs font-bold text-zinc-500">Upload Logo</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (b) => setFormData({...formData, teamLogo: b}))} />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Social Links */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-pink-400 flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Social Media
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <input 
                        value={formData.socialLinks.facebook}
                        onChange={(e) => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, facebook: e.target.value } })}
                        placeholder="Facebook Link"
                        className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} rounded-xl px-4 py-3 focus:outline-none focus:border-pink-400 transition-all font-bold text-xs`}
                      />
                      <input 
                        value={formData.socialLinks.instagram}
                        onChange={(e) => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, instagram: e.target.value } })}
                        placeholder="Instagram Link"
                        className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} rounded-xl px-4 py-3 focus:outline-none focus:border-pink-400 transition-all font-bold text-xs`}
                      />
                      <input 
                        value={formData.socialLinks.youtube}
                        onChange={(e) => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, youtube: e.target.value } })}
                        placeholder="YouTube Link"
                        className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} rounded-xl px-4 py-3 focus:outline-none focus:border-pink-400 transition-all font-bold text-xs`}
                      />
                    </div>
                  </div>

                  {/* Players */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-black uppercase tracking-widest text-pink-400 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Active Roster (4-6)
                      </h3>
                      {formData.players.length < 6 && (
                        <button 
                          type="button"
                          onClick={handleAddPlayer}
                          className="text-[10px] font-black uppercase tracking-widest text-pink-400 hover:text-pink-500"
                        >
                          + Add Player
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-6">
                      {formData.players.map((player, idx) => (
                        <div key={idx} className={`p-6 rounded-3xl border-2 ${darkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-100'} space-y-4`}>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Player {idx + 1}</span>
                            {formData.players.length > 4 && (
                              <button type="button" onClick={() => handleRemovePlayer(idx)} className="text-red-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <input required value={player.ign} onChange={(e) => handlePlayerChange(idx, 'ign', e.target.value)} placeholder="In-Game Name (IGN)" className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} rounded-xl px-4 py-3 focus:outline-none focus:border-pink-400 transition-all font-bold text-sm`} />
                            <input required value={player.uid} onChange={(e) => handlePlayerChange(idx, 'uid', e.target.value)} placeholder="Game UID" className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} rounded-xl px-4 py-3 focus:outline-none focus:border-pink-400 transition-all font-bold text-sm`} />
                            <input value={player.fullName} onChange={(e) => handlePlayerChange(idx, 'fullName', e.target.value)} placeholder="Full Name" className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} rounded-xl px-4 py-3 focus:outline-none focus:border-pink-400 transition-all font-bold text-sm`} />
                            <select value={player.role} onChange={(e) => handlePlayerChange(idx, 'role', e.target.value)} className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} rounded-xl px-4 py-3 focus:outline-none focus:border-pink-400 transition-all font-bold text-sm`}>
                              {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                            </select>
                            <input value={player.facebookId} onChange={(e) => handlePlayerChange(idx, 'facebookId', e.target.value)} placeholder="Facebook ID / Link" className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} rounded-xl px-4 py-3 focus:outline-none focus:border-pink-400 transition-all font-bold text-sm`} />
                            <div className="flex items-center gap-3">
                              {player.photoURL && <img src={player.photoURL} className="w-10 h-10 rounded-lg object-cover" alt="Player" />}
                              <label className={`flex-1 flex items-center justify-center gap-2 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 hover:border-pink-400' : 'bg-zinc-50 border-zinc-200 hover:border-pink-400'}`}>
                                <Camera className="w-4 h-4 text-zinc-400" />
                                <span className="text-[10px] font-bold text-zinc-500">Player Photo</span>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (b) => handlePlayerChange(idx, 'photoURL', b))} />
                              </label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Staff & Sponsors */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-black uppercase tracking-widest text-pink-400 flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        Staff & Sponsors
                      </h3>
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => setFormData({...formData, enabledSections: {...formData.enabledSections, coach: !formData.enabledSections.coach}})}
                          className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${formData.enabledSections.coach ? 'bg-pink-400 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}
                        >
                          {formData.enabledSections.coach ? '- Remove Coach' : '+ Add Coach'}
                        </button>
                        <button 
                          type="button"
                          onClick={() => setFormData({...formData, enabledSections: {...formData.enabledSections, manager: !formData.enabledSections.manager}})}
                          className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${formData.enabledSections.manager ? 'bg-pink-400 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}
                        >
                          {formData.enabledSections.manager ? '- Remove Manager' : '+ Add Manager'}
                        </button>
                        <button 
                          type="button"
                          onClick={() => setFormData({...formData, enabledSections: {...formData.enabledSections, sponsor: !formData.enabledSections.sponsor}})}
                          className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${formData.enabledSections.sponsor ? 'bg-pink-400 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}
                        >
                          {formData.enabledSections.sponsor ? '- Remove Sponsor' : '+ Add Sponsor'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Coach */}
                      {formData.enabledSections.coach && (
                        <div className={`p-6 rounded-3xl border-2 ${darkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-100'} space-y-4`}>
                          <p className="text-[10px] font-black uppercase text-zinc-500">Coach</p>
                          <input value={formData.coach.name} onChange={(e) => setFormData({...formData, coach: {...formData.coach, name: e.target.value}})} placeholder="Coach Name" className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} rounded-xl px-4 py-3 focus:outline-none focus:border-pink-400 transition-all font-bold text-sm`} />
                          <input value={formData.coach.ign} onChange={(e) => setFormData({...formData, coach: {...formData.coach, ign: e.target.value}})} placeholder="Coach IGN" className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} rounded-xl px-4 py-3 focus:outline-none focus:border-pink-400 transition-all font-bold text-sm`} />
                        </div>
                      )}
                      {/* Manager */}
                      {formData.enabledSections.manager && (
                        <div className={`p-6 rounded-3xl border-2 ${darkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-100'} space-y-4`}>
                          <p className="text-[10px] font-black uppercase text-zinc-500">Manager</p>
                          <input value={formData.manager.name} onChange={(e) => setFormData({...formData, manager: {...formData.manager, name: e.target.value}})} placeholder="Manager Name" className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} rounded-xl px-4 py-3 focus:outline-none focus:border-pink-400 transition-all font-bold text-sm`} />
                          <input value={formData.manager.ign} onChange={(e) => setFormData({...formData, manager: {...formData.manager, ign: e.target.value}})} placeholder="Manager IGN" className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} rounded-xl px-4 py-3 focus:outline-none focus:border-pink-400 transition-all font-bold text-sm`} />
                        </div>
                      )}
                      {/* Sponsor */}
                      {formData.enabledSections.sponsor && (
                        <div className={`p-6 rounded-3xl border-2 ${darkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-100'} space-y-4 sm:col-span-2`}>
                          <p className="text-[10px] font-black uppercase text-zinc-500">Sponsor</p>
                          <input value={formData.sponsor.name} onChange={(e) => setFormData({...formData, sponsor: {...formData.sponsor, name: e.target.value}})} placeholder="Sponsor Name" className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} rounded-xl px-4 py-3 focus:outline-none focus:border-pink-400 transition-all font-bold text-sm`} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-5 bg-pink-400 text-white rounded-[2rem] font-black uppercase italic tracking-wider hover:bg-pink-500 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-pink-400/20"
                >
                  {isSubmitting ? 'Registering...' : 'Submit Roster'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Roster Detail Modal (Comments) */}
      <AnimatePresence>
        {selectedRoster && (
          <RosterDetailModal 
            roster={selectedRoster} 
            onClose={() => setSelectedRoster(null)} 
            darkMode={darkMode}
          />
        )}
      </AnimatePresence>

      {/* User Profile Modal */}
      <AnimatePresence>
        {selectedUserUid && (
          <ProfileModal 
            uid={selectedUserUid} 
            onClose={() => setSelectedUserUid(null)} 
          />
        )}
      </AnimatePresence>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'} w-full max-w-sm rounded-[2.5rem] p-8 border shadow-2xl text-center space-y-6`}
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <div className="space-y-2">
                <h3 className={`text-xl font-black uppercase italic tracking-tighter ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Delete Roster?</h3>
                <p className="text-zinc-500 text-sm font-medium">This action cannot be undone. Are you sure?</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className={`flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${darkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      await deleteDoc(doc(db, 'rosters', deleteConfirm));
                      setDeleteConfirm(null);
                      showToast('Roster deleted successfully.', 'success');
                    } catch (error) {
                      console.error('Delete failed:', error);
                      showToast('Failed to delete roster.', 'error');
                    }
                  }}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200]"
          >
            <div className={`px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              toast.type === 'success'
                ? (darkMode ? 'bg-emerald-900/90 border-emerald-500/30 text-emerald-400' : 'bg-white border-emerald-100 text-emerald-600')
                : (darkMode ? 'bg-red-900/90 border-red-500/30 text-red-400' : 'bg-white border-red-100 text-red-600')
            }`}>
              <span className="font-black uppercase italic tracking-widest text-xs">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function RosterDetailModal({ roster, onClose, darkMode }: { roster: Roster, onClose: () => void, darkMode: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'comments'),
      where('targetId', '==', roster.id),
      where('targetType', '==', 'roster'),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
      setComments(data);
    });

    return () => unsubscribe();
  }, [roster.id]);

  const handleSubmitComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'comments'), {
        targetId: roster.id,
        targetType: 'roster',
        text: newComment,
        authorName: user.displayName || 'Anonymous',
        authorUid: user.uid,
        authorPhoto: user.photoURL || '',
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setNewComment('');
      alert('Comment submitted! Waiting for admin approval.');
    } catch (error) {
      console.error('Comment failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'} w-full max-w-2xl rounded-[3rem] p-10 border shadow-2xl relative max-h-[90vh] flex flex-col`}
      >
        <button 
          onClick={onClose}
          className={`absolute top-8 right-8 p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-zinc-100 text-zinc-400'}`}
        >
          <X className="w-6 h-6" />
        </button>

        <div className="space-y-6 mb-8">
          <h2 className={`text-3xl font-black uppercase italic tracking-tighter ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
            {roster.teamName} Discussion
          </h2>
          <div className="flex gap-4">
            {roster.players.map((p, i) => (
              <span key={i} className="text-[10px] font-black uppercase tracking-widest text-pink-400 bg-pink-400/10 px-2 py-1 rounded-md">
                {p.ign}
              </span>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 pr-4 no-scrollbar">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-4">
              <img 
                src={comment.authorPhoto || `https://picsum.photos/seed/${comment.authorUid}/100/100`} 
                alt={comment.authorName} 
                className="w-10 h-10 rounded-xl object-cover shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black uppercase italic ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{comment.authorName}</span>
                  <span className="text-[10px] font-bold text-zinc-400">{comment.createdAt?.toDate().toLocaleDateString()}</span>
                </div>
                <p className={`text-sm font-medium leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>{comment.text}</p>
              </div>
            </div>
          ))}
          {comments.length === 0 && (
            <div className="text-center py-10">
              <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">No comments yet</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmitComment} className="mt-8 pt-8 border-t border-dashed border-zinc-200 dark:border-zinc-800">
          <div className="relative">
            <input 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className={`w-full p-4 pr-12 rounded-2xl border-2 font-bold focus:outline-none focus:border-pink-400 transition-all ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'}`}
            />
            <button 
              type="submit"
              disabled={isSubmitting || !newComment.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-pink-400 hover:text-pink-500 disabled:opacity-50 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
