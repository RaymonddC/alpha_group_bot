'use client';

import { useState, useEffect } from 'react';
import { Trash2, ChevronLeft, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import TierBadge from './TierBadge';
import { MemberTableSkeleton } from './Skeleton';
import { getMembers, kickMember } from '@/lib/api';
import { formatWallet } from '@/lib/utils';

interface MemberTableProps {
  searchQuery: string;
  tierFilter: string;
}

export default function MemberTable({ searchQuery, tierFilter }: MemberTableProps) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kickError, setKickError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchMembers();
  }, [page, searchQuery, tierFilter]);

  async function fetchMembers() {
    try {
      setError(null);
      const data = await getMembers({
        page,
        limit: itemsPerPage,
        search: searchQuery,
        tier: tierFilter === 'all' ? undefined : tierFilter,
      });
      setMembers(data.members);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      console.error('Error fetching members:', err);
      setError('Failed to load members. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleKick(memberId: string, username: string) {
    if (!confirm(`Are you sure you want to kick @${username}?`)) return;

    try {
      await kickMember(memberId);
      fetchMembers();
    } catch (err) {
      console.error('Error kicking member:', err);
      setKickError('Failed to kick member. Please try again.');
      setTimeout(() => setKickError(null), 5000);
    }
  }

  if (loading) {
    return <MemberTableSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-red-900/20 rounded-xl p-6 border border-red-500/30 flex items-center justify-between">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0" />
          <p className="text-red-300">{error}</p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchMembers(); }}
          className="cursor-pointer flex items-center px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-lg transition-all duration-200"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-background/80 rounded-xl border border-text/10 overflow-hidden">
      {kickError && (
        <div className="mx-6 mt-4 flex items-center p-3 bg-red-900/20 rounded-lg border border-red-500/30">
          <AlertCircle className="h-4 w-4 text-red-400 mr-2 flex-shrink-0" />
          <p className="text-sm text-red-300">{kickError}</p>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-text/10">
          <thead className="bg-background/60">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">
                Username
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">
                Wallet
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">
                FairScore
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">
                Tier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text/70 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-text/10">
            {members.length > 0 ? (
              members.map((member) => (
                <tr key={member.id} className="hover:bg-background/40 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-text">@{member.telegram_username || 'unknown'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono text-sm text-text/70">
                      {formatWallet(member.wallet_address)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-bold text-primary">{member.fairscore}</span>
                    <span className="text-text/50 text-sm ml-1">/ 1000</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <TierBadge tier={member.tier} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text/60">
                    {new Date(member.joined_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleKick(member.id, member.telegram_username)}
                      aria-label={`Kick @${member.telegram_username || 'unknown'}`}
                      className="cursor-pointer text-red-400 hover:text-red-300 transition-colors duration-150"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-text/60">
                  No members found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-text/10 flex items-center justify-between">
          <p className="text-sm text-text/60">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="cursor-pointer px-3 py-1 bg-background border border-text/20 rounded hover:border-text/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="cursor-pointer px-3 py-1 bg-background border border-text/20 rounded hover:border-text/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
