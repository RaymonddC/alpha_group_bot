'use client';

import { useState, useEffect } from 'react';
import { Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import TierBadge from './TierBadge';
import { getMembers, kickMember } from '@/lib/api';
import { formatWallet } from '@/lib/utils';

interface MemberTableProps {
  searchQuery: string;
  tierFilter: string;
}

export default function MemberTable({ searchQuery, tierFilter }: MemberTableProps) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchMembers();
  }, [page, searchQuery, tierFilter]);

  async function fetchMembers() {
    try {
      const data = await getMembers({
        page,
        limit: itemsPerPage,
        search: searchQuery,
        tier: tierFilter === 'all' ? undefined : tierFilter,
      });
      setMembers(data.members);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleKick(memberId: string, username: string) {
    if (!confirm(`Are you sure you want to kick @${username}?`)) return;

    try {
      await kickMember(memberId);
      fetchMembers();
    } catch (error) {
      console.error('Error kicking member:', error);
      alert('Failed to kick member');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-background/80 rounded-xl border border-text/10">
        <p className="text-text/70">Loading members...</p>
      </div>
    );
  }

  return (
    <div className="bg-background/80 rounded-xl border border-text/10 overflow-hidden">
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
