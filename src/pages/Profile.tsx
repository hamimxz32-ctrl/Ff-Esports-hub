import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { doc, updateDoc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { useAuth, useTheme } from '../App';
import { motion } from 'motion/react';
import { User, Camera, Save, Globe, Facebook, Gamepad2, AtSign, Info } from 'lucide-react';
import imageCompression from 'browser-image-compression';

export default function Profile() {
  const { user, userData } = useAuth();
  const { darkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    displayName: '',
    username: '',
    gameUID: '',
    facebookId: '',
    bio: '',
    photoURL: '',
    country: '',
    role: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userData) {
      setFormData({
        displayName: userData.displayName || '',
        username: userData.username || '',
        gameUID: userData.gameUID || '',
        facebookId: userData.facebookId || '',
        bio: userData.bio || '',
        photoURL: userData.photoURL || '',
        country: userData.country || '',
        role: userData.role || ''
      });
    }
  }, [userData]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
          setFormData(prev => ({ ...prev, photoURL: reader.result as string }));
        };
      } catch (error) {
        console.error('Image upload failed:', error);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setMessage(null);

    try {
      const cleanUsername = formData.username.toLowerCase().trim().replace(/\s/g, '');
      
      // Check username uniqueness if changed
      if (cleanUsername !== userData?.username) {
        const q = query(collection(db, 'users'), where('username', '==', cleanUsername));
        const snap = await getDocs(q);
        if (!snap.empty) {
          throw new Error('Username is already taken');
        }
      }

      // Update Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: formData.displayName,
        username: cleanUsername,
        gameUID: formData.gameUID,
        facebookId: formData.facebookId,
        bio: formData.bio,
        photoURL: formData.photoURL,
        country: formData.country,
        role: formData.role
      });

      // Update Auth Profile
      try {
        await updateProfile(user, {
          displayName: formData.displayName,
          photoURL: formData.photoURL
        });
      } catch (authErr) {
        console.warn('Auth profile update failed (likely too many updates), but Firestore is updated.');
      }

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-20">
        <User className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Login to manage profile</h2>
        <p className="text-zinc-500">Your esports identity starts here.</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-12"
    >
      <div className="text-center space-y-4">
        <h1 className={`text-5xl font-black uppercase italic tracking-tighter leading-none ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
          Edit Profile
        </h1>
        <p className="text-zinc-500 font-medium">Customize your public esports presence.</p>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-12">
        {/* Left: Avatar & Identity */}
        <div className="space-y-8">
          <div className="relative group mx-auto w-48 h-48">
            <img 
              src={formData.photoURL || `https://picsum.photos/seed/${user.uid}/400/400`} 
              className={`w-full h-full rounded-[3rem] object-cover border-8 ${darkMode ? 'border-zinc-900 shadow-zinc-900' : 'border-white shadow-pink-100'} shadow-2xl transition-all group-hover:scale-105`}
              alt="Profile"
              referrerPolicy="no-referrer"
            />
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-4 right-4 p-4 bg-pink-400 text-white rounded-2xl shadow-xl hover:bg-pink-500 transition-all active:scale-90"
            >
              <Camera className="w-6 h-6" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Display Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input 
                  required
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className={`w-full pl-12 pr-4 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-100 text-zinc-900'} focus:ring-2 focus:ring-pink-400 outline-none transition-all font-bold`}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Username</label>
              <div className="relative">
                <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input 
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.replace(/\s/g, '') })}
                  className={`w-full pl-12 pr-4 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-100 text-zinc-900'} focus:ring-2 focus:ring-pink-400 outline-none transition-all font-bold`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Details & Bio */}
        <div className="md:col-span-2 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Game UID</label>
              <div className="relative">
                <Gamepad2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input 
                  value={formData.gameUID}
                  onChange={(e) => setFormData({ ...formData, gameUID: e.target.value })}
                  placeholder="Your FF UID..."
                  className={`w-full pl-12 pr-4 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-100 text-zinc-900'} focus:ring-2 focus:ring-pink-400 outline-none transition-all font-bold`}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Facebook ID / Link</label>
              <div className="relative">
                <Facebook className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input 
                  value={formData.facebookId}
                  onChange={(e) => setFormData({ ...formData, facebookId: e.target.value })}
                  placeholder="Facebook profile link..."
                  className={`w-full pl-12 pr-4 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-100 text-zinc-900'} focus:ring-2 focus:ring-pink-400 outline-none transition-all font-bold`}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Country</label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input 
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="e.g. Bangladesh, India..."
                  className={`w-full pl-12 pr-4 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-100 text-zinc-900'} focus:ring-2 focus:ring-pink-400 outline-none transition-all font-bold`}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Esports Role</label>
              <div className="relative">
                <Gamepad2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <select 
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className={`w-full pl-12 pr-4 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-100 text-zinc-900'} focus:ring-2 focus:ring-pink-400 outline-none transition-all font-bold appearance-none`}
                >
                  <option value="">Select Role</option>
                  <option value="Captain">Captain</option>
                  <option value="Sniper">Sniper</option>
                  <option value="Rusher">Rusher</option>
                  <option value="Support">Support</option>
                  <option value="Flanker">Flanker</option>
                  <option value="IGL">IGL</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Bio / Description</label>
            <div className="relative">
              <Info className="absolute left-4 top-6 w-5 h-5 text-zinc-400" />
              <textarea 
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell the world about yourself..."
                rows={4}
                className={`w-full pl-12 pr-4 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-100 text-zinc-900'} focus:ring-2 focus:ring-pink-400 outline-none transition-all font-bold resize-none`}
              />
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-2xl text-sm font-bold ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
              {message.text}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-pink-400 text-white rounded-[2rem] font-black uppercase italic tracking-wider hover:bg-pink-500 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-pink-400/20 flex items-center justify-center gap-3"
          >
            <Save className="w-6 h-6" />
            {loading ? 'Saving Changes...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
