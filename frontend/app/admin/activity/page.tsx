'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, Settings, UserMinus, UserCheck, ArrowUpCircle, ArrowDownCircle, Search, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { ActivityLogSkeleton } from '@/components/Skeleton';
import { getActivityLog } from '@/lib/api';

interface LogEntry {
  id: string;
  action: string;
  actionSource: string;
  adminName: string;
  memberUsername: string | null;
  details: string | null;
  oldScore: number | null;
  newScore: number | null;
  oldTier: string | null;
  newTier: string | null;
  createdAt: string;
  groupedCount?: number;
}

function groupCheckedEntries(entries: LogEntry[]): LogEntry[] {
  const result: LogEntry[] = [];
  let i = 0;
  while (i < entries.length) {
    const entry = entries[i];
    if (entry.action === 'checked') {
      const entryDate = new Date(entry.createdAt).toLocaleDateString();
      let count = 1;
      while (
        i + count < entries.length &&
        entries[i + count].action === 'checked' &&
        new Date(entries[i + count].createdAt).toLocaleDateString() === entryDate
      ) {
        count++;
      }
      if (count > 1) {
        result.push({ ...entry, groupedCount: count });
        i += count;
      } else {
        result.push(entry);
        i++;
      }
    } else {
      result.push(entry);
      i++;
    }
  }
  return result;
}

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'settings_updated', label: 'Settings Updated' },
  { value: 'kicked', label: 'Kicked' },
  { value: 'verified', label: 'Verified' },
  { value: 'promoted', label: 'Promoted' },
  { value: 'demoted', label: 'Demoted' },
  { value: 'checked', label: 'Re-checked' },
];

function getActionIcon(action: string) {
  switch (action) {
    case 'settings_updated':
      return <Settings className="h-4 w-4" />;
    case 'kicked':
      return <UserMinus className="h-4 w-4" />;
    case 'verified':
      return <UserCheck className="h-4 w-4" />;
    case 'promoted':
      return <ArrowUpCircle className="h-4 w-4" />;
    case 'demoted':
      return <ArrowDownCircle className="h-4 w-4" />;
    case 'checked':
      return <Search className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
}

function getActionColor(action: string) {
  switch (action) {
    case 'settings_updated':
      return 'text-primary bg-primary/10 border-primary/20';
    case 'kicked':
      return 'text-red-400 bg-red-500/10 border-red-500/20';
    case 'verified':
      return 'text-green-400 bg-green-500/10 border-green-500/20';
    case 'promoted':
      return 'text-cta bg-cta/10 border-cta/20';
    case 'demoted':
      return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    case 'checked':
      return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    default:
      return 'text-text/60 bg-text/5 border-text/10';
  }
}

function getActionLabel(action: string) {
  switch (action) {
    case 'settings_updated': return 'Settings Updated';
    case 'kicked': return 'Member Kicked';
    case 'verified': return 'Verified';
    case 'promoted': return 'Promoted';
    case 'demoted': return 'Demoted';
    case 'checked': return 'Re-checked';
    default: return action;
  }
}

function formatDetails(entry: LogEntry): string {
  if (entry.action === 'settings_updated' && entry.details) {
    try {
      const d = JSON.parse(entry.details);
      const parts: string[] = [];
      if (d.bronzeThreshold !== undefined) parts.push(`Bronze: ${d.bronzeThreshold}`);
      if (d.silverThreshold !== undefined) parts.push(`Silver: ${d.silverThreshold}`);
      if (d.goldThreshold !== undefined) parts.push(`Gold: ${d.goldThreshold}`);
      if (d.autoKickEnabled !== undefined) parts.push(`Auto-kick: ${d.autoKickEnabled ? 'ON' : 'OFF'}`);
      return parts.join(' | ');
    } catch {
      return entry.details;
    }
  }

  if (entry.oldScore !== null && entry.newScore !== null) {
    const scorePart = `Score: ${entry.oldScore} → ${entry.newScore}`;
    if (entry.oldTier && entry.newTier && entry.oldTier !== entry.newTier) {
      return `${scorePart} | Tier: ${entry.oldTier} → ${entry.newTier}`;
    }
    return scorePart;
  }

  return entry.details || '';
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, page]);

  async function fetchLogs() {
    try {
      setLoading(true);
      setError(null);
      const data = await getActivityLog({
        action: actionFilter || undefined,
        page,
        limit,
      });
      setLogs(groupCheckedEntries(data.logs || []));
      setTotal(data.total || 0);
    } catch (err: any) {
      console.error('Error fetching activity log:', err);
      setError(err.message || 'Failed to load activity log');
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-3xl font-bold mb-2">Activity Log</h2>
        <p className="text-text/70">Track all admin actions and system events</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="cursor-pointer px-4 py-2.5 bg-background border border-text/20 rounded-lg text-text focus:border-primary focus:outline-none transition-colors"
        >
          {ACTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <button
          onClick={() => fetchLogs()}
          className="cursor-pointer flex items-center px-4 py-2.5 bg-text/5 hover:bg-text/10 border border-text/10 rounded-lg text-text/70 hover:text-text transition-all duration-200"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-900/20 rounded-xl p-6 border border-red-500/30 flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0" />
            <p className="text-red-300">{error}</p>
          </div>
          <button
            onClick={() => fetchLogs()}
            className="cursor-pointer flex items-center px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-lg transition-all duration-200"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && <ActivityLogSkeleton />}

      {/* Log Entries */}
      {!loading && !error && (
        <div className="bg-background/80 rounded-xl border border-text/10 overflow-hidden">
          {logs.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="h-12 w-12 text-text/20 mx-auto mb-4" />
              <p className="text-text/60 text-lg">No activity yet</p>
              <p className="text-text/40 text-sm mt-1">Actions will appear here as they happen</p>
            </div>
          ) : (
            <div className="divide-y divide-text/5">
              {logs.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-4 p-4 hover:bg-text/[0.02] transition-colors duration-150"
                >
                  {/* Action Icon */}
                  <div className={`flex-shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center mt-0.5 ${getActionColor(entry.action)}`}>
                    {getActionIcon(entry.action)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 flex-wrap">
                      <span className="font-medium text-text">
                        {entry.action === 'checked' && entry.groupedCount && entry.groupedCount > 1
                          ? `Re-checked ${entry.groupedCount} members`
                          : getActionLabel(entry.action)}
                      </span>
                      {!(entry.action === 'checked' && entry.groupedCount && entry.groupedCount > 1) && entry.memberUsername && (
                        <span className="text-sm font-mono text-primary">
                          @{entry.memberUsername}
                        </span>
                      )}
                      <span className="text-sm text-text/40">
                        by {entry.adminName}
                      </span>
                    </div>
                    {entry.action === 'checked' && entry.groupedCount && entry.groupedCount > 1 ? (
                      <p className="text-sm text-text/60 mt-1 font-mono">
                        Score unchanged
                      </p>
                    ) : formatDetails(entry) ? (
                      <p className="text-sm text-text/60 mt-1 font-mono">
                        {formatDetails(entry)}
                      </p>
                    ) : null}
                  </div>

                  {/* Timestamp */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm text-text/50">{formatTime(entry.createdAt)}</p>
                    <p className="text-xs text-text/30 mt-0.5">
                      {new Date(entry.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-text/10">
              <p className="text-sm text-text/50">
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="cursor-pointer p-2 rounded-lg border border-text/10 hover:bg-text/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-text/70 px-2">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="cursor-pointer p-2 rounded-lg border border-text/10 hover:bg-text/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
