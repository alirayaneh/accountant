'use client';

import { Calendar as CalendarIcon } from 'lucide-react';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persianFa from 'react-date-object/locales/persian_fa';
import TimePicker from 'react-multi-date-picker/plugins/time_picker';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatPersianDate, type PersianDateFormat } from '@/lib/date-utils';

type PersianDatePickerProps = {
  value?: string;
  onChange: (value: string) => void;
  includeTime?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

export function PersianDatePicker({
  value,
  onChange,
  includeTime = false,
  disabled = false,
  placeholder = 'انتخاب تاریخ',
  className,
}: PersianDatePickerProps) {
  const dateValue = value ? new Date(value) : null;

  return (
    <DatePicker
      calendar={persian}
      locale={persianFa}
      calendarPosition="bottom-right"
      format={includeTime ? 'YYYY/MM/DD HH:mm' : 'YYYY/MM/DD'}
      value={dateValue}
      disabled={disabled}
      onChange={(date: DateObject | DateObject[] | null) => {
        if (!date || Array.isArray(date)) {
          onChange('');
          return;
        }
        onChange(date.toDate().toISOString());
      }}
      plugins={includeTime ? [<TimePicker key="time" position="bottom" hideSeconds />] : []}
      render={(displayValue, openCalendar) => (
        <div className="relative">
          <Input
            value={displayValue}
            onClick={openCalendar}
            onFocus={openCalendar}
            readOnly
            disabled={disabled}
            placeholder={placeholder}
            className={cn('cursor-pointer pl-10', className)}
          />
          <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      )}
    />
  );
}

type PersianDateProps = {
  value?: string | Date | null;
  format?: PersianDateFormat;
  className?: string;
};

export function PersianDate({ value, format = 'date', className }: PersianDateProps) {
  return <span className={className}>{formatPersianDate(value, format)}</span>;
}
