/**
 * Date Formatting Utility
 * Provides consistent DD/MM/YYYY date formatting across the application
 */

/**
 * Format date to DD/MM/YYYY
 * @param date - Date object, string, or timestamp
 * @returns Formatted date string in DD/MM/YYYY format
 */
export const formatDate = (date: Date | string | number | null | undefined): string => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Format date to DD/MM/YYYY HH:MM AM/PM
 * @param date - Date object, string, or timestamp
 * @returns Formatted datetime string
 */
export const formatDateTime = (date: Date | string | number | null | undefined): string => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    
    let hours = dateObj.getHours();
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    
    return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return 'Invalid Date';
  }
};

/**
 * Format date for SQL queries (YYYY-MM-DD)
 * @param date - Date object, string, or timestamp
 * @returns Formatted date string in SQL format
 */
export const formatDateForSQL = (date: Date | string | number): string => {
  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date provided');
  }
  
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Parse DD/MM/YYYY string to Date object
 * @param dateString - Date string in DD/MM/YYYY format
 * @returns Date object
 */
export const parseDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  
  const parts = dateString.split('/');
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
  const year = parseInt(parts[2], 10);
  
  const date = new Date(year, month, day);
  
  if (isNaN(date.getTime())) return null;
  
  return date;
};
