import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, where, updateDoc } from 'firebase/firestore';
import { useAuth, useTheme, useSettings } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Plus, X, Trash2, ExternalLink, ShieldCheck, Camera, Heart, MessageSquare, Send, Star, Medal } from 'lucide-react';
import imageCompression from 'browser-image-compression';

interface Comment {
  id: string;
  authorName: string;
  authorPhoto: string;
  authorUid: string;
  text: string;
  createdAt: any;
}

interface Achievement {
  title: string;
  image?: string;
}

interface TopTeam {
  id: string;
  name: string;
  rank: number;
  description: string;
  logoUrl: string;
  achievements: Achievement[];
  socialLink?: string;
  isVerified?: boolean;
  badgeType?: string;
  reactions?: Record<string, string[]>;
  createdAt: any;
}

interface HallOfFameEntry {
  id: string;
  category: 'team' | 'player' | 'tournament';
  name: string;
  description: string;
  imageUrl: string;
  year: string;
  createdAt: any;
}

export default function TopTeams() {
  const { isAdmin, user } = useAuth();
  const { darkMode } = useTheme();
  const settings = useSettings();
  const [teams, setTeams] = useState<TopTeam[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TopTeam | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [newTeam, setNewTeam] = useState({
    name: '',
    rank: 1,
    description: '',
    logoUrl: '',
    achievements: [] as Achievement[],
    socialLink: '',
    isVerified: false,
    badgeType: ''
  });

  const [hallOfFame, setHallOfFame] = useState<HallOfFameEntry[]>([]);
  const [showAddHOF, setShowAddHOF] = useState(false);
  const [newHOF, setNewHOF] = useState({
    category: 'team' as const,
    name: '',
    description: '',
    imageUrl: '',
    year: new Date().getFullYear().toString()
  });

  const [newAchievement, setNewAchievement] = useState({ title: '', image: '' });

  useEffect(() => {
    const q = query(collection(db, 'topTeams'), orderBy('rank', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TopTeam)));
    });

    const hofQ = query(collection(db, 'hallOfFame'), orderBy('createdAt', 'desc'));
    const unsubscribeHOF = onSnapshot(hofQ, (snapshot) => {
      setHallOfFame(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HallOfFameEntry)));
    });

    return () => {
      unsubscribe();
      unsubscribeHOF();
    };
  }, []);

  useEffect(() => {
    if (!selectedTeam) {
      setComments([]);
      return;
    }

    const q = query(
      collection(db, 'comments'),
      where('targetId', '==', selectedTeam.id),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
    });

    return unsubscribe;
  }, [selectedTeam]);

  const handleReaction = async (teamId: string, emoji: string) => {
    if (!user) return;
    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    const reactions = { ...(team.reactions || {}) };
    const users = reactions[emoji] || [];
    const index = users.indexOf(user.uid);

    if (index > -1) {
      users.splice(index, 1);
    } else {
      // Remove user from other reactions first
      Object.keys(reactions).forEach(key => {
        reactions[key] = (reactions[key] || []).filter(uid => uid !== user.uid);
      });
      users.push(user.uid);
    }

    reactions[emoji] = users;
    try {
      await updateDoc(doc(db, 'topTeams', teamId), { reactions });
    } catch (error) {
      console.error('Reaction failed:', error);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || !selectedTeam) return;

    setIsSubmittingComment(true);
    try {
      await addDoc(collection(db, 'comments'), {
        targetId: selectedTeam.id,
        type: 'topTeam',
        text: newComment.trim(),
        authorUid: user.uid,
        authorName: user.displayName || 'Anonymous',
        authorPhoto: user.photoURL || '',
        status: 'approved', // Auto-approve for top teams for now as per user request for "people can comment"
        createdAt: serverTimestamp()
      });
      setNewComment('');
    } catch (error) {
      console.error('Comment failed:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleImageUpload = async (file: File, callback: (base64: string) => void) => {
    const options = { maxSizeMB: 0.1, maxWidthOrHeight: 500, useWebWorker: true };
    try {
      const compressedFile = await imageCompression(file, options);
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onloadend = () => callback(reader.result as string);
    } catch (error) {
      console.error('Image compression failed:', error);
    }
  };

  const handleAddAchievement = () => {
    if (!newAchievement.title.trim()) return;
    setNewTeam(prev => ({
      ...prev,
      achievements: [...prev.achievements, newAchievement]
    }));
    setNewAchievement({ title: '', image: '' });
  };

  const handleRemoveAchievement = (index: number) => {
    setNewTeam(prev => ({
      ...prev,
      achievements: prev.achievements.filter((_, i) => i !== index)
    }));
  };

  const handleAddHOF = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'hallOfFame'), {
        ...newHOF,
        createdAt: serverTimestamp()
      });
      setShowAddHOF(false);
      setNewHOF({ category: 'team', name: '', description: '', imageUrl: '', year: new Date().getFullYear().toString() });
    } catch (error) {
      console.error('Add HOF failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'topTeams'), {
        ...newTeam,
        rank: Number(newTeam.rank),
        createdAt: serverTimestamp(),
      });
      setShowAdd(false);
      setNewTeam({ name: '', rank: 1, description: '', logoUrl: '', achievements: [], socialLink: '' });
    } catch (error) {
      console.error('Add team failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteDoc(doc(db, 'topTeams', deleteConfirm));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Trophy className="w-10 h-10 text-esports-primary" />
            <h1 className="text-5xl font-black uppercase italic tracking-tighter text-esports-text">
              {settings.topTeamsTitle.split(' ')[0]} <span className="text-esports-primary">{settings.topTeamsTitle.split(' ').slice(1).join(' ')}</span>
            </h1>
          </div>
          <p className="text-xs font-bold text-esports-text-muted uppercase tracking-widest">{settings.topTeamsDesc}</p>
        </div>

        {isAdmin && (
          <button 
            onClick={() => setShowAdd(true)}
            className="px-6 py-3 bg-esports-primary text-white rounded-2xl text-xs font-black uppercase italic tracking-widest hover:bg-red-600 transition-all shadow-xl shadow-esports-primary/20 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Add Team
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {teams.map((team) => (
            <motion.div
              key={team.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => setSelectedTeam(team)}
              className="group relative rounded-[2.5rem] border border-white/5 p-8 transition-all hover:shadow-2xl cursor-pointer bg-esports-card hover:bg-white/10"
            >
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-esports-primary text-white rounded-2xl flex items-center justify-center font-black italic text-xl shadow-lg rotate-[-10deg] z-10">
                #{team.rank}
              </div>
              {team.isVerified && (
                <div className="absolute top-4 right-4 z-10">
                  <div className="bg-blue-500 text-white p-2 rounded-xl shadow-lg animate-pulse">
                    <Star className="w-4 h-4 fill-current" />
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <img 
                    src={team.logoUrl || `https://picsum.photos/seed/${team.id}/200/200`} 
                    className="w-20 h-20 rounded-[2rem] object-cover border-4 border-white/5 shadow-xl"
                    alt={team.name}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-black uppercase italic leading-none text-esports-text">{team.name}</h2>
                      {team.isVerified && (
                        <div className="flex items-center gap-1 bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full border border-blue-500/20">
                          <ShieldCheck className="w-3 h-3 fill-current" />
                          <span className="text-[8px] font-black uppercase tracking-tighter">Verified</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <ShieldCheck className="w-4 h-4 text-esports-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-esports-text-muted">{team.badgeType || 'Verified Elite'}</span>
                    </div>
                  </div>
                </div>

                <p className="text-sm leading-relaxed line-clamp-3 text-esports-text-muted">{team.description}</p>

                <div className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-esports-primary">Recent Achievements</h3>
                  <div className="flex flex-wrap gap-2">
                    {team.achievements.slice(0, 3).map((ach, i) => (
                      <span key={i} className="px-3 py-1 rounded-lg text-[9px] font-bold uppercase bg-white/5 text-esports-text">
                        {ach.title}
                      </span>
                    ))}
                    {team.achievements.length > 3 && (
                      <span className="px-3 py-1 rounded-lg text-[9px] font-bold uppercase bg-white/5 text-esports-text-muted">
                        +{team.achievements.length - 3} More
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReaction(team.id, '❤️');
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
                        team.reactions?.['❤️']?.includes(user?.uid || '')
                          ? 'bg-esports-primary text-white shadow-lg shadow-esports-primary/20'
                          : 'bg-white/5 text-esports-text-muted hover:bg-white/10'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${team.reactions?.['❤️']?.includes(user?.uid || '') ? 'fill-current' : ''}`} />
                      <span className="text-[10px] font-black">{team.reactions?.['❤️']?.length || 0}</span>
                    </button>
                    <div className="flex items-center gap-1.5 text-esports-text-muted">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black">?</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {team.socialLink && (
                      <a 
                        href={team.socialLink} 
                        target="_blank" 
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 text-[10px] font-black uppercase italic text-esports-primary hover:translate-x-1 transition-transform"
                      >
                        Visit Team Page <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {isAdmin && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(team.id);
                        }}
                        className="p-2 text-red-400 hover:bg-red-900/20 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {teams.length === 0 && (
        <div className="text-center py-20 rounded-[3rem] border-2 border-dashed bg-esports-card border-white/5">
          <Trophy className="w-16 h-16 text-white/10 mx-auto mb-4 opacity-20" />
          <p className="text-esports-text-muted font-black uppercase italic text-xl">Rankings are being updated...</p>
        </div>
      )}

      {/* Hall of Fame Section */}
      <div className="space-y-12 pt-12 border-t border-white/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Star className="w-10 h-10 text-esports-secondary" />
              <h2 className="text-5xl font-black uppercase italic tracking-tighter text-esports-text">
                Hall of <span className="text-esports-secondary">Fame</span>
              </h2>
            </div>
            <p className="text-xs font-bold text-esports-text-muted uppercase tracking-widest">Immortalizing the legends of Free Fire Esports</p>
          </div>

          {isAdmin && (
            <button 
              onClick={() => setShowAddHOF(true)}
              className="px-6 py-3 bg-white text-esports-bg rounded-2xl text-xs font-black uppercase italic tracking-widest hover:scale-105 transition-all shadow-xl flex items-center gap-2"
            >
              <Plus className="w-5 h-5" /> Add Legend
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {hallOfFame.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="group relative rounded-[2.5rem] overflow-hidden border bg-esports-card border-white/5 shadow-xl"
            >
              <div className="aspect-[3/4] relative overflow-hidden">
                <img 
                  src={entry.imageUrl || `https://picsum.photos/seed/${entry.id}/400/600`} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  alt={entry.name}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />
                
                <div className="absolute top-4 left-4 bg-esports-secondary text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase italic shadow-lg">
                  {entry.year}
                </div>

                <div className="absolute bottom-6 left-6 right-6 space-y-2">
                  <div className="flex items-center gap-2">
                    <Medal className="w-4 h-4 text-esports-secondary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-esports-secondary">{entry.category}</span>
                  </div>
                  <h3 className="text-2xl font-black uppercase italic text-esports-text leading-tight">{entry.name}</h3>
                  <p className="text-xs text-esports-text-muted font-medium line-clamp-2">{entry.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
          {hallOfFame.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem] bg-esports-card">
              <Star className="w-16 h-16 text-white/5 mx-auto mb-4 opacity-20" />
              <p className="text-esports-text-muted font-black uppercase italic tracking-widest">The Hall of Fame is awaiting its first legends</p>
            </div>
          )}
        </div>
      </div>

      {/* Add HOF Modal */}
      <AnimatePresence>
        {showAddHOF && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'} w-full max-w-xl rounded-[3rem] p-10 border shadow-2xl relative`}
            >
              <button 
                onClick={() => setShowAddHOF(false)}
                className={`absolute top-8 right-8 p-3 rounded-full transition-colors ${darkMode ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-zinc-100 text-zinc-400'}`}
              >
                <X className="w-6 h-6" />
              </button>

              <div className="space-y-8">
                <div className="text-center">
                  <h2 className={`text-3xl font-black uppercase italic tracking-tighter ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Add to Hall of Fame</h2>
                </div>

                <form onSubmit={handleAddHOF} className="space-y-6">
                  <div className="flex justify-center">
                    <div className="relative group">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => e.target.files && handleImageUpload(e.target.files[0], (b) => setNewHOF(prev => ({ ...prev, imageUrl: b })))}
                        className="hidden"
                        id="hof-img"
                      />
                      <label 
                        htmlFor="hof-img"
                        className={`w-32 h-40 rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${
                          newHOF.imageUrl ? 'border-yellow-500' : 'border-zinc-200 dark:border-zinc-800 hover:border-yellow-500'
                        }`}
                      >
                        {newHOF.imageUrl ? (
                          <img src={newHOF.imageUrl} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="text-center space-y-2">
                            <Camera className="w-8 h-8 text-zinc-300 mx-auto" />
                            <span className="text-[10px] font-black uppercase text-zinc-400">Upload Photo</span>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Category</label>
                      <select 
                        value={newHOF.category}
                        onChange={(e) => setNewHOF({ ...newHOF, category: e.target.value as any })}
                        className={`w-full px-6 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} outline-none font-bold`}
                      >
                        <option value="team">Best Team</option>
                        <option value="player">Best Player</option>
                        <option value="tournament">Tournament Winner</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Year</label>
                      <input 
                        value={newHOF.year}
                        onChange={(e) => setNewHOF({ ...newHOF, year: e.target.value })}
                        className={`w-full px-6 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} outline-none font-bold`}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Name</label>
                    <input 
                      required
                      value={newHOF.name}
                      onChange={(e) => setNewHOF({ ...newHOF, name: e.target.value })}
                      className={`w-full px-6 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} outline-none font-bold`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Description</label>
                    <textarea 
                      required
                      value={newHOF.description}
                      onChange={(e) => setNewHOF({ ...newHOF, description: e.target.value })}
                      className={`w-full px-6 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} outline-none font-bold resize-none`}
                      rows={3}
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-5 bg-yellow-500 text-white rounded-[2rem] font-black uppercase italic tracking-wider hover:bg-yellow-600 transition-all disabled:opacity-50 shadow-xl"
                  >
                    {isSubmitting ? 'Adding Legend...' : 'Add to Hall of Fame'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedTeam && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'} w-full max-w-2xl rounded-[3rem] p-10 border shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar`}
            >
              <button 
                onClick={() => setSelectedTeam(null)}
                className={`absolute top-8 right-8 p-3 rounded-full transition-colors ${darkMode ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-zinc-100 text-zinc-400'}`}
              >
                <X className="w-6 h-6" />
              </button>

              <div className="space-y-8">
                <div className="flex items-center gap-8">
                  <img src={selectedTeam.logoUrl} className="w-24 h-24 rounded-[2.5rem] object-cover border-4 border-yellow-500/20 shadow-2xl" alt="" />
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 bg-yellow-500 text-white text-xs font-black italic rounded-lg shadow-lg">#{selectedTeam.rank}</span>
                      <h2 className={`text-4xl font-black uppercase italic tracking-tighter ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{selectedTeam.name}</h2>
                    </div>
                    <p className={`text-sm font-medium ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{selectedTeam.description}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className={`text-xl font-black uppercase italic tracking-tight ${darkMode ? 'text-white' : 'text-zinc-900'} flex items-center gap-3`}>
                    <Trophy className="w-6 h-6 text-yellow-500" />
                    Recent Achievements
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {selectedTeam.achievements.map((ach, i) => (
                      <div key={i} className={`p-6 rounded-[2rem] border-2 flex items-center gap-6 ${darkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-100'}`}>
                        {ach.image && (
                          <img src={ach.image} className="w-20 h-20 rounded-2xl object-cover shadow-lg" alt="" />
                        )}
                        <div className="flex-1">
                          <h4 className={`text-lg font-black uppercase italic ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{ach.title}</h4>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Comments Section */}
                <div className="space-y-6 pt-8 border-t border-zinc-100 dark:border-zinc-800">
                  <h3 className={`text-xl font-black uppercase italic tracking-tight ${darkMode ? 'text-white' : 'text-zinc-900'} flex items-center gap-3`}>
                    <MessageSquare className="w-6 h-6 text-yellow-500" />
                    Community Comments
                  </h3>

                  {user ? (
                    <form onSubmit={handleAddComment} className="relative">
                      <input
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className={`w-full px-6 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} focus:ring-2 focus:ring-yellow-500 outline-none transition-all font-bold pr-16`}
                      />
                      <button
                        type="submit"
                        disabled={isSubmittingComment || !newComment.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 transition-all disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  ) : (
                    <div className={`p-4 rounded-2xl text-center border ${darkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-100'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Sign in to join the conversation</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className={`p-4 rounded-2xl ${darkMode ? 'bg-zinc-800/30' : 'bg-zinc-50/50'}`}>
                        <div className="flex items-center gap-3 mb-2">
                          <img src={comment.authorPhoto || `https://picsum.photos/seed/${comment.authorUid}/100/100`} className="w-6 h-6 rounded-full object-cover" alt="" />
                          <span className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>{comment.authorName}</span>
                          <span className="text-[8px] font-bold text-zinc-500 uppercase ml-auto">
                            {comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleDateString() : 'Just now'}
                          </span>
                        </div>
                        <p className={`text-xs font-medium leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>{comment.text}</p>
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <p className="text-center py-8 text-zinc-500 text-[10px] font-black uppercase tracking-widest italic">No comments yet. Be the first!</p>
                    )}
                  </div>
                </div>

                {selectedTeam.socialLink && (
                  <a 
                    href={selectedTeam.socialLink}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full py-5 bg-yellow-500 text-white rounded-[2rem] text-center font-black uppercase italic tracking-widest hover:bg-yellow-600 transition-all shadow-xl shadow-yellow-500/20"
                  >
                    Visit Official Team Page
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'} w-full max-w-xl rounded-[3rem] p-10 border shadow-2xl relative my-8`}
            >
              <button 
                onClick={() => setShowAdd(false)}
                className={`absolute top-8 right-8 p-3 rounded-full transition-colors ${darkMode ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-zinc-100 text-zinc-400'}`}
              >
                <X className="w-6 h-6" />
              </button>

              <div className="space-y-8">
                <div className="text-center">
                  <h2 className={`text-3xl font-black uppercase italic tracking-tighter ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Add Top Team</h2>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-2">Only Admins can update rankings</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="flex justify-center">
                    <div className="relative group">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => e.target.files && handleImageUpload(e.target.files[0], (b) => setNewTeam(prev => ({ ...prev, logoUrl: b })))}
                        className="hidden"
                        id="team-logo"
                      />
                      <label 
                        htmlFor="team-logo"
                        className={`w-24 h-24 rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${
                          newTeam.logoUrl ? 'border-yellow-500' : 'border-zinc-200 dark:border-zinc-800 hover:border-yellow-500'
                        }`}
                      >
                        {newTeam.logoUrl ? (
                          <img src={newTeam.logoUrl} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <Plus className="w-8 h-8 text-zinc-300" />
                        )}
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Team Name</label>
                      <input 
                        required
                        value={newTeam.name}
                        onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                        className={`w-full px-6 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} focus:ring-2 focus:ring-yellow-500 outline-none transition-all font-bold`}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Rank Position</label>
                      <input 
                        type="number"
                        required
                        min="1"
                        value={newTeam.rank}
                        onChange={(e) => setNewTeam({ ...newTeam, rank: Number(e.target.value) })}
                        className={`w-full px-6 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} focus:ring-2 focus:ring-yellow-500 outline-none transition-all font-bold`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex items-center gap-3 px-6 py-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                      <input 
                        type="checkbox"
                        checked={newTeam.isVerified}
                        onChange={(e) => setNewTeam({ ...newTeam, isVerified: e.target.checked })}
                        className="w-5 h-5 accent-blue-500"
                      />
                      <label className="text-xs font-black uppercase italic tracking-widest text-zinc-500">Verified Team</label>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Badge Type</label>
                      <input 
                        value={newTeam.badgeType}
                        onChange={(e) => setNewTeam({ ...newTeam, badgeType: e.target.value })}
                        placeholder="e.g. Top Community Team"
                        className={`w-full px-6 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} focus:ring-2 focus:ring-yellow-500 outline-none transition-all font-bold`}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Description</label>
                    <textarea 
                      required
                      value={newTeam.description}
                      onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                      className={`w-full px-6 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} focus:ring-2 focus:ring-yellow-500 outline-none transition-all font-bold resize-none`}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Achievements</label>
                    
                    <div className="space-y-3">
                      {newTeam.achievements.map((ach, idx) => (
                        <div key={idx} className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                          <div className="flex items-center gap-3">
                            {ach.image && <img src={ach.image} className="w-8 h-8 rounded-lg object-cover" alt="" />}
                            <span className="text-xs font-bold">{ach.title}</span>
                          </div>
                          <button type="button" onClick={() => handleRemoveAchievement(idx)} className="text-red-400 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className={`p-4 rounded-2xl border-2 border-dashed ${darkMode ? 'border-zinc-800' : 'border-zinc-100'} space-y-4`}>
                      <div className="flex gap-4">
                        <div className="relative shrink-0">
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => e.target.files && handleImageUpload(e.target.files[0], (b) => setNewAchievement(prev => ({ ...prev, image: b })))}
                            className="hidden"
                            id="ach-img"
                          />
                          <label htmlFor="ach-img" className={`w-12 h-12 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer ${newAchievement.image ? 'border-yellow-500' : 'border-zinc-200 dark:border-zinc-700'}`}>
                            {newAchievement.image ? <img src={newAchievement.image} className="w-full h-full object-cover rounded-lg" alt="" /> : <Camera className="w-5 h-5 text-zinc-400" />}
                          </label>
                        </div>
                        <input 
                          value={newAchievement.title}
                          onChange={(e) => setNewAchievement({ ...newAchievement, title: e.target.value })}
                          placeholder="Achievement title..."
                          className={`flex-1 px-4 py-2 rounded-xl border ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} outline-none text-sm font-bold`}
                        />
                      </div>
                      <button 
                        type="button"
                        onClick={handleAddAchievement}
                        className="w-full py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-yellow-500 hover:text-white transition-all"
                      >
                        Add Achievement
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Social/Page Link</label>
                    <input 
                      value={newTeam.socialLink}
                      onChange={(e) => setNewTeam({ ...newTeam, socialLink: e.target.value })}
                      className={`w-full px-6 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} focus:ring-2 focus:ring-yellow-500 outline-none transition-all font-bold`}
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-5 bg-yellow-500 text-white rounded-[2rem] font-black uppercase italic tracking-wider hover:bg-yellow-600 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-yellow-500/20"
                  >
                    {isSubmitting ? 'Updating Rankings...' : 'Publish Ranking'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'} w-full max-w-sm rounded-[2.5rem] p-8 border shadow-2xl text-center`}
            >
              <div className={`w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center ${darkMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className={`text-2xl font-black uppercase italic mb-2 ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Confirm Delete</h3>
              <p className="text-zinc-400 text-sm mb-8">Are you sure you want to remove this team from rankings? This action cannot be undone.</p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className={`py-4 rounded-2xl font-black uppercase italic tracking-widest text-xs transition-all ${darkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="py-4 bg-red-500 text-white rounded-2xl font-black uppercase italic tracking-widest text-xs hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
