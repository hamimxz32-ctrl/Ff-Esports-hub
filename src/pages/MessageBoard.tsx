import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, limit, deleteDoc, doc } from 'firebase/firestore';
import { useAuth, useTheme, useSettings } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Image as ImageIcon, Smile, Flag, Trash2, Loader2 } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import imageCompression from 'browser-image-compression';

interface Message {
  id: string;
  text: string;
  imageUrl?: string;
  authorName: string;
  authorUid: string;
  authorPhoto: string;
  createdAt: any;
}

export default function MessageBoard() {
  const { user, isAdmin, userData } = useAuth();
  const { darkMode } = useTheme();
  const settings = useSettings();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'messageBoard'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs.reverse());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1024, useWebWorker: true };
      try {
        const compressedFile = await imageCompression(file, options);
        const reader = new FileReader();
        reader.readAsDataURL(compressedFile);
        reader.onloadend = () => setSelectedImage(reader.result as string);
      } catch (error) {
        console.error('Image upload failed:', error);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!newMessage.trim() && !selectedImage)) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'messageBoard'), {
        text: newMessage.trim(),
        imageUrl: selectedImage,
        authorUid: user.uid,
        authorName: userData?.displayName || user.displayName || 'Anonymous',
        authorPhoto: userData?.photoURL || user.photoURL || '',
        createdAt: serverTimestamp(),
      });
      setNewMessage('');
      setSelectedImage(null);
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (msgId: string) => {
    setDeleteConfirm(msgId);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteDoc(doc(db, 'messageBoard', deleteConfirm));
      setDeleteConfirm(null);
      showToast('Message deleted successfully', 'success');
    } catch (error) {
      console.error('Delete failed:', error);
      showToast('Failed to delete message', 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleReport = async (msg: Message) => {
    if (!user) return;
    setReportingId(msg.id);
    try {
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: msg.text || (msg.imageUrl ? '[Image]' : ''),
          authorName: msg.authorName,
          authorUid: msg.authorUid,
          reporterName: userData?.displayName || user.displayName || 'Anonymous',
          reporterUid: user.uid,
          type: 'Message Board',
          reason: 'User Reported',
        }),
      });
      if (response.ok) {
        showToast('Report sent to admin for review.', 'success');
      } else {
        showToast('Failed to send report.', 'error');
      }
    } catch (error) {
      console.error('Reporting failed:', error);
      showToast('Failed to send report.', 'error');
    } finally {
      setReportingId(null);
    }
  };

  const onEmojiClick = (emojiData: any) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-pink-500">{settings.messageBoardTitle}</h1>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{settings.messageBoardDesc}</p>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className={`flex-1 overflow-y-auto p-6 rounded-[2.5rem] border ${darkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-100'} shadow-xl space-y-6 mb-6 custom-scrollbar`}
      >
        {messages.map((msg) => (
          <motion.div 
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-4 ${msg.authorUid === user?.uid ? 'flex-row-reverse' : ''}`}
          >
            <img 
              src={msg.authorPhoto || `https://picsum.photos/seed/${msg.authorUid}/100/100`} 
              className="w-10 h-10 rounded-2xl object-cover shrink-0 border-2 border-pink-400/20"
              alt=""
            />
            <div className={`max-w-[70%] space-y-1 ${msg.authorUid === user?.uid ? 'items-end' : ''}`}>
              <div className="flex items-center gap-2 px-2">
                <span className="text-[10px] font-black uppercase italic text-pink-400">{msg.authorName}</span>
              </div>
              <div className={`p-4 rounded-[1.5rem] ${
                msg.authorUid === user?.uid 
                  ? 'bg-pink-500 text-white rounded-tr-none' 
                  : `${darkMode ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-100 text-zinc-800'} rounded-tl-none`
              } shadow-sm relative group`}>
                {msg.imageUrl && (
                  <img src={msg.imageUrl} className="rounded-xl mb-2 w-full max-h-64 object-cover" alt="" />
                )}
                <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                
                <div className={`absolute top-0 ${msg.authorUid === user?.uid ? 'right-full mr-2' : 'left-full ml-2'} opacity-0 group-hover:opacity-100 transition-opacity flex gap-2`}>
                  <button 
                    onClick={() => handleReport(msg)}
                    disabled={reportingId === msg.id}
                    className="p-2 rounded-full bg-zinc-800/50 text-zinc-400 hover:text-red-400 transition-colors"
                    title="Report Message"
                  >
                    {reportingId === msg.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                  </button>
                  {(isAdmin || msg.authorUid === user?.uid) && (
                    <button 
                      onClick={() => handleDelete(msg.id)}
                      className="p-2 rounded-full bg-zinc-800/50 text-zinc-400 hover:text-red-500 transition-colors"
                      title="Delete Message"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <form onSubmit={handleSendMessage} className="relative">
        <div className={`p-4 rounded-[2rem] border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'} shadow-2xl flex items-end gap-4`}>
          <div className="flex-1 space-y-4">
            {selectedImage && (
              <div className="relative inline-block">
                <img src={selectedImage} className="w-20 h-20 rounded-xl object-cover border-2 border-pink-400" alt="" />
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
            <textarea 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className={`w-full bg-transparent border-none focus:ring-0 resize-none text-sm font-medium max-h-32 ${darkMode ? 'text-white' : 'text-zinc-900'}`}
              rows={1}
            />
          </div>
          <div className="flex items-center gap-2 pb-1">
            <div className="relative">
              <button 
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
              >
                <Smile className="w-5 h-5" />
              </button>
              <AnimatePresence>
                {showEmojiPicker && (
                  <div className="absolute bottom-full right-0 mb-4 z-50">
                    <EmojiPicker 
                      onEmojiClick={onEmojiClick}
                      theme={darkMode ? Theme.DARK : Theme.LIGHT}
                      skinTonesDisabled
                    />
                  </div>
                )}
              </AnimatePresence>
            </div>
            <label className={`p-2 rounded-full cursor-pointer transition-colors ${darkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}>
              <ImageIcon className="w-5 h-5" />
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
            <button 
              type="submit"
              disabled={isSubmitting || (!newMessage.trim() && !selectedImage)}
              className="p-3 bg-pink-500 text-white rounded-full hover:bg-pink-600 transition-all disabled:opacity-50 disabled:scale-95 shadow-lg shadow-pink-500/20"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
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
              <p className="text-zinc-400 text-sm mb-8">Are you sure you want to delete this message? This action cannot be undone.</p>
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
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100]"
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
    </div>
  );
}
