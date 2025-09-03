# 🏥 pHLynk (PharmaLync) - Simplified Payment Collection System

## 📋 **Project Overview**

pHLynk is a streamlined pharmaceutical supply chain payment collection system focused specifically on preventing money theft by line workers using OTP-based verification. The system provides a lean, lightweight solution for payment collection between wholesalers, line workers, and retailers.

## 🎯 **Core Focus**

- **Prevent Money Theft**: OTP-based payment verification eliminates cash handling disputes
- **Streamlined Process**: Focus solely on payment collection, no complex invoicing or outstanding management
- **Real-time SMS Notifications**: Instant confirmations using Fast2SMS service
- **Mobile-First**: Optimized for field operations by line workers

## 🏗️ **System Architecture**

### **User Roles (Simplified)**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   SUPER ADMIN   │    │ WHOLESALER ADMIN│    │   LINE WORKER   │
│                 │    │                 │    │                 │
│ • Creates      │    │ • Creates       │    │ • Collects      │
│   wholesalers  │    │   line workers  │    │   payments     │
│ • Manages       │    │ • Manages       │    │ • Verifies     │
│   subscriptions │    │   retailers     │    │   via OTP       │
│ • Monitors      │    │ • Tracks        │    │ • Views         │
│   activity      │    │   collections   │    │   history       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Key Changes from Original System**
- ❌ **Removed**: Retailer login/authentication
- ❌ **Removed**: Complex invoice management
- ❌ **Removed**: Outstanding amount tracking
- ❌ **Removed**: Real-time notifications (replaced with SMS)
- ✅ **Added**: Fast2SMS integration for OTP and confirmations
- ✅ **Added**: Simplified retailer profiles (no authentication)
- ✅ **Added**: Focus on payment collection only
- ✅ **Added**: Mobile-optimized line worker interface

## 🔄 **Payment Flow**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   LINE WORKER   │    │    RETAILER     │    │ WHOLESALER ADMIN│
│                 │    │                 │    │                 │
│ 1. Selects      │    │                 │    │                 │
│    retailer     │    │                 │    │                 │
│                 │    │                 │    │                 │
│ 2. Enters       │    │                 │    │                 │
│    amount       │    │                 │    │                 │
│                 │    │                 │    │                 │
│ 3. Sends OTP    │───►│ 4. Receives     │    │                 │
│    via SMS      │    │    OTP          │    │                 │
│                 │    │                 │    │                 │
│ 5. Verifies     │◄───┤ 6. Provides     │    │                 │
│    OTP          │    │    OTP          │    │                 │
│                 │    │                 │    │                 │
│ 7. Completes    │    │                 │    │                 │
│    payment      │    │                 │    │                 │
│                 │    │                 │    │                 │
│ 8. Sends        │───►│ 9. Gets SMS     │    │                 │
│    confirmation │    │    confirmation │    │                 │
│                 │    │                 │    │                 │
│ 10. Sends       │    │                 │◄───│ 11. Gets SMS    │
│    confirmation │    │                 │    │    confirmation │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📱 **Dashboard Features**

### **Super Admin Dashboard**
- **Wholesaler Management**: Create, activate/deactivate wholesaler accounts
- **Subscription Tracking**: Monitor subscription status and expiry dates
- **Line Worker Overview**: View all line workers and their assigned wholesalers
- **Activity Monitoring**: Track system-wide activities and events
- **Simple Interface**: Clean, focused interface without complex metrics

### **Wholesaler Admin Dashboard**
- **Team Management**: Create and manage line worker accounts
- **Retailer Profiles**: Add retailer profiles (store name, phone, area)
- **Collection Tracking**: View daily/weekly collection reports
- **Performance Analytics**: Line worker performance metrics
- **Export Reports**: Download collection reports in Excel format

### **Line Worker Dashboard**
- **Modern UX**: Clean, mobile-optimized interface
- **Retailer Search**: Search retailers by name or area
- **Quick Selection**: Visual retailer cards with quick actions
- **Amount Entry**: Custom amount with quick suggestions (₹500, ₹1000, ₹1500, etc.)
- **OTP Management**: Integrated OTP sending and verification
- **Collection History**: Personal payment collection history
- **Performance Stats**: Today, this week, this month collections

## 🔧 **Technical Implementation**

### **Technology Stack**
- **Frontend**: Next.js 15, TypeScript, shadcn/ui, Tailwind CSS
- **Backend**: Next.js API routes, Firebase Firestore
- **Authentication**: Firebase Authentication (email/password)
- **SMS Service**: Fast2SMS integration
- **Database**: Firebase Firestore (simplified schema)

### **Key Services**
- **Fast2SMS Service**: OTP generation and SMS notifications
- **User Management**: Role-based access control
- **Payment Processing**: OTP-based verification system
- **Data Collection**: Simplified payment tracking

### **SMS Templates (DLT Compliant)**

#### **OTP Template**
```
Your OTP is {OTP}. As per your request {LineWorkerName} Line worker collecting {Amount} Amount behalf of {WholesalerName} wholesaler. IF you wish to Make this payment - Your OTP is {OTP}
```

#### **Retailer Confirmation**
```
You payment of {Amount} is successfully paid to {LineWorkerName} line worker of {WholesalerName} Wholesaler.
```

#### **Wholesaler Confirmation**
```
Your {LineWorkerName} Line worker collected {Amount} amount from {RetailerName} retailer. Payment status successful.
```

## 🚀 **Getting Started**

### **Prerequisites**
- Node.js 18+ installed
- Firebase project with Firestore database
- Fast2SMS API credentials (for production)

### **Installation**
```bash
# Clone the repository
git clone <repository-url>
cd pharmalync

# Install dependencies
npm install

# Configure Firebase
# Update src/lib/firebase.ts with your Firebase config

# Configure Fast2SMS (optional for development)
# Set environment variables for Fast2SMS API

# Start development server
npm run dev
```

### **Environment Variables**
```bash
# Firebase Configuration (Updated)
FIREBASE_API_KEY=AIzaSyDU6FP7f8nv1Hni2XfI43OeQLzT3n7DEmE
FIREBASE_AUTH_DOMAIN=pharmalync-collections.firebaseapp.com
FIREBASE_PROJECT_ID=pharmalync-collections
FIREBASE_STORAGE_BUCKET=pharmalync-collections.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=325661884860
FIREBASE_APP_ID=1:325661884860:web:9c583312604cc942c72bb9

# Fast2SMS Configuration (Optional for development)
FAST2SMS_API_KEY=your_fast2sms_api_key_here
```

## 📊 **Data Schema**

### **Simplified Collections**
- **tenants**: Wholesaler accounts with subscription info
- **users**: Super admin, wholesaler admin, line worker accounts
- **retailers**: Retailer profiles (no authentication)
- **payments**: Payment collection records with OTP verification

### **Key Fields**
- **Mobile Numbers**: Collected for all roles (wholesaler, line worker, retailer)
- **Area Information**: Used for retailer search and filtering
- **OTP Tracking**: Integrated into payment documents
- **Status Tracking**: Simple active/inactive status management

## 🎨 **UI/UX Features**

### **Design Principles**
- **Mobile-First**: Optimized for field use on mobile devices
- **Clean Interface**: Remove clutter, focus on essential actions
- **Visual Feedback**: Clear status indicators and confirmation messages
- **Quick Actions**: Fast access to common tasks

### **Key Components**
- **Searchable Retailer Lists**: Find retailers quickly by name or area
- **Amount Suggestions**: Quick amount selection buttons
- **OTP Flow**: Integrated OTP sending and verification
- **Collection Stats**: Simple performance metrics
- **Export Functionality**: Download reports for wholesalers

## 🔒 **Security Features**

### **OTP Verification**
- 6-digit OTP generation
- 10-minute expiration (configurable)
- SMS delivery via Fast2SMS
- Development mode simulation

### **Access Control**
- Role-based navigation
- Tenant data isolation
- Active/inactive status management
- Secure payment processing

## 📈 **Scalability**

### **Current Capacity**
- **50 Wholesalers** (tenants)
- **1,000 Retailers** (profiles)
- **250 Line Workers**
- **~5,000 Transactions/month**

### **Performance Optimizations**
- Simplified data queries
- Reduced real-time updates
- Mobile-optimized interfaces
- Efficient payment processing

## 🚨 **Important Notes**

### **Development vs Production**
- **Development**: OTP displayed in console logs
- **Production**: Real SMS via Fast2SMS
- **Testing**: Use simulation mode for development

### **Data Migration**
- Existing dashboards preserved but hidden from navigation
- New simplified dashboards use existing Firebase schema
- No data loss during transition

### **Future Enhancements**
- Offline support for line workers
- Advanced reporting features
- Multi-currency support
- Integration with accounting systems

## 🤝 **Support**

For support and questions:
- Review the existing codebase for original functionality
- Check Firebase documentation for database setup
- Contact Fast2SMS for SMS integration support

---

## ✅ **Summary**

This simplified version of pHLynk focuses specifically on:
- **Preventing money theft** through OTP verification
- **Streamlined payment collection** without complex invoicing
- **Mobile-optimized experience** for line workers
- **Real-time SMS notifications** for all parties
- **Clean, modern interface** with essential features only

The system maintains the robust backend infrastructure while providing a focused solution for the core business problem.