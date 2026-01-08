import { useEffect, useRef } from 'react';

function AudioPlayer({ audioUrl, audioTitle, onPlay }) {
  const playerRef = useRef(null);
  const playerjsInstanceRef = useRef(null);
  const containerRef = useRef(null);
  const onPlayRef = useRef(onPlay);
  const hasTriggeredRef = useRef(false);

  // Обновляем ref при изменении onPlay (НЕ сбрасываем hasTriggeredRef)
  useEffect(() => {
    onPlayRef.current = onPlay;
  }, [onPlay]);

  useEffect(() => {
    if (!audioUrl || !containerRef.current) return;

    // Загружаем скрипт playerjs.js если еще не загружен
    const loadPlayerScript = () => {
      return new Promise((resolve, reject) => {
        if (window.Playerjs) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = '/playerjs.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load playerjs.js'));
        document.head.appendChild(script);
      });
    };

    const initPlayer = async () => {
      try {
        await loadPlayerScript();

        if (!window.Playerjs) return;

        // Очищаем предыдущий плеер если есть
        if (playerjsInstanceRef.current) {
          try {
            playerjsInstanceRef.current.api('destroy');
          } catch (e) {
            // Игнорируем ошибки при уничтожении
          }
        }

        if (containerRef.current) {
          containerRef.current.innerHTML = '<div id="playerjs" style="width:100%;height:100%;"></div>';
        }

        // Создаем новый экземпляр плеера
        const playerConfig = {
          id: 'playerjs',
          file: audioUrl,
          title: audioTitle || 'Audio'
        };

        playerjsInstanceRef.current = new window.Playerjs(playerConfig);
        
        // Настраиваем аудио элемент для фонового воспроизведения
        setTimeout(() => {
          const audioElement = document.querySelector('#playerjs audio');
          if (audioElement) {
            // Разрешаем воспроизведение в фоне на мобильных устройствах
            audioElement.setAttribute('playsinline', 'true');
            // Предотвращаем автоматическую остановку
            audioElement.setAttribute('preload', 'auto');
            console.log('🎧 Audio элемент настроен для фонового воспроизведения');
          }
        }, 500);
        
        // Функция для запуска таймера (только один раз)
        const triggerPlay = () => {
          if (hasTriggeredRef.current) {
            console.log('🔒 Play already triggered, ignoring');
            return;
          }
          hasTriggeredRef.current = true;
          console.log('🎵 Audio play detected, triggering timer');
          if (onPlayRef.current) {
            onPlayRef.current();
          }
        };
        
        // Функция для подключения обработчиков к аудио элементам
        const attachAudioHandlers = (audioElement) => {
          if (audioElement._playHandlerAttached) return;
          audioElement._playHandlerAttached = true;
          
          const playHandler = () => {
            console.log('🎧 Audio element play event');
            triggerPlay();
          };
          
          audioElement.addEventListener('play', playHandler);
          audioElement.addEventListener('playing', playHandler);
          audioElement.addEventListener('canplay', () => {
            console.log('🎼 Audio can play');
          });
        };
        
        // Настраиваем обработчики событий
        const setupHandlers = () => {
          playerRef.current = document.getElementById('playerjs');
          if (!playerRef.current) {
            console.log('⚠️ Player element not found, retrying...');
            return false;
          }
          
          console.log('✅ Player element found, setting up handlers');
          
          // Подписываемся на события через API
          if (playerjsInstanceRef.current && playerjsInstanceRef.current.api) {
            try {
              const playHandler = () => {
                console.log('🎬 Playerjs API play event');
                triggerPlay();
              };
              playerjsInstanceRef.current.api('on', 'play', playHandler);
              playerjsInstanceRef.current.api('on', 'playing', playHandler);
            } catch (e) {
              console.log('⚠️ Playerjs API error:', e);
            }
          }
          
          // Ищем существующие аудио элементы
          const audioElements = playerRef.current.querySelectorAll('audio');
          console.log(`🔍 Found ${audioElements.length} audio elements`);
          audioElements.forEach(attachAudioHandlers);
          
          // Наблюдаем за добавлением новых аудио элементов
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              mutation.addedNodes.forEach((node) => {
                if (node.tagName === 'AUDIO') {
                  console.log('➕ New audio element detected');
                  attachAudioHandlers(node);
                }
                if (node.querySelectorAll) {
                  const newAudios = node.querySelectorAll('audio');
                  if (newAudios.length > 0) {
                    console.log(`➕ Found ${newAudios.length} new audio elements in added node`);
                    newAudios.forEach(attachAudioHandlers);
                  }
                }
              });
            });
          });
          
          observer.observe(playerRef.current, {
            childList: true,
            subtree: true
          });
          
          containerRef.current._observer = observer;
          
          // Обработчик клика как дополнительный fallback
          const clickHandler = () => {
            console.log('🖱️ Click detected on player');
            setTimeout(() => {
              if (!playerRef.current) return;
              const audioElements = playerRef.current.querySelectorAll('audio');
              const isPlaying = Array.from(audioElements).some(audio => !audio.paused);
              if (isPlaying) {
                console.log('▶️ Audio is playing after click');
                triggerPlay();
              }
            }, 500);
          };
          
          containerRef.current.addEventListener('click', clickHandler, true);
          containerRef.current._clickHandler = clickHandler;
          
          return true;
        };
        
        // Пытаемся установить обработчики с несколькими попытками
        let attempts = 0;
        const maxAttempts = 10;
        const trySetup = () => {
          attempts++;
          if (setupHandlers()) {
            console.log(`✅ Handlers setup successful on attempt ${attempts}`);
          } else if (attempts < maxAttempts) {
            setTimeout(trySetup, 200);
          } else {
            console.log('❌ Failed to setup handlers after max attempts');
          }
        };
        
        // Начинаем с небольшой задержки
        setTimeout(trySetup, 100);
      } catch (error) {
        // Игнорируем ошибки инициализации
      }
    };

    initPlayer();

    return () => {
      console.log('🧹 Cleaning up AudioPlayer');
      hasTriggeredRef.current = false;
      
      // Останавливаем MutationObserver
      if (containerRef.current && containerRef.current._observer) {
        containerRef.current._observer.disconnect();
        delete containerRef.current._observer;
      }
      
      // Удаляем обработчики кликов
      if (containerRef.current && containerRef.current._clickHandler) {
        containerRef.current.removeEventListener('click', containerRef.current._clickHandler);
        delete containerRef.current._clickHandler;
      }
      
      // Уничтожаем плеер
      if (playerjsInstanceRef.current) {
        try {
          playerjsInstanceRef.current.api('destroy');
        } catch (e) {
          // Игнорируем ошибки
        }
      }
    };
  }, [audioUrl, audioTitle]);

  return (
    <div className="w-full mb-6 rounded-lg overflow-hidden bg-gray-100" style={{ height: '130px' }}>
      <style>{`
        .audio-player-container {
          width: 100%;
          height: 100%;
          position: relative;
        }
        #playerjs {
          width: 100% !important;
          height: 100% !important;
        }
      `}</style>
      <div
        ref={containerRef}
        className="audio-player-container"
      />
    </div>
  );
}

export default AudioPlayer;
