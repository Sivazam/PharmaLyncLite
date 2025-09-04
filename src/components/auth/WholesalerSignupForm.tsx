'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { db, COLLECTIONS } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, Mail, Lock, User as UserIcon, Phone, MapPin, Building, CheckCircle } from 'lucide-react';
import { StatusBarColor } from '../ui/StatusBarColor';

const wholesalerSignupSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  displayName: z.string().min(2, 'Contact person name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number').regex(/^[0-9]{10}$/, 'Phone number must be 10 digits'),
  address: z.string().min(10, 'Address must be at least 10 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type WholesalerSignupFormData = z.infer<typeof wholesalerSignupSchema>;

interface WholesalerSignupFormProps {
  onToggleMode: () => void;
  onBackToRoleSelection: () => void;
}

export function WholesalerSignupForm({ onToggleMode, onBackToRoleSelection }: WholesalerSignupFormProps) {
  const { signup } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<WholesalerSignupFormData>({
    resolver: zodResolver(wholesalerSignupSchema)
  });

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setValue('latitude', position.coords.latitude);
          setValue('longitude', position.coords.longitude);
          setLocationEnabled(true);
        },
        (error) => {
          console.log('Location access denied or unavailable');
          setLocationEnabled(false);
        }
      );
    }
  };

  const onSubmit = async (data: WholesalerSignupFormData) => {
    setLoading(true);
    setError(null);
    
    try {
      // Create Firebase Auth user
      const authResult = await signup(data.email, data.password, data.displayName);
      
      if (authResult.user) {
        // Create wholesaler tenant record with approved: false
        const wholesalerData = {
          name: data.businessName,
          adminEmail: data.email,
          adminPhone: data.phone,
          adminName: data.displayName,
          address: data.address,
          location: data.latitude && data.longitude ? {
            latitude: data.latitude,
            longitude: data.longitude
          } : null,
          status: 'ACTIVE',
          subscriptionStatus: 'TRIAL',
          approved: false, // New field - requires admin approval
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        const tenantRef = doc(db, COLLECTIONS.TENANTS, authResult.user.uid);
        await setDoc(tenantRef, wholesalerData);
        
        // Create user record in Firestore for the wholesaler admin
        const userRecord = {
          uid: authResult.user.uid,
          displayName: data.displayName,
          email: data.email,
          phone: data.phone,
          tenantId: authResult.user.uid,
          roles: ['WHOLESALER_ADMIN'],
          active: true,
          approved: false, // New field - requires admin approval
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        await setDoc(doc(db, COLLECTIONS.USERS, authResult.user.uid), userRecord);
        
        setSuccess(true);
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please use a different email or try logging in.');
      } else {
        setError(err.message || 'Failed to create account');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <>
        <StatusBarColor theme="white" />
        
        <Card className="w-full max-w-md mx-auto border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-green-600">
              Registration Successful!
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              Your wholesaler account has been created and is pending admin approval.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-gray-700 mb-4">
                Thank you for registering with PharmaLync. Your account is currently under review by our administration team.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-blue-800 mb-2">What happens next?</h3>
                <ul className="text-sm text-blue-700 space-y-1 text-left">
                  <li>• Our team will review your application within 1-2 hours</li>
                  <li>• You'll receive an email once your account is approved</li>
                  <li>• After approval, you can log in and start using the platform</li>
                </ul>
              </div>
              <p className="text-sm text-gray-500">
                You can now close this window or try logging in after approval.
              </p>
            </div>
            
            <div className="text-center pt-4">
              <Button
                onClick={onBackToRoleSelection}
                variant="outline"
                className="w-full"
              >
                Back to Role Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <StatusBarColor theme="white" />
      
      <Card className="w-full max-w-md mx-auto border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-gray-900">
            Wholesaler Registration
          </CardTitle>
          <CardDescription className="text-center text-gray-600">
            Register your wholesale pharmacy business with PharmaLync
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Business Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2">
                Business Information
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="businessName" className="text-sm font-medium text-gray-700">
                  Business Name *
                </Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="businessName"
                    type="text"
                    placeholder="Enter your business name"
                    className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    {...register('businessName')}
                  />
                </div>
                {errors.businessName && (
                  <p className="text-sm text-red-600">{errors.businessName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                  Business Address *
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-gray-400 h-4 w-4" />
                  <Textarea
                    id="address"
                    placeholder="Enter your complete business address"
                    className="pl-10 min-h-[80px] border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    {...register('address')}
                  />
                </div>
                {errors.address && (
                  <p className="text-sm text-red-600">{errors.address.message}</p>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2">
                Contact Information
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-sm font-medium text-gray-700">
                  Contact Person Name *
                </Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Enter contact person name"
                    className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    {...register('displayName')}
                  />
                </div>
                {errors.displayName && (
                  <p className="text-sm text-red-600">{errors.displayName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                  Phone Number *
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter 10-digit phone number"
                    className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    {...register('phone')}
                  />
                </div>
                {errors.phone && (
                  <p className="text-sm text-red-600">{errors.phone.message}</p>
                )}
              </div>
            </div>

            {/* Location (Optional) */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2">
                Location (Optional)
              </h3>
              
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={getLocation}
                  className="text-xs"
                >
                  <MapPin className="w-3 h-3 mr-1" />
                  {locationEnabled ? 'Location Updated' : 'Get GPS Location'}
                </Button>
                <span className="text-xs text-gray-500">
                  {locationEnabled ? 'Location captured successfully' : 'Help us find your business location'}
                </span>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2">
                Account Security
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a strong password"
                    className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    {...register('password')}
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Confirm Password *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    {...register('confirmPassword')}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-2.5"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Register Wholesaler Account'
              )}
            </Button>
          </form>

          <div className="text-center">
            <div className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onToggleMode}
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Sign in
              </button>
            </div>
            <div className="mt-2">
              <button
                type="button"
                onClick={onBackToRoleSelection}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Back to Role Selection
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}