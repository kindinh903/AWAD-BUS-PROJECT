import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  animation?: 'pulse' | 'wave';
}

export function Skeleton({
  className,
  variant = 'text',
  animation = 'pulse'
}: SkeletonProps) {
  const baseClasses = "bg-gray-200 dark:bg-gray-700";
  
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    card: 'h-48 rounded-xl'
  };

  const animationVariants = {
    pulse: {
      opacity: [0.5, 1, 0.5],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    wave: {
      backgroundPosition: ['200% 0', '-200% 0'],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "linear"
      }
    }
  };

  return (
    <motion.div
      animate={animation === 'pulse' ? animationVariants.pulse : undefined}
      className={cn(
        baseClasses,
        variantClasses[variant],
        animation === 'wave' && 'bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%]',
        className
      )}
      style={animation === 'wave' ? {
        animation: 'wave 2s linear infinite',
      } : undefined}
    />
  );
}

// Preset skeleton patterns
export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start gap-4">
        <Skeleton variant="circular" className="w-12 h-12" />
        <div className="flex-1 space-y-3">
          <Skeleton className="w-3/4" />
          <Skeleton className="w-1/2" />
          <div className="flex gap-2 mt-4">
            <Skeleton className="w-20 h-8 rounded-full" />
            <Skeleton className="w-20 h-8 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
