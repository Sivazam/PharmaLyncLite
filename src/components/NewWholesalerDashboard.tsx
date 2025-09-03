'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardNavigation, NavItem, NotificationItem } from '@/components/DashboardNavigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, getDoc, setDoc, limit } from 'firebase/firestore';
import { COLLECTIONS, ROLES } from '@/lib/firebase';
import { logger } from '@/lib/logger';
import { 
  Building2, 
  Users, 
  UserCheck, 
  DollarSign, 
  Plus, 
  Edit, 
  Trash2, 
  ToggleLeft, 
  ToggleRight,
  Search,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Store,
  TrendingUp,
  Download,
  Eye,
  LayoutDashboard,
  BarChart3,
  Settings,
  UsersIcon,
  CreditCard,
  Target,
  PieChart,
  CheckCircle,
  AlertTriangle,
  Bell,
  FileText,
  Database,
  Shield,
  Clock,
  Activity
} from 'lucide-react';
import { formatTimestamp, formatCurrency } from '@/lib/timestamp-utils';
import { motion } from 'framer-motion';

interface LineWorker {
  id: string;
  displayName: string;
  email: string;
  phone?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: any;
  todayCollection: number;
}

interface Retailer {
  id: string;
  name: string;
  phone: string;
  area: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: any;
}

interface Payment {
  id: string;
  retailerId: string;
  retailerName: string;
  lineWorkerId: string;
  lineWorkerName: string;
  amount: number;
  status: 'COMPLETED' | 'PENDING';
  timestamp: any;
}

export function NewWholesalerDashboard() {
  const { user, logout, signup } = useAuth();
  const [lineWorkers, setLineWorkers] = useState<LineWorker[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateLineWorker, setShowCreateLineWorker] = useState(false);
  const [showCreateRetailer, setShowCreateRetailer] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Navigation state
  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'line-workers', label: 'Line Workers', icon: UsersIcon },
    { id: 'retailers', label: 'Retailers', icon: Store },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];
  const [activeNav, setActiveNav] = useState('overview');

  // Form states
  const [newLineWorker, setNewLineWorker] = useState({
    displayName: '',
    email: '',
    phone: '',
    password: ''
  });

  const [newRetailer, setNewRetailer] = useState({
    name: '',
    phone: '',
    area: '',
    address: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!user?.tenantId) return;
    
    try {
      setLoading(true);
      
      // Fetch line workers
      const lineWorkersQuery = query(
        collection(db, COLLECTIONS.USERS),
        where('tenantId', '==', user.tenantId),
        where('roles', 'array-contains', ROLES.LINE_WORKER)
      );
      const lineWorkersSnapshot = await getDocs(lineWorkersQuery);
      const lineWorkersData: LineWorker[] = [];
      
      for (const doc of lineWorkersSnapshot.docs) {
        const data = doc.data();
        
        // Calculate today's collection for this line worker
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const paymentsQuery = query(
          collection(db, COLLECTIONS.PAYMENTS),
          where('tenantId', '==', user.tenantId),
          where('lineWorkerId', '==', doc.id),
          where('state', '==', 'COMPLETED'),
          where('timeline.completedAt', '>=', today),
          where('timeline.completedAt', '<', tomorrow)
        );
        const paymentsSnapshot = await getDocs(paymentsQuery);
        const todayCollection = paymentsSnapshot.docs.reduce((sum, p) => sum + (p.data().totalPaid || 0), 0);
        
        lineWorkersData.push({
          id: doc.id,
          displayName: data.displayName,
          email: data.email,
          phone: data.phone,
          status: data.active ? 'ACTIVE' : 'INACTIVE',
          createdAt: data.createdAt,
          todayCollection
        });
      }
      
      setLineWorkers(lineWorkersData);
      
      // Fetch retailers
      const retailersQuery = query(
        collection(db, 'retailers'),
        where('tenantId', '==', user.tenantId)
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
          status: data.active !== false ? 'ACTIVE' : 'INACTIVE',
          createdAt: data.createdAt
        });
      }
      
      setRetailers(retailersData);
      
      // Fetch recent payments
      const paymentsQuery = query(
        collection(db, COLLECTIONS.PAYMENTS),
        where('tenantId', '==', user.tenantId),
        where('state', '==', 'COMPLETED'),
        orderBy('timeline.completedAt', 'desc'),
        limit(50)
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const paymentsData: Payment[] = [];
      
      for (const doc of paymentsSnapshot.docs) {
        const data = doc.data();
        paymentsData.push({
          id: doc.id,
          retailerId: data.retailerId,
          retailerName: data.retailerName,
          lineWorkerId: data.lineWorkerId,
          lineWorkerName: data.lineWorkerName || 'Unknown',
          amount: data.totalPaid,
          status: data.state,
          timestamp: data.timeline.completedAt
        });
      }
      
      setPayments(paymentsData);
      
    } catch (error) {
      logger.error('Error fetching dashboard data', error, { context: 'NewWholesalerDashboard' });
    } finally {
      setLoading(false);
    }
  };

  const createLineWorker = async () => {
    if (!user?.tenantId) return;
    
    try {
      if (!newLineWorker.email || !newLineWorker.password) {
        alert('Email and password are required');
        return;
      }

      // Create Firebase Auth user first
      const authResult = await signup(newLineWorker.email, newLineWorker.password, newLineWorker.displayName);
      
      if (authResult.user) {
        // Create user record in Firestore for the line worker
        const lineWorkerData = {
          uid: authResult.user.uid,
          displayName: newLineWorker.displayName,
          email: newLineWorker.email,
          phone: newLineWorker.phone,
          tenantId: user.tenantId,
          roles: [ROLES.LINE_WORKER],
          active: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await setDoc(doc(db, COLLECTIONS.USERS, authResult.user.uid), lineWorkerData);
        
        // Reset form
        setNewLineWorker({
          displayName: '',
          email: '',
          phone: '',
          password: ''
        });
        
        setShowCreateLineWorker(false);
        fetchData();
        
        alert('Line worker created successfully! They can now login with their email and password.');
      }
    } catch (error: any) {
      logger.error('Error creating line worker', error, { context: 'NewWholesalerDashboard' });
      if (error.code === 'auth/email-already-in-use') {
        alert('This email is already in use. Please use a different email.');
      } else {
        alert('Failed to create line worker. Please try again.');
      }
    }
  };

  const createRetailer = async () => {
    if (!user?.tenantId) return;
    
    try {
      const retailerData = {
        name: newRetailer.name,
        phone: newRetailer.phone,
        area: newRetailer.area,
        address: newRetailer.address,
        tenantId: user.tenantId,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await addDoc(collection(db, 'retailers'), retailerData);
      
      // Reset form
      setNewRetailer({
        name: '',
        phone: '',
        area: '',
        address: ''
      });
      
      setShowCreateRetailer(false);
      fetchData();
      
    } catch (error) {
      logger.error('Error creating retailer', error, { context: 'NewWholesalerDashboard' });
    }
  };

  const toggleLineWorkerStatus = async (lineWorkerId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? false : true;
      await updateDoc(doc(db, COLLECTIONS.USERS, lineWorkerId), {
        active: newStatus,
        updatedAt: new Date()
      });
      fetchData();
    } catch (error) {
      logger.error('Error toggling line worker status', error, { context: 'NewWholesalerDashboard' });
    }
  };

  const toggleRetailerStatus = async (retailerId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? false : true;
      await updateDoc(doc(db, 'retailers', retailerId), {
        active: newStatus,
        updatedAt: new Date()
      });
      fetchData();
    } catch (error) {
      logger.error('Error toggling retailer status', error, { context: 'NewWholesalerDashboard' });
    }
  };

  const downloadCollectionReport = () => {
    // Generate CSV report
    const headers = ['Date', 'Line Worker', 'Retailer', 'Amount', 'Status'];
    const csvContent = [
      headers.join(','),
      ...payments.map(p => [
        formatTimestamp(p.timestamp),
        p.lineWorkerName,
        p.retailerName,
        p.amount,
        p.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `collection-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const todayTotal = payments
    .filter(p => {
      const paymentDate = p.timestamp.toDate();
      const today = new Date();
      return paymentDate.toDateString() === today.toDateString();
    })
    .reduce((sum, p) => sum + p.amount, 0);

  const thisWeekTotal = payments
    .filter(p => {
      const paymentDate = p.timestamp.toDate();
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return paymentDate >= weekAgo;
    })
    .reduce((sum, p) => sum + p.amount, 0);

  const filteredLineWorkers = lineWorkers.filter(lw => 
    lw.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lw.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRetailers = retailers.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.area.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        subtitle="Wholesaler Dashboard"
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
            <h1 className="text-3xl font-bold text-gray-900">Wholesaler Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage line workers, retailers, and track collections</p>
          </div>
          <div className="flex space-x-2">
            <Dialog open={showCreateLineWorker} onOpenChange={setShowCreateLineWorker}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Line Worker
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Line Worker</DialogTitle>
                  <DialogDescription>
                    Add a new line worker to your team
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="lw-name">Full Name</Label>
                    <Input
                      id="lw-name"
                      value={newLineWorker.displayName}
                      onChange={(e) => setNewLineWorker(prev => ({ ...prev, displayName: e.target.value }))}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lw-email">Email</Label>
                    <Input
                      id="lw-email"
                      type="email"
                      value={newLineWorker.email}
                      onChange={(e) => setNewLineWorker(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="worker@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lw-phone">Phone</Label>
                    <Input
                      id="lw-phone"
                      value={newLineWorker.phone}
                      onChange={(e) => setNewLineWorker(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+91XXXXXXXXXX"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lw-password">Password</Label>
                    <Input
                      id="lw-password"
                      type="password"
                      value={newLineWorker.password}
                      onChange={(e) => setNewLineWorker(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter password for login"
                    />
                  </div>
                  <Button onClick={createLineWorker} className="w-full">
                    Create Line Worker
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showCreateRetailer} onOpenChange={setShowCreateRetailer}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Store className="h-4 w-4 mr-2" />
                  Add Retailer
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Retailer</DialogTitle>
                  <DialogDescription>
                    Add a new retailer profile for line workers
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="retailer-name">Store Name</Label>
                    <Input
                      id="retailer-name"
                      value={newRetailer.name}
                      onChange={(e) => setNewRetailer(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter store name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="retailer-phone">Phone</Label>
                    <Input
                      id="retailer-phone"
                      value={newRetailer.phone}
                      onChange={(e) => setNewRetailer(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+91XXXXXXXXXX"
                    />
                  </div>
                  <div>
                    <Label htmlFor="retailer-area">Area</Label>
                    <Input
                      id="retailer-area"
                      value={newRetailer.area}
                      onChange={(e) => setNewRetailer(prev => ({ ...prev, area: e.target.value }))}
                      placeholder="Enter area name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="retailer-address">Address</Label>
                    <Textarea
                      id="retailer-address"
                      value={newRetailer.address}
                      onChange={(e) => setNewRetailer(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Enter full address"
                    />
                  </div>
                  <Button onClick={createRetailer} className="w-full">
                    Add Retailer
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
                <CardTitle className="text-sm font-medium">Total Line Workers</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{lineWorkers.length}</div>
                <p className="text-xs text-muted-foreground">
                  {lineWorkers.filter(lw => lw.status === 'ACTIVE').length} active
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
                <CardTitle className="text-sm font-medium">Total Retailers</CardTitle>
                <Store className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{retailers.length}</div>
                <p className="text-xs text-muted-foreground">
                  {retailers.filter(r => r.status === 'ACTIVE').length} active
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
                <CardTitle className="text-sm font-medium">Today's Collection</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(todayTotal)}</div>
                <p className="text-xs text-muted-foreground">
                  {payments.filter(p => {
                    const paymentDate = p.timestamp.toDate();
                    const today = new Date();
                    return paymentDate.toDateString() === today.toDateString();
                  }).length} transactions
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
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(thisWeekTotal)}</div>
                <p className="text-xs text-muted-foreground">
                  Last 7 days
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search line workers or retailers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="line-workers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="line-workers">Line Workers</TabsTrigger>
            <TabsTrigger value="retailers">Retailers</TabsTrigger>
            <TabsTrigger value="collections">Collections</TabsTrigger>
          </TabsList>

          <TabsContent value="line-workers">
            <Card>
              <CardHeader>
                <CardTitle>Line Workers</CardTitle>
                <CardDescription>Manage your line worker team and their performance</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Today's Collection</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLineWorkers.map((lineWorker) => (
                      <TableRow key={lineWorker.id}>
                        <TableCell className="font-medium">{lineWorker.displayName}</TableCell>
                        <TableCell>{lineWorker.email}</TableCell>
                        <TableCell>{lineWorker.phone || '-'}</TableCell>
                        <TableCell>{formatCurrency(lineWorker.todayCollection)}</TableCell>
                        <TableCell>
                          <Badge variant={lineWorker.status === 'ACTIVE' ? 'default' : 'secondary'}>
                            {lineWorker.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleLineWorkerStatus(lineWorker.id, lineWorker.status)}
                          >
                            {lineWorker.status === 'ACTIVE' ? (
                              <ToggleRight className="h-4 w-4 text-green-600" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="retailers">
            <Card>
              <CardHeader>
                <CardTitle>Retailers</CardTitle>
                <CardDescription>Manage retailer profiles accessible to your line workers</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRetailers.map((retailer) => (
                      <TableRow key={retailer.id}>
                        <TableCell className="font-medium">{retailer.name}</TableCell>
                        <TableCell>{retailer.phone}</TableCell>
                        <TableCell>{retailer.area}</TableCell>
                        <TableCell>
                          <Badge variant={retailer.status === 'ACTIVE' ? 'default' : 'secondary'}>
                            {retailer.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRetailerStatus(retailer.id, retailer.status)}
                          >
                            {retailer.status === 'ACTIVE' ? (
                              <ToggleRight className="h-4 w-4 text-green-600" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="collections">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Collection Report</CardTitle>
                    <CardDescription>Line worker collection details and performance</CardDescription>
                  </div>
                  <Button onClick={downloadCollectionReport} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Line Worker</TableHead>
                      <TableHead>Retailer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatTimestamp(payment.timestamp)}</TableCell>
                        <TableCell>{payment.lineWorkerName}</TableCell>
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
          </TabsContent>
        </Tabs>
      </div>

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
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Payment Management</h2>
                <p className="text-gray-600">Manage and track all payment transactions</p>
              </div>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Payments
              </Button>
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
                    <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{payments.length}</div>
                    <p className="text-xs text-muted-foreground">
                      All time transactions
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
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Math.round((payments.filter(p => p.status === 'COMPLETED').length / payments.length) * 100) || 0}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Payment success rate
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
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {payments.length > 0 ? formatCurrency(payments.reduce((sum, p) => sum + p.amount, 0) / payments.length) : '₹0'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Average transaction
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
                    <CardTitle className="text-sm font-medium">Pending</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {payments.filter(p => p.status === 'PENDING').length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Awaiting verification
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Payment Methods Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Methods</CardTitle>
                    <CardDescription>Breakdown by payment method</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium">Cash</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{payments.length}</div>
                          <div className="text-xs text-gray-500">100%</div>
                        </div>
                      </motion.div>
                      
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 }}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-sm font-medium">Digital</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">0</div>
                          <div className="text-xs text-gray-500">0%</div>
                        </div>
                      </motion.div>
                      
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 }}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                          <span className="text-sm font-medium">Other</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">0</div>
                          <div className="text-xs text-gray-500">0%</div>
                        </div>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                    <CardDescription>Latest payment activities</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {payments.slice(0, 5).map((payment, index) => (
                        <motion.div
                          key={payment.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6 + index * 0.1 }}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-2 h-2 rounded-full ${
                              payment.status === 'COMPLETED' ? 'bg-green-500' : 'bg-yellow-500'
                            }`}></div>
                            <div>
                              <p className="font-medium text-sm">{payment.retailerName}</p>
                              <p className="text-xs text-gray-500">{payment.lineWorkerName}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-sm">{formatCurrency(payment.amount)}</p>
                            <p className="text-xs text-gray-500">
                              {formatTimestamp(payment.timestamp)}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
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
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Business Analytics</h2>
                <p className="text-gray-600">Comprehensive business performance metrics</p>
              </div>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Analytics
              </Button>
            </div>

            {/* Key Performance Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(thisWeekTotal)}</div>
                    <p className="text-xs text-muted-foreground">
                      This week's collections
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
                    <CardTitle className="text-sm font-medium">Active Retailers</CardTitle>
                    <Store className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{retailers.filter(r => r.status === 'ACTIVE').length}</div>
                    <p className="text-xs text-muted-foreground">
                      Ready for collections
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
                    <CardTitle className="text-sm font-medium">Team Efficiency</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">94%</div>
                    <p className="text-xs text-muted-foreground">
                      Collection success rate
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
                    <CardTitle className="text-sm font-medium">Avg. Collection</CardTitle>
                    <UsersIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {lineWorkers.length > 0 ? formatCurrency(todayTotal / lineWorkers.length) : '₹0'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Per worker today
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Performance Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Collection Trends</CardTitle>
                    <CardDescription>Daily collection performance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-500">Collection Trends Chart</p>
                        <p className="text-sm text-gray-400">Interactive chart coming soon</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Worker Performance</CardTitle>
                    <CardDescription>Individual worker efficiency</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <PieChart className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-500">Performance Chart</p>
                        <p className="text-sm text-gray-400">Interactive chart coming soon</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Top Performers */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Line Workers</CardTitle>
                  <CardDescription>Workers with highest collection efficiency</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {lineWorkers
                      .sort((a, b) => b.todayCollection - a.todayCollection)
                      .slice(0, 5)
                      .map((worker, index) => (
                        <motion.div
                          key={worker.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.8 + index * 0.1 }}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              index === 0 ? 'bg-yellow-100' : index === 1 ? 'bg-gray-100' : index === 2 ? 'bg-orange-100' : 'bg-blue-100'
                            }`}>
                              <span className={`text-sm font-semibold ${
                                index === 0 ? 'text-yellow-600' : index === 1 ? 'text-gray-600' : index === 2 ? 'text-orange-600' : 'text-blue-600'
                              }`}>#{index + 1}</span>
                            </div>
                            <div>
                              <p className="font-medium">{worker.displayName}</p>
                              <p className="text-sm text-gray-500">{worker.email}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(worker.todayCollection)}</p>
                            <p className="text-sm text-green-600">
                              {worker.todayCollection > 0 ? '+' + Math.floor(Math.random() * 20 + 5) + '%' : '0%'}
                            </p>
                          </div>
                        </motion.div>
                      ))}
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
              <h2 className="text-2xl font-bold text-gray-900">Business Settings</h2>
              <p className="text-gray-600">Configure your business preferences and settings</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Settings */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-2 space-y-6"
              >
                {/* Business Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Building2 className="h-5 w-5" />
                      <span>Business Information</span>
                    </CardTitle>
                    <CardDescription>Manage your business details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <Label className="text-base font-medium">Business Name</Label>
                        <p className="text-sm text-gray-500">Your registered business name</p>
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
                        <Label className="text-base font-medium">Contact Email</Label>
                        <p className="text-sm text-gray-500">Primary contact email</p>
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
                        <Label className="text-base font-medium">Phone Number</Label>
                        <p className="text-sm text-gray-500">Business contact number</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </motion.div>
                  </CardContent>
                </Card>

                {/* Collection Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <CreditCard className="h-5 w-5" />
                      <span>Collection Settings</span>
                    </CardTitle>
                    <CardDescription>Configure payment collection preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <Label className="text-base font-medium">Default Collection Amount</Label>
                        <p className="text-sm text-gray-500">Suggested amount for quick collection</p>
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
                        <p className="text-sm text-gray-500">Send SMS confirmations</p>
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
                        <Label className="text-base font-medium">Auto-assign Areas</Label>
                        <p className="text-sm text-gray-500">Automatically assign areas to new workers</p>
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
                {/* Business Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Activity className="h-5 w-5" />
                      <span>Business Status</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Subscription</span>
                        <Badge variant="default">Active</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Payment Methods</span>
                        <Badge variant="default">2 Active</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Team Size</span>
                        <Badge variant="secondary">{lineWorkers.length} Workers</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Service Areas</span>
                        <Badge variant="secondary">3 Areas</Badge>
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
                        Generate Report
                      </Button>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Button variant="outline" className="w-full justify-start">
                        <Download className="h-4 w-4 mr-2" />
                        Export Data
                      </Button>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <Button variant="outline" className="w-full justify-start">
                        <Bell className="h-4 w-4 mr-2" />
                        Test SMS
                      </Button>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      <Button variant="outline" className="w-full justify-start">
                        <Users className="h-4 w-4 mr-2" />
                        Invite Workers
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
                              Payment of {formatCurrency(payment.amount)} from {payment.retailerName}
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatTimestamp(payment.timestamp)}
                            </p>
                          </div>
                        </motion.div>
                      ))}
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