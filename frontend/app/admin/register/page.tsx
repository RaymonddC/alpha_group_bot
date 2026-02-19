'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Shield, Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import { validateRegistrationToken, adminRegister } from '@/lib/api';
import Link from 'next/link';

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-text/70 font-body">Validating your registration link...</p>
      </div>
    </div>
  );
}

function RegisterContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [groupName, setGroupName] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      setErrorMessage('No registration token provided.');
      return;
    }
    validateRegistrationToken(token)
      .then(data => {
        if (data.valid) {
          setStatus('valid');
          setGroupName(data.groupName);
          setTelegramUsername(data.telegramUsername || '');
          if (data.telegramUsername) setName(data.telegramUsername);
        } else {
          setStatus('invalid');
          setErrorMessage(data.error || 'Invalid token');
        }
      })
      .catch(err => {
        setStatus('invalid');
        setErrorMessage(err.message || 'Failed to validate token');
      });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      const result = await adminRegister({ token: token!, name, email, password });
      if (result.success) {
        localStorage.setItem('admin_token', result.token);
        if (result.groups && result.groups.length > 0) {
          localStorage.setItem('admin_groups', JSON.stringify(result.groups));
          localStorage.setItem('admin_active_group', result.groups[0].id);
        } else if (result.groupId) {
          localStorage.setItem('admin_active_group', result.groupId);
        }
        router.push('/admin');
      } else {
        setFormError(result.error || 'Registration failed');
      }
    } catch (err: any) {
      setFormError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  // Loading state
  if (status === 'loading') {
    return <LoadingState />;
  }

  // Invalid/expired token state
  if (status === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full bg-background/80 border border-primary/20 rounded-2xl p-8 shadow-xl">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <h2 className="font-heading text-2xl font-bold text-red-400 mb-2">
              Invalid Registration Link
            </h2>
            <p className="text-text/70 font-body mb-6">
              {errorMessage}
            </p>
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/10">
              <p className="text-sm text-primary font-body">
                Request a new link by typing /admin in your group
              </p>
            </div>
            <div className="mt-6">
              <Link
                href="/admin/login"
                className="text-sm text-primary hover:text-primary/80 transition-colors duration-200 font-body"
              >
                Already have an account? Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Valid token — registration form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="max-w-md w-full space-y-8 bg-background/80 p-8 rounded-2xl border border-primary/20 shadow-xl">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h2 className="font-heading text-3xl font-bold mb-2">
            Create Admin Account
          </h2>
          <p className="text-text/70 font-body">
            Set up your credentials to manage your group
          </p>
        </div>

        {/* Group name badge */}
        <div className="flex justify-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full border border-primary/50 bg-primary/10">
            <span className="text-sm text-primary font-body">
              Registering as admin for: <span className="font-semibold text-text">{groupName}</span>
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2 text-text/80 font-body">
              Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text/40" />
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-background border border-text/20 rounded-lg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-text font-body"
                placeholder="Your name"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2 text-text/80 font-body">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text/40" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-background border border-text/20 rounded-lg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-text font-body"
                placeholder="admin@example.com"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2 text-text/80 font-body">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text/40" />
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-background border border-text/20 rounded-lg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-text font-body"
                placeholder="Create a password"
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2 text-text/80 font-body">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text/40" />
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-background border border-text/20 rounded-lg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-text font-body"
                placeholder="Confirm your password"
              />
            </div>
          </div>

          {/* Form error */}
          {formError && (
            <div className="flex items-center p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-400 mr-2 flex-shrink-0" />
              <p className="text-sm text-red-400 font-body">{formError}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitting}
            className="cursor-pointer w-full py-3 px-4 bg-primary hover:bg-primary/90 text-background font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Creating Account...
              </>
            ) : (
              'Create Admin Account'
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-text/10 text-center">
          <p className="text-sm text-text/50 font-body">
            Already have an account?{' '}
            <Link
              href="/admin/login"
              className="text-primary hover:text-primary/80 transition-colors duration-200"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <RegisterContent />
    </Suspense>
  );
}
