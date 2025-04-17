/**
 * Formats a date string into a more readable format
 * @param dateString The date string to format
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString || 'N/A';
    }
  }
  
  /**
   * Formats a price number into a currency string
   * @param price The price to format
   * @param currency The currency symbol to use (default: $)
   * @returns Formatted price string
   */
  export function formatPrice(price: number, currency: string = '$'): string {
    try {
      return `${currency}${price.toFixed(2)}`;
    } catch (error) {
      console.error('Error formatting price:', error);
      return `${currency}0.00`;
    }
  }
  
  /**
   * Validates a credit card number using the Luhn algorithm
   * @param cardNumber The credit card number to validate
   * @returns True if valid, false otherwise
   */
  export function validateCreditCard(cardNumber: string): boolean {
    // Remove any non-digit characters
    const digitsOnly = cardNumber.replace(/\D/g, '');
    
    if (digitsOnly.length < 13 || digitsOnly.length > 19) {
      return false;
    }
    
    // Luhn algorithm for credit card validation
    let sum = 0;
    let shouldDouble = false;
    
    // Loop through digits in reverse order
    for (let i = digitsOnly.length - 1; i >= 0; i--) {
      let digit = parseInt(digitsOnly.charAt(i));
      
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    
    return (sum % 10) === 0;
  }
  
  /**
   * Validates an expiration date in the format MM/YY
   * @param expDate The expiration date to validate
   * @returns True if valid, false otherwise
   */
  export function validateExpDate(expDate: string): boolean {
    // Check format
    if (!/^\d{2}\/\d{2}$/.test(expDate)) {
      return false;
    }
    
    const [monthStr, yearStr] = expDate.split('/');
    const month = parseInt(monthStr, 10);
    const year = 2000 + parseInt(yearStr, 10); // Convert YY to 20YY
    
    // Check if month is valid
    if (month < 1 || month > 12) {
      return false;
    }
    
    // Get current date for comparison
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    
    // Check if the card is not expired
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      return false;
    }
    
    return true;
  }