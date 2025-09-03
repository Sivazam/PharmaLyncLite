'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RetailerAuth } from '@/components/RetailerAuth';
import { AuthComponent } from '@/components/auth/AuthComponent';
import { Store, Users, User as UserIcon, ArrowLeft, Smartphone } from 'lucide-react';

interface RoleSelectionProps {
  onRoleSelect: (role: string) => void;
  onBack: () => void;
}

export function RoleSelection({ onRoleSelect, onBack }: RoleSelectionProps) {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const roles = [
    {
      id: 'WHOLESALER_ADMIN',
      title: 'Wholesale Admin',
      description: 'Manage retailers, Line Workers, and track payment collections',
      icon: Users,
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      id: 'LINE_WORKER',
      title: 'Line Worker',
      description: 'Collect payments from retailers using OTP verification',
      icon: UserIcon,
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      id: 'SUPER_ADMIN',
      title: 'Super Admin',
      description: 'System-wide administration - manage wholesalers and monitor system',
      icon: Smartphone,
      color: 'bg-red-500 hover:bg-red-600'
    }
  ];

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    onRoleSelect(role);
  };

  // Removed retailer authentication - retailers no longer login
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-4">
      <div className="w-full max-w-4xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Login
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Select Your Role</h1>
          <p className="text-gray-600 mb-4">Choose your role to access the appropriate dashboard</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Card 
                key={role.id} 
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  selectedRole === role.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => handleRoleSelect(role.id)}
              >
                <CardHeader className="text-center">
                  <div className={`w-16 h-16 rounded-full ${role.color} flex items-center justify-center mx-auto mb-4`}>
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl">{role.title}</CardTitle>
                  <CardDescription>{role.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className={`w-full ${role.color} text-white`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRoleSelect(role.id);
                    }}
                  >
                    Access {role.title}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Don't have an account? Contact your administrator to get access.
          </p>
        </div>
      </div>
    </div>
  );
}