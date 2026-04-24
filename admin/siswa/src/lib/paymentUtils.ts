import { getDaysInMonth } from 'date-fns';

/**
 * Calculate pro-rated dorm fee for the first month
 * Monthly fee is 500,000 IDR
 */
export const calculateFirstMonthDormFee = (checkInDate: Date): number => {
  const daysInMonth = getDaysInMonth(checkInDate);
  const remainingDays = daysInMonth - checkInDate.getDate() + 1; // Including check-in day
  const monthlyFee = 500000;
  return Math.round((monthlyFee / daysInMonth) * remainingDays);
};

/**
 * Generate payment schedule for SSW (Tokutei Ginou) Lump Sum
 * 5,000,000 IDR Deposit + 15,000,000 IDR Balance
 */
export const getSSWLumpSumSplit = () => {
  return [
    { label: 'Deposit', amount: 5000000 },
    { label: 'Remaining Balance', amount: 15000000 }
  ];
};
