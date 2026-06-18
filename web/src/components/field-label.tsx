import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export const labelClass = 'text-muted-foreground text-xs font-medium tracking-normal uppercase';

export function FieldLabel({ className, ...props }: ComponentProps<'label'>) {
  return (
    <label
      className={cn(labelClass, className)}
      {...props}
    />
  );
}
