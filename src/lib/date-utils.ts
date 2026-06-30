export type PersianDateFormat = 'date' | 'dateTime' | 'month';

const dateFormatters: Record<PersianDateFormat, Intl.DateTimeFormat> = {
  date: new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }),
  dateTime: new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }),
  month: new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    year: 'numeric',
    month: '2-digit',
  }),
};

export const toDate = (value?: string | Date | null) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatPersianDate = (
  value?: string | Date | null,
  format: PersianDateFormat = 'date'
) => {
  const date = toDate(value);
  if (!date) return '-';
  return dateFormatters[format].format(date);
};

export const toISODateString = (value?: string | Date | null) => {
  const date = toDate(value);
  return date ? date.toISOString() : '';
};
