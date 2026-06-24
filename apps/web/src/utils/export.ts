import { formatDate } from './format';

export { formatDate };

export const getDateRange = (range: string): { start: string; end: string } => {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (range) {
    case 'today':
      startDate = now;
      endDate = now;
      break;
    case 'yesterday':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 1);
      endDate = startDate;
      break;
    case 'week':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      endDate = now;
      break;
    case 'month':
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 1);
      endDate = now;
      break;
    case 'quarter':
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 3);
      endDate = now;
      break;
    case 'year':
      startDate = new Date(now);
      startDate.setFullYear(startDate.getFullYear() - 1);
      endDate = now;
      break;
    case 'custom':
    default:
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 1);
      endDate = now;
  }

  return {
    start: formatDate(startDate),
    end: formatDate(endDate),
  };
};
