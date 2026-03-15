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
  User as UserIcon,
  MapPin,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProfileModalProps {
  uid: string;
  onClose: () => void;
}

export default function ProfileModal({ uid, onClose }: ProfileModalProps) {
  const { user } = useAuth();
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
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-esports-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-esports-card w-full max-w-4xl rounded-[3rem] border border-white/5 shadow-2xl relative flex flex-col overflow-hidden my-8"
      >
        {/* Banner Section */}
        <div className="relative h-48 w-full overflow-hidden">
          {/* Animated Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-esports-primary/20 via-purple-500/20 to-blue-500/20 animate-gradient-xy z-10" />
          
          {profile.bannerUrl ? (
            <img src={profile.bannerUrl} className="w-full h-full object-cover" alt="Banner" />
          ) : (
            <div className="w-full h-full bg-black/40 flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-esports-text-muted opacity-20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-20" />
        </div>

        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-30 p-2 rounded-full transition-colors bg-black/40 hover:bg-black/60 text-white"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex flex-col md:flex-row relative z-30 -mt-16">
          {/* Left: Identity & Media */}
          <div className="md:w-1/2 p-8 pt-0 space-y-8">
            <div className="text-center md:text-left space-y-4">
              <div className="relative inline-block">
                <img 
                  src={profile.photoURL || `https://picsum.photos/seed/${uid}/400/400`} 
                  alt={profile.displayName} 
                  className="w-32 h-32 rounded-[2.5rem] object-cover mx-auto md:mx-0 border-4 border-esports-card shadow-2xl"
                  referrerPolicy="no-referrer"
                />
                {profile.isOnline && (
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-esports-card bg-emerald-400" />
                )}
                <div className="absolute -top-2 -right-2 bg-esports-primary p-1.5 rounded-lg shadow-lg">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-center md:justify-start gap-3">
                  <h2 className="text-3xl font-black uppercase italic leading-none text-white">{profile.displayName}</h2>
                  <span className="px-2 py-0.5 bg-esports-primary/10 text-esports-primary rounded-md text-[10px] font-black uppercase italic border border-esports-primary/20">{profile.role || 'Player'}</span>
                </div>
                <p className="text-xs font-bold text-esports-text-muted uppercase tracking-widest mt-2">@{profile.username || 'player'}</p>
              </div>
            </div>

            {recruitmentMedia.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase italic tracking-widest text-esports-primary">Media Evidence</h3>
              <div className="grid grid-cols-2 gap-3">
                {recruitmentMedia.map((m, i) => (
                  <div key={i} className="aspect-square rounded-2xl overflow-hidden border-2 border-white/5 shadow-sm bg-black">
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
              <h3 className="text-[10px] font-black uppercase italic tracking-widest text-esports-primary">Bio</h3>
              <p className="text-sm font-bold italic leading-relaxed text-esports-text-muted">
                "{profile.bio}"
              </p>
            </div>
          )}
          </div>

          {/* Right: Details & Actions */}
          <div className="md:w-1/2 p-8 space-y-8 flex flex-col">
          <div className="space-y-6 flex-1">
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase italic tracking-widest text-esports-primary">Player Identity</h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="p-4 rounded-2xl border flex items-center gap-4 bg-black/20 border-white/5">
                  <Gamepad2 className="w-6 h-6 text-esports-primary" />
                  <div>
                    <p className="text-[8px] font-black uppercase text-esports-text-muted">Game UID</p>
                    <p className="text-sm font-bold text-white">{profile.gameUID || 'Not Linked'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border flex items-center gap-4 bg-black/20 border-white/5">
                    <MapPin className="w-6 h-6 text-esports-primary" />
                    <div>
                      <p className="text-[8px] font-black uppercase text-esports-text-muted">District</p>
                      <p className="text-sm font-bold text-white">{profile.district || 'Not Set'}</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl border flex items-center gap-4 bg-black/20 border-white/5">
                    <Globe className="w-6 h-6 text-esports-primary" />
                    <div>
                      <p className="text-[8px] font-black uppercase text-esports-text-muted">Country</p>
                      <p className="text-sm font-bold text-white">{profile.country || 'Global'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase italic tracking-widest text-esports-primary">Social Links</h3>
              <div className="grid grid-cols-1 gap-3">
                {profile.facebookId && (
                  <a 
                    href={profile.facebookId.startsWith('http') ? profile.facebookId : `https://facebook.com/${profile.facebookId}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-between p-4 rounded-2xl border transition-all hover:scale-[1.02] bg-blue-500/10 border-blue-500/20 text-blue-400"
                  >
                    <div className="flex items-center gap-3">
                      <Facebook className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase italic">Facebook Profile</span>
                    </div>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                {!profile.facebookId && (
                  <p className="text-xs font-bold text-esports-text-muted italic">No social links provided</p>
                )}
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5">
            <button 
              onClick={startChat}
              className="w-full py-5 bg-esports-primary text-white rounded-[2rem] font-black uppercase italic tracking-wider hover:bg-esports-primary/90 transition-all active:scale-95 shadow-xl shadow-esports-primary/20 flex items-center justify-center gap-3"
            >
              <MessageCircle className="w-6 h-6" />
              Start Direct Chat
            </button>
          </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
