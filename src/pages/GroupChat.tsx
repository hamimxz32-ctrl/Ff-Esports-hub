import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, limit } from 'firebase/firestore';
import { useAuth, useTheme, useSettings } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Smile, Reply, AtSign, Loader2, Trash2 } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { sendNotification } from '../services/NotificationService';

interface GroupMessage {
  id: string;
  text: string;
  authorName: string;
  authorUid: string;
  authorPhoto: string;
  replyTo?: {
    id: string;
    text: string;
    authorName: string;
  };
  createdAt: any;
}

export default function GroupChat() {
  const { user, isAdmin, userData } = useAuth();
  const { darkMode } = useTheme();
  const settings = useSettings();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<GroupMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'groupChat'), orderBy('createdAt', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GroupMessage));
      setMessages(msgs.reverse());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'groupChat'), {
        text: newMessage.trim(),
        authorUid: user.uid,
        authorName: userData?.displayName || user.displayName || 'Anonymous',
        authorPhoto: userData?.photoURL || user.photoURL || '',
        replyTo: replyingTo ? {
          id: replyingTo.id,
          text: replyingTo.text,
          authorName: replyingTo.authorName
        } : null,
        createdAt: serverTimestamp(),
      });
      setNewMessage('');
      setReplyingTo(null);
      setShowEmojiPicker(false);

      // Handle Mentions
      const mentions = newMessage.match(/@(\w+)/g);
      if (mentions) {
        // This is a bit complex without a full user search, but we can notify the person being replied to if they are mentioned
        // For now, let's focus on the reply notification which is more reliable
      }

      if (replyingTo) {
        sendNotification(
          replyingTo.authorUid,
          user.uid,
          userData?.displayName || user.displayName || 'Someone',
          'reply',
          `replied to your message in Global Chat`,
          '/chat'
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onEmojiClick = (emojiData: any) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  const handleMention = (name: string) => {
    setNewMessage(prev => prev + `@${name} `);
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-emerald-500">{settings.groupChatTitle}</h1>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{settings.groupChatDesc}</p>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className={`flex-1 overflow-y-auto p-6 rounded-[2.5rem] border ${darkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-100'} shadow-xl space-y-6 mb-6 custom-scrollbar`}
      >
        {messages.map((msg) => (
          <motion.div 
            key={msg.id}
            initial={{ opacity: 0, x: msg.authorUid === user?.uid ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex gap-4 ${msg.authorUid === user?.uid ? 'flex-row-reverse' : ''}`}
          >
            <img 
              src={msg.authorPhoto || `https://picsum.photos/seed/${msg.authorUid}/100/100`} 
              className="w-10 h-10 rounded-2xl object-cover shrink-0 border-2 border-emerald-400/20"
              alt=""
            />
            <div className={`max-w-[75%] space-y-1 ${msg.authorUid === user?.uid ? 'items-end' : ''}`}>
              <div className="flex items-center gap-2 px-2">
                <span className="text-[10px] font-black uppercase italic text-emerald-400">{msg.authorName}</span>
              </div>
              
              <div className={`relative group ${
                msg.authorUid === user?.uid 
                  ? 'bg-emerald-500 text-white rounded-[1.5rem] rounded-tr-none' 
                  : `${darkMode ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-100 text-zinc-800'} rounded-[1.5rem] rounded-tl-none`
              } p-4 shadow-sm`}>
                {msg.replyTo && (
                  <div className={`mb-2 p-2 rounded-lg text-[10px] border-l-4 border-emerald-400 ${
                    msg.authorUid === user?.uid ? 'bg-emerald-600/50' : 'bg-zinc-700/20'
                  }`}>
                    <p className="font-bold opacity-70 mb-1">{msg.replyTo.authorName}</p>
                    <p className="truncate italic">{msg.replyTo.text}</p>
                  </div>
                )}
                <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                
                <div className={`absolute top-0 ${msg.authorUid === user?.uid ? 'right-full mr-2' : 'left-full ml-2'} opacity-0 group-hover:opacity-100 transition-opacity flex gap-2`}>
                  <button 
                    onClick={() => setReplyingTo(msg)}
                    className="p-2 rounded-full bg-zinc-800/50 text-zinc-400 hover:text-emerald-400 transition-colors"
                    title="Reply"
                  >
                    <Reply className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleMention(msg.authorName)}
                    className="p-2 rounded-full bg-zinc-800/50 text-zinc-400 hover:text-blue-400 transition-colors"
                    title="Mention"
                  >
                    <AtSign className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <form onSubmit={handleSendMessage} className="relative">
        <AnimatePresence>
          {replyingTo && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={`absolute bottom-full left-0 right-0 mb-4 p-4 rounded-2xl border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'} shadow-xl flex items-center justify-between`}
            >
              <div className="flex items-center gap-3">
                <Reply className="w-4 h-4 text-emerald-400" />
                <div className="text-xs">
                  <p className="font-black uppercase italic text-emerald-400">Replying to {replyingTo.authorName}</p>
                  <p className="text-zinc-500 truncate max-w-md">{replyingTo.text}</p>
                </div>
              </div>
              <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-zinc-800 rounded-full transition-colors">
                <Trash2 className="w-4 h-4 text-zinc-500" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`p-4 rounded-[2rem] border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'} shadow-2xl flex items-end gap-4`}>
          <textarea 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Say something to the community..."
            className={`flex-1 bg-transparent border-none focus:ring-0 resize-none text-sm font-medium max-h-32 ${darkMode ? 'text-white' : 'text-zinc-900'}`}
            rows={1}
          />
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
            <button 
              type="submit"
              disabled={isSubmitting || !newMessage.trim()}
              className="p-3 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:scale-95 shadow-lg shadow-emerald-500/20"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
