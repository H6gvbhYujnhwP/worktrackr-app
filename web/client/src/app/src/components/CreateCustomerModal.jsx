import React, { useState } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { 
  X, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  User, 
  CreditCard,
  Palette,
  Upload,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function CreateCustomerModal({ isOpen, onClose, onSave }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Company Information
    companyName: '',
    domain: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    
    // Subscription Details
    plan: 'starter',
    billingCycle: 'monthly',
    trialDays: 7,
    
    // Admin User
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    
    // Branding
    primaryColor: '#3b82f6',
    logo: null,
    customDomain: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const planOptions = [
    { 
      value: 'starter', 
      label: 'Starter', 
      price: 49, 
      users: 5,
      features: ['Basic ticketing', 'Email notifications', 'Mobile app']
    },
    { 
      value: 'pro', 
      label: 'Pro', 
      price: 99, 
      users: 25,
      features: ['Workflow builder', 'Reports & inspections', 'Approvals', 'API access']
    },
    { 
      value: 'enterprise', 
      label: 'Enterprise', 
      price: 299, 
      users: 999,
      features: ['Unlimited users', 'Advanced workflows', 'White-labeling', 'Priority support']
    }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const generateDomain = (companyName) => {
    return companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20) + '.worktrackr.cloud';
  };

  const validateStep = (stepNumber) => {
    const newErrors = {};
    
    if (stepNumber === 1) {
      if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required';
      if (!formData.contactName.trim()) newErrors.contactName = 'Contact name is required';
      if (!formData.contactEmail.trim()) newErrors.contactEmail = 'Contact email is required';
      if (formData.contactEmail && !/\S+@\S+\.\S+/.test(formData.contactEmail)) {
        newErrors.contactEmail = 'Please enter a valid email address';
      }
    }
    
    if (stepNumber === 3) {
      if (!formData.adminName.trim()) newErrors.adminName = 'Admin name is required';
      if (!formData.adminEmail.trim()) newErrors.adminEmail = 'Admin email is required';
      if (formData.adminEmail && !/\S+@\S+\.\S+/.test(formData.adminEmail)) {
        newErrors.adminEmail = 'Please enter a valid email address';
      }
      if (!formData.adminPassword || formData.adminPassword.length < 8) {
        newErrors.adminPassword = 'Password must be at least 8 characters';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      if (step === 1 && !formData.domain) {
        handleInputChange('domain', generateDomain(formData.companyName));
      }
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) return;
    
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newCustomer = {
        id: `comp-${Date.now()}`,
        name: formData.companyName,
        domain: formData.domain,
        plan: formData.plan,
        users: 1,
        maxUsers: planOptions.find(p => p.value === formData.plan).users,
        monthlyRevenue: planOptions.find(p => p.value === formData.plan).price,
        status: formData.trialDays > 0 ? 'trial' : 'active',
        createdAt: new Date().toISOString().split('T')[0],
        lastActive: new Date().toISOString().split('T')[0],
        contactEmail: formData.contactEmail,
        contactName: formData.contactName,
        branding: {
          logo: formData.logo,
          primaryColor: formData.primaryColor,
          companyName: formData.companyName
        }
      };
      
      onSave(newCustomer);
      onClose();
      
      // Reset form
      setFormData({
        companyName: '',
        domain: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        address: '',
        plan: 'starter',
        billingCycle: 'monthly',
        trialDays: 7,
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        primaryColor: '#3b82f6',
        logo: null,
        customDomain: ''
      });
      setStep(1);
      
    } catch (error) {
      console.error('Error creating customer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const selectedPlan = planOptions.find(p => p.value === formData.plan);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Add New Customer</h2>
            <p className="text-sm text-gray-500">Step {step} of 4</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-2">
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  stepNum <= step 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {stepNum < step ? <CheckCircle className="w-4 h-4" /> : stepNum}
                </div>
                {stepNum < 4 && (
                  <div className={`w-12 h-1 mx-2 ${
                    stepNum < step ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Step 1: Company Information */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label>Company Name *</Label>
                <Input
                  value={formData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  placeholder="Enter company name"
                  className={errors.companyName ? 'border-red-500' : ''}
                />
                {errors.companyName && (
                  <p className="text-sm text-red-500 mt-1">{errors.companyName}</p>
                )}
              </div>

              <div>
                <Label>Subdomain</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    value={formData.domain}
                    onChange={(e) => handleInputChange('domain', e.target.value)}
                    placeholder="company.worktrackr.cloud"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleInputChange('domain', generateDomain(formData.companyName))}
                  >
                    Generate
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Contact Name *</Label>
                  <Input
                    value={formData.contactName}
                    onChange={(e) => handleInputChange('contactName', e.target.value)}
                    placeholder="John Smith"
                    className={errors.contactName ? 'border-red-500' : ''}
                  />
                  {errors.contactName && (
                    <p className="text-sm text-red-500 mt-1">{errors.contactName}</p>
                  )}
                </div>

                <div>
                  <Label>Contact Email *</Label>
                  <Input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                    placeholder="john@company.com"
                    className={errors.contactEmail ? 'border-red-500' : ''}
                  />
                  {errors.contactEmail && (
                    <p className="text-sm text-red-500 mt-1">{errors.contactEmail}</p>
                  )}
                </div>
              </div>

              <div>
                <Label>Phone Number</Label>
                <Input
                  value={formData.contactPhone}
                  onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                  placeholder="+44 20 1234 5678"
                />
              </div>

              <div>
                <Label>Address</Label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="123 Business Street, London, UK"
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Step 2: Subscription Plan */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <Label>Select Plan</Label>
                <div className="grid grid-cols-1 gap-4 mt-3">
                  {planOptions.map((plan) => (
                    <div
                      key={plan.value}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        formData.plan === plan.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleInputChange('plan', plan.value)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium">{plan.label}</h3>
                            <Badge variant={plan.value === 'pro' ? 'default' : 'secondary'}>
                              {plan.value === 'pro' ? 'Popular' : `Up to ${plan.users} users`}
                            </Badge>
                          </div>
                          <p className="text-2xl font-bold text-blue-600 mt-1">
                            £{plan.price}<span className="text-sm text-gray-500">/month</span>
                          </p>
                          <ul className="text-sm text-gray-600 mt-2 space-y-1">
                            {plan.features.map((feature, index) => (
                              <li key={index} className="flex items-center">
                                <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          formData.plan === plan.value
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {formData.plan === plan.value && (
                            <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Billing Cycle</Label>
                  <Select value={formData.billingCycle} onValueChange={(value) => handleInputChange('billingCycle', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly (10% discount)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Trial Period (days)</Label>
                  <Select value={formData.trialDays.toString()} onValueChange={(value) => handleInputChange('trialDays', parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">No trial</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Admin User */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-blue-600 mr-2" />
                  <p className="text-sm text-blue-800">
                    This user will be the primary administrator for {formData.companyName}
                  </p>
                </div>
              </div>

              <div>
                <Label>Admin Name *</Label>
                <Input
                  value={formData.adminName}
                  onChange={(e) => handleInputChange('adminName', e.target.value)}
                  placeholder="Admin full name"
                  className={errors.adminName ? 'border-red-500' : ''}
                />
                {errors.adminName && (
                  <p className="text-sm text-red-500 mt-1">{errors.adminName}</p>
                )}
              </div>

              <div>
                <Label>Admin Email *</Label>
                <Input
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                  placeholder="admin@company.com"
                  className={errors.adminEmail ? 'border-red-500' : ''}
                />
                {errors.adminEmail && (
                  <p className="text-sm text-red-500 mt-1">{errors.adminEmail}</p>
                )}
              </div>

              <div>
                <Label>Temporary Password *</Label>
                <Input
                  type="password"
                  value={formData.adminPassword}
                  onChange={(e) => handleInputChange('adminPassword', e.target.value)}
                  placeholder="Minimum 8 characters"
                  className={errors.adminPassword ? 'border-red-500' : ''}
                />
                {errors.adminPassword && (
                  <p className="text-sm text-red-500 mt-1">{errors.adminPassword}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  The admin will be prompted to change this password on first login
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Branding & Review */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-4">Branding Options</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Primary Color</Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <div 
                        className="w-10 h-10 rounded border"
                        style={{ backgroundColor: formData.primaryColor }}
                      />
                      <Input
                        value={formData.primaryColor}
                        onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Custom Domain (Optional)</Label>
                    <Input
                      value={formData.customDomain}
                      onChange={(e) => handleInputChange('customDomain', e.target.value)}
                      placeholder="tickets.company.com"
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-medium mb-4">Review & Confirm</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Company:</span>
                    <span className="text-sm font-medium">{formData.companyName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Domain:</span>
                    <span className="text-sm font-medium">{formData.domain}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Plan:</span>
                    <span className="text-sm font-medium">{selectedPlan?.label} - £{selectedPlan?.price}/month</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Admin:</span>
                    <span className="text-sm font-medium">{formData.adminName} ({formData.adminEmail})</span>
                  </div>
                  {formData.trialDays > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Trial:</span>
                      <span className="text-sm font-medium">{formData.trialDays} days</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="flex space-x-2">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {step < 4 ? (
              <Button onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Customer'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

