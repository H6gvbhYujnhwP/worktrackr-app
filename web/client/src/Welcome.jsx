// web/client/src/Welcome.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';

export default function Welcome() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      setStatus('error');
      setMessage('Missing session information.');
      return;
    }

    async function completeSignup() {
      try {
        const resp = await fetch(`/api/auth/signup/complete?session_id=${sessionId}`, {
          method: 'POST',
          credentials: 'include'
        });
        const data = await resp.json();

        if (!resp.ok) {
          throw new Error(data.error || 'Signup completion failed.');
        }

        setStatus('success');
        setMessage('Your account has been created and you are now logged in!');
        // after a short delay, redirect to dashboard
        setTimeout(() => navigate('/dashboard'), 2000);
      } catch (err) {
        console.error('Signup completion error:', err);
        setStatus('error');
        setMessage(err.message || 'Something went wrong.');
      }
    }

    completeSignup();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader>
          <CardTitle className="text-center">Welcome to WorkTrackr</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-500" />
              <p>Finalizing your signup...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
              <p>{message}</p>
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                Go to Dashboard
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
              <p className="text-red-600">{message}</p>
              <Button onClick={() => navigate('/signup')} className="w-full">
                Back to Signup
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
