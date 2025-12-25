import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';

type CardProps = HTMLMotionProps<"div"> & {
  variant?: 'default' | 'glass' | 'bordered';
  hover?: boolean;
};

export function Card({ className, variant = 'default', hover = true, children, ...props }: CardProps) {
  const variants = {
    default: "bg-white dark:bg-gray-800 shadow-sm",
    glass: "bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/20 dark:border-gray-700/20",
    bordered: "bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700",
  };

  const hoverEffect = hover ? {
    whileHover: { y: -4, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" },
    transition: { duration: 0.2 }
  } : {};

  return (
    <motion.div
      className={cn(
        "rounded-xl p-6 transition-all duration-200",
        variants[variant],
        className
      )}
      {...hoverEffect}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-1.5", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-gray-500 dark:text-gray-400", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("pt-0", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center pt-0", className)} {...props}>
      {children}
    </div>
  );
}
