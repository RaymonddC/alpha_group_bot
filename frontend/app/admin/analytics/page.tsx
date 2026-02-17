'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { getAnalytics } from '@/lib/api';

export default function AnalyticsPage() {
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
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text/70">Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-heading text-3xl font-bold mb-2">Analytics</h2>
          <p className="text-text/70">Detailed insights into your community metrics</p>
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

  const tierPieData = [
    { name: 'Bronze', value: analytics?.tierDistribution?.bronze || 0, color: '#F97316' },
    { name: 'Silver', value: analytics?.tierDistribution?.silver || 0, color: '#9CA3AF' },
    { name: 'Gold', value: analytics?.tierDistribution?.gold || 0, color: '#FCD34D' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-3xl font-bold mb-2">Analytics</h2>
        <p className="text-text/70">Detailed insights into your community metrics</p>
      </div>

      {/* Score Distribution Chart */}
      <div className="bg-background/80 rounded-xl p-6 border border-text/10">
        <h3 className="font-heading text-xl font-semibold mb-4">FairScore Distribution</h3>
        {analytics?.scoreDistribution && analytics.scoreDistribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.scoreDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="range" stroke="#F8FAFC" />
              <YAxis stroke="#F8FAFC" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#F8FAFC' }}
              />
              <Bar dataKey="count" fill="#F59E0B" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-text/60 text-center py-12">No data available</p>
        )}
      </div>

      {/* Tier Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-background/80 rounded-xl p-6 border border-text/10">
          <h3 className="font-heading text-xl font-semibold mb-4">Tier Breakdown</h3>
          {tierPieData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={tierPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {tierPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-text/60 text-center py-12">No data available</p>
          )}
        </div>

        {/* Member Growth */}
        <div className="bg-background/80 rounded-xl p-6 border border-text/10">
          <h3 className="font-heading text-xl font-semibold mb-4">Member Growth</h3>
          {analytics?.recentActivity && analytics.recentActivity.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={analytics.recentActivity.slice().reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#F8FAFC" />
                <YAxis stroke="#F8FAFC" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#F8FAFC' }}
                />
                <Line type="monotone" dataKey="verified" stroke="#8B5CF6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-text/60 text-center py-12">No data available</p>
          )}
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-background/80 rounded-xl p-6 border border-text/10">
        <h3 className="font-heading text-xl font-semibold mb-4">Recent Activity Timeline</h3>
        <div className="space-y-2">
          {analytics?.recentActivity && analytics.recentActivity.length > 0 ? (
            analytics.recentActivity.map((activity: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-text/5 hover:border-text/10 transition-all duration-200"
              >
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-cta rounded-full mr-3"></div>
                  <div>
                    <p className="font-medium">{activity.date}</p>
                  </div>
                </div>
                <div className="flex gap-4 text-sm text-text/70">
                  <span>Verified: {activity.verified || 0}</span>
                  <span>Promoted: {activity.promoted || 0}</span>
                  <span>Demoted: {activity.demoted || 0}</span>
                  <span>Kicked: {activity.kicked || 0}</span>
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
