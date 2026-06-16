import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export function FieldLabel({ className, ...props }: ComponentProps<'label'>) {
  return (
    <label
      className={cn(
        'text-muted-foreground text-xs font-medium tracking-normal uppercase',
        className,
      )}
      {...props}
    />
  );
}

export function FieldLabelText({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'text-muted-foreground text-xs font-medium tracking-normal uppercase',
        className,
      )}
      {...props}
    />
  );
}
