import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Car, Search, Clock, Bell, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const NAV_ITEMS = [
  { to: '/',         label: 'Dashboard',    Icon: LayoutDashboard },
  { to: '/vehicles', label: 'My vehicles',  Icon: Car },
  { to: '/quotes',   label: 'Get quotes',   Icon: Search },
  { to: '/history',  label: 'History',      Icon: Clock },
  { to: '/alerts',   label: 'Rate alerts',  Icon: Bell },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-semibold text-gray-900">
            Drive<span className="text-brand-600">Compare</span>
          </span>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-600 font-medium'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`
                }
              >
                <Icon size={15} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-xs font-medium">
              {initials}
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              title="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden border-t border-gray-100 flex overflow-x-auto">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-0.5 py-2 px-1 text-xs transition-colors min-w-[60px] ${
                  isActive ? 'text-brand-600 font-medium' : 'text-gray-500'
                }`
              }
            >
              <Icon size={18} />
              {label.split(' ')[0]}
            </NavLink>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
