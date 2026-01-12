import Layout from '../components/Layout';
import Button from '../components/Button';
import Card from '../components/Card';

function LoginPage() {
  // API URL берется из переменной окружения или использует дефолтные значения
  // Для форка проекта: установите VITE_API_URL в .env файле клиента
  const API_URL = import.meta.env.VITE_API_URL || 
    (import.meta.env.DEV ? 'http://localhost:4000' : 'https://api.sashin.net/as-app');
  
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Карманный психолог
          </h1>
          <p className="text-gray-600 mb-6">
            Войдите, чтобы начать практики
          </p>
          <div>
            <a href={`${API_URL}/auth/google`}>
              <Button variant="primary" className="w-full mb-3">
                Войти через Google
              </Button>
            </a>
            <a href={`${API_URL}/auth/yandex`}>
              <Button variant="secondary" className="w-full">
                Войти через Yandex
              </Button>
            </a>
          </div>
        </Card>
      </div>
    </Layout>
  );
}

export default LoginPage;

