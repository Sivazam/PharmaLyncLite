import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDU6FP7f8nv1Hni2XfI43OeQLzT3n7DEmE",
  authDomain: "pharmalync-collections.firebaseapp.com",
  projectId: "pharmalync-collections",
  storageBucket: "pharmalync-collections.firebasestorage.app",
  messagingSenderId: "325661884860",
  appId: "1:325661884860:web:9c583312604cc942c72bb9"
};

import { logger } from '@/lib/logger';

// Initialize Firebase with error handling
let app;
try {
  app = initializeApp(firebaseConfig);
  logger.success('Firebase initialized successfully');
} catch (error: any) {
  logger.error('Firebase initialization error', error);
  // If app already exists, use the existing one
  if (error?.code === 'app/duplicate-app') {
    app = initializeApp(firebaseConfig, 'secondary');
  } else {
    throw error;
  }
}

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Storage and get a reference to the service
export const storage = getStorage(app);

// Collection names
export const COLLECTIONS = {
  TENANTS: 'tenants',
  USERS: 'users',
  AREAS: 'areas',
  RETAILERS: 'retailers',
  INVOICES: 'invoices',
  PAYMENTS: 'payments',
  PAYMENT_EVENTS: 'paymentEvents',
  SUBSCRIPTIONS: 'subscriptions',
  CONFIG: 'config',
  OTPS: 'otps',
  MONTHLY_TARGETS: 'monthlyTargets'
} as const;

// User roles
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  WHOLESALER_ADMIN: 'WHOLESALER_ADMIN',
  LINE_WORKER: 'LINE_WORKER',
  RETAILER: 'RETAILER'
} as const;

// Payment states
export const PAYMENT_STATES = {
  INITIATED: 'INITIATED',
  OTP_SENT: 'OTP_SENT',
  OTP_VERIFIED: 'OTP_VERIFIED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED'
} as const;

// Payment methods
export const PAYMENT_METHODS = {
  CASH: 'CASH',
  UPI: 'UPI'
} as const;

// Invoice statuses
export const INVOICE_STATUSES = {
  OPEN: 'OPEN',
  PARTIAL: 'PARTIAL',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED'
} as const;

// Tenant statuses
export const TENANT_STATUSES = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED'
} as const;

export default app;