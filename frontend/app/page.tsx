'use client';

import { Shield, TrendingUp, Zap } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="px-6 py-20 md:py-32">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex justify-center mb-8">
            <Image src="/brand/logo.png" alt="Alpha Groups" width={200} height={200} priority />
          </div>
          <h1 className="font-heading text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-cta bg-clip-text text-transparent">
            Alpha Groups
          </h1>
          <p className="text-xl md:text-2xl text-text/80 mb-4 max-w-3xl mx-auto">
            Reputation-Gated Telegram Communities
          </p>
          <p className="text-lg text-text/60 mb-12 max-w-2xl mx-auto">
            Automatically manage community access based on on-chain reputation using FairScale.
            Keep bots and low-quality members out, elevate signal over noise.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/admin/login"
              className="cursor-pointer inline-flex items-center justify-center px-8 py-4 bg-cta text-white font-semibold rounded-lg hover:opacity-90 transition-all duration-200 hover:translate-y-[-2px] shadow-lg"
            >
              Admin Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-16 bg-background/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-background/80 rounded-xl p-8 border border-primary/20 hover:border-primary/40 transition-all duration-200 hover:translate-y-[-4px] shadow-md cursor-pointer">
              <div className="w-12 h-12 bg-cta/20 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-cta" />
              </div>
              <h3 className="font-heading text-xl font-semibold mb-3">Wallet Verification</h3>
              <p className="text-text/70">
                Users verify their Solana wallet via cryptographic signatures. No gas fees, completely free.
              </p>
            </div>

            <div className="bg-background/80 rounded-xl p-8 border border-secondary/20 hover:border-secondary/40 transition-all duration-200 hover:translate-y-[-4px] shadow-md cursor-pointer">
              <div className="w-12 h-12 bg-secondary/20 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="font-heading text-xl font-semibold mb-3">FairScore Check</h3>
              <p className="text-text/70">
                We check their FairScore (0-1000) using FairScale's on-chain reputation system.
              </p>
            </div>

            <div className="bg-background/80 rounded-xl p-8 border border-primary/20 hover:border-primary/40 transition-all duration-200 hover:translate-y-[-4px] shadow-md cursor-pointer">
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-heading text-xl font-semibold mb-3">Auto-Management</h3>
              <p className="text-text/70">
                Members are automatically promoted, demoted, or kicked based on reputation changes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tiers Section */}
      <section className="px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-12">
            Tiered Access System
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-orange-900/30 to-orange-800/20 rounded-xl p-6 border border-orange-600/30">
              <h3 className="font-heading text-xl font-semibold mb-2 text-orange-400">Bronze Tier</h3>
              <p className="text-4xl font-bold mb-2">300+</p>
              <p className="text-text/60">Entry-level access for verified members</p>
            </div>

            <div className="bg-gradient-to-br from-gray-700/30 to-gray-600/20 rounded-xl p-6 border border-gray-400/30">
              <h3 className="font-heading text-xl font-semibold mb-2 text-gray-300">Silver Tier</h3>
              <p className="text-4xl font-bold mb-2">500+</p>
              <p className="text-text/60">Trusted members with proven reputation</p>
            </div>

            <div className="bg-gradient-to-br from-yellow-700/30 to-yellow-600/20 rounded-xl p-6 border border-yellow-400/30">
              <h3 className="font-heading text-xl font-semibold mb-2 text-yellow-300">Gold Tier</h3>
              <p className="text-4xl font-bold mb-2">700+</p>
              <p className="text-text/60">Elite members with exceptional reputation</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 border-t border-text/10">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-text/60">
            Built with <span className="text-primary">FairScale</span> for the Fairathon 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
