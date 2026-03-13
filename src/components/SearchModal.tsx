import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, getDocs, where, limit } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Image as ImageIcon, Users, MessageSquare, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  id: string;
  type: 'photo' | 'player' | 'message';
  title: string;
  subtitle: string;
  image?: string;
  link: string;
}

export default function SearchModal({ isOpen, onClose, darkMode }: { isOpen: boolean, onClose: () => void, darkMode: boolean }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      handleSearch();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSearch = async () => {
    setIsSearching(true);
    const term = searchTerm.toLowerCase();
    const allResults: SearchResult[] = [];

    try {
      // Search Gallery (Photos)
      const gallerySnap = await getDocs(query(collection(db, 'gallery'), limit(20)));
      gallerySnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.caption?.toLowerCase().includes(term) || data.authorName?.toLowerCase().includes(term)) {
          allResults.push({
            id: doc.id,
            type: 'photo',
            title: data.caption || 'Untitled Photo',
            subtitle: `by ${data.authorName}`,
            image: data.imageUrl,
            link: '/gallery'
          });
        }
      });

      // Search Rosters (Teams & Players)
      const rostersSnap = await getDocs(query(collection(db, 'rosters'), limit(20)));
      rostersSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.teamName?.toLowerCase().includes(term)) {
          allResults.push({
            id: doc.id,
            type: 'player',
            title: data.teamName,
            subtitle: 'Team Roster',
            image: data.teamLogo,
            link: '/rosters'
          });
        }
        data.players?.forEach((p: any) => {
          if (p.ign?.toLowerCase().includes(term) || p.fullName?.toLowerCase().includes(term)) {
            allResults.push({
              id: `${doc.id}-${p.ign}`,
              type: 'player',
              title: p.ign,
              subtitle: `Player in ${data.teamName}`,
              image: p.photoURL,
              link: '/rosters'
            });
          }
        });
      });

      // Search Message Board
      const messagesSnap = await getDocs(query(collection(db, 'messageBoard'), limit(20)));
      messagesSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.text?.toLowerCase().includes(term) || data.authorName?.toLowerCase().includes(term)) {
          allResults.push({
            id: doc.id,
            type: 'message',
            title: data.text || 'Image Message',
            subtitle: `from ${data.authorName}`,
            image: data.authorPhoto,
            link: '/message-board'
          });
        }
      });

      setResults(allResults.slice(0, 10));
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleResultClick = (link: string) => {
    navigate(link);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className={`w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'}`}
          >
            <div className="p-6 border-b border-zinc-800/50 flex items-center gap-4">
              <Search className="w-6 h-6 text-pink-500" />
              <input
                autoFocus
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search photos, players, messages..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-lg font-bold placeholder:text-zinc-500"
              />
              <button onClick={onClose} className="p-2 hover:bg-zinc-800/50 rounded-full transition-colors">
                <X className="w-6 h-6 text-zinc-500" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">
              {isSearching ? (
                <div className="py-20 text-center">
                  <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Searching the hub...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-2">
                  {results.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result.link)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left group ${darkMode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'}`}
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-800 shrink-0">
                        {result.image ? (
                          <img src={result.image} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-500">
                            {result.type === 'photo' && <ImageIcon className="w-6 h-6" />}
                            {result.type === 'player' && <Users className="w-6 h-6" />}
                            {result.type === 'message' && <MessageSquare className="w-6 h-6" />}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-black uppercase italic truncate ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{result.title}</h4>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{result.subtitle}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-pink-500 transition-colors" />
                    </button>
                  ))}
                </div>
              ) : searchTerm ? (
                <div className="py-20 text-center">
                  <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No results found for "{searchTerm}"</p>
                </div>
              ) : (
                <div className="py-10 px-6 space-y-6">
                  <div className="space-y-4">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Quick Search</h5>
                    <div className="flex flex-wrap gap-2">
                      {['Gallery', 'Rosters', 'Top Teams', 'Sign Board'].map(tag => (
                        <button
                          key={tag}
                          onClick={() => setSearchTerm(tag)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${darkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-pink-500 hover:text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-pink-500 hover:text-white'}`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
