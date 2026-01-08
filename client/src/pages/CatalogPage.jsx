import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Card from '../components/Card';
import { fetchContent, fetchProgress } from '../utils/api';

function CatalogPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('CatalogPage: Loading content...');
        const content = await fetchContent();
        console.log('CatalogPage: Content loaded:', content);
        console.log('CatalogPage: Categories:', content?.categories);
        setCategories(content?.categories || []);
        setError(null);
      } catch (error) {
        console.error('Failed to load categories:', error);
        setError(`Ошибка загрузки: ${error.message}. Проверьте подключение к серверу.`);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

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

  if (categories.length === 0) {
    return (
      <Layout>
        <div className="text-center py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Каталог</h1>
          <p className="text-gray-600">Категории не найдены</p>
          <p className="text-gray-500 text-sm mt-2">Проверьте консоль браузера (F12)</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Каталог</h1>
      <div className="space-y-6">
        {categories.map((category) => (
          <Card
            key={category.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate(`/catalog/${category.id}`)}
          >
            <h2 className="text-xl font-semibold text-gray-900">
              {category.title}
            </h2>
          </Card>
        ))}
      </div>
    </Layout>
  );
}

export default CatalogPage;

