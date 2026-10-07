'use client';

import * as React from 'react';
import { DayButton, DayPicker, getDefaultClassNames } from 'react-day-picker';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react';

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  buttonVariant = 'ghost',
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>['variant'];
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        'bg-background group/calendar p-3 w-[280px] select-none',
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString('default', { month: 'short' }),
        ...formatters,
      }}
      classNames={{
        root: cn('w-full', defaultClassNames.root),
        months: cn('relative flex flex-col gap-4', defaultClassNames.months),
        month: cn('flex w-full flex-col gap-3', defaultClassNames.month),
        nav: cn(
          'absolute inset-x-0 top-0 flex w-full items-center justify-between z-10 px-1',
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          'h-7 w-7 select-none p-0 aria-disabled:opacity-50 text-muted-foreground hover:text-foreground',
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          'h-7 w-7 select-none p-0 aria-disabled:opacity-50 text-muted-foreground hover:text-foreground',
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          'flex h-7 w-full items-center justify-center text-sm font-semibold text-foreground',
          defaultClassNames.month_caption,
        ),
        caption_label: cn('select-none font-semibold text-sm', defaultClassNames.caption_label),
        table: 'w-full border-collapse space-y-1',
        weekdays: cn('flex justify-between w-full mb-1', defaultClassNames.weekdays),
        weekday: cn(
          'text-muted-foreground w-9 text-center select-none text-[0.8rem] font-medium',
          defaultClassNames.weekday,
        ),
        week: cn('flex w-full justify-between mt-1', defaultClassNames.week),
        day: cn(
          'h-9 w-9 p-0 text-center text-sm relative flex items-center justify-center focus-within:relative focus-within:z-20',
          defaultClassNames.day,
        ),
        today: cn('font-semibold rounded-md border border-primary/30', defaultClassNames.today),
        outside: cn('text-muted-foreground opacity-40 aria-selected:opacity-30', defaultClassNames.outside),
        disabled: cn('text-muted-foreground opacity-30 cursor-not-allowed', defaultClassNames.disabled),
        hidden: cn('invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          );
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === 'left') {
            return <ChevronLeftIcon className={cn('h-4 w-4', className)} {...props} />;
          }
          if (orientation === 'right') {
            return <ChevronRightIcon className={cn('h-4 w-4', className)} {...props} />;
          }
          return <ChevronDownIcon className={cn('h-4 w-4', className)} {...props} />;
        },
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  const isSelected = Boolean(modifiers.selected);

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      className={cn(
        'h-9 w-9 p-0 font-normal text-sm rounded-md transition-colors',
        isSelected
          ? 'bg-primary text-primary-foreground font-semibold hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground'
          : 'hover:bg-accent hover:text-accent-foreground',
        className,
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
