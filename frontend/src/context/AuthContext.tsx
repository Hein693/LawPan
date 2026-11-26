import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '../types';
import { apiRequest } from '../api/client';

interface AuthContextType {
  currentUser: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  quickLogin: (role: UserRole) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

interface LoginApiResponse {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    username: string;
    full_name: string;
    role: UserRole;
    employee_id?: string;
    is_active: boolean;
    permissions: string[];
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('lawpan_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('lawpan_token') || null;
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If token exists, verify profile from /api/v1/auth/me
    if (token) {
      apiRequest<LoginApiResponse['user']>('/api/v1/auth/me')
        .then((userData) => {
          const user: User = {
            id: userData.id,
            username: userData.username,
            name: userData.full_name,
            role: userData.role,
            employee_id: userData.employee_id,
            is_active: userData.is_active
          };
          setCurrentUser(user);
          localStorage.setItem('lawpan_user', JSON.stringify(user));
        })
        .catch(() => {
          // Token expired or invalid
          logout();
        });
    }
  }, [token]);

  const login = async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<LoginApiResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      const user: User = {
        id: response.user.id,
        username: response.user.username,
        name: response.user.full_name,
        role: response.user.role,
        employee_id: response.user.employee_id,
        is_active: response.user.is_active
      };

      setToken(response.access_token);
      setCurrentUser(user);
      localStorage.setItem('lawpan_token', response.access_token);
      localStorage.setItem('lawpan_user', JSON.stringify(user));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (role: UserRole) => {
    const roleUsernameMap: Record<UserRole, string> = {
      OWNER: 'owner',
      MANAGER: 'manager',
      WAITER: 'waiter',
      CASHIER: 'cashier',
      KITCHEN: 'kitchen'
    };
    const username = roleUsernameMap[role];
    await login(username, 'lawpan123');
  };

  const logout = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('lawpan_user');
    localStorage.removeItem('lawpan_token');
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        login,
        quickLogin,
        logout,
        isAuthenticated: !!currentUser,
        loading,
        error
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
