import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/integrations/database/client';
import { config } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Shield, Lock, Mail, ArrowRight, AlertTriangle, Wand2, UserPlus, User } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(12, 'Password must be at least 12 characters');
const fullNameSchema = z.string().min(2, 'Name must be at least 2 characters').max(100);

type AuthMode = 'password' | 'magic-link';
type AuthView = 'signin' | 'signup';

const Auth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string; fullName?: string }>({});
  const [authMode, setAuthMode] = useState<AuthMode>('password');
  const [authView, setAuthView] = useState<AuthView>('signin');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Show sign-up option only in self-hosted mode
  const showSignUp = config.isSelfHosted();
  // Show magic link only in SaaS mode
  const showMagicLink = config.isSaas();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const validateEmail = () => {
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setErrors({ email: emailResult.error.errors[0].message });
      return false;
    }
    setErrors({});
    return true;
  };

  const validateSignInForm = () => {
    const newErrors: typeof errors = {};

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSignUpForm = () => {
    const newErrors: typeof errors = {};

    const fullNameResult = fullNameSchema.safeParse(fullName);
    if (!fullNameResult.success) {
      newErrors.fullName = fullNameResult.error.errors[0].message;
    }

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateSignInForm()) return;

    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            title: 'Login failed',
            description: 'Invalid email or password. Please try again.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Login failed',
            description: error.message,
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Welcome back!',
          description: 'You have successfully logged in.',
        });
        navigate('/dashboard');
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateSignUpForm()) return;

    setIsLoading(true);

    try {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          toast({
            title: 'Account exists',
            description: 'An account with this email already exists. Please sign in instead.',
            variant: 'destructive',
          });
          setAuthView('signin');
        } else {
          toast({
            title: 'Sign up failed',
            description: error.message,
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Account created!',
          description: 'You have successfully created your admin account. Please sign in.',
        });
        setAuthView('signin');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail()) return;

    // Magic links only work in SaaS mode
    if (!config.isSaas()) {
      toast({
        title: 'Not available',
        description: 'Magic links are only available in cloud mode. Please use password login.',
        variant: 'destructive',
      });
      setAuthMode('password');
      return;
    }

    setIsLoading(true);

    try {
      // Dynamic import so self-hosted builds don't require Supabase env vars
      const { supabase } = await import('@/integrations/supabase/client');

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setMagicLinkSent(true);
        toast({
          title: 'Check your email',
          description: 'We sent you a magic link to sign in.',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setErrors({ email: 'Please enter your email address first' });
      return;
    }

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setErrors({ email: emailResult.error.errors[0].message });
      return;
    }

    setIsLoading(true);

    try {
      const result = await db.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      const error = result.error;

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Check your email',
          description: 'We sent you a password reset link.',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearForm = () => {
    setErrors({});
    setPassword('');
    setConfirmPassword('');
    setMagicLinkSent(false);
  };

  const handleSubmit = authView === 'signup' 
    ? handleSignUp 
    : (authMode === 'password' ? handlePasswordSignIn : handleMagicLinkSubmit);

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
            <CardTitle className="text-xl font-display">
              {authView === 'signup' ? 'Create Admin Account' : 'Welcome back'}
            </CardTitle>
            <CardDescription>
              {authView === 'signup' 
                ? 'Set up your first administrator account'
                : 'Sign in to access your GRC dashboard'
              }
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Sign-in / Sign-up toggle for self-hosted mode */}
            {showSignUp && (
              <div className="flex gap-2 mb-6">
                <Button
                  type="button"
                  variant={authView === 'signin' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setAuthView('signin');
                    clearForm();
                  }}
                >
                  <User className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
                <Button
                  type="button"
                  variant={authView === 'signup' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setAuthView('signup');
                    clearForm();
                  }}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Sign Up
                </Button>
              </div>
            )}

            {/* Auth mode toggle - only show if magic link is available and in sign-in view */}
            {showMagicLink && authView === 'signin' && (
              <div className="flex gap-2 mb-6">
                <Button
                  type="button"
                  variant={authMode === 'password' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setAuthMode('password');
                    setMagicLinkSent(false);
                  }}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Password
                </Button>
                <Button
                  type="button"
                  variant={authMode === 'magic-link' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setAuthMode('magic-link');
                    setMagicLinkSent(false);
                  }}
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  Magic Link
                </Button>
              </div>
            )}

            {magicLinkSent ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Check your email</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    We sent a magic link to <span className="font-medium">{email}</span>
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMagicLinkSent(false)}
                >
                  Use a different email
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name - only for sign-up */}
                {authView === 'signup' && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm font-medium">
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {errors.fullName && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {errors.fullName}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {errors.email}
                    </p>
                  )}
                </div>

                {(authMode === 'password' || authView === 'signup') && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-sm font-medium">
                          Password
                        </Label>
                        {authView === 'signin' && (
                          <button
                            type="button"
                            onClick={handleForgotPassword}
                            className="text-xs text-primary hover:underline"
                            disabled={isLoading}
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      {errors.password && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {errors.password}
                        </p>
                      )}
                    </div>

                    {/* Confirm Password - only for sign-up */}
                    {authView === 'signup' && (
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-sm font-medium">
                          Confirm Password
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="••••••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        {errors.confirmPassword && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {errors.confirmPassword}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      {authView === 'signup' 
                        ? 'Creating account...' 
                        : (authMode === 'password' ? 'Signing in...' : 'Sending link...')
                      }
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {authView === 'signup' 
                        ? 'Create Account' 
                        : (authMode === 'password' ? 'Sign In' : 'Send Magic Link')
                      }
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </form>
            )}

            <p className="text-center text-xs text-muted-foreground mt-4">
              {authView === 'signup' 
                ? 'This account will have full administrative privileges.'
                : (showSignUp 
                    ? 'First time? Click "Sign Up" to create an admin account.'
                    : 'Need access? Contact your administrator for an invitation link.'
                  )
              }
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to SecIX's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default Auth;
