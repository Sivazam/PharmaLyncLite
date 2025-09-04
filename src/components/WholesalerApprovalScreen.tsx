'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, COLLECTIONS } from '@/lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBarColor } from '@/components/ui/StatusBarColor';
import { Loader2, Clock, CheckCircle, Mail, Phone, LogOut } from 'lucide-react';

export function WholesalerApprovalScreen() {
  const { user, logout } = useAuth();
  const [wholesalerData, setWholesalerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.tenantId) return;

    // Set up real-time listener for wholesaler approval status
    const unsubscribe = onSnapshot(
      doc(db, COLLECTIONS.TENANTS, user.tenantId),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setWholesalerData(data);
          
          // If approved, redirect to dashboard by reloading the page
          if (data.approved) {
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          }
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to wholesaler data:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.tenantId]);

  const handleLogout = () => {
    logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-600 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Checking approval status...</p>
        </div>
      </div>
    );
  }

  // If approved, show success message before redirect
  if (wholesalerData?.approved) {
    return (
      <div className="min-h-screen bg-green-600 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-green-600">Account Approved!</CardTitle>
            <CardDescription>
              Your wholesaler account has been approved. Redirecting to dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <>
      <StatusBarColor theme="blue" />
      
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl mx-auto">
          {/* Main Approval Card */}
          <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center space-y-4">
              {/* Status Icon */}
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Clock className="w-10 h-10 text-blue-600" />
              </div>
              
              <CardTitle className="text-3xl font-bold text-gray-900">
                Account Under Review
              </CardTitle>
              
              <CardDescription className="text-lg text-gray-600 max-w-md mx-auto">
                Your wholesaler account is currently being reviewed by our administration team
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Business Information */}
              {wholesalerData && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-gray-800 text-center">Business Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Building className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">{wholesalerData.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">{wholesalerData.adminEmail}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">{wholesalerData.adminPhone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">
                        Applied: {new Date(wholesalerData.createdAt?.toDate()).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Timeline */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 text-center">What to Expect</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Application Submitted</p>
                      <p className="text-xs text-gray-500">Your wholesaler registration has been received</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Loader2 className="w-3 h-3 text-yellow-600 animate-spin" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Under Review</p>
                      <p className="text-xs text-gray-500">Our team is verifying your business details</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Approval</p>
                      <p className="text-xs text-gray-500">You'll receive email notification upon approval</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Important Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-800">Important Information</h4>
                    <ul className="text-sm text-blue-700 mt-2 space-y-1">
                      <li>• Typical approval time: 1-2 business hours</li>
                      <li>• You'll receive an email once approved</li>
                      <li>• This page will automatically redirect when approved</li>
                      <li>• You can safely close this window and check back later</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              {/* Contact Support */}
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-600">
                  Need immediate assistance? Contact our support team:
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm">
                  <a href="tel:9014882779" className="flex items-center text-blue-600 hover:text-blue-700">
                    <Phone className="w-4 h-4 mr-1" />
                    +91 9014882779
                  </a>
                  <a href="mailto:support@pharmalynk.com" className="flex items-center text-blue-600 hover:text-blue-700">
                    <Mail className="w-4 h-4 mr-1" />
                    support@pharmalynk.com
                  </a>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="flex-1"
                >
                  Check Status
                </Button>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="flex-1"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Auto-refresh Notice */}
          <div className="text-center mt-6">
            <p className="text-white/80 text-sm">
              This page automatically refreshes every 30 seconds
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// Add Building icon import
import { Building } from 'lucide-react';