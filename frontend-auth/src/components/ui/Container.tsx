import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface ContainerProps {
  children: ReactNode;
  className?: string;
  animate?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const sizeClasses = {
  sm: 'max-w-3xl',
  md: 'max-w-5xl',
  lg: 'max-w-7xl',
  xl: 'max-w-[1400px]',
  full: 'max-w-full'
};

export function Container({ 
  children, 
  className, 
  animate = true,
  size = 'lg' 
}: ContainerProps) {
  const Wrapper = animate ? motion.div : 'div';
  const animationProps = animate ? {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  } : {};

  return (
    <Wrapper
      {...animationProps}
      className={cn(
        'container mx-auto px-4 sm:px-6 lg:px-8',
        sizeClasses[size],
        className
      )}
    >
      {children}
    </Wrapper>
  );
}

// Section wrapper with consistent spacing
export function Section({ 
  children, 
  className,
  background = 'default' 
}: { 
  children: ReactNode; 
  className?: string;
  background?: 'default' | 'secondary' | 'gradient';
}) {
  const bgClasses = {
    default: 'bg-white dark:bg-gray-900',
    secondary: 'bg-gray-50 dark:bg-gray-800',
    gradient: 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800'
  };

  return (
    <section className={cn('py-16 sm:py-20 lg:py-24', bgClasses[background], className)}>
      {children}
    </section>
  );
}
