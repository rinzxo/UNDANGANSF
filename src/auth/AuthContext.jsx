import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchCurrentAdmin, loginAdmin } from '../api/client.js';

const AuthContext = createContext(null);
const tokenKey = 'wedding_admin_token';
const userKey = 'wedding_admin_user';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey) || '');
  const [user, setUser] = useState(() => readStoredUser());
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(tokenKey)));

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadUser() {
      try {
        const currentUser = await fetchCurrentAdmin();
        if (!active) return;
        setUser(currentUser);
        localStorage.setItem(userKey, JSON.stringify(currentUser));
      } catch {
        if (!active) return;
        clearAuthStorage();
        setToken('');
        setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadUser();

    return () => {
      active = false;
    };
  }, [token]);

  async function login(credentials) {
    const result = await loginAdmin(credentials);
    localStorage.setItem(tokenKey, result.token);
    localStorage.setItem(userKey, JSON.stringify(result.user));
    setToken(result.token);
    setUser(result.user);
    return result.user;
  }

  function logout() {
    clearAuthStorage();
    setToken('');
    setUser(null);
  }

  const value = useMemo(() => ({
    token,
    user,
    loading,
    login,
    logout,
    isAuthenticated: Boolean(token && user),
    canManageGuests: ['admin', 'super_admin'].includes(user?.role),
    canManageSettings: user?.role === 'super_admin',
    canUseReception: ['receptionist', 'admin', 'super_admin'].includes(user?.role)
  }), [token, user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

function readStoredUser() {
  try {
    const value = localStorage.getItem(userKey);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function clearAuthStorage() {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(userKey);
}
