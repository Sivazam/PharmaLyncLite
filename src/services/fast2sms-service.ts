import { logger } from '@/lib/logger';

// Fast2SMS Service for OTP and SMS notifications
export class Fast2SMSService {
  private static instance: Fast2SMSService;
  private apiKey: string | null = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): Fast2SMSService {
    if (!Fast2SMSService.instance) {
      Fast2SMSService.instance = new Fast2SMSService();
    }
    return Fast2SMSService.instance;
  }

  // Initialize Fast2SMS with API key
  initialize(apiKey: string) {
    this.apiKey = apiKey;
    this.initialized = true;
    logger.info('Fast2SMS service initialized', { context: 'Fast2SMSService' });
  }

  // Generate 6-digit OTP
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send OTP to retailer for payment verification
  async sendPaymentOTP(
    phoneNumber: string,
    otp: string,
    amount: number,
    lineWorkerName: string,
    wholesalerName: string
  ): Promise<boolean> {
    if (!this.initialized || !this.apiKey) {
      logger.error('Fast2SMS not initialized', { context: 'Fast2SMSService' });
      return false;
    }

    // DLT compliant OTP template
    const message = `Your OTP is ${otp}. As per your request ${lineWorkerName} Line worker collecting ${amount} Amount behalf of ${wholesalerName} wholesaler. IF you wish to Make this payment - Your OTP is ${otp}`;

    try {
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.apiKey,
        },
        body: JSON.stringify({
          route: 'q',
          message: message,
          language: 'english',
          numbers: phoneNumber,
          flash: 0,
        }),
      });

      const result = await response.json();
      
      if (result.return === true) {
        logger.info('OTP sent successfully', { 
          phoneNumber, 
          amount, 
          lineWorkerName,
          wholesalerName,
          context: 'Fast2SMSService' 
        });
        return true;
      } else {
        logger.error('Failed to send OTP', { 
          phoneNumber, 
          error: result,
          context: 'Fast2SMSService' 
        });
        return false;
      }
    } catch (error) {
      logger.error('Error sending OTP', { 
        phoneNumber, 
        error,
        context: 'Fast2SMSService' 
      });
      return false;
    }
  }

  // Send payment confirmation to retailer
  async sendRetailerConfirmation(
    phoneNumber: string,
    amount: number,
    lineWorkerName: string,
    wholesalerName: string
  ): Promise<boolean> {
    if (!this.initialized || !this.apiKey) {
      logger.error('Fast2SMS not initialized', { context: 'Fast2SMSService' });
      return false;
    }

    // DLT compliant confirmation template
    const message = `You payment of ${amount} is successfully paid to ${lineWorkerName} line worker of ${wholesalerName} Wholesaler.`;

    try {
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.apiKey,
        },
        body: JSON.stringify({
          route: 'q',
          message: message,
          language: 'english',
          numbers: phoneNumber,
          flash: 0,
        }),
      });

      const result = await response.json();
      
      if (result.return === true) {
        logger.info('Retailer confirmation sent successfully', { 
          phoneNumber, 
          amount, 
          lineWorkerName,
          wholesalerName,
          context: 'Fast2SMSService' 
        });
        return true;
      } else {
        logger.error('Failed to send retailer confirmation', { 
          phoneNumber, 
          error: result,
          context: 'Fast2SMSService' 
        });
        return false;
      }
    } catch (error) {
      logger.error('Error sending retailer confirmation', { 
        phoneNumber, 
        error,
        context: 'Fast2SMSService' 
      });
      return false;
    }
  }

  // Send payment confirmation to wholesaler
  async sendWholesalerConfirmation(
    phoneNumber: string,
    lineWorkerName: string,
    amount: number,
    retailerName: string
  ): Promise<boolean> {
    if (!this.initialized || !this.apiKey) {
      logger.error('Fast2SMS not initialized', { context: 'Fast2SMSService' });
      return false;
    }

    // DLT compliant confirmation template
    const message = `Your ${lineWorkerName} Line worker collected ${amount} amount from ${retailerName} retailer. Payment status successful.`;

    try {
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.apiKey,
        },
        body: JSON.stringify({
          route: 'q',
          message: message,
          language: 'english',
          numbers: phoneNumber,
          flash: 0,
        }),
      });

      const result = await response.json();
      
      if (result.return === true) {
        logger.info('Wholesaler confirmation sent successfully', { 
          phoneNumber, 
          lineWorkerName,
          amount,
          retailerName,
          context: 'Fast2SMSService' 
        });
        return true;
      } else {
        logger.error('Failed to send wholesaler confirmation', { 
          phoneNumber, 
          error: result,
          context: 'Fast2SMSService' 
        });
        return false;
      }
    } catch (error) {
      logger.error('Error sending wholesaler confirmation', { 
        phoneNumber, 
        error,
        context: 'Fast2SMSService' 
      });
      return false;
    }
  }

  // Development mode - simulate SMS sending (logs to console)
  async simulateSMSSending(
    type: 'OTP' | 'RETAILER_CONFIRMATION' | 'WHOLESALER_CONFIRMATION',
    phoneNumber: string,
    data: any
  ): Promise<void> {
    const messages = {
      OTP: `OTP: ${data.otp} - ${data.lineWorkerName} collecting ${data.amount} from behalf of ${data.wholesalerName}`,
      RETAILER_CONFIRMATION: `Payment of ${data.amount} successful to ${data.lineWorkerName} of ${data.wholesalerName}`,
      WHOLESALER_CONFIRMATION: `${data.lineWorkerName} collected ${data.amount} from ${data.retailerName}`
    };

    console.log(`📱 [SIMULATED SMS - ${type}] To: ${phoneNumber}`);
    console.log(`📱 Message: ${messages[type]}`);
    console.log(`📱 Data:`, data);
  }
}

// Export singleton instance
export const fast2SMSService = Fast2SMSService.getInstance();