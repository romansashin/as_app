// В dev режиме используем localhost, в production - удаленный API
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:4000' : 'https://api.sashin.net/as-app');

export const fetchContent = async () => {
  const url = `${API_URL}/api/content`;
  try {
    const response = await fetch(url, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch content: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    throw error;
  }
};

export const fetchProgress = async () => {
  const timestamp = Date.now();
  const url = `${API_URL}/api/progress?_=${timestamp}`;
  try {
    const response = await fetch(url, {
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    if (!response.ok) {
      if (response.status === 401) {
        return {};
      }
      throw new Error(`Failed to fetch progress: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
      return {};
    }
    throw error;
  }
};

export const fetchUser = async () => {
  const response = await fetch(`${API_URL}/api/me`, {
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) {
      return null; // Not authenticated
    }
    throw new Error('Failed to fetch user');
  }
  return response.json();
};

export const addProgress = async (practiceId) => {
  const url = `${API_URL}/api/progress`;
  const body = JSON.stringify({ practice_id: practiceId });
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: body,
    });
    
    if (!response.ok) {
      throw new Error(`Failed to add progress: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    throw error;
  }
};

export const logout = async () => {
  const url = `${API_URL}/auth/logout`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to logout: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    throw error;
  }
};

