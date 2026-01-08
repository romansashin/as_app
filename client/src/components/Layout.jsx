import Header from './Header';
import Footer from './Footer';

function Layout({ children, className = '' }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className={`max-w-md mx-auto px-4 py-8 flex-grow w-full ${className}`}>
        {children}
      </div>
      <Footer />
    </div>
  );
}

export default Layout;

