import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchUser, logout } from '../utils/api';

function Header() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await fetchUser();
        console.log('📥 fetchUser result:', userData);
        
        // Если userData === null, значит 401 (DEV режим)
        if (userData === null) {
          console.log('⚠️ User not authenticated (401) - showing DEV mode UI');
          setUser(null);
          setIsDevMode(true);
          console.log('✅ DEV mode activated');
        } else {
          // Production режим с авторизованным пользователем
          setUser(userData?.user || null);
          setIsDevMode(false);
          console.log('✅ Production mode - user:', userData?.user);
        }
      } catch (error) {
        // Другие ошибки (не 401)
        console.log('⚠️ Error loading user - showing DEV mode UI');
        console.log('Error:', error.message);
        setUser(null);
        setIsDevMode(true);
        console.log('✅ DEV mode activated (error fallback)');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      // В DEV режиме просто обновляем страницу
      if (isDevMode) {
        window.location.reload();
      } else {
        // В production перенаправляем на страницу логина
        navigate('/login');
      }
    } catch (error) {
      console.error('Failed to logout:', error);
      // Даже если запрос не удался, пытаемся перенаправить
      if (!isDevMode) {
        navigate('/login');
      }
    }
  };

  // Не показываем хедер на странице логина
  if (location.pathname === '/login') {
    return null;
  }

  // Не показываем хедер если загрузка
  if (loading) {
    return null;
  }

  // Не показываем если нет пользователя И не DEV режим
  if (!user && !isDevMode) {
    return null;
  }

  return (
    <header className="bg-white border-b border-gray-200 mb-6">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
          {isDevMode ? (
            <span className="truncate max-w-[150px] flex items-center gap-1">
              <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded font-medium">DEV</span>
              <span>Тестовый пользователь</span>
            </span>
          ) : (
            <span className="truncate max-w-[150px]">{user.email || 'Пользователь'}</span>
          )}
        </div>
        
        <button
          onClick={handleLogout}
          className="text-sm text-gray-600 hover:text-primary transition-colors flex items-center gap-1"
          title={isDevMode ? 'Перезагрузить страницу (DEV режим)' : 'Выйти из аккаунта'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Выйти</span>
        </button>
      </div>
    </header>
  );
}

export default Header;

