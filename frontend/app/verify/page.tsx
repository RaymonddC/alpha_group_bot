'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <p className="text-text/70">Loading...</p>
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}

function VerifyContent() {
  const { publicKey, signMessage } = useWallet();
  const searchParams = useSearchParams();
  const telegramId = searchParams.get('tid');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [fairscore, setFairscore] = useState<number | null>(null);
  const [tier, setTier] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!publicKey || !signMessage || !telegramId) return;

    setStatus('loading');
    setMessage('');

    try {
      const timestamp = new Date().toISOString();
      const nonce = crypto.randomUUID();
      const verifyMessage = `Sign in to Alpha Groups

URI: ${window.location.origin}
Telegram ID: ${telegramId}
Issued At: ${timestamp}
Nonce: ${nonce}

This signature is free and proves wallet ownership.`;

      const encodedMessage = new TextEncoder().encode(verifyMessage);
      const signature = await signMessage(encodedMessage);

      const response = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL + '/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId,
          publicKey: publicKey.toString(),
          signature: Array.from(signature),
          message: verifyMessage
        })
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setFairscore(data.fairscore);
        setTier(data.tier);
        setMessage(`Wallet verified successfully! You've been granted access.`);
      } else {
        setStatus('error');
        setFairscore(data.fairscore);
        setMessage(data.error || 'Verification failed. Please try again.');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Failed to sign message. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full space-y-8 bg-background/80 p-8 rounded-2xl border border-primary/20 shadow-xl">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-cta/20 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-cta" />
          </div>
          <h2 className="font-heading text-3xl font-bold mb-2">Verify Your Wallet</h2>
          <p className="text-text/70">
            Connect your Solana wallet to verify your reputation and access Alpha Groups
          </p>
        </div>

        <div className="space-y-4">
          <div className="w-full">
            <WalletMultiButton className="!w-full !bg-cta hover:!bg-cta/90 !transition-all !duration-200 !rounded-lg !h-12" />
          </div>

          {publicKey && (
            <button
              onClick={handleVerify}
              disabled={status === 'loading'}
              className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-background font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer flex items-center justify-center"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Wallet'
              )}
            </button>
          )}

          {message && (
            <div
              className={`p-4 rounded-lg border transition-all duration-200 ${
                status === 'success'
                  ? 'bg-green-900/20 border-green-500/30 text-green-300'
                  : 'bg-red-900/20 border-red-500/30 text-red-300'
              }`}
            >
              <div className="flex items-start">
                {status === 'success' ? (
                  <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold">{message}</p>
                  {fairscore !== null && (
                    <div className="mt-2 space-y-1">
                      <p className="text-sm">FairScore: <span className="font-bold">{fairscore}</span> / 1000</p>
                      {tier && tier !== 'none' && (
                        <p className="text-sm">Tier: <span className="font-bold capitalize">{tier}</span></p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!telegramId && (
            <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-900/20 text-yellow-300">
              <p className="text-sm">
                This link requires a Telegram ID. Please use the /verify command in Telegram to get your verification link.
              </p>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-text/10">
          <p className="text-xs text-text/50 text-center">
            This signature is free and does not require any gas fees. It only proves wallet ownership.
          </p>
        </div>
      </div>
    </div>
  );
}
