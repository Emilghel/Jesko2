// Sample notification data for demonstration purposes
// This would be replaced with real API data in production

import { v4 as uuidv4 } from 'uuid';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'alert';
  read: boolean;
  date: string;
  actionLink?: string;
  actionText?: string;
}

// Helper to create a date string for a specified number of days/hours/minutes ago
const getRelativeDate = (days = 0, hours = 0, minutes = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(date.getHours() - hours);
  date.setMinutes(date.getMinutes() - minutes);
  return date.toISOString();
};

export const sampleNotifications: Notification[] = [
  {
    id: uuidv4(),
    title: 'New Commission Earned',
    message: 'You earned a new commission of $150.00 from a referred user purchase.',
    type: 'success',
    read: false,
    date: getRelativeDate(0, 2, 15),
    actionLink: '/partner/commissions',
    actionText: 'View Commission Details'
  },
  {
    id: uuidv4(),
    title: 'Payment Processing',
    message: 'Your withdrawal request for $250.00 is being processed and will be available in your PayPal account within 48-72 hours.',
    type: 'warning',
    read: false,
    date: getRelativeDate(1, 3, 0),
    actionLink: '/partner/payments',
    actionText: 'View Payment Status'
  },
  {
    id: uuidv4(),
    title: 'New Referral Signed Up',
    message: 'A new user has signed up using your referral link. You\'ll earn commission when they make their first purchase.',
    type: 'info',
    read: true,
    date: getRelativeDate(2, 5, 30),
    actionLink: '/partner/referrals',
    actionText: 'View Referrals'
  },
  {
    id: uuidv4(),
    title: 'Payment Successful',
    message: 'Your withdrawal of $350.00 has been successfully deposited to your PayPal account.',
    type: 'success',
    read: true,
    date: getRelativeDate(6, 0, 0),
    actionLink: '/partner/payments',
    actionText: 'View Payment History'
  },
  {
    id: uuidv4(),
    title: 'Commission Rate Increased',
    message: 'Congratulations! Your commission rate has been increased to 25% based on your excellent performance.',
    type: 'success',
    read: false,
    date: getRelativeDate(7, 12, 0),
    actionLink: '/partner/dashboard',
    actionText: 'View Your New Rate'
  },
  {
    id: uuidv4(),
    title: 'New Marketing Materials',
    message: 'New social media templates and promotional banners are now available in your marketing resources.',
    type: 'info',
    read: true,
    date: getRelativeDate(12, 0, 0),
    actionLink: '/partner/marketing',
    actionText: 'View Resources'
  },
  {
    id: uuidv4(),
    title: 'Verification Required',
    message: 'Please verify your payment details to ensure seamless processing of future payments.',
    type: 'alert',
    read: false,
    date: getRelativeDate(14, 0, 0),
    actionLink: '/partner/settings',
    actionText: 'Verify Details'
  },
  {
    id: uuidv4(),
    title: 'Account Milestone Reached',
    message: 'You\'ve referred over 10 users! Keep up the great work and unlock additional perks.',
    type: 'success',
    read: true,
    date: getRelativeDate(20, 0, 0),
    actionLink: '/partner/dashboard',
    actionText: 'View Achievements'
  }
];