'use client';

import { Shield, TrendingUp, Zap, Send } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import FeatureCard from '@/components/FeatureCard';
import TierCard from '@/components/TierCard';

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
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="https://t.me/alphaGroupSol_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer inline-flex items-center justify-center gap-2 px-8 py-4 bg-cta text-white font-semibold rounded-lg hover:opacity-90 transition-all duration-200 hover:translate-y-[-2px] shadow-lg"
            >
              <Send className="h-5 w-5" />
              Try the Bot on Telegram
            </Link>
            <Link
              href="/admin/login"
              className="cursor-pointer inline-flex items-center justify-center px-8 py-4 bg-background border border-primary/40 text-text font-semibold rounded-lg hover:border-primary/60 hover:bg-primary/5 transition-all duration-200 hover:translate-y-[-2px]"
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
            <FeatureCard
              icon={<Shield className="h-6 w-6 text-cta" />}
              title="Wallet Verification"
              description="Users verify their Solana wallet via cryptographic signatures. No gas fees, completely free."
              iconWrapperClass="bg-cta/20"
              borderClass="border-primary/20 hover:border-primary/40"
            />
            <FeatureCard
              icon={<TrendingUp className="h-6 w-6 text-secondary" />}
              title="FairScore Check"
              description="We check their FairScore (0-1000) using FairScale's on-chain reputation system."
              iconWrapperClass="bg-secondary/20"
              borderClass="border-secondary/20 hover:border-secondary/40"
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6 text-primary" />}
              title="Auto-Management"
              description="Members are automatically promoted, demoted, or kicked based on reputation changes."
              iconWrapperClass="bg-primary/20"
              borderClass="border-primary/20 hover:border-primary/40"
            />
          </div>
        </div>
      </section>

      {/* Tiers Section */}
      <section className="px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-4">
            Tiered Access System
          </h2>
          <p className="text-sm text-text/50 text-center mb-12">
            Default thresholds — admins can adjust per group.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <TierCard
              name="Bronze Tier"
              threshold={300}
              description="Entry-level access for verified members"
              gradientClass="from-orange-900/30 to-orange-800/20"
              borderClass="border-orange-600/30 hover:border-orange-400/50"
              nameColor="text-orange-400"
            />
            <TierCard
              name="Silver Tier"
              threshold={500}
              description="Trusted members with proven reputation"
              gradientClass="from-gray-700/30 to-gray-600/20"
              borderClass="border-gray-400/30 hover:border-gray-300/50"
              nameColor="text-gray-300"
            />
            <TierCard
              name="Gold Tier"
              threshold={700}
              description="Elite members with exceptional reputation"
              gradientClass="from-yellow-700/30 to-yellow-600/20"
              borderClass="border-yellow-400/30 hover:border-yellow-300/50"
              nameColor="text-yellow-300"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 border-t border-text/10">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-text/60">
            Built with <span className="text-primary">FairScale</span> for the{' '}
            <a
              href="https://superteam.fun/earn/listing/fairathon"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Fairathon 2026
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
