import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface StaggerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  initialDelay?: number;
}

// Stagger container for children animations
export function Stagger({ 
  children, 
  className,
  staggerDelay = 0.1,
  initialDelay = 0 
}: StaggerProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            delayChildren: initialDelay,
            staggerChildren: staggerDelay
          }
        }
      }}
    >
      {children}
    </motion.div>
  );
}

// Individual stagger item
export function StaggerItem({ 
  children, 
  className 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: {
            type: "spring",
            stiffness: 100,
            damping: 15
          }
        }
      }}
    >
      {children}
    </motion.div>
  );
}

// Grid with stagger animation
export function StaggerGrid({ 
  children, 
  className,
  cols = 3 
}: { 
  children: ReactNode; 
  className?: string;
  cols?: 1 | 2 | 3 | 4;
}) {
  const colClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <Stagger className={`grid ${colClasses[cols]} gap-6 ${className || ''}`}>
      {children}
    </Stagger>
  );
}
