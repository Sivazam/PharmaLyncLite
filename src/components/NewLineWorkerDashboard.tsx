'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardNavigation, NavItem, NotificationItem } from '@/components/DashboardNavigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, query, where, orderBy, getDoc, limit } from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/firebase';
import { fast2SMSService } from '@/services/fast2sms-service';
import { logger } from '@/lib/logger';
import { 
  Store, 
  DollarSign, 
  Search, 
  Phone, 
  MapPin, 
  Calendar,
  TrendingUp,
  Plus,
  ArrowRight,
  CheckCircle,
  Clock,
  Smartphone,
  User,
  Building2,
  LayoutDashboard,
  BarChart3,
  Settings,
  CreditCard,
  Target,
  PieChart,
  CheckCircle as CheckCircleIcon,
  AlertTriangle,
  Bell,
  FileText,
  Activity,
  Trophy,
  Star,
  Zap
} from 'lucide-react';
import { formatTimestamp, formatCurrency } from '@/lib/timestamp-utils';
import { motion } from 'framer-motion';

interface Retailer {
  id: string;
  name: string;
  phone: string;
  area: string;
  address?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

interface Payment {
  id: string;
  retailerId: string;
  retailerName: string;
  amount: number;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  timestamp: any;
  otp?: string;
}

interface CollectionStats {
  today: number;
  thisWeek: number;
  thisMonth: number;
  todayCount: number;
  thisWeekCount: number;
  thisMonthCount: number;
}

export function NewLineWorkerDashboard() {
  const { user, logout } = useAuth();
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRetailer, setSelectedRetailer] = useState<Retailer | null>(null);
  const [showAmountEntry, setShowAmountEntry] = useState(false);
  const [showOTPScreen, setShowOTPScreen] = useState(false);
  const [collectionAmount, setCollectionAmount] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [enteredOTP, setEnteredOTP] = useState('');
  const [currentPayment, setCurrentPayment] = useState<{
    retailerId: string;
    retailerName: string;
    amount: number;
  } | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Navigation state
  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'retailers', label: 'Retailers', icon: Store },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];
  const [activeNav, setActiveNav] = useState('overview');

  // Amount suggestions
  const amountSuggestions = [500, 1000, 1500, 2000, 5000];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!user?.tenantId) return;
    
    try {
      setLoading(true);
      
      // Fetch retailers
      const retailersQuery = query(
        collection(db, 'retailers'),
        where('tenantId', '==', user.tenantId),
        where('active', '==', true)
      );
      const retailersSnapshot = await getDocs(retailersQuery);
      const retailersData: Retailer[] = [];
      
      for (const doc of retailersSnapshot.docs) {
        const data = doc.data();
        retailersData.push({
          id: doc.id,
          name: data.name,
          phone: data.phone,
          area: data.area || 'Not specified',
          address: data.address,
          status: data.active !== false ? 'ACTIVE' : 'INACTIVE'
        });
      }
      
      setRetailers(retailersData);
      
      // Fetch my payments
      const paymentsQuery = query(
        collection(db, COLLECTIONS.PAYMENTS),
        where('tenantId', '==', user.tenantId),
        where('lineWorkerId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const paymentsData: Payment[] = [];
      
      for (const doc of paymentsSnapshot.docs) {
        const data = doc.data();
        paymentsData.push({
          id: doc.id,
          retailerId: data.retailerId,
          retailerName: data.retailerName,
          amount: data.totalPaid,
          status: data.state,
          timestamp: data.createdAt,
          otp: data.otp?.hash
        });
      }
      
      setPayments(paymentsData);
      
    } catch (error) {
      logger.error('Error fetching dashboard data', error, { context: 'NewLineWorkerDashboard' });
    } finally {
      setLoading(false);
    }
  };

  const getCollectionStats = (): CollectionStats => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const todayPayments = payments.filter(p => {
      const paymentDate = p.timestamp.toDate();
      return paymentDate >= today && p.status === 'COMPLETED';
    });

    const weekPayments = payments.filter(p => {
      const paymentDate = p.timestamp.toDate();
      return paymentDate >= weekAgo && p.status === 'COMPLETED';
    });

    const monthPayments = payments.filter(p => {
      const paymentDate = p.timestamp.toDate();
      return paymentDate >= monthAgo && p.status === 'COMPLETED';
    });

    return {
      today: todayPayments.reduce((sum, p) => sum + p.amount, 0),
      thisWeek: weekPayments.reduce((sum, p) => sum + p.amount, 0),
      thisMonth: monthPayments.reduce((sum, p) => sum + p.amount, 0),
      todayCount: todayPayments.length,
      thisWeekCount: weekPayments.length,
      thisMonthCount: monthPayments.length
    };
  };

  const stats = getCollectionStats();

  const filteredRetailers = retailers.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.area.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRetailerSelect = (retailer: Retailer) => {
    setSelectedRetailer(retailer);
    setShowAmountEntry(true);
  };

  const handleSendOTP = async () => {
    if (!selectedRetailer || !collectionAmount || !user?.tenantId) return;

    try {
      const amount = parseFloat(collectionAmount);
      if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount');
        return;
      }

      // Generate OTP
      const otp = fast2SMSService.generateOTP();
      setGeneratedOTP(otp);

      // Get wholesaler details
      const tenantDoc = await getDoc(doc(db, COLLECTIONS.TENANTS, user.tenantId));
      const wholesalerName = tenantDoc.exists() ? tenantDoc.data().name : 'Unknown Wholesaler';

      // Send OTP via Fast2SMS (or simulate in development)
      const otpSent = await fast2SMSService.sendPaymentOTP(
        selectedRetailer.phone,
        otp,
        amount,
        user.displayName || 'Line Worker',
        wholesalerName
      );

      if (!otpSent) {
        // Simulate SMS sending in development
        await fast2SMSService.simulateSMSSending('OTP', selectedRetailer.phone, {
          otp,
          amount,
          lineWorkerName: user.displayName || 'Line Worker',
          wholesalerName
        });
      }

      setCurrentPayment({
        retailerId: selectedRetailer.id,
        retailerName: selectedRetailer.name,
        amount
      });

      setShowAmountEntry(false);
      setShowOTPScreen(true);

    } catch (error) {
      logger.error('Error sending OTP', error, { context: 'NewLineWorkerDashboard' });
      alert('Failed to send OTP. Please try again.');
    }
  };

  const handleVerifyOTP = async () => {
    if (!currentPayment || !enteredOTP || !user?.tenantId) return;

    try {
      if (enteredOTP === generatedOTP) {
        // OTP verified - create payment record
        const paymentData = {
          tenantId: user.tenantId,
          retailerId: currentPayment.retailerId,
          retailerName: currentPayment.retailerName,
          lineWorkerId: user.uid,
          lineWorkerName: user.displayName,
          totalPaid: currentPayment.amount,
          method: 'CASH',
          state: 'COMPLETED',
          timeline: {
            initiatedAt: new Date(),
            otpSentAt: new Date(),
            verifiedAt: new Date(),
            completedAt: new Date()
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const paymentRef = await addDoc(collection(db, COLLECTIONS.PAYMENTS), paymentData);

        // Get wholesaler details for confirmation SMS
        const tenantDoc = await getDoc(doc(db, COLLECTIONS.TENANTS, user.tenantId));
        const wholesalerData = tenantDoc.data();
        const wholesalerPhone = wholesalerData?.adminPhone;
        const wholesalerName = wholesalerData?.name || 'Unknown Wholesaler';

        // Send confirmation to retailer
        await fast2SMSService.sendRetailerConfirmation(
          selectedRetailer!.phone,
          currentPayment.amount,
          user.displayName || 'Line Worker',
          wholesalerName
        );

        // Send confirmation to wholesaler
        if (wholesalerPhone) {
          await fast2SMSService.sendWholesalerConfirmation(
            wholesalerPhone,
            user.displayName || 'Line Worker',
            currentPayment.amount,
            currentPayment.retailerName
          );
        }

        // Reset states
        setShowOTPScreen(false);
        setSelectedRetailer(null);
        setCollectionAmount('');
        setEnteredOTP('');
        setCurrentPayment(null);
        setGeneratedOTP('');

        // Refresh data
        fetchData();

        alert('Payment completed successfully!');

      } else {
        alert('Invalid OTP. Please try again.');
      }
    } catch (error) {
      logger.error('Error verifying OTP', error, { context: 'NewLineWorkerDashboard' });
      alert('Failed to complete payment. Please try again.');
    }
  };

  const handleAmountSuggestion = (amount: number) => {
    setCollectionAmount(amount.toString());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col dashboard-screen">
      {/* Navigation */}
      <DashboardNavigation
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        navItems={navItems}
        title="PharmaLync"
        subtitle="Line Worker Dashboard"
        notificationCount={notificationCount}
        notifications={notifications}
        user={user ? { displayName: user.displayName, email: user.email } : undefined}
        onLogout={logout}
      />

      {/* Main Content */}
      <main className="flex-1 pt-16 p-3 sm:p-4 lg:p-6 overflow-y-auto pb-20 lg:pb-6">
        <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Line Worker Dashboard</h1>
            <p className="text-gray-600 mt-1">Collect payments from retailers using OTP verification</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Collection</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.today)}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.todayCount} transactions
                </p>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.thisWeek)}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.thisWeekCount} transactions
                </p>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.thisMonth)}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.thisMonthCount} transactions
                </p>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Retailers</CardTitle>
                <Store className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{retailers.length}</div>
                <p className="text-xs text-muted-foreground">
                  Ready for collection
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Retailer Selection */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Select Retailer</CardTitle>
                <CardDescription>Choose a retailer to collect payment from</CardDescription>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by store name or area..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredRetailers.map((retailer) => (
                    <Card 
                      key={retailer.id} 
                      className={`cursor-pointer transition-all duration-200 hover:shadow-md border-2 ${
                        selectedRetailer?.id === retailer.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                      onClick={() => handleRetailerSelect(retailer)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{retailer.name}</h3>
                            <div className="flex items-center mt-1 text-sm text-gray-600">
                              <Phone className="h-3 w-3 mr-1" />
                              {retailer.phone}
                            </div>
                            <div className="flex items-center mt-1 text-sm text-gray-600">
                              <MapPin className="h-3 w-3 mr-1" />
                              {retailer.area}
                            </div>
                          </div>
                          <Badge variant={retailer.status === 'ACTIVE' ? 'default' : 'secondary'}>
                            {retailer.status}
                          </Badge>
                        </div>
                        <div className="mt-3">
                          <Button size="sm" className="w-full">
                            Collect Payment
                            <ArrowRight className="h-3 w-3 ml-2" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {filteredRetailers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Store className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No retailers found matching your search.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Frequently used features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Smartphone className="h-4 w-4 mr-2" />
                  Send Bulk SMS
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  View Schedule
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <User className="h-4 w-4 mr-2" />
                  My Profile
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Building2 className="h-4 w-4 mr-2" />
                  Wholesaler Info
                </Button>
              </CardContent>
            </Card>

            {/* Recent Collections */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Recent Collections</CardTitle>
                <CardDescription>Your latest payment collections</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payments.slice(0, 5).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{payment.retailerName}</p>
                        <p className="text-xs text-gray-500">{formatTimestamp(payment.timestamp)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(payment.amount)}</p>
                        <Badge variant={payment.status === 'COMPLETED' ? 'default' : 'secondary'} className="text-xs">
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  
                  {payments.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <DollarSign className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No collections yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>All your payment collections</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Retailer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatTimestamp(payment.timestamp)}</TableCell>
                    <TableCell>{payment.retailerName}</TableCell>
                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={payment.status === 'COMPLETED' ? 'default' : 'secondary'}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Amount Entry Dialog */}
      <Dialog open={showAmountEntry} onOpenChange={setShowAmountEntry}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Collection Amount</DialogTitle>
            <DialogDescription>
              Collecting payment from {selectedRetailer?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                value={collectionAmount}
                onChange={(e) => setCollectionAmount(e.target.value)}
                placeholder="Enter amount"
                className="text-lg"
              />
            </div>
            
            <div>
              <Label className="text-sm text-gray-600">Quick Suggestions</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {amountSuggestions.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAmountSuggestion(amount)}
                    className="text-sm"
                  >
                    ₹{amount}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setShowAmountEntry(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSendOTP} className="flex-1">
                Send OTP
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* OTP Entry Dialog */}
      <Dialog open={showOTPScreen} onOpenChange={setShowOTPScreen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter OTP</DialogTitle>
            <DialogDescription>
              Enter the 6-digit OTP sent to {selectedRetailer?.phone}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="otp">6-Digit OTP</Label>
              <Input
                id="otp"
                type="text"
                maxLength={6}
                value={enteredOTP}
                onChange={(e) => setEnteredOTP(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter OTP"
                className="text-center text-lg tracking-widest"
              />
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Collecting ₹{currentPayment?.amount} from {currentPayment?.retailerName}
              </p>
            </div>
            
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setShowOTPScreen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleVerifyOTP} className="flex-1">
                Complete Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Navigation-based content for missing screens */}
      <div className="space-y-6">
        {activeNav === 'payments' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Header */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Payment History</h2>
              <p className="text-gray-600">View your complete payment collection history</p>
            </div>

            {/* Payment Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(stats.thisMonth)}</div>
                    <p className="text-xs text-muted-foreground">
                      This month
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                    <CheckCircleIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">100%</div>
                    <p className="text-xs text-muted-foreground">
                      All payments successful
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Amount</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {payments.length > 0 ? formatCurrency(payments.reduce((sum, p) => sum + p.amount, 0) / payments.length) : '₹0'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Per transaction
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Today's Goal</CardTitle>
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₹5,000</div>
                    <p className="text-xs text-muted-foreground">
                      Daily target
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Payment History */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
                <CardDescription>Your latest payment collection activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {payments.map((payment, index) => (
                    <motion.div
                      key={payment.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">{payment.retailerName}</p>
                          <p className="text-sm text-gray-500">
                            {formatTimestamp(payment.timestamp)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg">{formatCurrency(payment.amount)}</p>
                        <Badge variant="default" className="text-xs">
                          Completed
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                  
                  {payments.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="text-center py-8"
                    >
                      <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">No payment history yet</p>
                      <p className="text-sm text-gray-400">Start collecting payments to see your history here</p>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeNav === 'analytics' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Header */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Performance Analytics</h2>
              <p className="text-gray-600">Track your collection performance and achievements</p>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Today's Score</CardTitle>
                    <Star className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Math.min(100, Math.round((stats.today / 5000) * 100))}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Daily goal progress
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Week Streak</CardTitle>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{Math.floor(Math.random() * 7) + 1}</div>
                    <p className="text-xs text-muted-foreground">
                      Consecutive days
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Retailers</CardTitle>
                    <Store className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{retailers.length}</div>
                    <p className="text-xs text-muted-foreground">
                      In your area
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Efficiency</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">A+</div>
                    <p className="text-xs text-muted-foreground">
                      Performance grade
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Achievements */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Trophy className="h-5 w-5" />
                    <span>Achievements</span>
                  </CardTitle>
                  <CardDescription>Your recent accomplishments and milestones</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 }}
                      className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200"
                    >
                      <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Star className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-yellow-800">First Collection</h3>
                      <p className="text-sm text-yellow-600">Completed your first payment</p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.7 }}
                      className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200"
                    >
                      <div className="w-12 h-12 bg-blue-400 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Zap className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-blue-800">Speed Demon</h3>
                      <p className="text-sm text-blue-600">5 collections in one day</p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8 }}
                      className="text-center p-4 bg-green-50 rounded-lg border border-green-200 opacity-50"
                    >
                      <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Trophy className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-600">Top Performer</h3>
                      <p className="text-sm text-gray-500">Collect ₹50,000 in a month</p>
                      <Badge variant="secondary" className="mt-2">Locked</Badge>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Performance Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Performance</CardTitle>
                  <CardDescription>Your collection trends over the past week</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-500">Performance Chart</p>
                      <p className="text-sm text-gray-400">Interactive chart coming soon</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {activeNav === 'settings' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Header */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Worker Settings</h2>
              <p className="text-gray-600">Manage your profile and preferences</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Settings */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-2 space-y-6"
              >
                {/* Profile Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="h-5 w-5" />
                      <span>Profile Information</span>
                    </CardTitle>
                    <CardDescription>Manage your personal details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <Label className="text-base font-medium">Full Name</Label>
                        <p className="text-sm text-gray-500">{user?.displayName || 'Not set'}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <Label className="text-base font-medium">Email</Label>
                        <p className="text-sm text-gray-500">{user?.email || 'Not set'}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <Label className="text-base font-medium">Phone</Label>
                        <p className="text-sm text-gray-500">Not set</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Add
                      </Button>
                    </motion.div>
                  </CardContent>
                </Card>

                {/* Collection Preferences */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <CreditCard className="h-5 w-5" />
                      <span>Collection Preferences</span>
                    </CardTitle>
                    <CardDescription>Customize your payment collection experience</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <Label className="text-base font-medium">Default Amount</Label>
                        <p className="text-sm text-gray-500">Quick amount suggestions</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">₹1,000</span>
                        <Button variant="outline" size="sm">
                          Change
                        </Button>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <Label className="text-base font-medium">SMS Notifications</Label>
                        <p className="text-sm text-gray-500">Get SMS confirmations</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Configure
                      </Button>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <Label className="text-base font-medium">Area Focus</Label>
                        <p className="text-sm text-gray-500">Prioritize nearby retailers</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Configure
                      </Button>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Quick Actions Panel */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-6"
              >
                {/* Worker Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Activity className="h-5 w-5" />
                      <span>Your Status</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Account Status</span>
                        <Badge variant="default">Active</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Today's Progress</span>
                        <Badge variant="secondary">
                          {Math.min(100, Math.round((stats.today / 5000) * 100))}%
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Retailers Covered</span>
                        <Badge variant="outline">
                          {Math.min(retailers.length, 10)}/{retailers.length}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Week Streak</span>
                        <Badge variant="default">{Math.floor(Math.random() * 7) + 1} days</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <Button variant="outline" className="w-full justify-start">
                        <FileText className="h-4 w-4 mr-2" />
                        My Report
                      </Button>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Button variant="outline" className="w-full justify-start">
                        <Bell className="h-4 w-4 mr-2" />
                        Notifications
                      </Button>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <Button variant="outline" className="w-full justify-start">
                        <Download className="h-4 w-4 mr-2" />
                        Download Data
                      </Button>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      <Button variant="outline" className="w-full justify-start">
                        <Smartphone className="h-4 w-4 mr-2" />
                        Test SMS
                      </Button>
                    </motion.div>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {payments.slice(0, 3).map((payment, index) => (
                        <motion.div
                          key={payment.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.7 + index * 0.1 }}
                          className="flex items-start space-x-2"
                        >
                          <CreditCard className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-gray-600 truncate">
                              Collected {formatCurrency(payment.amount)} from {payment.retailerName}
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatTimestamp(payment.timestamp)}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                      
                      {payments.length === 0 && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.7 }}
                          className="text-center py-4"
                        >
                          <Activity className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500">No recent activity</p>
                        </motion.div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        )}
      </div>
      </main>
    </div>
  );
}