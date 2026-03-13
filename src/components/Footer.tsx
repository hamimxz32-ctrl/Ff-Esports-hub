import { useTheme, useSettings, useAuth } from '../App';
import { HelpCircle, MessageSquare, Globe, ArrowRight, ShieldCheck, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const { darkMode } = useTheme();
  const settings = useSettings();
  const { isAdmin } = useAuth();
  
  return (
    <footer className={`mt-20 border-t ${darkMode ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-100 bg-white'}`}>
      {/* Support & Visit Pages Bar */}
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-zinc-100 dark:border-zinc-800">
        {/* Support Bar */}
        <div className={`p-8 rounded-[2.5rem] border ${darkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-emerald-50/50 border-emerald-100'} flex flex-col sm:flex-row items-center gap-6 group transition-all hover:shadow-xl`}>
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0 group-hover:scale-110 transition-transform">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
          <div className="text-center sm:text-left flex-1">
            <h3 className="text-xl font-black uppercase italic tracking-tighter mb-1">Support System</h3>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Need help? Our team is here 24/7.</p>
            <a 
              href={settings.supportTelegram} 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase italic tracking-widest hover:bg-emerald-600 transition-all"
            >
              Contact Support <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Visit Pages Bar */}
        <div className={`p-8 rounded-[2.5rem] border ${darkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-blue-50/50 border-blue-100'} flex flex-col sm:flex-row items-center gap-6 group transition-all hover:shadow-xl`}>
          <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0 group-hover:scale-110 transition-transform">
            <Globe className="w-8 h-8 text-white" />
          </div>
          <div className="text-center sm:text-left flex-1">
            <h3 className="text-xl font-black uppercase italic tracking-tighter mb-1">Visit Pages</h3>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Explore the ecosystem pages.</p>
            <Link 
              to="/esports-pages"
              className="inline-flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase italic tracking-widest hover:bg-blue-600 transition-all"
            >
              View All Pages <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-pink-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="text-lg font-black uppercase italic tracking-tighter leading-none">{settings.siteTitle}</h4>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Official Esports Hub</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <Link to="/" className="text-xs font-black uppercase italic text-zinc-500 hover:text-pink-500 transition-colors">Home</Link>
          <Link to="/rosters" className="text-xs font-black uppercase italic text-zinc-500 hover:text-pink-500 transition-colors">Rosters</Link>
          <Link to="/album" className="text-xs font-black uppercase italic text-zinc-500 hover:text-pink-500 transition-colors">Album</Link>
          <Link to="/top-teams" className="text-xs font-black uppercase italic text-zinc-500 hover:text-pink-500 transition-colors">Top Teams</Link>
          {isAdmin && <Link to="/admin" className="text-xs font-black uppercase italic text-zinc-500 hover:text-emerald-500 transition-colors">Admin</Link>}
        </div>

        <div className="text-center md:text-right">
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">
            created by <span className="text-emerald-500">hamimmiahh</span> ☠️
          </p>
          <p className="text-[10px] text-zinc-600 mt-1 uppercase font-bold">© 2026 Bangladesh Esports Ecosystem</p>
        </div>
      </div>
    </footer>
  );
}
