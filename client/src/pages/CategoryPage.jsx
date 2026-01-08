import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Card from '../components/Card';
import { fetchContent, fetchProgress } from '../utils/api';

function CategoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [practices, setPractices] = useState([]);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [contentData, progressData] = await Promise.all([
          fetchContent(),
          fetchProgress().catch(() => ({})) // Если не авторизован, возвращаем пустой объект
        ]);

        const foundCategory = contentData.categories?.find((c) => c.id === id);
        setCategory(foundCategory);

        const categoryPractices =
          contentData.practices?.filter((p) => p.category_id === id) || [];
        setPractices(categoryPractices);
        setProgress(progressData || {});
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </Layout>
    );
  }

  if (!category) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p className="text-gray-600">Категория не найдена</p>
        </div>
      </Layout>
    );
  }

  // Функция для склонения слова "раз"
  const getPracticeWord = (count) => {
    if (count === 1) return 'раз';
    if (count >= 2 && count <= 4) return 'раза';
    return 'раз';
  };

  return (
    <Layout>
      <button
        onClick={() => navigate('/')}
        className="text-primary hover:text-accent mb-6 text-sm"
      >
        ← Назад в каталог
      </button>
      
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        {category.title}
      </h1>
      <div className="space-y-6">
        {practices.map((practice) => {
          const practiceProgress = progress[practice.id];
          return (
            <Card
              key={practice.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/practice/${practice.id}`)}
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {practice.title}
              </h2>
              {practiceProgress ? (
                <p className="text-primary font-medium">
                  Прослушано {practiceProgress} {getPracticeWord(practiceProgress)}
                </p>
              ) : (
                <p className="text-gray-500">Ждет вас</p>
              )}
            </Card>
          );
        })}
      </div>
    </Layout>
  );
}

export default CategoryPage;

