import React, { useState, useEffect, FormEvent } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  increment, 
  serverTimestamp, 
  deleteDoc,
  getDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { useAuth, useTheme, useSettings } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  UserPlus, 
  Search, 
  Plus, 
  X, 
  Trash2, 
  MessageCircle, 
  ThumbsUp, 
  Flame, 
  Laugh, 
  Heart, 
  Send, 
  Gamepad2, 
  Facebook, 
  Instagram, 
  Phone, 
  Video, 
  Image as ImageIcon,
  Trophy,
  Info,
  ChevronRight,
  User,
  Loader2
} from 'lucide-react';
import imageCompression from 'browser-image-compression';
import ProfileModal from '../components/ProfileModal';

interface RecruitmentPost {
  id: string;
  type: 'player' | 'team';
  ign?: string;
  gameUid?: string;
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  previousTeam?: string;
  screenshots?: string[];
  gameplayVideo?: string;
  requirements?: {
    age?: string;
    role?: string;
    experience?: string;
    other?: string;
  };
  authorUid: string;
  authorName: string;
  authorPhoto: string;
  status: 'pending' | 'approved';
  createdAt: any;
  isEdited?: boolean;
  lastEditedAt?: any;
  reactions: Record<string, string[]>;
}

interface Comment {
  id: string;
  targetId: string;
  targetType: 'recruitment';
  text: string;
  authorName: string;
  authorUid: string;
  authorPhoto: string;
  status: 'pending' | 'approved';
  createdAt: any;
}

const EMOJIS = [
  { icon: ThumbsUp, label: 'Like', key: 'like', color: 'text-blue-400' },
  { icon: Flame, label: 'Fire', key: 'fire', color: 'text-orange-500' },
  { icon: Laugh, label: 'Funny', key: 'funny', color: 'text-yellow-400' },
  { icon: Heart, label: 'Love', key: 'love', color: 'text-red-500' },
];

export default function Recruitment() {
  const { user, isAdmin, userData } = useAuth();
  const { darkMode } = useTheme();
  const settings = useSettings();
  const navigate = useNavigate();
  
  const [posts, setPosts] = useState<RecruitmentPost[]>([]);
  const [filter, setFilter] = useState<'all' | 'player' | 'team'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPost, setSelectedPost] = useState<RecruitmentPost | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userReactions, setUserReactions] = useState<Record<string, string[]>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [formData, setFormData] = useState({
    type: 'player' as 'player' | 'team',
    ign: '',
    gameUid: '',
    whatsapp: '',
    instagram: '',
    facebook: '',
    previousTeam: '',
    screenshots: [] as string[],
    gameplayVideo: '',
    requirements: {
      age: '',
      role: '',
      experience: '',
      other: ''
    }
  });

  useEffect(() => {
    const q = query(collection(db, 'recruitment'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecruitmentPost));
      // Filter for non-admins: only show approved posts or their own pending posts
      const filtered = isAdmin ? data : data.filter(p => p.status === 'approved' || p.authorUid === user?.uid);
      setPosts(filtered);
    });

    return () => unsubscribe();
  }, [isAdmin, user?.uid]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const options = { maxSizeMB: 0.1, maxWidthOrHeight: 800, useWebWorker: true };
      try {
        const compressedFile = await imageCompression(file, options);
        const reader = new FileReader();
        reader.readAsDataURL(compressedFile);
        reader.onloadend = () => {
          const newScreenshots = [...formData.screenshots];
          newScreenshots[index] = reader.result as string;
          setFormData({ ...formData, screenshots: newScreenshots });
        };
      } catch (error) {
        console.error('Image upload failed:', error);
      }
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Note: In a real app, we'd upload to Storage. For now, base64 (limited size)
      if (file.size > 2 * 1024 * 1024) {
        alert('Video too large! Please keep it under 2MB for this demo.');
        return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        setFormData({ ...formData, gameplayVideo: reader.result as string });
      };
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'recruitment'), {
        ...formData,
        authorUid: user.uid,
        authorName: userData?.displayName || user.displayName || 'Anonymous',
        authorPhoto: userData?.photoURL || user.photoURL || '',
        status: isAdmin ? 'approved' : 'pending',
        createdAt: serverTimestamp(),
        reactions: {}
      });
      setShowCreate(false);
      setFormData({
        type: 'player',
        ign: '',
        gameUid: '',
        whatsapp: '',
        instagram: '',
        facebook: '',
        previousTeam: '',
        screenshots: [],
        gameplayVideo: '',
        requirements: { age: '', role: '', experience: '', other: '' }
      });
      showToast(isAdmin ? 'Post published!' : 'Post submitted for review!', 'success');
    } catch (error) {
      console.error('Error creating post:', error);
      showToast('Failed to create post', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReaction = async (postId: string, reactionKey: string) => {
    if (!user) {
      navigate('/login');
      return;
    }

    const postReactions = userReactions[postId] || [];
    const postRef = doc(db, 'recruitment', postId);

    try {
      if (postReactions.includes(reactionKey)) {
        // Remove reaction
        await updateDoc(postRef, {
          [`reactions.${reactionKey}`]: arrayRemove(user.uid)
        });
        setUserReactions(prev => ({
          ...prev,
          [postId]: postReactions.filter(r => r !== reactionKey)
        }));
      } else {
        // Add reaction
        await updateDoc(postRef, {
          [`reactions.${reactionKey}`]: arrayUnion(user.uid)
        });
        setUserReactions(prev => ({
          ...prev,
          [postId]: [...postReactions, reactionKey]
        }));
      }
    } catch (error) {
      console.error('Error reacting:', error);
    }
  };

  const handleDelete = async (postId: string) => {
    setDeleteConfirm(postId);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteDoc(doc(db, 'recruitment', deleteConfirm));
      setDeleteConfirm(null);
      showToast('Post deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting post:', error);
      showToast('Failed to delete post', 'error');
    }
  };

  const filteredPosts = posts.filter(p => filter === 'all' || p.type === filter);

  const handleViewUser = async (uid: string) => {
    try {
      const userSnap = await getDoc(doc(db, 'users', uid));
      if (userSnap.exists()) {
        setSelectedUser({ uid, ...userSnap.data() });
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-12"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className={`text-5xl sm:text-6xl font-black uppercase italic tracking-tighter leading-none ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
            {settings.recruitmentTitle.split(' ')[0]} <span className="text-pink-400">{settings.recruitmentTitle.split(' ').slice(1).join(' ')}</span>
          </h1>
          <p className="text-zinc-500 font-medium">{settings.recruitmentDesc}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`flex p-1 rounded-2xl border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'}`}>
            {(['all', 'player', 'team'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase italic transition-all ${
                  filter === t 
                  ? 'bg-pink-400 text-white shadow-lg shadow-pink-400/20' 
                  : 'text-zinc-500 hover:text-pink-400'
                }`}
              >
                {t === 'all' ? 'All' : t === 'player' ? 'Players' : 'Teams'}
              </button>
            ))}
          </div>
          <button 
            onClick={() => user ? setShowCreate(true) : navigate('/login')}
            className="p-4 bg-pink-400 text-white rounded-2xl shadow-xl hover:bg-pink-500 transition-all active:scale-95 flex items-center gap-2 font-black uppercase italic text-sm"
          >
            <Plus className="w-5 h-5" />
            Post
          </button>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {filteredPosts.map((post) => (
            <motion.div
              key={post.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`group relative rounded-[2.5rem] border overflow-hidden transition-all hover:shadow-2xl ${
                darkMode ? 'bg-zinc-900 border-zinc-800 hover:shadow-zinc-900/50' : 'bg-white border-zinc-100 hover:shadow-pink-100/50'
              }`}
            >
              {/* Post Type Badge */}
              <div className="absolute top-6 right-6 flex flex-col items-end gap-2 z-10">
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase italic tracking-widest ${
                  post.type === 'player' ? 'bg-emerald-400 text-white' : 'bg-blue-400 text-white'
                }`}>
                  {post.type === 'player' ? 'LFG' : 'LFR'}
                </div>
                {post.status === 'pending' && (
                  <div className="px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded-lg text-[7px] font-black uppercase tracking-widest">
                    Pending Approval
                  </div>
                )}
              </div>

              <div className="p-8 space-y-6">
                {/* Author Info */}
                <div className="flex items-center gap-4">
                  <button onClick={() => handleViewUser(post.authorUid)} className="relative shrink-0">
                    <img 
                      src={post.authorPhoto || `https://picsum.photos/seed/${post.authorUid}/100/100`} 
                      alt={post.authorName} 
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-pink-400/20"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-black uppercase italic truncate ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
                          {post.type === 'player' ? post.ign : post.authorName}
                        </h3>
                        {post.isEdited && (
                          <span className="text-[8px] font-black uppercase text-pink-400/60 italic">(Edited)</span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        {post.type === 'player' ? 'Player looking for team' : 'Team looking for players'}
                      </p>
                    </div>
                </div>

                {/* Content Preview */}
                <div className="space-y-4">
                  {post.type === 'player' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`p-3 rounded-2xl border ${darkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-100'}`}>
                        <p className="text-[8px] font-black text-zinc-400 uppercase mb-1">UID</p>
                        <p className={`text-xs font-bold truncate ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{post.gameUid}</p>
                      </div>
                      <div className={`p-3 rounded-2xl border ${darkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-100'}`}>
                        <p className="text-[8px] font-black text-zinc-400 uppercase mb-1">Prev Team</p>
                        <p className={`text-xs font-bold truncate ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{post.previousTeam || 'None'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-100'}`}>
                      <p className="text-[8px] font-black text-zinc-400 uppercase mb-2">Requirements</p>
                      <div className="flex flex-wrap gap-2">
                        {post.requirements?.role && <span className="px-2 py-1 bg-pink-400/10 text-pink-400 text-[10px] font-bold rounded-lg uppercase">{post.requirements.role}</span>}
                        {post.requirements?.age && <span className="px-2 py-1 bg-blue-400/10 text-blue-400 text-[10px] font-bold rounded-lg uppercase">Age: {post.requirements.age}</span>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    {EMOJIS.slice(0, 1).map((emoji) => (
                      <button
                        key={emoji.key}
                        onClick={() => handleReaction(post.id, emoji.key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          userReactions[post.id] === emoji.key
                          ? 'bg-pink-400 text-white'
                          : darkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-zinc-50 text-zinc-500 hover:bg-zinc-100'
                        }`}
                      >
                        <emoji.icon className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black">
                          {Array.isArray(post.reactions?.[emoji.key]) ? post.reactions[emoji.key].length : 0}
                        </span>
                      </button>
                    ))}
                    <button 
                      onClick={() => setSelectedPost(post)}
                      className={`p-2 rounded-xl transition-colors ${darkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-zinc-50 text-zinc-500 hover:bg-zinc-100'}`}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>

                  <button 
                    onClick={() => setSelectedPost(post)}
                    className="flex items-center gap-1 text-[10px] font-black uppercase italic text-pink-400 hover:translate-x-1 transition-transform"
                  >
                    View Details <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {(isAdmin || (user && post.authorUid === user.uid)) && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(post.id); }}
                  className="absolute bottom-6 right-6 p-2 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'} w-full max-w-2xl rounded-[3rem] p-10 border shadow-2xl relative my-8`}
            >
              <button 
                onClick={() => setShowCreate(false)}
                className={`absolute top-8 right-8 p-3 rounded-full transition-colors ${darkMode ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-zinc-100 text-zinc-400'}`}
              >
                <X className="w-6 h-6" />
              </button>

              <div className="space-y-8">
                <div className="text-center space-y-2">
                  <h2 className={`text-3xl font-black uppercase italic tracking-tighter ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Create Post</h2>
                  <div className="flex justify-center gap-4">
                    <button 
                      onClick={() => setFormData({ ...formData, type: 'player' })}
                      className={`px-6 py-2 rounded-2xl text-xs font-black uppercase italic transition-all ${formData.type === 'player' ? 'bg-emerald-400 text-white' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800'}`}
                    >
                      I'm a Player
                    </button>
                    <button 
                      onClick={() => setFormData({ ...formData, type: 'team' })}
                      className={`px-6 py-2 rounded-2xl text-xs font-black uppercase italic transition-all ${formData.type === 'team' ? 'bg-blue-400 text-white' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800'}`}
                    >
                      We're a Team
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {formData.type === 'player' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">In-Game Name (IGN)</label>
                        <input 
                          required
                          value={formData.ign}
                          onChange={(e) => setFormData({ ...formData, ign: e.target.value })}
                          className={`w-full px-6 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} focus:ring-2 focus:ring-pink-400 outline-none transition-all font-bold`}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Game UID</label>
                        <input 
                          required
                          value={formData.gameUid}
                          onChange={(e) => setFormData({ ...formData, gameUid: e.target.value })}
                          className={`w-full px-6 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} focus:ring-2 focus:ring-pink-400 outline-none transition-all font-bold`}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Previous Team</label>
                        <input 
                          value={formData.previousTeam}
                          onChange={(e) => setFormData({ ...formData, previousTeam: e.target.value })}
                          className={`w-full px-6 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} focus:ring-2 focus:ring-pink-400 outline-none transition-all font-bold`}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">WhatsApp (Optional)</label>
                        <input 
                          value={formData.whatsapp}
                          onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                          className={`w-full px-6 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} focus:ring-2 focus:ring-pink-400 outline-none transition-all font-bold`}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Required Role</label>
                        <input 
                          required
                          value={formData.requirements.role}
                          onChange={(e) => setFormData({ ...formData, requirements: { ...formData.requirements, role: e.target.value } })}
                          placeholder="e.g. Rusher, Sniper"
                          className={`w-full px-6 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} focus:ring-2 focus:ring-pink-400 outline-none transition-all font-bold`}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Min. Experience</label>
                        <input 
                          value={formData.requirements.experience}
                          onChange={(e) => setFormData({ ...formData, requirements: { ...formData.requirements, experience: e.target.value } })}
                          placeholder="e.g. 2 Years, Semi-Pro"
                          className={`w-full px-6 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} focus:ring-2 focus:ring-pink-400 outline-none transition-all font-bold`}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Age Requirement</label>
                        <input 
                          value={formData.requirements.age}
                          onChange={(e) => setFormData({ ...formData, requirements: { ...formData.requirements, age: e.target.value } })}
                          placeholder="e.g. 16+"
                          className={`w-full px-6 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} focus:ring-2 focus:ring-pink-400 outline-none transition-all font-bold`}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Other Requirements</label>
                        <input 
                          value={formData.requirements.other}
                          onChange={(e) => setFormData({ ...formData, requirements: { ...formData.requirements, other: e.target.value } })}
                          placeholder="e.g. Good communication"
                          className={`w-full px-6 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} focus:ring-2 focus:ring-pink-400 outline-none transition-all font-bold`}
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Instagram (Optional)</label>
                      <input 
                        value={formData.instagram}
                        onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                        className={`w-full px-6 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} focus:ring-2 focus:ring-pink-400 outline-none transition-all font-bold`}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Facebook (Optional)</label>
                      <input 
                        value={formData.facebook}
                        onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                        className={`w-full px-6 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} focus:ring-2 focus:ring-pink-400 outline-none transition-all font-bold`}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Media Evidence</label>
                    <div className="grid grid-cols-3 gap-4">
                      {[0, 1].map((idx) => (
                        <div key={idx} className="relative aspect-square">
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, idx)}
                            className="hidden"
                            id={`img-${idx}`}
                          />
                          <label 
                            htmlFor={`img-${idx}`}
                            className={`w-full h-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                              formData.screenshots[idx] 
                              ? 'border-pink-400 bg-pink-50 dark:bg-pink-900/10' 
                              : 'border-zinc-200 dark:border-zinc-800 hover:border-pink-400'
                            }`}
                          >
                            {formData.screenshots[idx] ? (
                              <img src={formData.screenshots[idx]} className="w-full h-full object-cover rounded-2xl" alt="Screenshot" />
                            ) : (
                              <>
                                <ImageIcon className="w-6 h-6 text-zinc-400 mb-1" />
                                <span className="text-[8px] font-black text-zinc-400 uppercase">ID SS {idx + 1}</span>
                              </>
                            )}
                          </label>
                        </div>
                      ))}
                      <div className="relative aspect-square">
                        <input 
                          type="file" 
                          accept="video/*"
                          onChange={handleVideoUpload}
                          className="hidden"
                          id="video-upload"
                        />
                        <label 
                          htmlFor="video-upload"
                          className={`w-full h-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                            formData.gameplayVideo 
                            ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10' 
                            : 'border-zinc-200 dark:border-zinc-800 hover:border-emerald-400'
                          }`}
                        >
                          {formData.gameplayVideo ? (
                            <Video className="w-8 h-8 text-emerald-400" />
                          ) : (
                            <>
                              <Video className="w-6 h-6 text-zinc-400 mb-1" />
                              <span className="text-[8px] font-black text-zinc-400 uppercase">Gameplay</span>
                            </>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-5 bg-pink-400 text-white rounded-[2rem] font-black uppercase italic tracking-wider hover:bg-pink-500 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-pink-400/20 flex flex-col items-center justify-center"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin mb-1" />
                        <span className="text-[10px]">Uploading media may take a few moments. Please wait.</span>
                      </>
                    ) : 'Post Recruitment'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedPost && (
          <PostDetailModal 
            post={selectedPost} 
            onClose={() => setSelectedPost(null)} 
            onViewUser={handleViewUser}
            darkMode={darkMode}
          />
        )}
      </AnimatePresence>

      {/* User Profile Modal */}
      <AnimatePresence>
        {selectedUser && (
          <ProfileModal 
            uid={selectedUser.uid} 
            onClose={() => setSelectedUser(null)} 
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
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
              <p className="text-zinc-400 text-sm mb-8">Are you sure you want to delete this recruitment post? This action cannot be undone.</p>
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

function PostDetailModal({ post, onClose, onViewUser, darkMode }: { post: RecruitmentPost, onClose: () => void, onViewUser: (uid: string) => void, darkMode: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'comments'),
      where('targetId', '==', post.id),
      where('targetType', '==', 'recruitment'),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
      setComments(data);
    });

    return () => unsubscribe();
  }, [post.id]);

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
        targetId: post.id,
        targetType: 'recruitment',
        text: newComment,
        authorName: user.displayName || 'Anonymous',
        authorUid: user.uid,
        authorPhoto: user.photoURL || '',
        status: 'approved',
        createdAt: serverTimestamp()
      });
      setNewComment('');
    } catch (error) {
      console.error('Error commenting:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'} w-full max-w-4xl rounded-[3rem] border shadow-2xl relative flex flex-col md:flex-row overflow-hidden my-8`}
      >
        <button 
          onClick={onClose}
          className={`absolute top-6 right-6 z-20 p-2 rounded-full transition-colors ${darkMode ? 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400' : 'bg-white/50 hover:bg-white text-zinc-500'}`}
        >
          <X className="w-6 h-6" />
        </button>

        {/* Media Section */}
        <div className={`md:w-1/2 p-8 space-y-6 ${darkMode ? 'bg-zinc-800/30' : 'bg-zinc-50/50'}`}>
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase italic tracking-widest text-pink-400">Media Evidence</h3>
            <div className="grid grid-cols-2 gap-4">
              {post.screenshots?.map((src, i) => (
                <img key={i} src={src} className="w-full aspect-square object-cover rounded-2xl border-2 border-white dark:border-zinc-800 shadow-lg" alt="Evidence" />
              ))}
            </div>
            {post.gameplayVideo && (
              <div className="rounded-2xl overflow-hidden border-2 border-white dark:border-zinc-800 shadow-lg bg-black aspect-video flex items-center justify-center">
                {post.gameplayVideo.startsWith('data:video') ? (
                  <video src={post.gameplayVideo} controls className="w-full h-full" />
                ) : (
                  <div className="text-center p-4">
                    <Video className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
                    <p className="text-[10px] font-bold text-zinc-500 uppercase">Video Preview</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase italic tracking-widest text-pink-400">Contact Info</h3>
            <div className="flex flex-wrap gap-3">
              {post.whatsapp && (
                <a href={`https://wa.me/${post.whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-emerald-400/10 text-emerald-400 rounded-xl text-xs font-bold">
                  <Phone className="w-4 h-4" /> WhatsApp
                </a>
              )}
              {post.instagram && (
                <a href={`https://instagram.com/${post.instagram}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-pink-400/10 text-pink-400 rounded-xl text-xs font-bold">
                  <Instagram className="w-4 h-4" /> Instagram
                </a>
              )}
              {post.facebook && (
                <a href={post.facebook} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-blue-400/10 text-blue-400 rounded-xl text-xs font-bold">
                  <Facebook className="w-4 h-4" /> Facebook
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Info & Comments Section */}
        <div className="md:w-1/2 p-8 flex flex-col h-[600px] md:h-auto">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => onViewUser(post.authorUid)} className="shrink-0">
              <img src={post.authorPhoto} className="w-14 h-14 rounded-2xl object-cover border-2 border-pink-400" alt={post.authorName} />
            </button>
            <div>
              <h2 className={`text-2xl font-black uppercase italic leading-none ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{post.ign || post.authorName}</h2>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
                Posted by {post.authorName}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
            {/* Details */}
            <div className={`p-6 rounded-3xl border ${darkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-100'}`}>
              {post.type === 'player' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[8px] font-black text-zinc-400 uppercase mb-1">UID</p>
                      <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{post.gameUid}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-zinc-400 uppercase mb-1">Prev Team</p>
                      <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{post.previousTeam || 'None'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                   <p className="text-[8px] font-black text-zinc-400 uppercase mb-2">Requirements</p>
                   <div className="space-y-2">
                     <div className="flex items-center justify-between">
                       <span className="text-xs font-bold text-zinc-500">Role</span>
                       <span className="text-xs font-black text-pink-400 uppercase italic">{post.requirements?.role}</span>
                     </div>
                     <div className="flex items-center justify-between">
                       <span className="text-xs font-bold text-zinc-500">Age</span>
                       <span className="text-xs font-black text-blue-400 uppercase italic">{post.requirements?.age || 'Any'}</span>
                     </div>
                     <div className="flex items-center justify-between">
                       <span className="text-xs font-bold text-zinc-500">Experience</span>
                       <span className="text-xs font-black text-emerald-400 uppercase italic">{post.requirements?.experience || 'Any'}</span>
                     </div>
                     {post.requirements?.other && (
                       <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
                         <p className="text-[10px] font-medium text-zinc-400 italic">"{post.requirements.other}"</p>
                       </div>
                     )}
                   </div>
                </div>
              )}
            </div>

            {/* Comments List */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase italic tracking-widest text-zinc-400">Discussion</h3>
              {comments.length === 0 ? (
                <p className="text-center py-8 text-zinc-500 text-xs italic">No comments yet. Start the conversation!</p>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <button onClick={() => onViewUser(comment.authorUid)} className="shrink-0">
                        <img src={comment.authorPhoto} className="w-8 h-8 rounded-xl object-cover hover:ring-2 hover:ring-pink-400 transition-all" alt="" />
                      </button>
                      <div className={`flex-1 p-3 rounded-2xl text-xs ${darkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                        <button 
                          onClick={() => onViewUser(comment.authorUid)}
                          className="font-black uppercase italic text-[10px] text-pink-400 mb-1 hover:underline"
                        >
                          {comment.authorName}
                        </button>
                        <p className={darkMode ? 'text-zinc-300' : 'text-zinc-600'}>{comment.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Comment Input */}
          <form onSubmit={handleSubmitComment} className="mt-6 flex gap-3">
            <input 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className={`flex-1 px-6 py-3 rounded-2xl border text-sm ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'} focus:ring-2 focus:ring-pink-400 outline-none transition-all`}
            />
            <button 
              type="submit"
              disabled={isSubmitting || !newComment.trim()}
              className="p-3 bg-pink-400 text-white rounded-2xl hover:bg-pink-500 transition-all disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
