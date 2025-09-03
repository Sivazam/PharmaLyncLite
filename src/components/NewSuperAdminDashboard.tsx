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
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, getDoc } from 'firebase/firestore';
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
  MapPin
} from 'lucide-react';
import { formatTimestamp } from '@/lib/timestamp-utils';

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
  const { user } = useAuth();
  const [wholesalers, setWholesalers] = useState<Wholesaler[]>([]);
  const [lineWorkers, setLineWorkers] = useState<LineWorker[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateWholesaler, setShowCreateWholesaler] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [newWholesaler, setNewWholesaler] = useState({
    name: '',
    email: '',
    phone: '',
    subscriptionStatus: 'ACTIVE',
    subscriptionExpiry: ''
  });

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
          retailerCount
        });
      }
      
      setWholesalers(wholesalersData);
      
      // Fetch line workers with wholesaler info
      const lineWorkersSnapshot = await getDocs(
        query(collection(db, COLLECTIONS.USERS), where('roles', 'array-contains', ROLES.LINE_WORKER))
      );
      const lineWorkersData: LineWorker[] = [];
      
      for (const doc of lineWorkersSnapshot.docs) {
        const data = doc.data();
        const wholesalerDoc = await getDoc(doc(db, COLLECTIONS.TENANTS, data.tenantId));
        const wholesalerName = wholesalerDoc.exists() ? wholesalerDoc.data().name : 'Unknown';
        
        lineWorkersData.push({
          id: doc.id,
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

  const createWholesaler = async () => {
    try {
      const wholesalerData = {
        name: newWholesaler.name,
        adminEmail: newWholesaler.email,
        adminPhone: newWholesaler.phone,
        status: 'ACTIVE',
        subscriptionStatus: newWholesaler.subscriptionStatus,
        subscriptionExpiry: newWholesaler.subscriptionExpiry ? new Date(newWholesaler.subscriptionExpiry) : null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await addDoc(collection(db, COLLECTIONS.TENANTS), wholesalerData);
      
      // Reset form
      setNewWholesaler({
        name: '',
        email: '',
        phone: '',
        subscriptionStatus: 'ACTIVE',
        subscriptionExpiry: ''
      });
      
      setShowCreateWholesaler(false);
      fetchData();
      
    } catch (error) {
      logger.error('Error creating wholesaler', error, { context: 'NewSuperAdminDashboard' });
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage wholesalers and monitor system activity</p>
          </div>
          <Dialog open={showCreateWholesaler} onOpenChange={setShowCreateWholesaler}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Wholesaler
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Wholesaler</DialogTitle>
                <DialogDescription>
                  Add a new wholesaler account to the system
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Wholesaler Name</Label>
                  <Input
                    id="name"
                    value={newWholesaler.name}
                    onChange={(e) => setNewWholesaler(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter wholesaler name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Admin Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newWholesaler.email}
                    onChange={(e) => setNewWholesaler(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="admin@wholesaler.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Admin Phone</Label>
                  <Input
                    id="phone"
                    value={newWholesaler.phone}
                    onChange={(e) => setNewWholesaler(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+91XXXXXXXXXX"
                  />
                </div>
                <div>
                  <Label htmlFor="subscription">Subscription Status</Label>
                  <Select value={newWholesaler.subscriptionStatus} onValueChange={(value) => setNewWholesaler(prev => ({ ...prev, subscriptionStatus: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="EXPIRED">Expired</SelectItem>
                      <SelectItem value="TRIAL">Trial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="expiry">Subscription Expiry</Label>
                  <Input
                    id="expiry"
                    type="date"
                    value={newWholesaler.subscriptionExpiry}
                    onChange={(e) => setNewWholesaler(prev => ({ ...prev, subscriptionExpiry: e.target.value }))}
                  />
                </div>
                <Button onClick={createWholesaler} className="w-full">
                  Create Wholesaler
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search wholesalers or line workers..."
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleWholesalerStatus(wholesaler.id, wholesaler.status)}
                      >
                        {wholesaler.status === 'ACTIVE' ? (
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

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>System-wide activities and events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.description}</p>
                    <p className="text-xs text-gray-500">
                      {activity.userName} • {formatTimestamp(activity.timestamp)}
                    </p>
                  </div>
                  <Badge variant="outline">{activity.type.replace('_', ' ')}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}