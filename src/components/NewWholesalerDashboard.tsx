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
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, getDoc } from 'firebase/firestore';
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
  Eye
} from 'lucide-react';
import { formatTimestamp, formatCurrency } from '@/lib/timestamp-utils';

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
  const { user } = useAuth();
  const [lineWorkers, setLineWorkers] = useState<LineWorker[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateLineWorker, setShowCreateLineWorker] = useState(false);
  const [showCreateRetailer, setShowCreateRetailer] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
      const lineWorkerData = {
        displayName: newLineWorker.displayName,
        email: newLineWorker.email,
        phone: newLineWorker.phone,
        tenantId: user.tenantId,
        roles: [ROLES.LINE_WORKER],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await addDoc(collection(db, COLLECTIONS.USERS), lineWorkerData);
      
      // Reset form
      setNewLineWorker({
        displayName: '',
        email: '',
        phone: '',
        password: ''
      });
      
      setShowCreateLineWorker(false);
      fetchData();
      
    } catch (error) {
      logger.error('Error creating line worker', error, { context: 'NewWholesalerDashboard' });
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
    <div className="min-h-screen bg-gray-50 p-6">
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
    </div>
  );
}