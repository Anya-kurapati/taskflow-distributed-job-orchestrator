import { cn } from '@/utils/cn';
import { getInitials } from '@/utils/format';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'size-8 text-xs',
  md: 'size-9 text-sm',
  lg: 'size-14 text-lg',
};

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700',
        sizeClasses[size],
        className,
      )}
    >
      {getInitials(name)}
    </span>
  );
}
