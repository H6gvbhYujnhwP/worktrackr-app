import React, { useState, useEffect } from 'react';
import { useAuth, useSimulation } from '../App.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { 
  Building2, 
  LogOut, 
  Plus, 
  Search, 
  Users, 
  DollarSign, 
  TrendingUp,
  Settings,
  Eye,
  Edit,
  Trash2,
  Crown,
  Palette,
  Globe,
  BarChart3,
  Calendar,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Download,
  Upload,
  Zap,
  Shield,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw
} from 'lucide-react';

// Mock data for reseller dashboard
const mockCustomerCompanies = [
  {
    id: 'comp-1',
    name: 'TechCorp Solutions',
    domain: 'techcorp.worktrackr.cloud',
    plan: 'pro',
    users: 12,
    maxUsers: 25,
    monthlyRevenue: 99,
    status: 'active',
    createdAt: '2024-01-15',
    lastActive: '2024-01-20',
    contactEmail: 'admin@techcorp.com',
    contactName: 'Sarah Johnson',
    branding: {
      logo: null,
      primaryColor: '#3b82f6',
      companyName: 'TechCorp Solutions'
    }
  },
  {
    id: 'comp-2',
    name: 'BuildRight Construction',
    domain: 'buildright.worktrackr.cloud',
    plan: 'starter',
    users: 3,
    maxUsers: 5,
    monthlyRevenue: 49,
    status: 'active',
    createdAt: '2024-01-10',
    lastActive: '2024-01-19',
    contactEmail: 'manager@buildright.com',
    contactName: 'Mike Thompson',
    branding: {
      logo: null,
      primaryColor: '#f59e0b',
      companyName: 'BuildRight Construction'
    }
  },
  {
    id: 'comp-3',
    name: 'MedCare Clinic',
    domain: 'medcare.worktrackr.cloud',
    plan: 'enterprise',
    users: 45,
    maxUsers: 999,
    monthlyRevenue: 299,
    status: 'trial',
    createdAt: '2024-01-18',
    lastActive: '2024-01-20',
    contactEmail: 'it@medcare.com',
    contactName: 'Dr. Lisa Chen',
    branding: {
      logo: null,
      primaryColor: '#10b981',
      companyName: 'MedCare Clinic'
    }
  }
];

const mockResellerStats = {
  totalRevenue: 447,
  commission: 112, // 25% of total revenue
  totalCustomers: 3,
  activeUsers: 60,
  trialCustomers: 1,
  churnRate: 5.2,
  growthRate: 23.5
};

export default function ResellerDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBrandingModal, setShowBrandingModal] = useState(false);
  const [customerCompanies, setCustomerCompanies] = useState(mockCustomerCompanies);
  const [resellerStats, setResellerStats] = useState(mockResellerStats);

  // Filter companies based on search
  const filteredCompanies = customerCompanies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.contactEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPlanBadge = (plan) => {
    const planConfig = {
      starter: { label: 'Starter', color: 'bg-blue-100 text-blue-800' },
      pro: { label: 'Pro', color: 'bg-purple-100 text-purple-800' },
      enterprise: { label: 'Enterprise', color: 'bg-green-100 text-green-800' }
    };
    return planConfig[plan] || planConfig.starter;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { label: 'Active', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      trial: { label: 'Trial', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      suspended: { label: 'Suspended', color: 'bg-red-100 text-red-800', icon: AlertCircle }
    };
    return statusConfig[status] || statusConfig.active;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Building2 className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">WorkTrackr</h1>
                  <p className="text-xs text-gray-500">Reseller Portal</p>
                </div>
              </div>
            </div>

            {/* User Info and Actions */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <Badge variant="default" className="text-xs">Reseller</Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <DollarSign className="w-6 h-6 text-green-600 mr-2" />
                <div>
                  <p className="text-xs font-medium text-gray-600">Monthly Revenue</p>
                  <p className="text-lg font-bold">£{resellerStats.totalRevenue}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <TrendingUp className="w-6 h-6 text-blue-600 mr-2" />
                <div>
                  <p className="text-xs font-medium text-gray-600">Commission</p>
                  <p className="text-lg font-bold">£{resellerStats.commission}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Building2 className="w-6 h-6 text-purple-600 mr-2" />
                <div>
                  <p className="text-xs font-medium text-gray-600">Customers</p>
                  <p className="text-lg font-bold">{resellerStats.totalCustomers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Users className="w-6 h-6 text-orange-600 mr-2" />
                <div>
                  <p className="text-xs font-medium text-gray-600">Total Users</p>
                  <p className="text-lg font-bold">{resellerStats.activeUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest customer activities and updates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-sm font-medium">TechCorp Solutions upgraded to Pro</p>
                        <p className="text-xs text-gray-500">2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Plus className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium">New customer: MedCare Clinic</p>
                        <p className="text-xs text-gray-500">1 day ago</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Users className="w-5 h-5 text-purple-500" />
                      <div>
                        <p className="text-sm font-medium">BuildRight added 2 new users</p>
                        <p className="text-xs text-gray-500">3 days ago</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                  <CardDescription>Your reseller performance this month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Growth Rate</span>
                      <span className="text-sm font-medium text-green-600">+{resellerStats.growthRate}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Churn Rate</span>
                      <span className="text-sm font-medium text-red-600">{resellerStats.churnRate}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Trial Conversions</span>
                      <span className="text-sm font-medium text-blue-600">85%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Avg Revenue/Customer</span>
                      <span className="text-sm font-medium">£{Math.round(resellerStats.totalRevenue / resellerStats.totalCustomers)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Customer
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredCompanies.map((company) => {
                const planBadge = getPlanBadge(company.plan);
                const statusBadge = getStatusBadge(company.status);
                const StatusIcon = statusBadge.icon;

                return (
                  <Card key={company.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{company.name}</CardTitle>
                          <CardDescription>{company.domain}</CardDescription>
                        </div>
                        <div className="flex space-x-1">
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <Badge className={planBadge.color}>{planBadge.label}</Badge>
                          <Badge className={statusBadge.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusBadge.label}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          <div className="flex justify-between">
                            <span>Users:</span>
                            <span>{company.users}/{company.maxUsers}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Revenue:</span>
                            <span className="font-medium">£{company.monthlyRevenue}/mo</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t">
                          <div className="flex items-center text-xs text-gray-500">
                            <Mail className="w-3 h-3 mr-1" />
                            {company.contactEmail}
                          </div>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <Calendar className="w-3 h-3 mr-1" />
                            Created {new Date(company.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Summary</CardTitle>
                  <CardDescription>Your earnings this month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-gray-600">Customer Revenue</span>
                      <span className="font-medium">£{resellerStats.totalRevenue}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-gray-600">Commission (25%)</span>
                      <span className="font-medium text-green-600">£{resellerStats.commission}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-gray-600">Reseller License</span>
                      <span className="font-medium text-red-600">-£399</span>
                    </div>
                    <div className="flex justify-between items-center py-2 font-bold text-lg">
                      <span>Net Profit</span>
                      <span className="text-green-600">£{resellerStats.commission - 399}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                  <CardDescription>Recent commission payments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2">
                      <div>
                        <p className="text-sm font-medium">January 2024</p>
                        <p className="text-xs text-gray-500">Paid on Feb 1, 2024</p>
                      </div>
                      <span className="font-medium text-green-600">£89</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <div>
                        <p className="text-sm font-medium">December 2023</p>
                        <p className="text-xs text-gray-500">Paid on Jan 1, 2024</p>
                      </div>
                      <span className="font-medium text-green-600">£67</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <div>
                        <p className="text-sm font-medium">November 2023</p>
                        <p className="text-xs text-gray-500">Paid on Dec 1, 2023</p>
                      </div>
                      <span className="font-medium text-green-600">£45</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>White-Label Branding</CardTitle>
                <CardDescription>Customize the appearance for your customers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label>Company Logo</Label>
                      <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Upload your logo</p>
                        <Button variant="outline" size="sm" className="mt-2">
                          Choose File
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Primary Color</Label>
                      <div className="mt-2 flex items-center space-x-2">
                        <div className="w-10 h-10 bg-blue-600 rounded border"></div>
                        <Input value="#3b82f6" className="flex-1" />
                        <Button variant="outline" size="sm">
                          <Palette className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Custom Domain</Label>
                    <div className="mt-2 flex items-center space-x-2">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <Input placeholder="your-domain.com" />
                      <Button variant="outline">Configure</Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Set up a custom domain for your customers' WorkTrackr access
                    </p>
                  </div>

                  <Button>
                    <Settings className="w-4 h-4 mr-2" />
                    Save Branding Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Reseller Profile</CardTitle>
                  <CardDescription>Your reseller account information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label>Company Name</Label>
                      <Input value="Your Reseller Company" />
                    </div>
                    <div>
                      <Label>Contact Email</Label>
                      <Input value={user.email} />
                    </div>
                    <div>
                      <Label>Phone Number</Label>
                      <Input placeholder="+44 20 1234 5678" />
                    </div>
                    <div>
                      <Label>Address</Label>
                      <Input placeholder="123 Business Street, London" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Subscription Details</CardTitle>
                  <CardDescription>Your reseller plan information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Current Plan</span>
                      <Badge className="bg-purple-100 text-purple-800">Pro Reseller</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Monthly Fee</span>
                      <span className="font-medium">£399/month</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Customer Limit</span>
                      <span className="font-medium">25 companies</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Commission Rate</span>
                      <span className="font-medium text-green-600">25%</span>
                    </div>
                    <Button variant="outline" className="w-full">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Upgrade Plan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

