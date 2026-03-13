import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { useAuth, useTheme } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  MessageCircle, 
  Facebook, 
  Instagram, 
  Gamepad2, 
  Info, 
  Video, 
  Image as ImageIcon,
  ExternalLink,
  Phone,
  Globe,
  User as UserIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProfileModalProps {
  uid: string;
  onClose: () => void;
}

export default function ProfileModal({ uid, onClose }: ProfileModalProps) {
  const { user, darkMode } = useAuth();
  const { darkMode: themeDarkMode } = useTheme();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [recruitmentMedia, setRecruitmentMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      try {
        // Fetch user basic info
        const userSnap = await getDoc(doc(db, 'users', uid));
        if (userSnap.exists()) {
          setProfile({ uid, ...userSnap.data() });
        }

        // Fetch user's recruitment posts for media
        const q = query(
          collection(db, 'recruitment'),
          where('authorUid', '==', uid),
          where('status', '==', 'approved'),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        const recruitmentSnap = await getDocs(q);
        if (!recruitmentSnap.empty) {
          const post = recruitmentSnap.docs[0].data();
          const media = [];
          if (post.screenshots) media.push(...post.screenshots.map((s: string) => ({ type: 'image', url: s })));
          if (post.gameplayVideo) media.push({ type: 'video', url: post.gameplayVideo });
          setRecruitmentMedia(media);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [uid]);

  const startChat = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    const chatId = [user.uid, uid].sort().join('_');
    navigate(`/chat/${chatId}`);
    onClose();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-400 border-t-transparent"></div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className={`${themeDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'} w-full max-w-4xl rounded-[3rem] border shadow-2xl relative flex flex-col md:flex-row overflow-hidden my-8`}
      >
        <button 
          onClick={onClose}
          className={`absolute top-6 right-6 z-20 p-2 rounded-full transition-colors ${themeDarkMode ? 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400' : 'bg-white/50 hover:bg-white text-zinc-500'}`}
        >
          <X className="w-6 h-6" />
        </button>

        {/* Left: Identity & Media */}
        <div className={`md:w-1/2 p-8 space-y-8 ${themeDarkMode ? 'bg-zinc-800/30' : 'bg-zinc-50/50'}`}>
          <div className="text-center space-y-4">
            <div className="relative inline-block">
              <img 
                src={profile.photoURL || `https://picsum.photos/seed/${uid}/400/400`} 
                alt={profile.displayName} 
                className={`w-32 h-32 rounded-[2.5rem] object-cover mx-auto border-4 ${themeDarkMode ? 'border-zinc-800' : 'border-white'} shadow-xl`}
                referrerPolicy="no-referrer"
              />
              {profile.isOnline && (
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-white dark:border-zinc-900 bg-emerald-400" />
              )}
            </div>
            <div>
              <h2 className={`text-3xl font-black uppercase italic leading-none ${themeDarkMode ? 'text-white' : 'text-zinc-900'}`}>{profile.displayName}</h2>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-2">@{profile.username || 'player'}</p>
            </div>
          </div>

          {recruitmentMedia.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase italic tracking-widest text-pink-400">Media Evidence</h3>
              <div className="grid grid-cols-2 gap-3">
                {recruitmentMedia.map((m, i) => (
                  <div key={i} className="aspect-square rounded-2xl overflow-hidden border-2 border-white dark:border-zinc-800 shadow-sm bg-black">
                    {m.type === 'image' ? (
                      <img src={m.url} className="w-full h-full object-cover" alt="Evidence" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="w-8 h-8 text-emerald-400" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {profile.bio && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-black uppercase italic tracking-widest text-pink-400">Bio</h3>
              <p className={`text-sm font-bold italic leading-relaxed ${themeDarkMode ? 'text-zinc-300' : 'text-zinc-600'}`}>
                "{profile.bio}"
              </p>
            </div>
          )}
        </div>

        {/* Right: Details & Actions */}
        <div className="md:w-1/2 p-8 space-y-8 flex flex-col">
          <div className="space-y-6 flex-1">
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase italic tracking-widest text-pink-400">Player Identity</h3>
              <div className="grid grid-cols-1 gap-4">
                <div className={`p-4 rounded-2xl border flex items-center gap-4 ${themeDarkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-100'}`}>
                  <Gamepad2 className="w-6 h-6 text-pink-400" />
                  <div>
                    <p className="text-[8px] font-black uppercase text-zinc-400">Game UID</p>
                    <p className={`text-sm font-bold ${themeDarkMode ? 'text-white' : 'text-zinc-900'}`}>{profile.gameUID || 'Not Linked'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-2xl border flex items-center gap-4 ${themeDarkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-100'}`}>
                    <UserIcon className="w-6 h-6 text-pink-400" />
                    <div>
                      <p className="text-[8px] font-black uppercase text-zinc-400">Role</p>
                      <p className={`text-sm font-bold ${themeDarkMode ? 'text-white' : 'text-zinc-900'}`}>{profile.role || 'Player'}</p>
                    </div>
                  </div>
                  <div className={`p-4 rounded-2xl border flex items-center gap-4 ${themeDarkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-100'}`}>
                    <Globe className="w-6 h-6 text-pink-400" />
                    <div>
                      <p className="text-[8px] font-black uppercase text-zinc-400">Country</p>
                      <p className={`text-sm font-bold ${themeDarkMode ? 'text-white' : 'text-zinc-900'}`}>{profile.country || 'Global'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase italic tracking-widest text-pink-400">Social Links</h3>
              <div className="grid grid-cols-1 gap-3">
                {profile.facebookId && (
                  <a 
                    href={profile.facebookId.startsWith('http') ? profile.facebookId : `https://facebook.com/${profile.facebookId}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all hover:scale-[1.02] ${themeDarkMode ? 'bg-blue-900/10 border-blue-900/20 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-600'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Facebook className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase italic">Facebook Profile</span>
                    </div>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                {!profile.facebookId && (
                  <p className="text-xs font-bold text-zinc-400 italic">No social links provided</p>
                )}
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800">
            <button 
              onClick={startChat}
              className="w-full py-5 bg-pink-400 text-white rounded-[2rem] font-black uppercase italic tracking-wider hover:bg-pink-500 transition-all active:scale-95 shadow-xl shadow-pink-400/20 flex items-center justify-center gap-3"
            >
              <MessageCircle className="w-6 h-6" />
              Start Direct Chat
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
