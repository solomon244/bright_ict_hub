import { Outlet } from 'react-router-dom';
import Navbar from '../components/navigation/Navbar';
import Footer from '../components/navigation/Footer';

const PublicLayout = () => (
  <div className="flex min-h-screen flex-col">
    <Navbar />
    <main className="flex-1">
      <Outlet />
    </main>
    <Footer />
  </div>
);

export default PublicLayout;

