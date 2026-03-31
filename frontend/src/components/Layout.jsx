import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, Image, Users, MessageCircle, LogOut, Camera } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen bg-gray-950">
      <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
              <Camera size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">Drishyamitra</h1>
              <p className="text-gray-400 text-xs">Friend of Vision</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {[
            { to: '/', icon: Home, label: 'Dashboard' },
            { to: '/gallery', icon: Image, label: 'Gallery' },
            { to: '/persons', icon: Users, label: 'People' },
            { to: '/chat', icon: MessageCircle, label: 'AI Chat' },
          ].map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              <span className="font-medium">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <span className="text-gray-300 text-sm flex-1">{user?.username}</span>
            <button onClick={logout} className="text-gray-500 hover:text-red-400 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-950">
        <Outlet />
      </div>
    </div>
  );
}
