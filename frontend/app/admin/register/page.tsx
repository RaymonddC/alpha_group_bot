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
        <div className="max-w-md w-full bg-slate-800/50 border border-slate-700 rounded-xl p-8">
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
            <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-900/20">
              <p className="text-sm text-amber-300 font-body">
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
      <div className="max-w-md w-full bg-slate-800/50 border border-slate-700 rounded-xl p-8">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h2 className="font-heading text-3xl font-bold text-primary mb-2">
            Create Admin Account
          </h2>
          <p className="text-text/70 font-body">
            Set up your credentials to manage your group
          </p>
        </div>

        {/* Group name badge */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full border border-primary/50 bg-primary/10">
            <span className="text-sm text-primary font-body">
              Registering as admin for: <span className="font-semibold text-text">{groupName}</span>
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm text-slate-400 mb-1 font-body">
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
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors duration-200 font-body"
                placeholder="Your name"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm text-slate-400 mb-1 font-body">
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
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors duration-200 font-body"
                placeholder="admin@example.com"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm text-slate-400 mb-1 font-body">
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
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors duration-200 font-body"
                placeholder="Create a password"
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm text-slate-400 mb-1 font-body">
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
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors duration-200 font-body"
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
            className="cursor-pointer w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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

        <div className="mt-6 pt-4 border-t border-slate-700 text-center">
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
