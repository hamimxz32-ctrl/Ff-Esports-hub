import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { doc, updateDoc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { useAuth, useTheme } from '../App';
import { motion } from 'motion/react';
import { User, Camera, Save, Globe, Facebook, Gamepad2, AtSign, Info, MapPin, Image as ImageIcon, Sparkles } from 'lucide-react';
import imageCompression from 'browser-image-compression';

const BANGLADESH_DISTRICTS = [
  'Dhaka', 'Faridpur', 'Gazipur', 'Gopalganj', 'Kishoreganj', 'Madaripur', 'Manikganj', 'Munshiganj', 'Narayanganj', 'Narsingdi', 'Rajbari', 'Shariatpur', 'Tangail',
  'Bagerhat', 'Chuadanga', 'Jessore', 'Jhenaidah', 'Khulna', 'Kushtia', 'Magura', 'Meherpur', 'Narail', 'Satkhira',
  'Bogra', 'Joypurhat', 'Naogaon', 'Natore', 'Chapainawabganj', 'Pabna', 'Rajshahi', 'Sirajganj',
  'Dinajpur', 'Gaibandha', 'Kurigram', 'Lalmonirhat', 'Nilphamari', 'Panchagarh', 'Rangpur', 'Thakurgaon',
  'Habiganj', 'Moulvibazar', 'Sunamganj', 'Sylhet',
  'Barguna', 'Barisal', 'Bhola', 'Jhalokati', 'Patuakhali', 'Pirojpur',
  'Bandarban', 'Brahmanbaria', 'Chandpur', 'Chittagong', 'Comilla', 'Cox\'s Bazar', 'Feni', 'Khagrachhari', 'Lakshmipur', 'Noakhali', 'Rangamati',
  'Jamalpur', 'Mymensingh', 'Netrokona', 'Sherpur'
].sort();

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
    bannerUrl: '',
    district: '',
    country: '',
    role: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userData) {
      setFormData({
        displayName: userData.displayName || '',
        username: userData.username || '',
        gameUID: userData.gameUID || '',
        facebookId: userData.facebookId || '',
        bio: userData.bio || '',
        photoURL: userData.photoURL || '',
        bannerUrl: userData.bannerUrl || '',
        district: userData.district || '',
        country: userData.country || '',
        role: userData.role || ''
      });
    }
  }, [userData]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'photoURL' | 'bannerUrl') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const options = {
        maxSizeMB: field === 'bannerUrl' ? 0.2 : 0.1,
        maxWidthOrHeight: field === 'bannerUrl' ? 1200 : 400,
        useWebWorker: true,
      };
      try {
        const compressedFile = await imageCompression(file, options);
        const reader = new FileReader();
        reader.readAsDataURL(compressedFile);
        reader.onloadend = () => {
          setFormData(prev => ({ ...prev, [field]: reader.result as string }));
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
        bannerUrl: formData.bannerUrl,
        district: formData.district,
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
        <h1 className="text-5xl font-black uppercase italic tracking-tighter leading-none text-esports-text">
          Edit Profile
        </h1>
        <p className="text-esports-text-muted font-medium">Customize your public esports presence.</p>
      </div>

      {/* Profile Preview (Esports Card Style) */}
      <div className="relative group">
        <div className="relative h-64 rounded-[2rem] overflow-hidden border-4 border-esports-card shadow-2xl bg-esports-card">
          {/* Animated Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-esports-primary/20 via-purple-500/10 to-blue-500/10 z-10" />
          
          {formData.bannerUrl ? (
            <img src={formData.bannerUrl} className="w-full h-full object-cover" alt="Banner" />
          ) : (
            <div className="w-full h-full bg-white/5 flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-white/10" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-esports-bg via-transparent to-transparent z-20" />
          
          <div className="absolute bottom-8 left-8 right-8 flex items-end justify-between z-30">
            <div className="flex items-center gap-6">
              <div className="relative">
                <img 
                  src={formData.photoURL || `https://picsum.photos/seed/${user.uid}/200/200`} 
                  className="w-24 h-24 rounded-2xl border-4 border-esports-card object-cover shadow-2xl"
                  alt="Avatar"
                />
                <div className="absolute -top-2 -right-2 bg-esports-primary p-1.5 rounded-lg shadow-lg">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="text-esports-text">
                <h2 className="text-3xl font-black uppercase italic tracking-tighter">{formData.displayName || 'Your Name'}</h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-esports-text-muted uppercase tracking-widest">@{formData.username || 'username'}</span>
                  <span className="px-2 py-0.5 bg-esports-primary/20 text-esports-primary rounded-md text-[10px] font-black uppercase italic">{formData.role || 'Player'}</span>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center gap-2 text-esports-text-muted mb-1">
                <MapPin className="w-3 h-3" />
                <span className="text-[10px] font-black uppercase tracking-widest">{formData.district || 'Location'}</span>
              </div>
              <div className="text-esports-secondary text-xl font-black italic uppercase tracking-tighter">Pro Elite</div>
            </div>
          </div>

          <button 
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            className="absolute top-6 right-6 p-3 bg-white/10 backdrop-blur-md text-white rounded-xl hover:bg-white/20 transition-all z-40 border border-white/20"
          >
            <Camera className="w-5 h-5" />
          </button>
          <input 
            type="file" 
            ref={bannerInputRef} 
            onChange={(e) => handleImageUpload(e, 'bannerUrl')} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-12">
        {/* Left: Avatar & Identity */}
        <div className="space-y-8">
          <div className="relative group mx-auto w-48 h-48">
            <img 
              src={formData.photoURL || `https://picsum.photos/seed/${user.uid}/400/400`} 
              className="w-full h-full rounded-[2.5rem] object-cover border-8 border-esports-card shadow-2xl transition-all group-hover:scale-105"
              alt="Profile"
              referrerPolicy="no-referrer"
            />
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-4 right-4 p-4 bg-esports-primary text-white rounded-2xl shadow-xl hover:bg-red-600 transition-all active:scale-90"
            >
              <Camera className="w-6 h-6" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={(e) => handleImageUpload(e, 'photoURL')} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-esports-text-muted ml-2">Display Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-esports-text-muted" />
                <input 
                  required
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border bg-esports-card border-white/5 text-esports-text focus:ring-2 focus:ring-esports-primary outline-none transition-all font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-esports-text-muted ml-2">Username</label>
              <div className="relative">
                <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-esports-text-muted" />
                <input 
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.replace(/\s/g, '') })}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border bg-esports-card border-white/5 text-esports-text focus:ring-2 focus:ring-esports-primary outline-none transition-all font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Details & Bio */}
        <div className="md:col-span-2 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-esports-text-muted ml-2">Game UID</label>
              <div className="relative">
                <Gamepad2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-esports-text-muted" />
                <input 
                  value={formData.gameUID}
                  onChange={(e) => setFormData({ ...formData, gameUID: e.target.value })}
                  placeholder="Your FF UID..."
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border bg-esports-card border-white/5 text-esports-text focus:ring-2 focus:ring-esports-primary outline-none transition-all font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-esports-text-muted ml-2">Facebook ID / Link</label>
              <div className="relative">
                <Facebook className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-esports-text-muted" />
                <input 
                  value={formData.facebookId}
                  onChange={(e) => setFormData({ ...formData, facebookId: e.target.value })}
                  placeholder="Facebook profile link..."
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border bg-esports-card border-white/5 text-esports-text focus:ring-2 focus:ring-esports-primary outline-none transition-all font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-esports-text-muted ml-2">District (Bangladesh)</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-esports-text-muted" />
                <select 
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border bg-esports-card border-white/5 text-esports-text focus:ring-2 focus:ring-esports-primary outline-none transition-all font-bold appearance-none"
                >
                  <option value="">Select District</option>
                  {BANGLADESH_DISTRICTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-esports-text-muted ml-2">Country</label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-esports-text-muted" />
                <input 
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="e.g. Bangladesh, India..."
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border bg-esports-card border-white/5 text-esports-text focus:ring-2 focus:ring-esports-primary outline-none transition-all font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-esports-text-muted ml-2">Esports Role</label>
              <div className="relative">
                <Gamepad2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-esports-text-muted" />
                <select 
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border bg-esports-card border-white/5 text-esports-text focus:ring-2 focus:ring-esports-primary outline-none transition-all font-bold appearance-none"
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
            <label className="text-[10px] font-black uppercase tracking-widest text-esports-text-muted ml-2">Bio / Description</label>
            <div className="relative">
              <Info className="absolute left-4 top-6 w-5 h-5 text-esports-text-muted" />
              <textarea 
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell the world about yourself..."
                rows={4}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border bg-esports-card border-white/5 text-esports-text focus:ring-2 focus:ring-esports-primary outline-none transition-all font-bold resize-none"
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
            className="w-full py-5 bg-esports-primary text-white rounded-[2rem] font-black uppercase italic tracking-wider hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-esports-primary/20 flex items-center justify-center gap-3"
          >
            <Save className="w-6 h-6" />
            {loading ? 'Saving Changes...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
