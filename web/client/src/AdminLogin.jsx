import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@app/components/ui/button.jsx';
import { Input } from '@app/components/ui/input.jsx';
import { Label } from '@app/components/ui/label.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@app/components/ui/card.jsx';
import { Shield } from 'lucide-react';
import worktrackrLogo from './assets/worktrackr_icon_only.png';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Check if user is master admin
        const sessionResp = await fetch('/api/auth/session', {
          credentials: 'include'
        });
        const sessionData = await sessionResp.json();

        if (sessionData.user?.is_master_admin) {
          // Redirect to admin dashboard
          navigate('/admin87476463/dashboard');
        } else {
          setError('Access denied. Master admin privileges required.');
          // Log out non-admin user
          await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
          });
        }
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-gray-700 bg-gray-800/50 backdrop-blur">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <img src={worktrackrLogo} alt="WorkTrackr" className="w-16 h-16" />
              <div className="absolute -bottom-1 -right-1 bg-red-600 rounded-full p-1">
                <Shield className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl font-bold text-white">Master Admin</CardTitle>
            <CardDescription className="text-gray-400">
              Restricted access - Authorized personnel only
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-900/20 border border-red-600 text-red-400 px-4 py-3 rounded">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                placeholder="admin@example.com"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Access Admin Panel'}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-gray-500">
            <p>⚠️ Unauthorized access attempts are logged and monitored</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
