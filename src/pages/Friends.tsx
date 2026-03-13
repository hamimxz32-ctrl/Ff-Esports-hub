import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp, 
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  or,
  and
} from 'firebase/firestore';
import { useAuth, useTheme, useSettings } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, UserCheck, UserX, MessageSquare, Search, Users, Clock, User as UserIcon, Swords, Check, X as CloseIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProfileModal from '../components/ProfileModal';

export default function Friends() {
  const { user, userData } = useAuth();
  const { darkMode } = useTheme();
  const settings = useSettings();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserUid, setSelectedUserUid] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'friends' | 'challenges'>('friends');

  useEffect(() => {
    if (!user) return;

    // Listen to friend requests
    const q = query(
      collection(db, 'friendRequests'),
      or(where('fromUid', '==', user.uid), where('toUid', '==', user.uid))
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const pending: any[] = [];
      const sent: any[] = [];
      const acceptedUids: string[] = [];

      snapshot.docs.forEach(doc => {
        const data = { id: doc.id, ...doc.data() } as any;
        if (data.status === 'pending') {
          if (data.toUid === user.uid) pending.push(data);
          else sent.push(data);
        } else if (data.status === 'accepted') {
          acceptedUids.push(data.fromUid === user.uid ? data.toUid : data.fromUid);
        }
      });

      setPendingRequests(pending);
      setSentRequests(sent);

      // Fetch friend details
      if (acceptedUids.length > 0) {
        const friendsData: any[] = [];
        for (const uid of acceptedUids) {
          const userSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', uid)));
          if (!userSnap.empty) {
            friendsData.push({ id: userSnap.docs[0].id, ...userSnap.docs[0].data() });
          }
        }
        setFriends(friendsData);
      } else {
        setFriends([]);
      }
    });

    // Listen to challenges
    const cq = query(
      collection(db, 'challenges'),
      or(where('challengerUid', '==', user.uid), where('targetUid', '==', user.uid))
    );

    const unsubscribeChallenges = onSnapshot(cq, (snapshot) => {
      const challengesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChallenges(challengesData);
    });

    return () => {
      unsubscribe();
      unsubscribeChallenges();
    };
  }, [user]);

  const respondToChallenge = async (challenge: any, status: 'accepted' | 'rejected') => {
    try {
      if (status === 'rejected') {
        await deleteDoc(doc(db, 'challenges', challenge.id));
      } else {
        await updateDoc(doc(db, 'challenges', challenge.id), { status: 'accepted' });
        
        // Create notification for challenger
        await addDoc(collection(db, 'notifications'), {
          userId: challenge.challengerUid,
          title: 'Challenge Accepted!',
          message: `${challenge.targetTeamName} accepted your challenge!`,
          type: 'challenge_accepted',
          link: `/friends`,
          read: false,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Failed to respond to challenge:', error);
    }
  };

  const startChallengeChat = (challenge: any) => {
    const chatId = `challenge_${challenge.id}`;
    navigate(`/chat/${chatId}`);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    
    try {
      // For "similar" names, we fetch all users and filter client-side
      // In a real large app, we'd use a search service or prefix matching
      const snapshot = await getDocs(collection(db, 'users'));
      const search = searchQuery.toLowerCase().trim();
      
      const results = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((u: any) => {
          if (u.uid === user?.uid) return false;
          const displayName = (u.displayName || '').toLowerCase();
          const username = (u.username || '').toLowerCase();
          return displayName.includes(search) || username.includes(search);
        });
      
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (targetUser: any) => {
    if (!user || !userData) return;
    try {
      await addDoc(collection(db, 'friendRequests'), {
        fromUid: user.uid,
        fromName: userData.displayName || user.displayName,
        fromPhoto: userData.photoURL || user.photoURL || '',
        toUid: targetUser.uid,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setSearchResults([]);
      setSearchQuery('');
    } catch (error) {
      console.error('Failed to send request:', error);
    }
  };

  const respondToRequest = async (request: any, status: 'accepted' | 'rejected') => {
    try {
      if (status === 'rejected') {
        await deleteDoc(doc(db, 'friendRequests', request.id));
      } else {
        await updateDoc(doc(db, 'friendRequests', request.id), { status: 'accepted' });
      }
    } catch (error) {
      console.error('Failed to respond:', error);
    }
  };

  const startChat = (friend: any) => {
    const chatId = [user?.uid, friend.uid].sort().join('_');
    navigate(`/chat/${chatId}`);
  };

  if (!user) {
    return (
      <div className="text-center py-20">
        <Users className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Login to make friends</h2>
        <p className="text-zinc-500 mb-6">Connect with other players and start messaging.</p>
        <button 
          onClick={() => navigate('/login')}
          className="px-8 py-3 bg-pink-400 text-white rounded-xl font-bold uppercase italic tracking-wider"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Search Section */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter">{settings.friendsTitle}</h1>
            <p className="text-zinc-500 font-medium">{settings.friendsDesc}</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            placeholder="Enter username (e.g. proplayer123)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-12 pr-32 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-100 text-zinc-900'} focus:ring-2 focus:ring-pink-400 outline-none transition-all shadow-sm`}
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-2 top-2 bottom-2 px-6 bg-pink-400 text-white rounded-xl font-bold text-sm uppercase italic tracking-wider hover:bg-pink-500 transition-all"
          >
            {loading ? '...' : 'Search'}
          </button>
        </form>

        <AnimatePresence>
          {searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 p-4 rounded-2xl border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'} shadow-xl max-w-xl`}
            >
              {searchResults.map(u => (
                <div key={u.uid} className="flex items-center justify-between p-2">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSelectedUserUid(u.uid)}>
                      <img 
                        src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} 
                        className="w-10 h-10 rounded-full bg-zinc-100 border border-transparent hover:border-pink-400 transition-all"
                        alt=""
                      />
                    </button>
                    <div>
                      <button 
                        onClick={() => setSelectedUserUid(u.uid)}
                        className="font-bold hover:text-pink-400 transition-colors text-left"
                      >
                        {u.displayName}
                      </button>
                      <p className="text-xs text-zinc-500">@{u.username}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => sendFriendRequest(u)}
                    className="p-2 bg-pink-400 text-white rounded-lg hover:bg-pink-500 transition-all"
                    title="Add Friend"
                  >
                    <UserPlus className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <button
          onClick={() => setActiveTab('friends')}
          className={`px-6 py-2 rounded-xl font-bold uppercase italic tracking-wider transition-all ${activeTab === 'friends' ? 'bg-pink-400 text-white shadow-lg shadow-pink-400/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
        >
          Friends
        </button>
        <button
          onClick={() => setActiveTab('challenges')}
          className={`px-6 py-2 rounded-xl font-bold uppercase italic tracking-wider transition-all flex items-center gap-2 ${activeTab === 'challenges' ? 'bg-orange-400 text-white shadow-lg shadow-orange-400/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
        >
          <Swords className="w-4 h-4" />
          Challenges
          {challenges.filter(c => c.targetUid === user.uid && c.status === 'pending').length > 0 && (
            <span className="bg-white text-orange-400 text-[10px] px-1.5 py-0.5 rounded-full">
              {challenges.filter(c => c.targetUid === user.uid && c.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'friends' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Friends List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-pink-400" />
              <h2 className="text-2xl font-black uppercase italic tracking-tighter">My Friends</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {friends.length === 0 ? (
                <div className={`col-span-full p-12 text-center rounded-3xl border-2 border-dashed ${darkMode ? 'border-zinc-800 text-zinc-600' : 'border-zinc-100 text-zinc-400'}`}>
                  <p className="font-bold italic uppercase tracking-widest">No friends yet</p>
                  <p className="text-sm">Search for players to start connecting!</p>
                </div>
              ) : (
                friends.map(friend => (
                  <motion.div
                    layout
                    key={friend.uid}
                    className={`p-4 rounded-2xl border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'} shadow-sm flex items-center justify-between group`}
                  >
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setSelectedUserUid(friend.uid)}
                        className="relative shrink-0"
                      >
                        <img 
                          src={friend.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.username}`} 
                          className="w-12 h-12 rounded-full bg-zinc-100 object-cover border-2 border-transparent hover:border-pink-400 transition-all"
                          alt=""
                        />
                        {friend.isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full"></div>
                        )}
                      </button>
                      <div>
                        <button 
                          onClick={() => setSelectedUserUid(friend.uid)}
                          className="font-bold hover:text-pink-400 transition-colors text-left"
                        >
                          {friend.displayName}
                        </button>
                        <p className="text-xs text-zinc-500">@{friend.username}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => startChat(friend)}
                      className="p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl hover:bg-pink-400 hover:text-white transition-all"
                    >
                      <MessageSquare className="w-5 h-5" />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Requests Sidebar */}
          <div className="space-y-8">
            {/* Pending Requests */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Clock className="w-5 h-5 text-pink-400" />
                <h2 className="text-xl font-black uppercase italic tracking-tighter">Requests</h2>
              </div>
              
              <div className="space-y-3">
                {pendingRequests.length === 0 && sentRequests.length === 0 && (
                  <p className="text-sm text-zinc-500 italic">No pending requests</p>
                )}
                
                {pendingRequests.map(req => (
                  <div key={req.id} className={`p-4 rounded-2xl border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'} shadow-sm`}>
                    <div className="flex items-center gap-3 mb-4">
                      <img src={req.fromPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.fromName}`} className="w-10 h-10 rounded-full" alt="" />
                      <div>
                        <p className="text-sm font-bold">{req.fromName}</p>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Wants to be friends</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => respondToRequest(req, 'accepted')}
                        className="flex-1 py-2 bg-pink-400 text-white rounded-lg text-xs font-bold uppercase italic tracking-wider hover:bg-pink-500 transition-all flex items-center justify-center gap-2"
                      >
                        <UserCheck className="w-4 h-4" /> Accept
                      </button>
                      <button
                        onClick={() => respondToRequest(req, 'rejected')}
                        className={`flex-1 py-2 ${darkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'} rounded-lg text-xs font-bold uppercase italic tracking-wider hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2`}
                      >
                        <UserX className="w-4 h-4" /> Decline
                      </button>
                    </div>
                  </div>
                ))}

                {sentRequests.map(req => (
                  <div key={req.id} className={`p-3 rounded-xl border border-dashed ${darkMode ? 'border-zinc-800 text-zinc-500' : 'border-zinc-200 text-zinc-400'} flex items-center justify-between`}>
                    <span className="text-xs font-bold uppercase italic tracking-widest">Request Sent</span>
                    <button 
                      onClick={() => respondToRequest(req, 'rejected')}
                      className="text-[10px] font-bold text-red-400 hover:underline uppercase"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <Swords className="w-6 h-6 text-orange-400" />
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Team Challenges</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {challenges.length === 0 ? (
              <div className={`col-span-full p-12 text-center rounded-3xl border-2 border-dashed ${darkMode ? 'border-zinc-800 text-zinc-600' : 'border-zinc-100 text-zinc-400'}`}>
                <p className="font-bold italic uppercase tracking-widest">No challenges yet</p>
                <p className="text-sm">Go to Rosters to challenge other teams!</p>
              </div>
            ) : (
              challenges.map(challenge => (
                <motion.div
                  key={challenge.id}
                  layout
                  className={`p-6 rounded-[2rem] border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'} shadow-sm space-y-4`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${challenge.status === 'accepted' ? 'bg-emerald-400' : 'bg-orange-400 animate-pulse'}`} />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{challenge.status}</span>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500">{challenge.createdAt?.toDate().toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center justify-center gap-4 py-4">
                    <div className="text-center flex-1">
                      <p className={`text-sm font-black uppercase italic truncate ${challenge.challengerUid === user.uid ? 'text-pink-500' : ''}`}>
                        {challenge.challengerTeamName}
                      </p>
                      <p className="text-[8px] font-bold text-zinc-500 uppercase">Challenger</p>
                    </div>
                    <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-lg">
                      <span className="text-xs font-black italic">VS</span>
                    </div>
                    <div className="text-center flex-1">
                      <p className={`text-sm font-black uppercase italic truncate ${challenge.targetUid === user.uid ? 'text-pink-500' : ''}`}>
                        {challenge.targetTeamName}
                      </p>
                      <p className="text-[8px] font-bold text-zinc-500 uppercase">Target</p>
                    </div>
                  </div>

                  {challenge.status === 'pending' && challenge.targetUid === user.uid && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => respondToChallenge(challenge, 'accepted')}
                        className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold uppercase italic text-xs tracking-wider hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" /> Accept
                      </button>
                      <button
                        onClick={() => respondToChallenge(challenge, 'rejected')}
                        className={`flex-1 py-3 ${darkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'} rounded-xl font-bold uppercase italic text-xs tracking-wider hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2`}
                      >
                        <CloseIcon className="w-4 h-4" /> Decline
                      </button>
                    </div>
                  )}

                  {challenge.status === 'accepted' && (
                    <button
                      onClick={() => startChallengeChat(challenge)}
                      className="w-full py-3 bg-orange-400 text-white rounded-xl font-bold uppercase italic text-xs tracking-wider hover:bg-orange-500 transition-all flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" /> Discuss Match
                    </button>
                  )}

                  {challenge.status === 'pending' && challenge.challengerUid === user.uid && (
                    <button
                      onClick={() => respondToChallenge(challenge, 'rejected')}
                      className={`w-full py-3 ${darkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'} rounded-xl font-bold uppercase italic text-xs tracking-wider hover:bg-red-500 hover:text-white transition-all`}
                    >
                      Cancel Challenge
                    </button>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {selectedUserUid && (
          <ProfileModal 
            uid={selectedUserUid} 
            onClose={() => setSelectedUserUid(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
