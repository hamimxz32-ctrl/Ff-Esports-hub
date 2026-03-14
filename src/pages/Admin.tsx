import { useState, useEffect } from 'react';
import React from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc, setDoc, orderBy, getDoc } from 'firebase/firestore';
import { useAuth, useSettings, Settings, useTheme } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Trash2, ShieldCheck, Settings as SettingsIcon, Save, Play } from 'lucide-react';

type Tab = 'gallery' | 'rosters' | 'comments' | 'recruitment' | 'esportsPages' | 'upgradeRequests' | 'messageBoard' | 'groupChat' | 'topTeams' | 'settings';

export default function Admin() {
  const { isAdmin, user } = useAuth();
  const globalSettings = useSettings();
  const { darkMode } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('gallery');
  const [items, setItems] = useState<any[]>([]);
  const [showApproved, setShowApproved] = useState(false);
  const [editSettings, setEditSettings] = useState<Settings>(globalSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin || activeTab === 'settings') return;

    let q;
    if (activeTab === 'messageBoard' || activeTab === 'groupChat') {
      q = query(collection(db, activeTab), orderBy('createdAt', 'desc'));
    } else if (activeTab === 'topTeams') {
      q = query(collection(db, 'topTeams'), orderBy('rank', 'asc'));
    } else {
      q = query(
        collection(db, activeTab), 
        where('status', '==', showApproved ? 'approved' : 'pending'),
        orderBy('createdAt', 'desc')
      );
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [activeTab, isAdmin, showApproved]);

  useEffect(() => {
    setEditSettings(globalSettings);
  }, [globalSettings]);

  const handleApprove = async (id: string) => {
    try {
      await updateDoc(doc(db, activeTab as any, id), { status: 'approved' });
    } catch (error) {
      console.error('Approve failed:', error);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteDoc(doc(db, activeTab as any, deleteConfirm));
      setDeleteConfirm(null);
      setSuccessMessage('Item deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Delete failed:', error);
      setErrorMessage('Failed to delete item.');
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const { id, ...data } = editingItem;
      await updateDoc(doc(db, activeTab as any, id), {
        ...data,
        isEdited: true,
        lastEditedAt: new Date().toISOString(),
        editedBy: user?.displayName || 'Admin'
      });
      setEditingItem(null);
      setSuccessMessage('Item updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Update failed:', error);
      setErrorMessage('Failed to update item.');
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const handleSetPOTW = async (photoId: string) => {
    try {
      await updateDoc(doc(db, 'settings', 'global'), {
        photoOfTheWeekId: photoId
      });
      setSuccessMessage('Photo of the Week updated!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Failed to set POTW:', error);
      setErrorMessage('Failed to update Photo of the Week.');
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const handleSaveSettings = async (e: any) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), editSettings);
      setSuccessMessage('Settings saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Save failed:', error);
      setErrorMessage('Failed to save settings.');
      setTimeout(() => setErrorMessage(null), 3000);
    } finally {
      setIsSaving(false);
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

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className={`p-6 rounded-full ${darkMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
          <X className="w-12 h-12 text-red-400" />
        </div>
        <h1 className={`text-2xl font-black uppercase italic ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Access Denied</h1>
        <p className="text-zinc-400 font-medium">Only admins can access this panel.</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-6xl mx-auto space-y-8"
    >
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h1 className={`text-4xl font-black uppercase italic tracking-tight ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Admin Panel</h1>
          <p className="text-zinc-400 font-medium">Review and approve community content</p>
        </div>
        
        <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold border ${darkMode ? 'bg-emerald-900/20 text-emerald-400 border-emerald-900/30' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
          <ShieldCheck className="w-5 h-5" />
          Admin Verified
        </div>
      </div>

      <div className={`flex p-1.5 rounded-2xl w-fit mx-auto sm:mx-0 overflow-x-auto max-w-full no-scrollbar ${darkMode ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
        {(['gallery', 'rosters', 'comments', 'recruitment', 'esportsPages', 'upgradeRequests', 'messageBoard', 'groupChat', 'topTeams', 'settings'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-xl font-bold uppercase italic text-sm transition-all whitespace-nowrap ${
              activeTab === tab 
                ? (darkMode ? 'bg-zinc-800 text-white shadow-sm' : 'bg-white text-zinc-900 shadow-sm')
                : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            {tab === 'gallery' ? 'Photos' : tab === 'rosters' ? 'Rosters' : tab === 'comments' ? 'Comments' : tab === 'recruitment' ? 'Recruitment' : tab === 'esportsPages' ? 'Pages' : tab === 'upgradeRequests' ? 'Requests' : tab === 'messageBoard' ? 'Board' : tab === 'groupChat' ? 'Group' : tab === 'topTeams' ? 'Top Teams' : 'Settings'}
            {tab !== 'settings' && (
              <span className={`ml-2 px-2 py-0.5 rounded-md text-[10px] font-black ${darkMode ? 'bg-zinc-700' : 'bg-zinc-200'}`}>
                {activeTab === tab ? items.length : '?'}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'settings' ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'} rounded-[2rem] border p-10 shadow-sm max-w-4xl mx-auto`}
        >
          <div className="flex items-center gap-3 mb-8">
            <SettingsIcon className="w-8 h-8 text-pink-500" />
            <h2 className={`text-3xl font-black uppercase italic ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Site Customization</h2>
          </div>

          <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-50 dark:border-zinc-800 pb-2">General Info</h3>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Navbar Title</label>
                <input 
                  type="text"
                  value={editSettings.siteTitle}
                  onChange={(e) => setEditSettings({ ...editSettings, siteTitle: e.target.value })}
                  className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Hero Title</label>
                <input 
                  type="text"
                  value={editSettings.heroTitle}
                  onChange={(e) => setEditSettings({ ...editSettings, heroTitle: e.target.value })}
                  className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Hero Subtitle</label>
                <textarea 
                  rows={3}
                  value={editSettings.heroSubtitle}
                  onChange={(e) => setEditSettings({ ...editSettings, heroSubtitle: e.target.value })}
                  className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors resize-none ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Font Power</label>
                <select 
                  value={editSettings.fontFamily}
                  onChange={(e) => setEditSettings({ ...editSettings, fontFamily: e.target.value })}
                  className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                >
                  <option value="Sans">Normal (Sans)</option>
                  <option value="Mono">Gaming (Mono)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Support Telegram Link</label>
                <input 
                  type="text"
                  value={editSettings.supportTelegram}
                  onChange={(e) => setEditSettings({ ...editSettings, supportTelegram: e.target.value })}
                  placeholder="https://t.me/yourusername"
                  className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Creator Name</label>
                <input 
                  type="text"
                  value={editSettings.creatorName}
                  onChange={(e) => setEditSettings({ ...editSettings, creatorName: e.target.value })}
                  className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Creator Telegram/Link</label>
                <input 
                  type="text"
                  value={editSettings.creatorLink}
                  onChange={(e) => setEditSettings({ ...editSettings, creatorLink: e.target.value })}
                  className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                />
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-50 dark:border-zinc-800 pb-2">Section Names & Descriptions</h3>
              <div className="grid grid-cols-1 gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Roster Title</label>
                    <input 
                      type="text"
                      value={editSettings.rosterTitle}
                      onChange={(e) => setEditSettings({ ...editSettings, rosterTitle: e.target.value })}
                      className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Roster Desc</label>
                    <input 
                      type="text"
                      value={editSettings.rosterDesc}
                      onChange={(e) => setEditSettings({ ...editSettings, rosterDesc: e.target.value })}
                      className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Album Title</label>
                    <input 
                      type="text"
                      value={editSettings.albumTitle}
                      onChange={(e) => setEditSettings({ ...editSettings, albumTitle: e.target.value })}
                      className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Album Desc</label>
                    <input 
                      type="text"
                      value={editSettings.albumDesc}
                      onChange={(e) => setEditSettings({ ...editSettings, albumDesc: e.target.value })}
                      className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Recruitment Title</label>
                    <input 
                      type="text"
                      value={editSettings.recruitmentTitle}
                      onChange={(e) => setEditSettings({ ...editSettings, recruitmentTitle: e.target.value })}
                      className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Recruitment Desc</label>
                    <input 
                      type="text"
                      value={editSettings.recruitmentDesc}
                      onChange={(e) => setEditSettings({ ...editSettings, recruitmentDesc: e.target.value })}
                      className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Message Board Title</label>
                    <input 
                      type="text"
                      value={editSettings.messageBoardTitle}
                      onChange={(e) => setEditSettings({ ...editSettings, messageBoardTitle: e.target.value })}
                      className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Message Board Desc</label>
                    <input 
                      type="text"
                      value={editSettings.messageBoardDesc}
                      onChange={(e) => setEditSettings({ ...editSettings, messageBoardDesc: e.target.value })}
                      className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Top Teams Title</label>
                    <input 
                      type="text"
                      value={editSettings.topTeamsTitle}
                      onChange={(e) => setEditSettings({ ...editSettings, topTeamsTitle: e.target.value })}
                      className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Top Teams Desc</label>
                    <input 
                      type="text"
                      value={editSettings.topTeamsDesc}
                      onChange={(e) => setEditSettings({ ...editSettings, topTeamsDesc: e.target.value })}
                      className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Esports Pages Title</label>
                    <input 
                      type="text"
                      value={editSettings.esportsPagesTitle}
                      onChange={(e) => setEditSettings({ ...editSettings, esportsPagesTitle: e.target.value })}
                      className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Esports Pages Desc</label>
                    <input 
                      type="text"
                      value={editSettings.esportsPagesDesc}
                      onChange={(e) => setEditSettings({ ...editSettings, esportsPagesDesc: e.target.value })}
                      className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Friends Title</label>
                    <input 
                      type="text"
                      value={editSettings.friendsTitle}
                      onChange={(e) => setEditSettings({ ...editSettings, friendsTitle: e.target.value })}
                      className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Friends Desc</label>
                    <input 
                      type="text"
                      value={editSettings.friendsDesc}
                      onChange={(e) => setEditSettings({ ...editSettings, friendsDesc: e.target.value })}
                      className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Group Chat Title</label>
                    <input 
                      type="text"
                      value={editSettings.groupChatTitle}
                      onChange={(e) => setEditSettings({ ...editSettings, groupChatTitle: e.target.value })}
                      className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Group Chat Desc</label>
                    <input 
                      type="text"
                      value={editSettings.groupChatDesc}
                      onChange={(e) => setEditSettings({ ...editSettings, groupChatDesc: e.target.value })}
                      className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className={`md:col-span-2 pt-6 border-t ${darkMode ? 'border-zinc-800' : 'border-zinc-50'}`}>
              <button 
                type="submit"
                disabled={isSaving}
                className={`w-full py-4 bg-pink-400 text-white rounded-2xl font-black uppercase italic tracking-wider hover:bg-pink-500 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg ${darkMode ? 'shadow-pink-900/20' : 'shadow-pink-100'}`}
              >
                <Save className="w-5 h-5" />
                {isSaving ? 'Saving...' : 'Save All Changes'}
              </button>
            </div>
          </form>
        </motion.div>
      ) : (
        <>
          {activeTab !== 'settings' && ['gallery', 'rosters', 'recruitment', 'esportsPages', 'upgradeRequests', 'comments'].includes(activeTab) && (
            <div className="flex justify-between items-center mb-8">
              <h2 className={`text-xl font-black uppercase italic ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
                {showApproved ? 'Approved Items' : 'Pending Approval'}
              </h2>
              <button
                onClick={() => setShowApproved(!showApproved)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  showApproved 
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' 
                    : darkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                }`}
              >
                {showApproved ? 'View Pending' : 'View Approved'}
              </button>
            </div>
          )}

          {activeTab !== 'settings' && !['gallery', 'rosters', 'recruitment', 'esportsPages', 'upgradeRequests'].includes(activeTab) && (
            <div className="mb-8">
              <h2 className={`text-xl font-black uppercase italic ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
                All {activeTab === 'topTeams' ? 'Ranked Teams' : activeTab === 'messageBoard' ? 'Board Messages' : activeTab === 'groupChat' ? 'Group Messages' : 'Items'}
              </h2>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'} rounded-[2rem] border p-6 shadow-sm hover:shadow-md transition-all flex flex-col`}
              >
                <div className="flex-1 space-y-4">
                  {activeTab === 'gallery' && (
                    <div className="space-y-4">
                      <img 
                        src={item.imageUrl} 
                        alt="Pending" 
                        className="w-full aspect-video object-cover rounded-2xl"
                        referrerPolicy="no-referrer"
                      />
                      {item.caption && (
                        <p className={`${darkMode ? 'text-zinc-400' : 'text-zinc-600'} text-sm font-medium italic px-2 leading-relaxed`}>
                          "{item.caption}"
                        </p>
                      )}
                      <div className="px-2 flex justify-between items-end">
                        <button 
                          onClick={() => handleViewUser(item.authorUid)}
                          className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-purple-400 transition-colors"
                        >
                          By {item.authorName}
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'rosters' && (
                    <div className="space-y-4">
                      <div className={`p-6 rounded-2xl border-2 ${darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-100'}`}>
                        <div className="flex items-center gap-4 mb-4">
                          <img src={item.teamLogo || `https://picsum.photos/seed/${item.id}/100/100`} className="w-12 h-12 rounded-xl object-cover" alt="Logo" />
                          <h3 className={`text-xl font-black uppercase italic leading-none ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{item.teamName}</h3>
                        </div>
                        <div className="space-y-2">
                          {item.players?.map((p: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-xs font-bold">
                              <span className={darkMode ? 'text-zinc-300' : 'text-zinc-800'}>{p.ign}</span>
                              <span className="text-pink-400 uppercase tracking-widest">{p.role}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                          {item.socialLinks?.facebook && <span className="text-[8px] font-black uppercase px-2 py-1 bg-blue-500/10 text-blue-500 rounded">FB</span>}
                          {item.socialLinks?.instagram && <span className="text-[8px] font-black uppercase px-2 py-1 bg-pink-500/10 text-pink-500 rounded">IG</span>}
                          {item.socialLinks?.youtube && <span className="text-[8px] font-black uppercase px-2 py-1 bg-red-500/10 text-red-500 rounded">YT</span>}
                        </div>
                        <button 
                          onClick={() => handleViewUser(item.authorUid)}
                          className="mt-4 w-full text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-pink-400 transition-colors text-center"
                        >
                          Submitted by {item.authorName}
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'comments' && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-100'}`}>
                      <div className="flex items-center gap-2">
                        <img 
                          src={item.authorPhoto || `https://picsum.photos/seed/${item.authorUid}/100/100`} 
                          alt={item.authorName} 
                          className="w-6 h-6 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <button 
                          onClick={() => handleViewUser(item.authorUid)}
                          className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-purple-400 transition-colors"
                        >
                          {item.authorName}
                        </button>
                      </div>
                      <p className={`font-bold italic leading-relaxed ${darkMode ? 'text-zinc-300' : 'text-zinc-800'}`}>"{item.text}"</p>
                      <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">On {item.targetType} ID: {item.targetId}</p>
                    </div>
                  )}

                  {activeTab === 'recruitment' && (
                    <div className={`p-6 rounded-2xl border-2 ${darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-100'}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <img src={item.authorPhoto} className="w-10 h-10 rounded-xl object-cover" alt="" />
                          <div>
                            <h3 className={`font-black uppercase italic text-sm ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{item.ign || item.authorName}</h3>
                            <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">{item.type === 'player' ? 'LFG' : 'LFR'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {item.type === 'player' ? (
                          <p className="text-xs font-bold text-zinc-400">UID: {item.gameUid}</p>
                        ) : (
                          <p className="text-xs font-bold text-zinc-400">Role: {item.requirements?.role}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'esportsPages' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        {item.logoUrl ? (
                          <img src={item.logoUrl} className="w-12 h-12 rounded-xl object-cover shadow-lg" alt="" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white font-black italic">
                            {item.title?.charAt(0) || item.name?.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h3 className={`font-black uppercase italic ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{item.title || item.name}</h3>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{item.category}</p>
                        </div>
                      </div>
                      <p className={`text-xs leading-relaxed line-clamp-2 ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>{item.description}</p>
                      <div className="flex gap-2">
                        {item.socialLinks?.facebook && <span className="text-[8px] font-black uppercase px-2 py-1 bg-blue-500/10 text-blue-500 rounded">FB</span>}
                        {item.socialLinks?.whatsapp && <span className="text-[8px] font-black uppercase px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded">WA</span>}
                        {item.socialLinks?.youtube && <span className="text-[8px] font-black uppercase px-2 py-1 bg-red-500/10 text-red-500 rounded">YT</span>}
                      </div>
                    </div>
                  )}

                  {activeTab === 'upgradeRequests' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-[8px] font-black uppercase tracking-widest italic">
                          {item.type}
                        </div>
                        <span className="text-[10px] font-bold text-zinc-500">{new Date(item.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                      </div>
                      <h3 className={`font-black uppercase italic ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{item.pageTitle}</h3>
                      <p className={`text-xs leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>{item.details}</p>
                      <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                        <p className="text-[10px] font-bold text-zinc-500">FROM: {item.authorName}</p>
                        <p className="text-[10px] font-bold text-zinc-500">EMAIL: {item.authorEmail}</p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'topTeams' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-yellow-500 text-white rounded-xl flex items-center justify-center font-black italic text-xl shadow-lg">
                          #{item.rank}
                        </div>
                        <img src={item.logoUrl} className="w-12 h-12 rounded-xl object-cover shadow-lg" alt="" />
                        <div>
                          <h3 className={`font-black uppercase italic ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{item.name}</h3>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Ranked Team</p>
                        </div>
                      </div>
                      <p className={`text-xs leading-relaxed line-clamp-2 ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>{item.description}</p>
                    </div>
                  )}

                  {(activeTab === 'messageBoard' || activeTab === 'groupChat') && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-100'}`}>
                      <div className="flex items-center gap-2">
                        <img 
                          src={item.authorPhoto || `https://picsum.photos/seed/${item.authorUid}/100/100`} 
                          alt={item.authorName} 
                          className="w-6 h-6 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <button 
                          onClick={() => handleViewUser(item.authorUid)}
                          className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-purple-400 transition-colors"
                        >
                          {item.authorName}
                        </button>
                      </div>
                      <p className={`font-bold italic leading-relaxed ${darkMode ? 'text-zinc-300' : 'text-zinc-800'}`}>"{item.text}"</p>
                    </div>
                  )}
                </div>

                <div className={`grid grid-cols-2 gap-3 mt-6 pt-6 border-t ${darkMode ? 'border-zinc-800' : 'border-zinc-50'}`}>
                {!showApproved && ['gallery', 'rosters', 'recruitment', 'esportsPages', 'upgradeRequests', 'comments'].includes(activeTab) && (
                    <button
                      onClick={() => handleApprove(item.id)}
                      className="col-span-2 flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all active:scale-95 shadow-sm mb-2"
                    >
                      <Check className="w-4 h-4" />
                      Approve
                    </button>
                  )}
                  
                  <button
                    onClick={() => setEditingItem(item)}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all active:scale-95 ${darkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
                  >
                    <SettingsIcon className="w-4 h-4" />
                    Edit
                  </button>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all active:scale-95 bg-red-500 text-white hover:bg-red-600`}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </>
      )}

      {activeTab !== 'settings' && items.length === 0 && (
        <div className={`text-center py-20 rounded-[2rem] border-2 border-dashed ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'}`}>
          <p className="text-zinc-300 font-black uppercase italic text-2xl">
            {['gallery', 'rosters', 'recruitment', 'esportsPages', 'upgradeRequests', 'comments'].includes(activeTab) && !showApproved ? 'No Pending Items' : 'No Items Found'}
          </p>
          <p className="text-zinc-400 font-medium mt-2">Everything is up to date!</p>
        </div>
      )}

      {/* Edit Item Modal */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'} w-full max-w-lg rounded-[2.5rem] p-8 border shadow-2xl relative`}
            >
              <button 
                onClick={() => setEditingItem(null)}
                className={`absolute top-6 right-6 p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-zinc-100 text-zinc-400'}`}
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className={`text-2xl font-black uppercase italic mb-6 ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Edit {activeTab.slice(0, -1)}</h2>

              <form onSubmit={handleUpdateItem} className="space-y-4">
                {activeTab === 'gallery' && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Caption</label>
                      <textarea 
                        value={editingItem.caption || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, caption: e.target.value })}
                        className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'rosters' && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Team Name</label>
                      <input 
                        type="text"
                        value={editingItem.teamName || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, teamName: e.target.value })}
                        className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                      />
                    </div>
                  </div>
                )}

                {(activeTab === 'comments' || activeTab === 'messageBoard' || activeTab === 'groupChat') && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Text Content</label>
                      <textarea 
                        value={editingItem.text || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, text: e.target.value })}
                        className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'esportsPages' && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Logo URL</label>
                      <input 
                        type="text"
                        value={editingItem.logoUrl || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, logoUrl: e.target.value })}
                        className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Title</label>
                      <input 
                        type="text"
                        value={editingItem.title || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                        className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Category</label>
                      <select 
                        value={editingItem.category || 'News'}
                        onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                        className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
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
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Description</label>
                      <textarea 
                        value={editingItem.description || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                        className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Facebook</label>
                        <input 
                          type="text"
                          value={editingItem.socialLinks?.facebook || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, socialLinks: { ...editingItem.socialLinks, facebook: e.target.value } })}
                          className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">WhatsApp</label>
                        <input 
                          type="text"
                          value={editingItem.socialLinks?.whatsapp || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, socialLinks: { ...editingItem.socialLinks, whatsapp: e.target.value } })}
                          className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">YouTube</label>
                      <input 
                        type="text"
                        value={editingItem.socialLinks?.youtube || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, socialLinks: { ...editingItem.socialLinks, youtube: e.target.value } })}
                        className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'topTeams' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Rank</label>
                        <input 
                          type="number"
                          value={editingItem.rank || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, rank: parseInt(e.target.value) })}
                          className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Team Name</label>
                        <input 
                          type="text"
                          value={editingItem.name || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                          className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Logo URL</label>
                      <input 
                        type="text"
                        value={editingItem.logoUrl || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, logoUrl: e.target.value })}
                        className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Description</label>
                      <textarea 
                        value={editingItem.description || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                        className={`w-full rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-400 transition-colors ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'}`}
                      />
                    </div>
                  </div>
                )}

                <button 
                  type="submit"
                  className="w-full py-4 bg-pink-400 text-white rounded-2xl font-black uppercase italic tracking-wider hover:bg-pink-500 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg"
                >
                  <Save className="w-5 h-5" />
                  Save Changes
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Bio Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'} w-full max-w-sm rounded-[2.5rem] p-8 border shadow-2xl relative text-center`}
            >
              <button 
                onClick={() => setSelectedUser(null)}
                className={`absolute top-6 right-6 p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-zinc-100 text-zinc-400'}`}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-6">
                <div className="relative inline-block">
                  <img 
                    src={selectedUser.photoURL || `https://picsum.photos/seed/${selectedUser.uid}/200/200`} 
                    alt={selectedUser.displayName} 
                    className={`w-24 h-24 rounded-[2rem] object-cover mx-auto border-4 ${darkMode ? 'border-zinc-800' : 'border-zinc-50'} shadow-lg`}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-emerald-400 w-6 h-6 rounded-full border-4 border-white dark:border-zinc-900" />
                </div>

                <div className="space-y-1">
                  <h2 className={`text-2xl font-black uppercase italic leading-none ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{selectedUser.displayName}</h2>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Squad Member</p>
                </div>

                {selectedUser.bio ? (
                  <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-100'}`}>
                    <p className={`${darkMode ? 'text-zinc-400' : 'text-zinc-600'} text-sm font-medium italic leading-relaxed`}>
                      "{selectedUser.bio}"
                    </p>
                  </div>
                ) : (
                  <p className="text-zinc-300 text-sm font-medium italic">No bio added yet...</p>
                )}
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
              <p className="text-zinc-400 text-sm mb-8">Are you sure you want to delete this item? This action cannot be undone.</p>
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

      {/* Success/Error Toasts */}
      <AnimatePresence>
        {(successMessage || errorMessage) && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300]"
          >
            <div className={`px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              successMessage 
                ? (darkMode ? 'bg-emerald-900/90 border-emerald-500/30 text-emerald-400' : 'bg-white border-emerald-100 text-emerald-600')
                : (darkMode ? 'bg-red-900/90 border-red-500/30 text-red-400' : 'bg-white border-red-100 text-red-600')
            }`}>
              {successMessage ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
              <span className="font-black uppercase italic tracking-widest text-xs">{successMessage || errorMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
