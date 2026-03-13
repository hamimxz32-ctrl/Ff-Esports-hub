import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, query, collection, where, getDocs } from 'firebase/firestore';
import { motion } from 'motion/react';
import { LogIn, Mail, Lock, User as UserIcon, Chrome } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings, useTheme, useAuth } from '../App';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const settings = useSettings();
  const { darkMode } = useTheme();
  const { user, loading: authLoading } = useAuth();

  React.useEffect(() => {
    if (user && !authLoading) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user exists in Firestore
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        // New user from Google
        const baseUsername = user.email?.split('@')[0] || user.uid.slice(0, 8);
        let finalUsername = baseUsername.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Check if generated username is taken
        const q = query(collection(db, 'users'), where('username', '==', finalUsername));
        const snap = await getDocs(q);
        if (!snap.empty) {
          finalUsername = `${finalUsername}${Math.floor(Math.random() * 1000)}`;
        }

        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Anonymous',
          username: finalUsername,
          photoURL: user.photoURL || '',
          createdAt: serverTimestamp(),
          isOnline: true,
          lastActive: serverTimestamp()
        });
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (isSignUp) {
        if (!username) throw new Error('Username is required');
        const cleanUsername = username.toLowerCase().trim().replace(/\s/g, '');
        
        // Check if username exists
        const usernameQ = query(collection(db, 'users'), where('username', '==', cleanUsername));
        const usernameSnap = await getDocs(usernameQ);
        if (!usernameSnap.empty) {
          throw new Error('Username is already taken');
        }

        const userCredential = await createUserWithEmailAndPassword(auth, emailOrUsername, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName });
        
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: emailOrUsername,
          displayName,
          username: cleanUsername,
          photoURL: '',
          createdAt: serverTimestamp(),
          isOnline: true,
          lastActive: serverTimestamp()
        });
      } else {
        let loginEmail = emailOrUsername;
        
        // If it doesn't look like an email, assume it's a username
        if (!emailOrUsername.includes('@')) {
          const q = query(collection(db, 'users'), where('username', '==', emailOrUsername.toLowerCase().trim()));
          const snap = await getDocs(q);
          if (snap.empty) {
            throw new Error('Username not found');
          }
          loginEmail = snap.docs[0].data().email;
        }
        
        await signInWithEmailAndPassword(auth, loginEmail, password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-8">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`p-10 rounded-[3rem] ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'} shadow-2xl border max-w-md w-full`}
      >
        <div className="w-20 h-20 bg-pink-400 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-pink-400/20">
          <LogIn className="w-10 h-10 text-white" />
        </div>
        <h1 className={`text-4xl font-black uppercase italic tracking-tighter mb-2 ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
          {isSignUp ? 'Join the Hub' : 'Welcome Back'}
        </h1>
        <p className="text-zinc-500 font-medium max-w-xs mx-auto mb-8">
          {isSignUp ? 'Create your account to start sharing.' : 'Login to access your esports portal.'}
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
          {isSignUp && (
            <>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={`w-full pl-12 pr-4 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'} focus:ring-2 focus:ring-pink-400 outline-none transition-all`}
                  required
                />
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-zinc-400">@</span>
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                  className={`w-full pl-12 pr-4 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'} focus:ring-2 focus:ring-pink-400 outline-none transition-all`}
                  required
                />
              </div>
            </>
          )}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type={isSignUp ? "email" : "text"}
              placeholder={isSignUp ? "Email Address" : "Email or Username"}
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              className={`w-full pl-12 pr-4 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'} focus:ring-2 focus:ring-pink-400 outline-none transition-all`}
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full pl-12 pr-4 py-4 rounded-2xl border ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'} focus:ring-2 focus:ring-pink-400 outline-none transition-all`}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white rounded-2xl font-black uppercase italic tracking-wider hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Login'}
          </button>
        </form>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className={`px-2 ${darkMode ? 'bg-zinc-900 text-zinc-500' : 'bg-white text-zinc-500'}`}>Or continue with</span>
          </div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          disabled={loading}
          className={`w-full py-4 border ${darkMode ? 'border-zinc-700 text-white hover:bg-zinc-800' : 'border-zinc-200 text-zinc-900 hover:bg-zinc-50'} rounded-2xl font-black uppercase italic tracking-wider transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50`}
        >
          <Chrome className="w-5 h-5" />
          Google Account
        </button>

        <p className="mt-8 text-zinc-500 font-medium">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-pink-400 font-bold hover:underline"
          >
            {isSignUp ? 'Login' : 'Sign Up'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
