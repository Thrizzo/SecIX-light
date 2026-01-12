import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, LogIn } from 'lucide-react';
import { config } from '@/lib/config';

const SignedOut: React.FC = () => {
  const navigate = useNavigate();

  const handleBackToLogin = () => {
    if (config.isSelfHosted()) {
      navigate('/');
    } else {
      navigate('/x7k9m2p4q8w1n5v3b6h0j4f2ry9t6e3a8c1d5g0i2l7o4s');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-primary">
              <Shield className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">SecIX</h1>
              <p className="text-xs text-muted-foreground tracking-wider uppercase">GRC Platform</p>
            </div>
          </div>
        </div>

        <Card className="glass border-border/50 animate-slide-up">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-display">You've been signed out</CardTitle>
            <CardDescription>
              Your session has ended. Sign in again to continue.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex justify-center pt-2 pb-6">
            <Button onClick={handleBackToLogin} className="gap-2">
              <LogIn className="w-4 h-4" />
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignedOut;
