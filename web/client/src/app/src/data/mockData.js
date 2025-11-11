// Mock data for WorkTrackr simulation

export const mockUsers = [
  {
    id: '1',
    name: 'John Admin',
    email: 'admin@worktrackr.com',
    role: 'admin',
    isOrgOwner: true,
    avatar: null,
    department: 'Management',
    emailNotifications: true,
    status: 'active',
    createdAt: '2024-01-15T10:00:00Z',
    lastActive: '2024-01-20T14:30:00Z'
  },
  {
    id: '2',
    name: 'Sarah Manager',
    email: 'sarah@worktrackr.com',
    role: 'manager',
    isOrgOwner: false,
    avatar: null,
    department: 'Operations',
    emailNotifications: true,
    status: 'active',
    createdAt: '2024-01-16T09:00:00Z',
    lastActive: '2024-01-20T13:45:00Z'
  },
  {
    id: '3',
    name: 'Mike Technician',
    email: 'mike@worktrackr.com',
    role: 'staff',
    isOrgOwner: false,
    avatar: null,
    department: 'IT Support',
    emailNotifications: true,
    status: 'active',
    createdAt: '2024-01-17T08:00:00Z',
    lastActive: '2024-01-20T15:20:00Z'
  },
  {
    id: '4',
    name: 'Lisa Maintenance',
    email: 'lisa@worktrackr.com',
    role: 'staff',
    isOrgOwner: false,
    avatar: null,
    department: 'Maintenance',
    emailNotifications: true,
    status: 'active',
    createdAt: '2024-01-18T07:30:00Z',
    lastActive: '2024-01-20T12:15:00Z'
  },
  {
    id: '5',
    name: 'David Inspector',
    email: 'david@worktrackr.com',
    role: 'staff',
    isOrgOwner: false,
    avatar: null,
    department: 'Quality Control',
    emailNotifications: true,
    status: 'active',
    createdAt: '2024-01-19T07:00:00Z',
    lastActive: '2024-01-20T11:30:00Z'
  }
];

// Start with empty tickets - users will create their own
export const mockTickets = [];

export const mockWorkflows = [
  {
    id: 'wf-1',
    name: 'Maintenance Request Workflow',
    description: 'Standard workflow for maintenance requests',
    stages: [
      { id: 'stage-1', name: 'New Request', color: '#3b82f6' },
      { id: 'stage-2', name: 'Assessment', color: '#f59e0b' },
      { id: 'stage-3', name: 'In Progress', color: '#10b981' },
      { id: 'stage-4', name: 'Review', color: '#8b5cf6' },
      { id: 'stage-5', name: 'Completed', color: '#6b7280' }
    ],
    isActive: true,
    createdAt: '2024-01-15T10:00:00Z'
  }
];

export const mockEmailLogs = [];

export const ticketStatuses = [
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-800' },
  { value: 'assigned', label: 'Assigned', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-green-100 text-green-800' },
  { value: 'waiting_approval', label: 'Waiting Approval', color: 'bg-purple-100 text-purple-800' },
  { value: 'parked', label: 'Parked', color: 'bg-orange-100 text-orange-800' },
  { value: 'completed', label: 'Completed', color: 'bg-gray-100 text-gray-800' },
  { value: 'billed', label: 'Billed', color: 'bg-green-100 text-green-800' },
  { value: 'deleted', label: 'Deleted', color: 'bg-red-100 text-red-800' }
];

export const priorities = [
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' }
];

export const categories = [
  { value: 'hvac', label: 'HVAC' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'security', label: 'Security' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'general', label: 'General' }
];



export const mockOrganization = {
  id: 'org-1',
  name: 'WorkTrackr Demo Organization',
  subscription: {
    plan: 'pro',
    maxUsers: 5,
    currentUsers: 1,
    additionalSeats: 0,
    billingCycle: 'monthly',
    amount: 99,
    status: 'active',
    nextBilling: '2024-12-20',
    stripeCustomerId: 'cus_example123',
    stripeSubscriptionId: 'sub_example456'
  },
  createdAt: '2024-01-15T10:00:00Z'
};

// Subscription plans
export const subscriptionPlans = {
  starter: { 
    id: 'starter',
    name: 'Starter', 
    maxUsers: 1, 
    price: 49,
    currency: '£',
    interval: 'month',
    stripePriceId: 'price_starter_49',
    features: [
      'Basic ticketing',
      'Email notifications',
      'Up to 1 user'
    ]
  },
  pro: { 
    id: 'pro',
    name: 'Pro', 
    maxUsers: 5, 
    price: 99,
    currency: '£',
    interval: 'month',
    stripePriceId: 'price_pro_99',
    features: [
      'Workflow builder',
      'Reports & inspections',
      'Approvals',
      'Up to 5 users'
    ]
  },
  enterprise: { 
    id: 'enterprise',
    name: 'Enterprise', 
    maxUsers: 50, 
    price: 299,
    currency: '£',
    interval: 'month',
    stripePriceId: 'price_enterprise_299',
    features: [
      'Unlimited users',
      'Custom branding',
      'Partner admin access',
      'Dedicated support'
    ]
  }
};

// Additional seat pricing
export const additionalSeatPrice = {
  price: 15,
  currency: '£',
  interval: 'month',
  stripePriceId: 'price_additional_seat_15'
};

