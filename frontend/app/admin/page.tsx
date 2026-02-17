'use client';

import { useState, useEffect } from 'react';
import { Users, TrendingUp, Award, Activity, AlertCircle, RefreshCw } from 'lucide-react';
import StatCard from '@/components/StatCard';
import { DashboardSkeleton } from '@/components/Skeleton';
import { getAnalytics } from '@/lib/api';

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    try {
      setError(null);
      const data = await getAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-heading text-3xl font-bold mb-2">Dashboard</h2>
          <p className="text-text/70">Overview of your community metrics</p>
        </div>
        <div className="bg-red-900/20 rounded-xl p-6 border border-red-500/30 flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0" />
            <p className="text-red-300">{error}</p>
          </div>
          <button
            onClick={() => { setLoading(true); fetchAnalytics(); }}
            className="cursor-pointer flex items-center px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-lg transition-all duration-200"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-3xl font-bold mb-2">Dashboard</h2>
        <p className="text-text/70">Overview of your community metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          label="Total Members"
          value={analytics?.totalMembers || 0}
          iconColor="text-cta"
          bgColor="bg-cta/20"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg FairScore"
          value={analytics?.avgScore || 0}
          iconColor="text-primary"
          bgColor="bg-primary/20"
        />
        <StatCard
          icon={Award}
          label="Gold Members"
          value={analytics?.tierDistribution?.gold || 0}
          iconColor="text-yellow-400"
          bgColor="bg-yellow-400/20"
        />
        <StatCard
          icon={Activity}
          label="Recent Activity"
          value={analytics?.recentActivity?.length || 0}
          iconColor="text-secondary"
          bgColor="bg-secondary/20"
        />
      </div>

      {/* Tier Distribution */}
      <div className="bg-background/80 rounded-xl p-6 border border-text/10">
        <h3 className="font-heading text-xl font-semibold mb-4">Tier Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-orange-900/20 rounded-lg p-4 border border-orange-600/30">
            <p className="text-sm text-text/70 mb-1">Bronze Tier</p>
            <p className="text-3xl font-bold text-orange-400">
              {analytics?.tierDistribution?.bronze || 0}
            </p>
          </div>
          <div className="bg-gray-700/20 rounded-lg p-4 border border-gray-400/30">
            <p className="text-sm text-text/70 mb-1">Silver Tier</p>
            <p className="text-3xl font-bold text-gray-300">
              {analytics?.tierDistribution?.silver || 0}
            </p>
          </div>
          <div className="bg-yellow-700/20 rounded-lg p-4 border border-yellow-400/30">
            <p className="text-sm text-text/70 mb-1">Gold Tier</p>
            <p className="text-3xl font-bold text-yellow-300">
              {analytics?.tierDistribution?.gold || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-background/80 rounded-xl p-6 border border-text/10">
        <h3 className="font-heading text-xl font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {analytics?.recentActivity && analytics.recentActivity.length > 0 ? (
            analytics.recentActivity.slice(0, 10).map((activity: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-text/5 hover:border-text/10 transition-all duration-200"
              >
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-cta rounded-full mr-3"></div>
                  <div>
                    <p className="font-medium">{activity.action}</p>
                    <p className="text-sm text-text/60">
                      {new Date(activity.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-text/70">Count: {activity.count || activity.verified || 0}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-text/60 text-center py-8">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}
