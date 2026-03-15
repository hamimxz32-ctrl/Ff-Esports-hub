import { useState, useEffect, FormEvent, useCallback, useRef, ChangeEvent } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, updateDoc, doc, increment, serverTimestamp, deleteDoc, getDoc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth, useTheme, useSettings } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Heart, Flame, Laugh, ThumbsUp, Plus, X, Trash2, MessageCircle, Send, User, Crop, Upload, Image as ImageIcon, Settings } from 'lucide-react';
import Cropper from 'react-easy-crop';
import imageCompression from 'browser-image-compression';

interface Photo {
  id: string;
  imageUrl: string;
  caption?: string;
  authorName: string;
  authorUid: string;
  createdAt: any;
  reactions: Record<string, string[]>;
  status: 'pending' | 'approved';
  isEdited?: boolean;
}

interface Comment {
  id: string;
  targetId: string;
  targetType: 'gallery' | 'roster';
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

export default function Gallery() {
  const { user, isAdmin } = useAuth();
  const settings = useSettings();
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [formData, setFormData] = useState({
    url: '',
    caption: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Cropping states
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        const options = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
        };
        
        try {
          const compressedFile = await imageCompression(blob as File, options);
          const reader = new FileReader();
          reader.readAsDataURL(compressedFile);
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
        } catch (error) {
          console.error('Compression failed:', error);
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
        }
      }, 'image/jpeg');
    });
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setImageToCrop(reader.result as string));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleCropSave = async () => {
    if (imageToCrop && croppedAreaPixels) {
      try {
        const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels);
        setFormData(prev => ({ ...prev, url: croppedImage }));
        setImageToCrop(null);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const q = query(
      collection(db, 'gallery'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Photo));
      setPhotos(data);
    });

    return () => unsubscribe();
  }, []);

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !formData.url) return;

    setIsUploading(true);
    try {
      await addDoc(collection(db, 'gallery'), {
        imageUrl: formData.url,
        caption: formData.caption,
        authorName: user.displayName || 'Anonymous',
        authorUid: user.uid,
        createdAt: serverTimestamp(),
        status: 'pending',
        reactions: { like: [], fire: [], funny: [], love: [] }
      });
      setFormData({ url: '', caption: '' });
      setShowUpload(false);
      showToast('Photo submitted! Waiting for admin approval.', 'success');
    } catch (error) {
      console.error('Upload failed:', error);
      showToast('Failed to upload photo', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReact = async (photoId: string, reactionKey: string) => {
    if (!user) {
      navigate('/login');
      return;
    }

    const photo = photos.find(p => p.id === photoId);
    if (!photo) return;

    const photoRef = doc(db, 'gallery', photoId);
    const currentReactions = photo.reactions?.[reactionKey] || [];
    const hasReacted = Array.isArray(currentReactions) && currentReactions.includes(user.uid);

    try {
      if (hasReacted) {
        // Remove reaction
        await updateDoc(photoRef, {
          [`reactions.${reactionKey}`]: arrayRemove(user.uid)
        });
      } else {
        // Add reaction
        await updateDoc(photoRef, {
          [`reactions.${reactionKey}`]: arrayUnion(user.uid)
        });
      }
    } catch (error) {
      console.error('Error reacting:', error);
    }
  };

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !editingPhoto) return;

    setIsEditing(true);
    try {
      await updateDoc(doc(db, 'gallery', editingPhoto.id), {
        caption: editingPhoto.caption,
        imageUrl: editingPhoto.imageUrl,
        isEdited: true,
        lastEditedAt: serverTimestamp()
      });
      setEditingPhoto(null);
      showToast('Photo updated successfully!', 'success');
    } catch (error) {
      console.error('Edit failed:', error);
      showToast('Failed to update photo.', 'error');
    } finally {
      setIsEditing(false);
    }
  };

  const handleViewUser = async (uid: string) => {
    try {
      const userSnap = await getDoc(doc(db, 'users', uid));
      if (userSnap.exists()) {
        setSelectedUser({ uid, ...userSnap.data() });
      } else {
        setSelectedUser({ uid, displayName: 'Anonymous Member' });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const handleDelete = async (photoId: string) => {
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'gallery', photoId));
      setDeleteConfirm(null);
      showToast('Photo deleted successfully.', 'success');
    } catch (error) {
      console.error('Delete failed:', error);
      showToast('Failed to delete photo.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredPhotos = photos.filter(p => isAdmin || p.status === 'approved' || p.authorUid === user?.uid);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-16"
    >
        <div className="flex flex-col sm:flex-row justify-between items-center gap-8">
          <div className="space-y-3 text-center sm:text-left">
            <h1 className="text-6xl sm:text-8xl font-black uppercase italic tracking-tighter leading-none text-esports-text">
              {settings.albumTitle}
            </h1>
            <p className="text-esports-primary font-black uppercase italic tracking-[0.3em] text-xs">{settings.albumDesc}</p>
          </div>
          
          <button 
            onClick={() => user ? setShowUpload(true) : navigate('/login')}
            className="flex items-center gap-3 px-10 py-5 bg-esports-primary text-white rounded-[2rem] font-black uppercase italic tracking-wider hover:bg-esports-primary/90 transition-all active:scale-95 shadow-[0_0_30px_rgba(230,57,70,0.4)]"
          >
            <Plus className="w-6 h-6" />
            Upload Photo
          </button>
        </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
        {filteredPhotos.map((photo) => (
          <motion.div 
            key={photo.id}
            layout
            className="group relative bg-esports-card border-white/5 rounded-[3.5rem] overflow-hidden border-2 shadow-sm hover:shadow-2xl transition-all hover:scale-[1.02] hover:border-esports-primary/50"
          >
            <div className="aspect-square overflow-hidden cursor-pointer relative" onClick={() => setSelectedPhoto(photo)}>
              <img 
                src={photo.imageUrl} 
                alt="Gallery" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-8">
                <span className="text-esports-text font-black uppercase italic tracking-widest text-xs mb-4">View Details</span>
                {photo.caption && (
                  <p className="text-esports-text-muted text-sm font-medium italic leading-relaxed line-clamp-2">
                    {photo.caption}
                  </p>
                )}
              </div>
              {photo.status === 'pending' && (
                <div className="absolute top-8 left-8">
                  <span className="px-5 py-2 bg-amber-500 text-white text-[10px] font-black uppercase italic rounded-full shadow-[0_0_20px_rgba(245,158,11,0.5)] animate-pulse">Pending Approval</span>
                </div>
              )}
            </div>
            
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => handleViewUser(photo.authorUid)}
                  className="flex items-center gap-3 group/author"
                >
                  <div className="w-10 h-10 rounded-xl border-2 border-esports-primary/20 overflow-hidden group-hover/author:border-esports-primary transition-all">
                    <img src={`https://picsum.photos/seed/${photo.authorUid}/100/100`} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-esports-text-muted">Captured by</p>
                    <p className="text-sm font-black italic tracking-tight text-esports-text group-hover/author:text-esports-primary transition-colors">{photo.authorName}</p>
                  </div>
                </button>
                <span className="text-[10px] text-esports-text-muted font-black uppercase italic flex items-center gap-2">
                  {photo.createdAt?.toDate().toLocaleDateString()}
                  {photo.isEdited && <span className="text-esports-primary/50">(Edited)</span>}
                </span>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-white/5">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                  {EMOJIS.slice(0, 3).map((emoji) => (
                    <button
                      key={emoji.key}
                      onClick={() => handleReact(photo.id, emoji.key)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all group/btn ${
                        (photo.reactions?.[emoji.key] || []).includes(user?.uid || '')
                          ? 'bg-esports-primary text-white shadow-[0_0_15px_rgba(230,57,70,0.4)]'
                          : 'bg-black/40 hover:bg-black/60 text-esports-text-muted'
                      }`}
                    >
                      <emoji.icon className="w-4 h-4 group-hover/btn:scale-125 transition-transform" />
                      <span className="text-[10px] font-black">
                        {Array.isArray(photo.reactions?.[emoji.key]) ? photo.reactions[emoji.key].length : 0}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {(user?.uid === photo.authorUid || isAdmin) && (
                    <button 
                      onClick={() => setEditingPhoto(photo)}
                      className="p-3 rounded-2xl transition-all text-esports-text-muted hover:bg-white/5 hover:text-esports-text"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                  )}
                  <button 
                    onClick={() => setSelectedPhoto(photo)}
                    className="p-3 rounded-2xl transition-all text-esports-text-muted hover:bg-white/5 hover:text-esports-text"
                  >
                    <MessageCircle className="w-6 h-6" />
                  </button>
                  {(user?.uid === photo.authorUid || isAdmin) && (
                    <button
                      onClick={() => setDeleteConfirm(photo.id)}
                      className="p-3 rounded-2xl transition-all text-esports-text-muted hover:text-esports-primary hover:bg-esports-primary/10"
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-esports-card w-full max-w-sm rounded-[2.5rem] p-8 border border-white/5 shadow-2xl text-center space-y-6"
            >
              <div className="w-16 h-16 bg-esports-primary/10 text-esports-primary rounded-2xl flex items-center justify-center mx-auto">
                <Trash2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black uppercase italic text-esports-text">Delete Photo?</h3>
                <p className="text-esports-text-muted text-sm font-medium">This action cannot be undone. Are you sure?</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-4 rounded-xl font-black uppercase italic tracking-widest text-xs transition-all bg-black/40 text-esports-text-muted hover:bg-black/60"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={isDeleting}
                  className="flex-1 py-4 bg-esports-primary text-white rounded-xl font-black uppercase italic tracking-widest text-xs hover:bg-esports-primary/90 transition-all disabled:opacity-50 shadow-lg shadow-esports-primary/20"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Photo Detail Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <PhotoDetailModal 
            photo={selectedPhoto} 
            onClose={() => setSelectedPhoto(null)} 
            onViewUser={handleViewUser}
            showToast={showToast}
          />
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingPhoto && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-esports-card w-full max-w-md rounded-[3rem] p-10 border border-white/5 shadow-2xl relative"
            >
              <button 
                onClick={() => setEditingPhoto(null)}
                className="absolute top-8 right-8 p-2 rounded-full transition-colors hover:bg-white/5 text-esports-text-muted"
              >
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-3xl font-black uppercase italic mb-8 text-esports-text">Edit Memory</h2>

              <form onSubmit={handleEdit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-esports-text-muted ml-2">Image URL</label>
                  <input 
                    required
                    value={editingPhoto.imageUrl}
                    onChange={(e) => setEditingPhoto({ ...editingPhoto, imageUrl: e.target.value })}
                    className="w-full bg-black/40 border-white/5 text-esports-text rounded-2xl px-6 py-4 focus:outline-none focus:border-esports-primary transition-all font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-esports-text-muted ml-2">Caption</label>
                  <textarea 
                    value={editingPhoto.caption || ''}
                    onChange={(e) => setEditingPhoto({ ...editingPhoto, caption: e.target.value })}
                    className="w-full bg-black/40 border-white/5 text-esports-text rounded-2xl px-6 py-4 focus:outline-none focus:border-esports-primary transition-all font-bold h-32 resize-none"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isEditing}
                  className="w-full py-5 bg-esports-primary text-white rounded-[2rem] font-black uppercase italic tracking-wider hover:bg-esports-primary/90 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-esports-primary/20"
                >
                  {isEditing ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-esports-card w-full max-w-md rounded-[3rem] p-10 border border-white/5 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowUpload(false)}
                className="absolute top-8 right-8 p-2 rounded-full transition-colors hover:bg-white/5 text-esports-text-muted"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="text-center space-y-4 mb-10">
                <div className="w-16 h-16 bg-esports-primary rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-esports-primary/20">
                  <ImageIcon className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-esports-text">Upload Memory</h2>
                <p className="text-esports-text-muted font-medium">Share your epic esports moments.</p>
              </div>

              <form onSubmit={handleUpload} className="space-y-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-esports-text-muted ml-2">Photo Source</label>
                    <div className="flex gap-3">
                      <input 
                        required
                        value={formData.url}
                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                        placeholder="Paste image URL..."
                        className="flex-1 bg-black/40 border-white/5 text-esports-text rounded-2xl px-6 py-4 focus:outline-none focus:border-esports-primary transition-all font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-4 rounded-2xl border-2 transition-all bg-black/40 border-white/5 text-esports-text-muted hover:text-esports-primary"
                      >
                        <Upload className="w-6 h-6" />
                      </button>
                      <input 
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                    <div className="p-4 rounded-xl border bg-black/40 border-white/5 space-y-2">
                      <p className="text-[10px] font-black uppercase italic text-esports-primary flex items-center gap-2">
                        <Plus className="w-3 h-3" /> How to get a direct link?
                      </p>
                      <ul className="text-[9px] font-bold text-esports-text-muted space-y-1 list-disc ml-4">
                        <li>Upload to <span className="text-esports-primary">Discord</span>, right-click the image, and select "Copy Link".</li>
                        <li>Use <span className="text-esports-primary">Imgur</span> or <span className="text-esports-primary">PostImages</span>.</li>
                        <li>Ensure the link ends with <span className="font-black">.jpg, .png,</span> or <span className="font-black">.webp</span>.</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-esports-text-muted ml-2">Caption</label>
                    <input 
                      type="text"
                      value={formData.caption}
                      onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                      placeholder="What happened here?"
                      className="w-full bg-black/40 border-white/5 text-esports-text rounded-2xl px-6 py-4 focus:outline-none focus:border-esports-primary transition-all font-bold"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isUploading}
                  className="w-full py-5 bg-esports-primary text-white rounded-[2rem] font-black uppercase italic tracking-wider hover:bg-esports-primary/90 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-esports-primary/20"
                >
                  {isUploading ? 'Submitting...' : 'Submit for Approval'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Crop Modal */}
      <AnimatePresence>
        {imageToCrop && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl aspect-square bg-zinc-900 rounded-[3rem] overflow-hidden relative flex flex-col"
            >
              <div className="flex-1 relative">
                <Cropper
                  image={imageToCrop}
                  crop={crop}
                  zoom={zoom}
                  aspect={16 / 9}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>
              
              <div className="p-10 bg-zinc-900 border-t border-zinc-800 flex flex-col gap-6">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-esports-text-muted uppercase tracking-widest">Zoom</span>
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    onChange={(e: any) => setZoom(e.target.value)}
                    className="flex-1 accent-pink-400"
                  />
                </div>
                
                <div className="flex gap-4">
                  <button
                    onClick={() => setImageToCrop(null)}
                    className="flex-1 py-4 bg-esports-card text-esports-text-muted rounded-2xl font-black uppercase italic tracking-wider hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCropSave}
                    className="flex-[2] py-4 bg-pink-400 text-white rounded-2xl font-black uppercase italic tracking-wider hover:bg-pink-500 transition-all shadow-lg shadow-pink-400/20 flex items-center justify-center gap-2"
                  >
                    <Crop className="w-5 h-5" />
                    Crop & Resize
                  </button>
                </div>
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
                ? 'bg-emerald-900/90 border-emerald-500/30 text-emerald-400'
                : 'bg-red-900/90 border-red-500/30 text-red-400'
            }`}>
              <span className="font-black uppercase italic tracking-widest text-xs">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function PhotoDetailModal({ photo, onClose, onViewUser, showToast }: { photo: Photo, onClose: () => void, onViewUser: (uid: string) => void, showToast: (msg: string, type: 'success' | 'error') => void }) {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'comments'),
      where('targetId', '==', photo.id),
      where('targetType', '==', 'gallery'),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
      setComments(data);
    });

    return () => unsubscribe();
  }, [photo.id]);

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
        targetId: photo.id,
        targetType: 'gallery',
        text: newComment,
        authorName: user.displayName || 'Anonymous',
        authorUid: user.uid,
        authorPhoto: user.photoURL || '',
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setNewComment('');
      showToast('Comment submitted! Waiting for admin approval.', 'success');
    } catch (error) {
      console.error('Comment failed:', error);
      showToast('Failed to submit comment.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-esports-card w-full max-w-5xl rounded-[3rem] overflow-hidden flex flex-col lg:flex-row max-h-[90vh] shadow-2xl border border-white/5"
      >
        <div className="flex-1 bg-black flex items-center justify-center relative">
          <img 
            src={photo.imageUrl} 
            alt="Gallery" 
            className="max-w-full max-h-full object-contain"
            referrerPolicy="no-referrer"
          />
          <button onClick={onClose} className="absolute top-8 left-8 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors lg:hidden">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="w-full lg:w-96 bg-esports-card flex flex-col border-l border-white/5">
          <div className="p-8 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-black uppercase italic tracking-tight text-esports-text">Comments</h3>
            <button onClick={onClose} className="p-2 rounded-full transition-colors hidden lg:block hover:bg-white/5 text-esports-text-muted">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
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
                    <span className="text-xs font-black uppercase italic text-esports-text">{comment.authorName}</span>
                    <span className="text-[10px] font-bold text-esports-text-muted">{comment.createdAt?.toDate().toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm font-medium leading-relaxed text-esports-text-muted">{comment.text}</p>
                </div>
              </div>
            ))}
            {comments.length === 0 && (
              <div className="text-center py-10">
                <p className="text-esports-text-muted text-xs font-bold uppercase tracking-widest">No comments yet</p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmitComment} className="p-8 border-t border-white/5">
            <div className="relative">
              <input 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full p-4 pr-12 rounded-2xl border border-white/5 font-bold focus:outline-none focus:border-esports-primary transition-all bg-black/40 text-esports-text"
              />
              <button 
                type="submit"
                disabled={isSubmitting || !newComment.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-esports-primary hover:text-esports-primary/80 disabled:opacity-50 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
