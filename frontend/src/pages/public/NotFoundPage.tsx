import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';

const NotFoundPage = () => (
  <div className="flex flex-col items-center gap-4 py-20 text-center">
    <p className="text-xs font-semibold uppercase text-primary">404</p>
    <h1 className="text-4xl font-display font-semibold">Page not found</h1>
    <p className="max-w-md text-sm text-stone-500">
      The page you are looking for has moved or no longer exists. Let’s guide you back to the learning studio.
    </p>
    <Button asChild>
      <Link to="/">Return home</Link>
    </Button>
  </div>
);

export default NotFoundPage;


