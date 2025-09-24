import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { Loader2, Building2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    login(email, password);
    
    // Simulate login success after loading
    setTimeout(() => {
      navigate('/dashboard');
    }, 1000);
  };

  const quickLogin = (userEmail) => {
    setEmail(userEmail);
    setPassword('password');
    login(userEmail, 'password');
    setTimeout(() => {
      navigate('/dashboard');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Building2 className="w-12 h-12 text-blue-600 mr-3" />
            <div className="text-3xl font-bold">
              Work<span className="text-yellow-500">Trackr</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Simulation Login</h1>
          <p className="text-gray-600 mt-2">
            Test the complete WorkTrackr experience
          </p>
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  disabled={loading}
                />
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={loading}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Quick Login Options */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Login (Demo)</CardTitle>
            <CardDescription>
              Click to login as different user types
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => quickLogin('admin@worktrackr.com')}
              disabled={loading}
            >
              <div className="text-left">
                <div className="font-medium">John Admin</div>
                <div className="text-sm text-gray-500">Organization Owner / Admin</div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => quickLogin('sarah@worktrackr.com')}
              disabled={loading}
            >
              <div className="text-left">
                <div className="font-medium">Sarah Manager</div>
                <div className="text-sm text-gray-500">Manager Role</div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => quickLogin('mike@worktrackr.com')}
              disabled={loading}
            >
              <div className="text-left">
                <div className="font-medium">Mike Technician</div>
                <div className="text-sm text-gray-500">Staff Member</div>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* Demo Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h3 className="font-medium text-blue-900 mb-2">Demo Features</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Complete ticket management system</li>
              <li>• User assignment and ticket passing</li>
              <li>• Email notifications (simulated)</li>
              <li>• Admin approval workflows</li>
              <li>• Custom workflow builder</li>
              <li>• Real-time updates</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

