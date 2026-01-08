import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import Layout from '../components/Layout';
import Card from '../components/Card';
import AudioPlayer from '../components/AudioPlayer';
import { fetchContent, addProgress, fetchProgress } from '../utils/api';

function PracticePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [practice, setPractice] = useState(null);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [listenCount, setListenCount] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0); // Время воспроизведения в секундах
  const sessionRecordedRef = useRef(false); // Записано ли прослушивание в этой сессии
  const playEventFiredRef = useRef(false); // Сработало ли событие Play в этой сессии
  const wakeLockRef = useRef(null); // Wake Lock для предотвращения сна устройства
  const mediaSessionSetupRef = useRef(false); // Настроена ли Media Session

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        // Сбрасываем флаги для новой сессии
        sessionRecordedRef.current = false;
        playEventFiredRef.current = false;
        mediaSessionSetupRef.current = false;
        setPlaybackTime(0);
        
        // Освобождаем Wake Lock если был активирован
        if (wakeLockRef.current) {
          wakeLockRef.current.release();
          wakeLockRef.current = null;
        }
        
        // Загружаем контент
        const contentData = await fetchContent();
        const foundPractice = contentData?.practices?.find((p) => p.id === id);
        
        if (!foundPractice) {
          if (isMounted) {
            setLoading(false);
          }
          return;
        }
        
        if (isMounted) {
          setPractice(foundPractice);
          const foundCategory = contentData.categories?.find(
            (c) => c.id === foundPractice.category_id
          );
          setCategory(foundCategory);
        }
        
        // Загружаем прогресс ПОСЛЕ загрузки контента
        try {
          const progressData = await fetchProgress();
          if (isMounted && progressData) {
            const currentCount = progressData[id] ? parseInt(progressData[id], 10) : 0;
            console.log(`Loaded progress for ${id}:`, currentCount);
            setListenCount(currentCount);
          }
        } catch (progressError) {
          console.error('Error loading progress:', progressError);
          // При ошибке устанавливаем 0
          if (isMounted) {
            setListenCount(0);
          }
        }
      } catch (error) {
        if (isMounted) {
          setError(`Ошибка загрузки: ${error.message}. Проверьте подключение к серверу.`);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
      // Освобождаем Wake Lock при размонтировании
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, [id, location.key]);


  // Функция для запроса Wake Lock
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        // Освобождаем предыдущий Wake Lock если был
        if (wakeLockRef.current) {
          wakeLockRef.current.release();
        }
        
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('🔒 Wake Lock активирован');
        
        // Переактивируем Wake Lock когда пользователь возвращается к странице
        wakeLockRef.current.addEventListener('release', () => {
          console.log('🔓 Wake Lock освобожден');
        });
      } catch (err) {
        console.warn('⚠️ Не удалось активировать Wake Lock:', err);
      }
    }
  }, []);

  // Обработчик запуска плеера - записываем прослушивание ОДИН РАЗ при первом Play
  const handlePlayerPlay = useCallback(async () => {
    // Если Play уже был нажат в этой сессии - игнорируем
    if (playEventFiredRef.current) {
      console.log('▶️ Play event already fired in this session, ignoring');
      return;
    }
    
    playEventFiredRef.current = true;
    console.log('▶️ First Play in session - will record after 30 seconds');
    
    // Запрашиваем Wake Lock
    await requestWakeLock();
    
    // Запускаем таймер на 30 секунд, после чего запишем прослушивание
    setTimeout(() => {
      if (!sessionRecordedRef.current) {
        sessionRecordedRef.current = true;
        console.log('✅ 30 seconds passed, recording listening session');
        
        const recordProgress = async () => {
          try {
            console.log('📤 Sending progress to server...');
            const result = await addProgress(id);
            console.log('✅ Progress recorded successfully:', result);
            
            // Перезагружаем прогресс с сервера
            await new Promise(resolve => setTimeout(resolve, 500));
            
            console.log('📥 Fetching updated progress...');
            const progressData = await fetchProgress();
            console.log('📊 Fetched updated progress:', progressData);
            
            const currentCount = progressData && progressData[id] ? parseInt(progressData[id], 10) : 0;
            console.log(`🎯 Updated listen count for ${id}:`, currentCount);
            setListenCount(currentCount);
          } catch (error) {
            console.error('❌ Error recording progress:', error);
            // При ошибке обновляем локально
            setListenCount((prev) => prev + 1);
          }
        };
        
        recordProgress();
      }
    }, 30000); // 30 секунд
  }, [id]); // Зависимость только от id


  // Визуальный таймер - показывает оставшееся время практики
  useEffect(() => {
    if (!playEventFiredRef.current) {
      return;
    }

    const timer = setInterval(() => {
      const playerElement = document.getElementById('playerjs');
      if (playerElement) {
        const audioElement = playerElement.querySelector('audio');
        if (audioElement && !audioElement.paused) {
          const currentTime = Math.floor(audioElement.currentTime);
          const duration = Math.floor(audioElement.duration);
          
          if (duration && !isNaN(duration)) {
            // Показываем оставшееся время
            const remaining = Math.max(0, duration - currentTime);
            setPlaybackTime(remaining);
          }
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [playEventFiredRef.current]);

  // Настройка Media Session API и обработка видимости страницы
  useEffect(() => {
    if (!practice || !playEventFiredRef.current) return;

    // Настраиваем Media Session API один раз
    if (!mediaSessionSetupRef.current && 'mediaSession' in navigator) {
      mediaSessionSetupRef.current = true;
      
      navigator.mediaSession.metadata = new MediaMetadata({
        title: practice.title,
        artist: 'Гипнопрактика',
        album: category?.name || 'Практики',
        artwork: [
          { src: '/favicon.ico', sizes: '96x96', type: 'image/x-icon' }
        ]
      });

      console.log('🎵 Media Session настроен');
    }

    // Обработчик восстановления Wake Lock при возврате на страницу
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && playEventFiredRef.current) {
        console.log('👁️ Страница снова видна, восстанавливаем Wake Lock');
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [practice, category, requestWakeLock]);

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-gray-600 text-sm">Проверьте консоль браузера (F12) для подробностей</p>
        </div>
      </Layout>
    );
  }

  if (!practice && !loading) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p className="text-gray-600 mb-2">Практика не найдена</p>
          <p className="text-gray-500 text-sm">ID: {id}</p>
          <p className="text-gray-500 text-sm mt-2">Проверьте консоль браузера (F12) для подробностей</p>
        </div>
      </Layout>
    );
  }

  // Форматирование времени в MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Layout>
      {category && (
        <button
          onClick={() => navigate(`/catalog/${category.id}`)}
          className="text-primary hover:text-accent mb-6 text-sm"
        >
          ← Назад к категории
        </button>
      )}
      
      <Card>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          {practice.title}
        </h1>
        
        <AudioPlayer 
          audioUrl={practice.audio_url} 
          audioTitle={practice.audio_title || practice.title}
          onPlay={handlePlayerPlay}
        />
        
        {playEventFiredRef.current && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-green-700">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Фоновое воспроизведение активно</span>
            </div>
            <p className="text-xs text-green-600 mt-1 ml-7">
              Аудио продолжит играть даже если экран выключится
            </p>
          </div>
        )}
        
        {playEventFiredRef.current && !sessionRecordedRef.current && (
          <div className="mb-6 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Осталось</p>
                <p className="text-primary text-2xl font-bold">
                  {formatTime(playbackTime)}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 text-center">
              Прослушивание будет записано через 30 сек
            </p>
          </div>
        )}
        
        {playEventFiredRef.current && sessionRecordedRef.current && (
          <div className="mb-6 p-4 bg-secondary rounded-lg border border-primary/30">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <div>
                <p className="text-xs text-primary/70 mb-1">Осталось</p>
                <p className="text-primary text-2xl font-bold">
                  {formatTime(playbackTime)}
                </p>
              </div>
            </div>
            <p className="text-sm text-primary font-medium text-center">
              ✓ Прослушивание засчитано
            </p>
          </div>
        )}
        
        {!playEventFiredRef.current && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-600 text-sm">
              Нажмите Play для начала прослушивания
            </p>
          </div>
        )}
        
        <div className="mb-6">
          {listenCount > 0 ? (
            <div className="flex items-center gap-2">
              <p className="text-primary font-medium">
                Прослушано {listenCount} {listenCount === 1 ? 'раз' : listenCount < 5 ? 'раза' : 'раз'}
              </p>
            </div>
          ) : (
            <p className="text-gray-500">Ждет вас</p>
          )}
        </div>
        
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{practice.description_md}</ReactMarkdown>
        </div>
      </Card>
    </Layout>
  );
}

export default PracticePage;

