import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { useAuth, useTheme } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { Send, ArrowLeft, MoreVertical, ShieldAlert, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { sendNotification } from '../services/NotificationService';

export default function Chat() {
  const { chatId } = useParams();
  const { user, userData } = useAuth();
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [friend, setFriend] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !chatId) return;

    // Get friend's UID from chatId
    const friendUid = chatId.split('_').find(id => id !== user.uid);
    if (!friendUid) return;

    // Fetch friend details
    const fetchFriend = async () => {
      const friendSnap = await getDoc(doc(db, 'users', friendUid));
      if (friendSnap.exists()) {
        setFriend(friendSnap.data());
      }
      setLoading(false);
    };
    fetchFriend();

    // Listen to messages
    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  }, [chatId, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !chatId) return;

    const friendUid = chatId.split('_').find(id => id !== user.uid);
    if (!friendUid) return;

    try {
      await addDoc(collection(db, 'messages'), {
        chatId,
        participants: [user.uid, friendUid],
        senderUid: user.uid,
        text: newMessage.trim(),
        createdAt: serverTimestamp()
      });

      // Notify friend
      sendNotification(
        friendUid,
        user.uid,
        userData?.displayName || user.displayName || 'Someone',
        'message',
        `sent you a message`,
        `/chat/${chatId}`
      );

      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldAlert className="w-16 h-16 text-red-400 mb-4" />
        <h2 className="text-2xl font-bold">Unauthorized</h2>
        <p className="text-zinc-500 mb-6">You must be logged in to view messages.</p>
        <button onClick={() => navigate('/login')} className="px-8 py-3 bg-pink-400 text-white rounded-xl font-bold">Login</button>
      </div>
    );
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-pink-400 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className={`max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col rounded-[2.5rem] border overflow-hidden shadow-2xl ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'}`}>
      {/* Chat Header */}
      <div className={`p-6 border-b flex items-center justify-between ${darkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-100 bg-zinc-50/50'}`}>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/friends')}
            className={`p-2 rounded-xl transition-all ${darkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={friend?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend?.username}`} 
                className="w-10 h-10 rounded-full bg-zinc-100 object-cover"
                alt=""
              />
              {friend?.isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full"></div>
              )}
            </div>
            <div>
              <p className="font-bold leading-none">{friend?.displayName}</p>
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1">
                {friend?.isOnline ? 'Active Now' : 'Offline'}
              </p>
            </div>
          </div>
        </div>
        <button className={`p-2 rounded-xl transition-all ${darkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}>
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
            <MessageSquare className="w-12 h-12" />
            <p className="font-bold italic uppercase tracking-widest">Start the conversation</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.senderUid === user.uid;
            const showTime = idx === 0 || (msg.createdAt?.seconds - messages[idx-1].createdAt?.seconds > 300);
            
            return (
              <div key={msg.id} className="space-y-1">
                {showTime && msg.createdAt && (
                  <p className="text-[10px] text-center text-zinc-400 font-bold uppercase tracking-widest my-4">
                    {format(msg.createdAt.toDate(), 'p')}
                  </p>
                )}
                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0, x: isMe ? 20 : -20 }}
                    animate={{ scale: 1, opacity: 1, x: 0 }}
                    className={`max-w-[70%] p-4 rounded-2xl text-sm font-medium shadow-sm ${
                      isMe 
                        ? 'bg-pink-400 text-white rounded-tr-none' 
                        : darkMode ? 'bg-zinc-800 text-white rounded-tl-none' : 'bg-zinc-100 text-zinc-800 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </motion.div>
                </div>
              </div>
            );
          })
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className={`p-6 border-t ${darkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-100 bg-zinc-50/50'}`}>
        <div className="relative">
          <input
            type="text"
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className={`w-full pl-6 pr-16 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'} focus:ring-2 focus:ring-pink-400 outline-none transition-all`}
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="absolute right-2 top-2 bottom-2 px-4 bg-pink-400 text-white rounded-xl font-bold hover:bg-pink-500 transition-all active:scale-95 disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
