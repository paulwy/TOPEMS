export const formatCurrency = (amount: number, currency: string = 'CNY'): string => {
  const formatters: Record<string, Intl.NumberFormat> = {
    CNY: new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    USD: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  };

  return formatters[currency]?.format(amount) || amount.toFixed(2);
};

export const formatNumber = (num: number, decimals: number = 0): string => {
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const number = bytes / Math.pow(k, i);
  const formattedNumber = i === 0 ? Math.round(number).toString() : number.toFixed(2);
  return `${formattedNumber} ${sizes[i]}`;
};
