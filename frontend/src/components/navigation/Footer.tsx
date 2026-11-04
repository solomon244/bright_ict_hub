import { Link } from 'react-router-dom';

const footerLinks = [
  { label: 'Training', path: '/courses' },
  { label: 'Services', path: '/about' },
  { label: 'Support', path: '/contact' },
  { label: 'Privacy', path: '#' },
];

const Footer = () => (
  <footer className="border-t border-white/40 bg-white/80 backdrop-blur-3xl">
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-lg font-display font-semibold text-primary">Ethio Tech Hub</p>
        <p className="text-sm text-stone-500">
          Practical ICT services and modern technical training for teams, institutions, and learners.
        </p>
      </div>
      <nav className="flex flex-wrap gap-4 text-sm font-semibold text-stone-500">
        {footerLinks.map((link) => (
          <Link key={link.label} to={link.path} className="hover:text-primary">
            {link.label}
          </Link>
        ))}
      </nav>
      <p className="text-xs text-stone-400">© {new Date().getFullYear()} Ethio Tech Hub. All rights reserved.</p>
    </div>
  </footer>
);

export default Footer;

