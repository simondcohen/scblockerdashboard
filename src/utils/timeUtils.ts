import { RemainingTime } from '../types';

// Format date only (YYYY-MM-DD)
export const formatDateOnly = (date: Date): string => {
  try {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};

// Format time component (ensure it's two digits)
export const formatTimeComponent = (value: string | number): string => {
  try {
    return String(value).padStart(2, '0');
  } catch (error) {
    console.error("Error formatting time component:", error);
    return "00";
  }
};

// Format datetime for input with timezone consideration
export const formatDateTimeLocal = (date: Date): string => {
  try {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes() % 60).padStart(2, '0');
    
    // We're using step="60" in inputs, so omit seconds for stability
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};

// Parse datetime-local input value to Date object
export const parseDateTimeLocal = (dateTimeString: string): Date => {
  try {
    if (!dateTimeString) {
      throw new Error("Empty date string");
    }
    
    // Normalize the string by ensuring consistent format
    let normalized = dateTimeString;
    
    // If we have a time format with minutes, validate them
    if (normalized.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
      const [datePart, timePart] = normalized.split('T');
      const [hoursStr, minutesStr] = timePart.split(':');
      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      
      // Validate and correct minutes if they're ≥ 60
      if (minutes >= 60) {
        const newHours = hours + Math.floor(minutes / 60);
        const newMinutes = minutes % 60;
        normalized = `${datePart}T${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
      }
    }
    
    // Add seconds if not present (to ensure consistent parsing)
    if (normalized.split(':').length === 2) {
      normalized = `${normalized}:00`;
    }
    
    const date = new Date(normalized);
    
    // Validate the date to ensure it's valid
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date format");
    }
    
    return date;
  } catch (error) {
    console.error("Error parsing date:", error, dateTimeString);
    throw error;
  }
};

// Calculate remaining time
export const calculateRemainingTime = (endTime: Date, currentTime: Date): RemainingTime => {
  try {
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
  } catch (error) {
    console.error("Error calculating remaining time:", error);
    return { text: 'Error', expired: false };
  }
};

// Calculate progress percentage
export const calculateProgress = (startTime: Date, endTime: Date, currentTime: Date): number => {
  try {
    const totalDuration = endTime.getTime() - startTime.getTime();
    if (totalDuration <= 0) return 0;
    
    const elapsedTime = currentTime.getTime() - startTime.getTime();
    const progress = (elapsedTime / totalDuration) * 100;
    return Math.min(100, Math.max(0, progress));
  } catch (error) {
    console.error("Error calculating progress:", error);
    return 0;
  }
};

// Format duration in minutes
export const formatDuration = (startTime: Date, endTime: Date): string => {
  try {
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    if (durationMinutes < 60) {
      return `${durationMinutes} minutes`;
    }
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours} hours`;
  } catch (error) {
    console.error("Error formatting duration:", error);
    return "Unknown duration";
  }
};

// Format date considering timezone
export const formatLocalDateTime = (date: Date, options: Intl.DateTimeFormatOptions = {}): string => {
  try {
    return new Intl.DateTimeFormat('default', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      ...options
    }).format(date);
  } catch (error) {
    console.error("Error formatting local date time:", error);
    return "Invalid date";
  }
};

// Check if date is today
export const isToday = (date: Date): boolean => {
  try {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  } catch (error) {
    console.error("Error checking if date is today:", error);
    return false;
  }
};

// Update either the date or time part of a Date object
export const updateDateTimePart = (
  originalDateTime: Date | null,
  newValueFromPicker: Date | null, // This will be a full Date object from the picker
  partToUpdate: 'date' | 'time'
): Date | null => {
  if (!newValueFromPicker) return originalDateTime; // Or handle as needed

  const combined = originalDateTime ? new Date(originalDateTime) : new Date(); // Base for combining

  if (partToUpdate === 'date') {
    combined.setFullYear(newValueFromPicker.getFullYear());
    combined.setMonth(newValueFromPicker.getMonth());
    combined.setDate(newValueFromPicker.getDate());
    if (!originalDateTime) { // If original was null, set a default time (e.g., midnight or current)
      combined.setHours(0, 0, 0, 0);
    }
  } else if (partToUpdate === 'time') {
    combined.setHours(newValueFromPicker.getHours());
    combined.setMinutes(newValueFromPicker.getMinutes());
    combined.setSeconds(newValueFromPicker.getSeconds()); // Or 0
    combined.setMilliseconds(newValueFromPicker.getMilliseconds()); // Or 0
    if (!originalDateTime) { // If original was null, set a default date (e.g., today)
        const today = new Date();
        combined.setFullYear(today.getFullYear());
        combined.setMonth(today.getMonth());
        combined.setDate(today.getDate());
    }
  }
  return combined;
};

// Format date for HTML date input (YYYY-MM-DD)
export const formatDateForDateInput = (date: Date | null): string => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Format time for HTML time input (HH:MM)
export const formatTimeForTimeInput = (date: Date | null): string => {
  if (!date) return '';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

// Update only the date or time part of a Date object while preserving the other part
export const updateDateAndTime = (current: Date|null, newDate?: string, newTime?: string): Date|null => {
  // Return null if both newDate and newTime are empty/undefined
  if (!newDate && !newTime) {
    return null;
  }
  
  // Start with current Date or create a new one if null
  const result = current ? new Date(current) : new Date();
  
  // Update date part if provided
  if (newDate) {
    const [year, month, day] = newDate.split('-').map(Number);
    result.setFullYear(year, month - 1, day); // month is 0-indexed
  }
  
  // Update time part if provided
  if (newTime) {
    const [hours, minutes] = newTime.split(':').map(Number);
    result.setHours(hours, minutes, 0, 0); // Reset seconds/ms
  }
  
  return result;
};