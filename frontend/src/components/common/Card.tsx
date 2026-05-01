import type { ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

const paddingMap = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const Card = ({ children, className, padding = 'md' }: CardProps) => {
  return (
    <div className={clsx('glass-panel rounded-2xl', paddingMap[padding], className)}>{children}</div>
  );
};

export default Card;

