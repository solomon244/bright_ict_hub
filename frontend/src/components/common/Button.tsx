import clsx from 'clsx';
import { cloneElement, isValidElement } from 'react';
import type { ButtonHTMLAttributes, ReactNode, ReactElement } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  asChild?: boolean;
}

const baseStyles =
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-dark focus-visible:outline-primary shadow-card',
  secondary:
    'bg-white text-primary border border-primary/30 hover:border-primary hover:bg-primary/5 focus-visible:outline-primary',
  ghost: 'bg-transparent text-stone-600 hover:bg-primary/5 hover:text-primary focus-visible:outline-primary',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'text-xs px-3 py-1.5 rounded-lg',
  md: 'text-sm px-4 py-2',
  lg: 'text-base px-5 py-3',
};

const Button = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  fullWidth,
  asChild,
  ...props
}: ButtonProps) => {
  const classes = clsx(
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    fullWidth && 'w-full',
    className
  );

  if (asChild && isValidElement(children)) {
    return cloneElement(children as ReactElement, {
      className: clsx(children.props.className, classes),
    });
  }

  return (
    <button className={classes} {...props}>
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
};

export default Button;

