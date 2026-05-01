import { Outlet } from 'react-router-dom';
import Navbar from '../components/navigation/Navbar';
import Footer from '../components/navigation/Footer';

const AuthLayout = () => {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-white to-stone-50">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="glass-panel w-full max-w-4xl rounded-3xl p-8 shadow-card md:p-12">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AuthLayout;


