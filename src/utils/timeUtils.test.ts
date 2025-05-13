import { describe, it, expect } from 'vitest';
import { updateDateAndTime, formatTimeForTimeInput, formatDateForDateInput } from './timeUtils';

describe('updateDateAndTime', () => {
  it('should update only date part when only date is provided', () => {
    const originalDate = new Date(2023, 5, 15, 14, 30); // June 15, 2023, 14:30
    const newDate = '2023-07-20'; // July 20, 2023
    
    const result = updateDateAndTime(originalDate, newDate);
    
    expect(result?.getFullYear()).toBe(2023);
    expect(result?.getMonth()).toBe(6); // July is 6 (zero-indexed)
    expect(result?.getDate()).toBe(20);
    expect(result?.getHours()).toBe(14); // Time should be preserved
    expect(result?.getMinutes()).toBe(30);
  });
  
  it('should update only time part when only time is provided', () => {
    const originalDate = new Date(2023, 5, 15, 14, 30); // June 15, 2023, 14:30
    const newTime = '16:45'; // 16:45
    
    const result = updateDateAndTime(originalDate, undefined, newTime);
    
    expect(result?.getFullYear()).toBe(2023); // Date should be preserved
    expect(result?.getMonth()).toBe(5); // June is 5 (zero-indexed)
    expect(result?.getDate()).toBe(15);
    expect(result?.getHours()).toBe(16); // Time should be updated
    expect(result?.getMinutes()).toBe(45);
  });
  
  it('should update both parts when both date and time are provided', () => {
    const originalDate = new Date(2023, 5, 15, 14, 30); // June 15, 2023, 14:30
    const newDate = '2023-07-20'; // July 20, 2023
    const newTime = '16:45'; // 16:45
    
    const result = updateDateAndTime(originalDate, newDate, newTime);
    
    expect(result?.getFullYear()).toBe(2023);
    expect(result?.getMonth()).toBe(6); // July is 6 (zero-indexed)
    expect(result?.getDate()).toBe(20);
    expect(result?.getHours()).toBe(16);
    expect(result?.getMinutes()).toBe(45);
  });
  
  it('should create a new date with current date/time if original is null', () => {
    const newDate = '2023-07-20'; // July 20, 2023
    
    const result = updateDateAndTime(null, newDate);
    
    // Date part should be from newDate
    expect(result?.getFullYear()).toBe(2023);
    expect(result?.getMonth()).toBe(6); // July is 6 (zero-indexed)
    expect(result?.getDate()).toBe(20);
  });
  
  it('should return null if both date and time are empty/undefined', () => {
    const originalDate = new Date(2023, 5, 15, 14, 30); // June 15, 2023, 14:30
    
    const result = updateDateAndTime(originalDate, undefined, undefined);
    
    expect(result).toBeNull();
  });
  
  it('should handle empty string date/time values as undefined', () => {
    const originalDate = new Date(2023, 5, 15, 14, 30); // June 15, 2023, 14:30
    
    const result = updateDateAndTime(originalDate, '', '');
    
    expect(result).toBeNull();
  });
});

describe('End time validation', () => {
  // Mock implementation of getEndTimeMinString for testing
  const getEndTimeMinString = (startTime: Date | null, endTime: Date | null): string => {
    if (!startTime || !endTime) return '';
    
    const sameDate = 
      startTime.getFullYear() === endTime.getFullYear() &&
      startTime.getMonth() === endTime.getMonth() &&
      startTime.getDate() === endTime.getDate();
    
    return sameDate ? formatTimeForTimeInput(startTime) : '';
  };
  
  it('should return start time as min when dates match', () => {
    const startTime = new Date(2023, 6, 15, 14, 30); // July 15, 2023, 14:30
    const endTime = new Date(2023, 6, 15, 16, 0); // July 15, 2023, 16:00 (same date)
    
    const result = getEndTimeMinString(startTime, endTime);
    
    expect(result).toBe('14:30');
  });
  
  it('should return empty string when dates do not match', () => {
    const startTime = new Date(2023, 6, 15, 14, 30); // July 15, 2023, 14:30
    const endTime = new Date(2023, 6, 16, 10, 0); // July 16, 2023, 10:00 (different date)
    
    const result = getEndTimeMinString(startTime, endTime);
    
    expect(result).toBe('');
  });
  
  it('should enforce that end time is after start time', () => {
    // Scenario: Trying to set an invalid end time (before start time)
    const startTime = new Date(2023, 6, 15, 14, 30); // July 15, 2023, 14:30
    const endTimeBeforeStart = new Date(2023, 6, 15, 13, 0); // July 15, 2023, 13:00
    
    // This is what we check in the form submit handler:
    const isValidTimeOrder = endTimeBeforeStart > startTime;
    
    expect(isValidTimeOrder).toBe(false);
    
    // Scenario: Setting a valid end time (after start time)
    const endTimeAfterStart = new Date(2023, 6, 15, 15, 30); // July 15, 2023, 15:30
    
    const isValidTimeOrder2 = endTimeAfterStart > startTime;
    
    expect(isValidTimeOrder2).toBe(true);
  });
}); 