'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Wallet, Loader2 } from 'lucide-react';

interface WalletConnectProps {
  onConnect?: () => void;
}

export default function WalletConnect({ onConnect: _onConnect }: WalletConnectProps) {
  const { publicKey, connecting, connected } = useWallet();

  return (
    <div className="space-y-4">
      <WalletMultiButton className="!bg-cta hover:!bg-cta/90 !transition-all !duration-200 !rounded-lg cursor-pointer" />

      {connecting && (
        <div className="flex items-center text-text/70">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          <span className="text-sm">Connecting wallet...</span>
        </div>
      )}

      {connected && publicKey && (
        <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
          <div className="flex items-center">
            <Wallet className="h-4 w-4 text-green-400 mr-2" />
            <div>
              <p className="text-sm font-medium text-green-300">Wallet Connected</p>
              <p className="text-xs text-green-400/70 font-mono">
                {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
