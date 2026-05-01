import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { FaBars, FaRegUserCircle, FaTimes } from 'react-icons/fa';
import Button from '../common/Button';
import useAuth from '../../hooks/useAuth';

const routes = [
  { label: 'Home', to: '/' },
  { label: 'Courses', to: '/courses' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'For Schools', to: '/about' },
  { label: 'Success Stories', href: '/#success-stories' },
  { label: 'Support', to: '/contact' },
];

const roleDashboardMap = {
  student: '/student',
  instructor: '/instructor',
  admin: '/admin',
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const dashboardPath = user ? roleDashboardMap[user.role] : '/login';
  const [language, setLanguage] = useState<'EN' | 'AM'>('EN');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('site-lang');
    if (saved === 'am') {
      setLanguage('AM');
    }
  }, []);

  const toggleLanguage = () => {
    const next = language === 'EN' ? 'AM' : 'EN';
    setLanguage(next);
    localStorage.setItem('site-lang', next.toLowerCase());
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/40 bg-white/80 backdrop-blur-3xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Link to="/" className="flex items-center gap-2 text-xl font-display font-semibold text-primary">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            BI
          </span>
           Bright ICT Hub
        </Link>
        <nav className="hidden gap-8 md:flex">
          {routes.map((route) => (
            route.to ? (
              <NavLink
                key={route.label}
                to={route.to}
                className={({ isActive }) =>
                  `text-sm font-semibold ${
                    isActive ? 'text-primary' : 'text-stone-500 hover:text-stone-900'
                  }`
                }
              >
                {route.label}
              </NavLink>
            ) : (
              <a key={route.label} href={route.href} className="text-sm font-semibold text-stone-500 hover:text-stone-900">
                {route.label}
              </a>
            )
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLanguage}
            className="hidden rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50 md:inline-flex"
          >
            {language}
          </button>
          {user ? (
            <>
              <Button asChild variant="secondary" className="hidden md:inline-flex">
                <Link to={dashboardPath}>Dashboard</Link>
              </Button>
              <button
                onClick={handleLogout}
                className="hidden rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-500 hover:text-primary md:inline-flex"
              >
                Logout
              </button>
              <Link
                to={dashboardPath}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/30 text-primary hover:bg-primary/5"
                title="Dashboard"
              >
                <FaRegUserCircle size={20} />
              </Link>
            </>
          ) : (
            <>
              <Button asChild variant="secondary" className="hidden md:inline-flex">
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild className="hidden md:inline-flex">
                <Link to="/register">Start Free</Link>
              </Button>
              <Link
                to="/login"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/30 text-primary hover:bg-primary/5"
                title="Login"
              >
                <FaRegUserCircle size={20} />
              </Link>
            </>
          )}
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 text-stone-600 md:hidden"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <FaTimes size={18} /> : <FaBars size={18} />}
          </button>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="border-t border-stone-100 bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-2">
            {routes.map((route) =>
              route.to ? (
                <NavLink
                  key={route.label}
                  to={route.to}
                  onClick={closeMobileMenu}
                  className="rounded-xl px-3 py-3 text-sm font-semibold text-stone-600 hover:bg-primary/5 hover:text-primary"
                >
                  {route.label}
                </NavLink>
              ) : (
                <a
                  key={route.label}
                  href={route.href}
                  onClick={closeMobileMenu}
                  className="rounded-xl px-3 py-3 text-sm font-semibold text-stone-600 hover:bg-primary/5 hover:text-primary"
                >
                  {route.label}
                </a>
              )
            )}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link to="/login" onClick={closeMobileMenu} className="rounded-xl border border-stone-200 px-3 py-3 text-center text-sm font-semibold text-stone-700">
                Login
              </Link>
              <Link to="/register" onClick={closeMobileMenu} className="rounded-xl bg-primary px-3 py-3 text-center text-sm font-semibold text-white">
                Start Free
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;

