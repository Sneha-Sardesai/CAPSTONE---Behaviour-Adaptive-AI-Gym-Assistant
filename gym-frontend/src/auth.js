const STORAGE_KEY = 'mygym_auth';
const AUTH_CHANGED_EVENT = 'mygym-auth-changed';

const emitAuthChanged = () => {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
};

const getStoredAuth = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to parse auth storage:', error);
    return null;
  }
};

export const isAuthenticated = () => {
  return Boolean(getStoredAuth()?.token);
};

export const getAuthToken = () => {
  return getStoredAuth()?.token || null;
};

export const getCurrentUser = () => {
  const auth = getStoredAuth();
  return auth
    ? {
        user_id: auth.user_id,
        username: auth.username,
        email: auth.email,
        name: auth.name,
        member_id: auth.member_id,
        member_name: auth.member_name,
      }
    : null;
};

export const getAuthHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const saveAuth = ({ token, user_id, username, email, name, member_id, member_name }) => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ token, user_id, username, email, name, member_id, member_name })
  );
  emitAuthChanged();
};

export const clearAuth = () => {
  localStorage.removeItem(STORAGE_KEY);
  emitAuthChanged();
};

export const subscribeAuth = (callback) => {
  window.addEventListener(AUTH_CHANGED_EVENT, callback);
  return () => window.removeEventListener(AUTH_CHANGED_EVENT, callback);
};
