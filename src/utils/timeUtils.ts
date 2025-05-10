import { RemainingTime } from '../types';

// Format datetime for input with timezone consideration
export const formatDateTimeLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Calculate remaining time
export const calculateRemainingTime = (endTime: Date, currentTime: Date): RemainingTime => {
  const diff = endTime.getTime() - currentTime.getTime();
  if (diff <= 0) return { text: 'Completed', expired: true };
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { 
    text: `${hours}h ${minutes}m ${seconds}s`,
    expired: false,
    totalMinutes: Math.floor(diff / (1000 * 60)),
    hours,
    minutes,
    seconds
  };
};

// Calculate progress percentage
export const calculateProgress = (startTime: Date, endTime: Date, currentTime: Date): number => {
  const totalDuration = endTime.getTime() - startTime.getTime();
  const elapsedTime = currentTime.getTime() - startTime.getTime();
  const progress = (elapsedTime / totalDuration) * 100;
  return Math.min(100, Math.max(0, progress));
};

// Format duration in minutes
export const formatDuration = (startTime: Date, endTime: Date): string => {
  const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  if (durationMinutes < 60) {
    return `${durationMinutes} minutes`;
  }
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours} hours`;
};

// Format date considering timezone
export const formatLocalDateTime = (date: Date, options: Intl.DateTimeFormatOptions = {}): string => {
  return new Intl.DateTimeFormat('default', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...options
  }).format(date);
};

// Check if date is today
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
};