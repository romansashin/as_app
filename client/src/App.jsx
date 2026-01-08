import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import CatalogPage from './pages/CatalogPage';
import CategoryPage from './pages/CategoryPage';
import PracticePage from './pages/PracticePage';
import { fetchUser } from './utils/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // В dev режиме авторизация отключена
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await fetchUser();
        setUser(userData?.user || null);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    // В dev режиме пропускаем проверку авторизации
    if (isDev) {
      setLoading(false);
      setUser({ id: 1, provider: 'dev', email: 'dev@localhost' });
    } else {
      checkAuth();
    }
  }, [isDev]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Загрузка...</p>
      </div>
    );
  }

  // В production требуем авторизацию
  const requireAuth = !isDev && !user;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        {requireAuth ? (
          // Если не авторизован в production - редирект на login
          <Route path="*" element={<Navigate to="/login" replace />} />
        ) : (
          // Если авторизован или dev режим - доступ к приложению
          <>
            <Route path="/" element={<Navigate to="/catalog" replace />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/catalog/:id" element={<CategoryPage />} />
            <Route path="/practice/:id" element={<PracticePage />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
