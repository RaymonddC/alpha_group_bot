'use client';

import { useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import './globals.css';

require('@solana/wallet-adapter-react-ui/styles.css');

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new BackpackWalletAdapter(),
    ],
    []
  );

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Alpha Groups - Reputation-Gated Communities on Solana</title>
        <meta name="description" content="Verify your Solana wallet, get scored by FairScale, and access reputation-gated Telegram communities." />
        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="32x32" href="/brand/favicon.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/brand/favicon-16.png" />
        {/* OG / Social */}
        <meta property="og:title" content="Alpha Groups" />
        <meta property="og:description" content="Reputation-gated Telegram communities on Solana. Verify wallet · FairScale score · Access your tier." />
        <meta property="og:image" content="https://alpha-group-bot.vercel.app/brand/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Alpha Groups" />
        <meta name="twitter:description" content="Reputation-gated Telegram communities on Solana." />
        <meta name="twitter:image" content="https://alpha-group-bot.vercel.app/brand/og-image.png" />
      </head>
      <body>
        <ConnectionProvider endpoint={endpoint}>
          <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>
              {children}
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </body>
    </html>
  );
}
