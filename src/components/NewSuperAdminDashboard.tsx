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
  Activity, 
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
  LayoutDashboard,
  BarChart3,
  Settings,
  TrendingUp,
  UsersIcon,
  DollarSign,
  CreditCard,
  Store,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  PieChart,
  Database,
  Shield,
  Bell,
  FileText,
  Download
} from 'lucide-react';
import { formatTimestamp } from '@/lib/timestamp-utils';
import { motion } from 'framer-motion';

interface Wholesaler {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  subscriptionStatus: string;
  subscriptionExpiry?: any;
  createdAt: any;
  lineWorkerCount: number;
  retailerCount: number;
  approved: boolean; // New field for approval status
}

interface LineWorker {
  id: string;
  displayName: string;
  email: string;
  phone?: string;
  wholesalerId: string;
  wholesalerName: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: any;
}

interface Activity {
  id: string;
  type: 'WHOLESALER_CREATED' | 'LINE_WORKER_CREATED' | 'WHOLESALER_SUSPENDED' | 'WHOLESALER_ACTIVATED';
  description: string;
  timestamp: any;
  userId: string;
  userName: string;
}

export function NewSuperAdminDashboard() {
  const { user, logout, signup } = useAuth();
  const [wholesalers, setWholesalers] = useState<Wholesaler[]>([]);
  const [lineWorkers, setLineWorkers] = useState<LineWorker[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Navigation state
  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'wholesalers', label: 'Wholesalers', icon: Building2 },
    { id: 'line-workers', label: 'Line Workers', icon: UserCheck },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];
  const [activeNav, setActiveNav] = useState('overview');

  // Form state - removed since we no longer create wholesalers from Super Admin
  // const [newWholesaler, setNewWholesaler] = useState({
  //   name: '',
  //   email: '',
  //   phone: '',
  //   password: '',
  //   subscriptionStatus: 'ACTIVE',
  //   subscriptionExpiry: ''
  // });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch wholesalers
      const wholesalersSnapshot = await getDocs(collection(db, COLLECTIONS.TENANTS));
      const wholesalersData: Wholesaler[] = [];
      
      for (const doc of wholesalersSnapshot.docs) {
        const data = doc.data();
        
        // Get line worker count
        const lineWorkersQuery = query(
          collection(db, COLLECTIONS.USERS),
          where('tenantId', '==', doc.id),
          where('roles', 'array-contains', ROLES.LINE_WORKER)
        );
        const lineWorkersSnapshot = await getDocs(lineWorkersQuery);
        
        // Get retailer count
        const retailersSnapshot = await getDocs(
          collection(db, 'retailers')
        );
        const retailerCount = retailersSnapshot.docs.filter(d => d.data().tenantId === doc.id).length;
        
        wholesalersData.push({
          id: doc.id,
          name: data.name,
          email: data.adminEmail || '',
          phone: data.adminPhone || '',
          status: data.status,
          subscriptionStatus: data.subscriptionStatus || 'ACTIVE',
          subscriptionExpiry: data.subscriptionExpiry,
          createdAt: data.createdAt,
          lineWorkerCount: lineWorkersSnapshot.size,
          retailerCount,
          approved: data.approved || false // New field - default to false if not present
        });
      }
      
      setWholesalers(wholesalersData);
      
      // Fetch line workers with wholesaler info
      const lineWorkersSnapshot = await getDocs(
        query(collection(db, COLLECTIONS.USERS), where('roles', 'array-contains', ROLES.LINE_WORKER))
      );
      const lineWorkersData: LineWorker[] = [];
      
      for (const document of lineWorkersSnapshot.docs) {
        const data = document.data();
        const wholesalerDoc = await getDoc(doc(db, COLLECTIONS.TENANTS, data.tenantId));
        const wholesalerName = wholesalerDoc.exists() ? wholesalerDoc.data().name : 'Unknown';
        
        lineWorkersData.push({
          id: document.id,
          displayName: data.displayName,
          email: data.email,
          phone: data.phone,
          wholesalerId: data.tenantId,
          wholesalerName,
          status: data.active ? 'ACTIVE' : 'INACTIVE',
          createdAt: data.createdAt
        });
      }
      
      setLineWorkers(lineWorkersData);
      
      // Fetch activities (simplified - in real app, this would be a separate collection)
      const mockActivities: Activity[] = [
        {
          id: '1',
          type: 'WHOLESALER_CREATED',
          description: 'New wholesaler account created',
          timestamp: new Date(),
          userId: user?.uid || '',
          userName: user?.displayName || 'System'
        }
      ];
      setActivities(mockActivities);
      
    } catch (error) {
      logger.error('Error fetching dashboard data', error, { context: 'NewSuperAdminDashboard' });
    } finally {
      setLoading(false);
    }
  };

  const toggleWholesalerStatus = async (wholesalerId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await updateDoc(doc(db, COLLECTIONS.TENANTS, wholesalerId), {
        status: newStatus,
        updatedAt: new Date()
      });
      fetchData();
    } catch (error) {
      logger.error('Error toggling wholesaler status', error, { context: 'NewSuperAdminDashboard' });
    }
  };

  const toggleWholesalerApproval = async (wholesalerId: string, currentApproved: boolean) => {
    try {
      await updateDoc(doc(db, COLLECTIONS.TENANTS, wholesalerId), {
        approved: !currentApproved,
        updatedAt: new Date()
      });
      fetchData();
    } catch (error) {
      logger.error('Error toggling wholesaler approval', error, { context: 'NewSuperAdminDashboard' });
    }
  };

  const filteredWholesalers = wholesalers.filter(w => 
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLineWorkers = lineWorkers.filter(lw =>
    lw.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lw.wholesalerName.toLowerCase().includes(searchTerm.toLowerCase())
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
        subtitle="Super Admin Dashboard"
        notificationCount={notificationCount}
        notifications={notifications}
        user={user ? { displayName: user.displayName, email: user.email } : undefined}
        onLogout={logout}
      />

      {/* Main Content */}
      <main className="flex-1 pt-16 p-3 sm:p-4 lg:p-6 overflow-y-auto pb-20 lg:pb-6">
        <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage wholesalers and monitor system activity</p>
          </div>
        </div>

        {/* Content based on active navigation */}
        <div className="space-y-6">
          {activeNav === 'overview' && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Wholesalers</CardTitle>
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{wholesalers.length}</div>
                      <p className="text-xs text-muted-foreground">
                        {wholesalers.filter(w => w.status === 'ACTIVE').length} active
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
                  transition={{ delay: 0.3 }}
                >
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {wholesalers.filter(w => w.subscriptionStatus === 'ACTIVE').length}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This month
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
                      <CardTitle className="text-sm font-medium">System Activities</CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{activities.length}</div>
                      <p className="text-xs text-muted-foreground">
                        Recent activities
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Recent Activities */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activities</CardTitle>
                    <CardDescription>System-wide activities and events</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {activities.slice(0, 5).map((activity, index) => (
                        <motion.div
                          key={activity.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + index * 0.1 }}
                          className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg"
                        >
                          <Activity className="h-5 w-5 text-blue-600" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{activity.description}</p>
                            <p className="text-xs text-gray-500">
                              {activity.userName} • {formatTimestamp(activity.timestamp)}
                            </p>
                          </div>
                          <Badge variant="outline">{activity.type.replace('_', ' ')}</Badge>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}

          {activeNav === 'wholesalers' && (
            <>
              <div className="mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Wholesalers</h2>
                  <p className="text-gray-600">Manage wholesaler accounts and approvals</p>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search wholesalers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Wholesalers Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Wholesalers</CardTitle>
                  <CardDescription>Manage wholesaler accounts and subscriptions</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Approved</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Subscription</TableHead>
                        <TableHead>Line Workers</TableHead>
                        <TableHead>Retailers</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWholesalers.map((wholesaler) => (
                        <TableRow key={wholesaler.id}>
                          <TableCell className="font-medium">{wholesaler.name}</TableCell>
                          <TableCell>{wholesaler.email}</TableCell>
                          <TableCell>{wholesaler.phone || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={wholesaler.approved ? 'default' : 'secondary'}>
                              {wholesaler.approved ? 'Approved' : 'Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={wholesaler.status === 'ACTIVE' ? 'default' : 'secondary'}>
                              {wholesaler.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={wholesaler.subscriptionStatus === 'ACTIVE' ? 'default' : 'destructive'}>
                              {wholesaler.subscriptionStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>{wholesaler.lineWorkerCount}</TableCell>
                          <TableCell>{wholesaler.retailerCount}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleWholesalerApproval(wholesaler.id, wholesaler.approved)}
                                title={wholesaler.approved ? 'Revoke Approval' : 'Approve Wholesaler'}
                              >
                                {wholesaler.approved ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Clock className="h-4 w-4 text-yellow-600" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleWholesalerStatus(wholesaler.id, wholesaler.status)}
                                title={wholesaler.status === 'ACTIVE' ? 'Suspend Wholesaler' : 'Activate Wholesaler'}
                              >
                                {wholesaler.status === 'ACTIVE' ? (
                                  <ToggleRight className="h-4 w-4 text-green-600" />
                                ) : (
                                  <ToggleLeft className="h-4 w-4 text-gray-400" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {activeNav === 'line-workers' && (
            <>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Line Workers</h2>
                  <p className="text-gray-600">All line workers and their assigned wholesalers</p>
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search line workers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Line Workers Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Line Workers</CardTitle>
                  <CardDescription>All line workers and their assigned wholesalers</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Wholesaler</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLineWorkers.map((lineWorker) => (
                        <TableRow key={lineWorker.id}>
                          <TableCell className="font-medium">{lineWorker.displayName}</TableCell>
                          <TableCell>{lineWorker.email}</TableCell>
                          <TableCell>{lineWorker.phone || '-'}</TableCell>
                          <TableCell>{lineWorker.wholesalerName}</TableCell>
                          <TableCell>
                            <Badge variant={lineWorker.status === 'ACTIVE' ? 'default' : 'secondary'}>
                              {lineWorker.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatTimestamp(lineWorker.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
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
                  <h2 className="text-2xl font-bold text-gray-900">System Analytics</h2>
                  <p className="text-gray-600">Comprehensive system-wide analytics and reporting</p>
                </div>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹2,45,000</div>
                      <p className="text-xs text-muted-foreground">
                        +12.5% from last month
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
                      <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                      <UsersIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">1,247</div>
                      <p className="text-xs text-muted-foreground">
                        +8.2% from last month
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
                      <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">98.5%</div>
                      <p className="text-xs text-muted-foreground">
                        Payment success rate
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
                      <CardTitle className="text-sm font-medium">Avg. Processing Time</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">2.3s</div>
                      <p className="text-xs text-muted-foreground">
                        OTP verification
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Revenue Trend</CardTitle>
                      <CardDescription>Monthly revenue over the last 6 months</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                        <div className="text-center">
                          <TrendingUp className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                          <p className="text-gray-500">Revenue Chart</p>
                          <p className="text-sm text-gray-400">Interactive chart coming soon</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* User Growth Chart */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>User Growth</CardTitle>
                      <CardDescription>New user registrations by month</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                        <div className="text-center">
                          <UsersIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                          <p className="text-gray-500">Growth Chart</p>
                          <p className="text-sm text-gray-400">Interactive chart coming soon</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="lg:col-span-2"
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Performing Wholesalers</CardTitle>
                      <CardDescription>Wholesalers with highest collection efficiency</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {wholesalers.slice(0, 5).map((wholesaler, index) => (
                          <motion.div
                            key={wholesaler.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.8 + index * 0.1 }}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-semibold text-blue-600">#{index + 1}</span>
                              </div>
                              <div>
                                <p className="font-medium">{wholesaler.name}</p>
                                <p className="text-sm text-gray-500">{wholesaler.lineWorkerCount} workers</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">₹{(Math.random() * 50000 + 10000).toLocaleString()}</p>
                              <p className="text-sm text-green-600">+{Math.floor(Math.random() * 20 + 5)}%</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>System Health</CardTitle>
                      <CardDescription>Current system status</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.9 }}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">API Status</span>
                          </div>
                          <Badge variant="default">Operational</Badge>
                        </motion.div>
                        
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 1.0 }}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">Database</span>
                          </div>
                          <Badge variant="default">Healthy</Badge>
                        </motion.div>
                        
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 1.1 }}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">SMS Service</span>
                          </div>
                          <Badge variant="default">Active</Badge>
                        </motion.div>
                        
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 1.2 }}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm">Storage</span>
                          </div>
                          <Badge variant="secondary">78% Used</Badge>
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
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
                <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
                <p className="text-gray-600">Configure system-wide preferences and settings</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Settings */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="lg:col-span-2 space-y-6"
                >
                  {/* General Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Settings className="h-5 w-5" />
                        <span>General Settings</span>
                      </CardTitle>
                      <CardDescription>Basic system configuration</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <Label className="text-base font-medium">Maintenance Mode</Label>
                          <p className="text-sm text-gray-500">Temporarily disable user access</p>
                        </div>
                        <Button variant="outline" size="sm">
                          Configure
                        </Button>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <Label className="text-base font-medium">Default Currency</Label>
                          <p className="text-sm text-gray-500">Set default currency for transactions</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">INR (₹)</span>
                          <Button variant="outline" size="sm">
                            Change
                          </Button>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <Label className="text-base font-medium">Time Zone</Label>
                          <p className="text-sm text-gray-500">Set system time zone</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">IST (UTC+5:30)</span>
                          <Button variant="outline" size="sm">
                            Change
                          </Button>
                        </div>
                      </motion.div>
                    </CardContent>
                  </Card>

                  {/* Security Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Shield className="h-5 w-5" />
                        <span>Security Settings</span>
                      </CardTitle>
                      <CardDescription>Manage system security and access controls</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <Label className="text-base font-medium">OTP Expiry Time</Label>
                          <p className="text-sm text-gray-500">Set OTP validity duration</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">10 minutes</span>
                          <Button variant="outline" size="sm">
                            Configure
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
                          <Label className="text-base font-medium">Failed Login Attempts</Label>
                          <p className="text-sm text-gray-500">Maximum attempts before lockout</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">5 attempts</span>
                          <Button variant="outline" size="sm">
                            Configure
                          </Button>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <Label className="text-base font-medium">Session Timeout</Label>
                          <p className="text-sm text-gray-500">Automatic logout duration</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">30 minutes</span>
                          <Button variant="outline" size="sm">
                            Configure
                          </Button>
                        </div>
                      </motion.div>
                    </CardContent>
                  </Card>

                  {/* Notification Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Bell className="h-5 w-5" />
                        <span>Notification Settings</span>
                      </CardTitle>
                      <CardDescription>Configure system notifications and alerts</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <Label className="text-base font-medium">Email Notifications</Label>
                          <p className="text-sm text-gray-500">System alerts via email</p>
                        </div>
                        <Button variant="outline" size="sm">
                          Configure
                        </Button>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9 }}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <Label className="text-base font-medium">SMS Notifications</Label>
                          <p className="text-sm text-gray-500">Payment confirmations via SMS</p>
                        </div>
                        <Button variant="outline" size="sm">
                          Configure
                        </Button>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.0 }}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <Label className="text-base font-medium">Push Notifications</Label>
                          <p className="text-sm text-gray-500">Real-time alerts in dashboard</p>
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
                  {/* System Status */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Database className="h-5 w-5" />
                        <span>System Status</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Last Backup</span>
                          <Badge variant="default">2 hours ago</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Database Size</span>
                          <Badge variant="secondary">2.4 GB</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Active Sessions</span>
                          <Badge variant="default">47</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">API Requests</span>
                          <Badge variant="default">1.2K/hr</Badge>
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
                          Generate System Report
                        </Button>
                      </motion.div>
                      
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                      >
                        <Button variant="outline" className="w-full justify-start">
                          <Download className="h-4 w-4 mr-2" />
                          Backup Database
                        </Button>
                      </motion.div>
                      
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                      >
                        <Button variant="outline" className="w-full justify-start">
                          <Users className="h-4 w-4 mr-2" />
                          Manage User Roles
                        </Button>
                      </motion.div>
                      
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 }}
                      >
                        <Button variant="outline" className="w-full justify-start">
                          <Bell className="h-4 w-4 mr-2" />
                          Test Notifications
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
                        {activities.slice(0, 3).map((activity, index) => (
                          <motion.div
                            key={activity.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.7 + index * 0.1 }}
                            className="flex items-start space-x-2"
                          >
                            <Activity className="h-3 w-3 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-gray-600 truncate">{activity.description}</p>
                              <p className="text-xs text-gray-400">
                                {formatTimestamp(activity.timestamp)}
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
      </div>
      </main>
    </div>
  );
}