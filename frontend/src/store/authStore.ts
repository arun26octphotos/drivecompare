import { create } from 'zustand';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  init: () => void;
  recordActivity: () => void;
}

const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes
const LAST_ACTIVE_KEY = 'dc_last_active';

let inactivityTimer: ReturnType<typeof setTimeout> | null = null;

function clearInactivityTimer() {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
}

function scheduleInactivityLogout(logoutFn: () => void) {
  clearInactivityTimer();
  inactivityTimer = setTimeout(() => {
    logoutFn();
    window.location.href = '/login?reason=timeout';
  }, INACTIVITY_MS);
  localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,

  init: () => {
    const token = localStorage.getItem('dc_token');
    const user = localStorage.getItem('dc_user');
    const lastActive = parseInt(localStorage.getItem(LAST_ACTIVE_KEY) || '0', 10);

    if (token && user) {
      // Check if the session has been idle past 30 min (across page refreshes)
      if (lastActive && Date.now() - lastActive > INACTIVITY_MS) {
        localStorage.removeItem('dc_token');
        localStorage.removeItem('dc_user');
        localStorage.removeItem(LAST_ACTIVE_KEY);
        set({ isLoading: false });
        return;
      }

      set({ token, user: JSON.parse(user), isLoading: false });
      scheduleInactivityLogout(get().logout);

      // Listen to DOM events to reset the timer on activity
      const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
      const handler = () => get().recordActivity();
      events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    } else {
      set({ isLoading: false });
    }
  },

  recordActivity: () => {
    if (get().user) {
      scheduleInactivityLogout(get().logout);
    }
  },

  login: async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('dc_token', data.token);
    localStorage.setItem('dc_user', JSON.stringify(data.user));
    set({ token: data.token, user: data.user });
    scheduleInactivityLogout(get().logout);
  },

  register: async (email, password, name) => {
    const { data } = await api.post('/api/auth/register', { email, password, name });
    localStorage.setItem('dc_token', data.token);
    localStorage.setItem('dc_user', JSON.stringify(data.user));
    set({ token: data.token, user: data.user });
    scheduleInactivityLogout(get().logout);
  },

  logout: () => {
    clearInactivityTimer();
    localStorage.removeItem('dc_token');
    localStorage.removeItem('dc_user');
    localStorage.removeItem(LAST_ACTIVE_KEY);
    set({ user: null, token: null });
  },
}));
