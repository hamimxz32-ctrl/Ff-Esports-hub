import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, query, onSnapshot, serverTimestamp, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { useAuth, useTheme, useSettings } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Facebook, MessageCircle, Youtube, Plus, X, Loader2, Send, Info, ExternalLink, ShieldCheck, Trash2, Camera, Image as ImageIcon } from 'lucide-react';
import imageCompression from 'browser-image-compression';

interface EsportsPage {
  id: string;
  title: string;
  description: string;
  logoUrl?: string;
  category: 'News' | 'Production' | 'Management' | 'Memes' | 'Others' | 'Organisations';
  socialLinks: {
    facebook?: string;
    whatsapp?: string;
    youtube?: string;
  };
  createdAt: any;
}

export default function EsportsPages() {
  const { user, isAdmin, userData } = useAuth();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const settings = useSettings();
  const [pages, setPages] = useState<EsportsPage[]>([]);
  const [showRequest, setShowRequest] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestData, setRequestData] = useState({ type: 'Add Page', pageTitle: '', details: '' });
  const [activeCategory, setActiveCategory] = useState<'All' | 'News' | 'Production' | 'Management' | 'Memes' | 'Others' | 'Organisations'>('All');
  const [showAddPage, setShowAddPage] = useState(false);
  const [newPageData, setNewPageData] = useState<Partial<EsportsPage>>({
    title: '',
    description: '',
    logoUrl: '',
    category: 'News',
    socialLinks: { facebook: '', whatsapp: '', youtube: '' }
  });

  useEffect(() => {
    if (showAddPage && activeCategory !== 'All') {
      setNewPageData(prev => ({ ...prev, category: activeCategory as any }));
    }
  }, [showAddPage, activeCategory]);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onloadend = () => {
        setNewPageData(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
    } catch (error) {
      console.error('Image compression failed:', error);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'esportsPages'), orderBy('title', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EsportsPage));
      // Filter for non-admins: only show approved pages
      const filtered = isAdmin ? data : data.filter(p => (p as any).status === 'approved' || !(p as any).status || (p as any).authorUid === user?.uid);
      setPages(filtered);
    });
    return unsubscribe;
  }, [isAdmin]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddPage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'esportsPages'), {
        ...newPageData,
        status: isAdmin ? 'approved' : 'pending',
        authorUid: user?.uid,
        authorName: userData?.displayName || user?.displayName || 'Anonymous',
        createdAt: serverTimestamp(),
      });
      setShowAddPage(false);
      setNewPageData({
        title: '',
        description: '',
        logoUrl: '',
        category: 'News',
        socialLinks: { facebook: '', whatsapp: '', youtube: '' }
      });
      if (!isAdmin) {
        showToast('Your page has been submitted for approval!', 'success');
      } else {
        showToast('Page added successfully!', 'success');
      }
    } catch (error) {
      console.error('Add page failed:', error);
      showToast('Failed to add page', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePage = async (id: string) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteDoc(doc(db, 'esportsPages', deleteConfirm));
      setDeleteConfirm(null);
      showToast('Page deleted successfully', 'success');
    } catch (error) {
      console.error('Delete failed:', error);
      showToast('Failed to delete page', 'error');
    }
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'upgradeRequests'), {
        ...requestData,
        authorUid: user.uid,
        authorName: userData?.displayName || user.displayName || 'Anonymous',
        authorEmail: user.email,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setShowRequest(false);
      setRequestData({ type: 'Add Page', pageTitle: '', details: '' });
      showToast('Your request has been sent to the admin. We will review it shortly.', 'success');
    } catch (error) {
      console.error('Request failed:', error);
      showToast('Failed to send request', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPages = activeCategory === 'All' ? pages : pages.filter(p => p.category === activeCategory);

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">{settings.esportsPagesTitle}</h1>
          <p className="text-xs font-bold text-esports-text-muted uppercase tracking-widest">{settings.esportsPagesDesc}</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => user ? setShowAddPage(true) : navigate('/login')}
            className="px-6 py-2 bg-esports-primary text-white rounded-xl text-[10px] font-black uppercase italic tracking-widest hover:bg-esports-primary/90 transition-all shadow-lg shadow-esports-primary/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Page
          </button>
          <div className="flex gap-2 p-1 bg-esports-card rounded-2xl overflow-x-auto max-w-full no-scrollbar border border-white/5">
            {['All', 'News', 'Production', 'Management', 'Memes', 'Others', 'Organisations'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat as any)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all whitespace-nowrap ${
                  activeCategory === cat 
                    ? 'bg-esports-primary text-white shadow-lg' 
                    : 'text-esports-text-muted hover:text-esports-primary'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredPages.length === 0 ? (
          <div className="col-span-full py-20 text-center space-y-6">
            <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto">
              <Globe className="w-12 h-12 text-zinc-400" />
            </div>
            <div className="space-y-2">
              <p className="text-xl font-black uppercase italic tracking-tighter">No pages found</p>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Be the first to add a page in this category!</p>
            </div>
            {isAdmin && (
              <button 
                onClick={() => setShowAddPage(true)}
                className="px-8 py-3 bg-emerald-500 text-white rounded-2xl font-black uppercase italic tracking-wider hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20"
              >
                Add Your First Page
              </button>
            )}
          </div>
        ) : (
          filteredPages.map((page) => (
            <motion.div 
              key={page.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="group p-8 rounded-[2.5rem] border bg-esports-card border-white/5 shadow-xl hover:shadow-2xl transition-all relative overflow-hidden"
            >
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              {page.logoUrl ? (
                <img src={page.logoUrl} alt="" className="w-24 h-24 object-cover rounded-2xl" />
              ) : (
                <Globe className="w-24 h-24 text-white" />
              )}
            </div>
            
            <div className="space-y-6 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {page.logoUrl && (
                    <img src={page.logoUrl} alt={page.title} className="w-12 h-12 object-cover rounded-xl shadow-lg border border-white/10" />
                  )}
                  <div className="px-3 py-1 bg-esports-primary/10 text-esports-primary rounded-full text-[8px] font-black uppercase tracking-widest italic">
                    {page.category}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(page as any).status === 'pending' && (
                    <div className="px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded-lg text-[7px] font-black uppercase tracking-widest">
                      Pending Approval
                    </div>
                  )}
                  <ShieldCheck className="w-5 h-5 text-esports-primary opacity-50" />
                  {isAdmin && (
                    <button 
                      onClick={() => handleDeletePage(page.id)}
                      className="p-2 text-esports-primary hover:bg-esports-primary/10 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-black uppercase italic leading-none mb-2 text-white">{page.title}</h3>
                <p className="text-sm leading-relaxed line-clamp-3 text-esports-text-muted">
                  {page.description}
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                {page.socialLinks.facebook && (
                  <a href={page.socialLinks.facebook} target="_blank" rel="noreferrer" className="p-3 bg-blue-600/10 text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all">
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
                {page.socialLinks.whatsapp && (
                  <a href={`https://wa.me/${page.socialLinks.whatsapp}`} target="_blank" rel="noreferrer" className="p-3 bg-emerald-600/10 text-emerald-400 rounded-xl hover:bg-emerald-600 hover:text-white transition-all">
                    <MessageCircle className="w-5 h-5" />
                  </a>
                )}
                {page.socialLinks.youtube && (
                  <a href={page.socialLinks.youtube} target="_blank" rel="noreferrer" className="p-3 bg-red-600/10 text-red-400 rounded-xl hover:bg-red-600 hover:text-white transition-all">
                    <Youtube className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )))}
      </div>

      <div className="p-12 rounded-[3rem] border bg-esports-card border-white/5 text-center space-y-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">Own an Esports Page?</h2>
          <p className="text-sm font-medium text-esports-text-muted">
            If you want to add your page, upgrade your title, or edit your information, send us a request. 
            Our management team will review and update it for you.
          </p>
          <button 
            onClick={() => setShowRequest(true)}
            className="inline-flex items-center gap-3 px-8 py-4 bg-esports-primary text-white rounded-[2rem] font-black uppercase italic tracking-wider hover:bg-esports-primary/90 transition-all shadow-xl shadow-esports-primary/20"
          >
            <Send className="w-5 h-5" /> Send Upgrade Request
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showAddPage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg rounded-[2.5rem] p-8 border bg-esports-card border-white/5 shadow-2xl relative my-8"
            >
              <button onClick={() => setShowAddPage(false)} className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-colors text-esports-text-muted">
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-2xl font-black uppercase italic mb-8 flex items-center gap-3 text-white">
                <Plus className="w-6 h-6 text-emerald-500" /> Add New Page
              </h2>
              <form onSubmit={handleAddPage} className="space-y-4">
                <div className="flex justify-center mb-6">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-white/10 bg-black/20 flex items-center justify-center overflow-hidden transition-all group-hover:border-emerald-500">
                      {newPageData.logoUrl ? (
                        <img src={newPageData.logoUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-8 h-8 text-esports-text-muted" />
                      )}
                    </div>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="absolute -bottom-2 -right-2 p-2 bg-emerald-500 text-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-esports-text-muted ml-2">Title</label>
                  <input 
                    required
                    value={newPageData.title}
                    onChange={(e) => setNewPageData({ ...newPageData, title: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border bg-black/20 border-white/5 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-esports-text-muted ml-2">Category</label>
                  <select 
                    value={newPageData.category}
                    onChange={(e) => setNewPageData({ ...newPageData, category: e.target.value as any })}
                    className="w-full px-4 py-3 rounded-xl border bg-black/20 border-white/5 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-sm appearance-none"
                  >
                    <option value="News">News</option>
                    <option value="Production">Production</option>
                    <option value="Management">Management</option>
                    <option value="Memes">Memes</option>
                    <option value="Others">Others</option>
                    <option value="Organisations">Organisations</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-esports-text-muted ml-2">Description</label>
                  <textarea 
                    required
                    value={newPageData.description}
                    onChange={(e) => setNewPageData({ ...newPageData, description: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border bg-black/20 border-white/5 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-sm h-24 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase tracking-widest text-esports-text-muted ml-2">Facebook URL</label>
                    <input 
                      value={newPageData.socialLinks?.facebook}
                      onChange={(e) => setNewPageData({ ...newPageData, socialLinks: { ...newPageData.socialLinks!, facebook: e.target.value } })}
                      className="w-full px-4 py-3 rounded-xl border bg-black/20 border-white/5 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase tracking-widest text-esports-text-muted ml-2">WhatsApp Number</label>
                    <input 
                      value={newPageData.socialLinks?.whatsapp}
                      onChange={(e) => setNewPageData({ ...newPageData, socialLinks: { ...newPageData.socialLinks!, whatsapp: e.target.value } })}
                      className="w-full px-4 py-3 rounded-xl border bg-black/20 border-white/5 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-esports-text-muted ml-2">YouTube URL</label>
                  <input 
                    value={newPageData.socialLinks?.youtube}
                    onChange={(e) => setNewPageData({ ...newPageData, socialLinks: { ...newPageData.socialLinks!, youtube: e.target.value } })}
                    className="w-full px-4 py-3 rounded-xl border bg-black/20 border-white/5 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-xs"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase italic tracking-wider hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:scale-95 shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3"
                >
                  {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Add Page'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {showRequest && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg rounded-[2.5rem] p-8 border bg-esports-card border-white/5 shadow-2xl relative"
            >
              <button onClick={() => setShowRequest(false)} className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-colors text-esports-text-muted">
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-2xl font-black uppercase italic mb-8 flex items-center gap-3 text-white">
                <Info className="w-6 h-6 text-blue-500" /> Page Request
              </h2>
              <form onSubmit={handleRequest} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-esports-text-muted ml-2">Request Type</label>
                  <select 
                    value={requestData.type}
                    onChange={(e) => setRequestData({ ...requestData, type: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl border bg-black/20 border-white/5 text-white focus:ring-2 focus:ring-esports-primary outline-none transition-all font-bold appearance-none"
                  >
                    <option>Add Page</option>
                    <option>Upgrade Title</option>
                    <option>Edit Information</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-esports-text-muted ml-2">Page Name</label>
                  <input 
                    required
                    value={requestData.pageTitle}
                    onChange={(e) => setRequestData({ ...requestData, pageTitle: e.target.value })}
                    placeholder="Enter page name"
                    className="w-full px-6 py-4 rounded-2xl border bg-black/20 border-white/5 text-white focus:ring-2 focus:ring-esports-primary outline-none transition-all font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-esports-text-muted ml-2">Details & Social Links</label>
                  <textarea 
                    required
                    value={requestData.details}
                    onChange={(e) => setRequestData({ ...requestData, details: e.target.value })}
                    placeholder="Provide description and links..."
                    className="w-full px-6 py-4 rounded-2xl border bg-black/20 border-white/5 text-white focus:ring-2 focus:ring-esports-primary outline-none transition-all font-bold h-32 resize-none"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-5 bg-esports-primary text-white rounded-[2rem] font-black uppercase italic tracking-wider hover:bg-esports-primary/90 transition-all disabled:opacity-50 disabled:scale-95 shadow-xl shadow-esports-primary/20 flex items-center justify-center gap-3"
                >
                  {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Submit Request'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-esports-card w-full max-w-sm rounded-[2.5rem] p-8 border border-white/5 shadow-2xl text-center"
            >
              <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center bg-esports-primary/20">
                <Trash2 className="w-8 h-8 text-esports-primary" />
              </div>
              <h3 className="text-2xl font-black uppercase italic mb-2 text-white">Confirm <span className="text-esports-primary">Delete</span></h3>
              <p className="text-esports-text-muted text-sm mb-8">Are you sure you want to delete this esports page? This action cannot be undone.</p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="py-4 rounded-2xl font-black uppercase italic tracking-widest text-xs transition-all bg-white/5 text-esports-text-muted hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="py-4 bg-esports-primary text-white rounded-2xl font-black uppercase italic tracking-widest text-xs hover:bg-esports-primary/90 transition-all shadow-lg shadow-esports-primary/20"
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
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-esports-primary/10 border-esports-primary/30 text-esports-primary'
            }`}>
              <span className="font-black uppercase italic tracking-widest text-xs">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
