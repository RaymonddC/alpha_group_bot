'use client';

import { useState, useEffect } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import { getGroupSettings, updateGroupSettings } from '@/lib/api';

export default function SettingsPage() {
  const [bronzeThreshold, setBronzeThreshold] = useState(300);
  const [silverThreshold, setSilverThreshold] = useState(500);
  const [goldThreshold, setGoldThreshold] = useState(700);
  const [autoKickEnabled, setAutoKickEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings(showLoading = true) {
    try {
      if (showLoading) setLoading(true);
      const settings = await getGroupSettings();
      if (settings.groupId) localStorage.setItem('admin_group_id', settings.groupId);
      setBronzeThreshold(settings.bronzeThreshold ?? 300);
      setSilverThreshold(settings.silverThreshold ?? 500);
      setGoldThreshold(settings.goldThreshold ?? 700);
      setAutoKickEnabled(settings.autoKickEnabled ?? true);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (bronzeThreshold >= silverThreshold || silverThreshold >= goldThreshold) {
      setMessage('Thresholds must be in ascending order: Bronze < Silver < Gold');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      await updateGroupSettings({
        bronzeThreshold,
        silverThreshold,
        goldThreshold,
        autoKickEnabled,
      });
      setMessage('Settings saved successfully!');
      // Re-fetch to confirm the save (no loading spinner)
      await fetchSettings(false);
    } catch (error: any) {
      setMessage(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text/70">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-3xl font-bold mb-2">Group Settings</h2>
        <p className="text-text/70">Configure reputation thresholds and automation</p>
      </div>

      <div className="max-w-2xl">
        {/* Thresholds */}
        <div className="bg-background/80 rounded-xl p-6 border border-text/10 space-y-6">
          <div>
            <h3 className="font-heading text-xl font-semibold mb-4">Tier Thresholds</h3>
            <p className="text-sm text-text/60 mb-6">
              Set the minimum FairScore required for each tier. Thresholds must be in ascending order.
            </p>

            <div className="space-y-4">
              {/* Bronze */}
              <div>
                <label className="block text-sm font-medium mb-2 text-text/80">
                  Bronze Tier (Entry Level)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="100"
                    max="500"
                    step="10"
                    value={bronzeThreshold}
                    onChange={(e) => setBronzeThreshold(Number(e.target.value))}
                    className="flex-1 cursor-pointer"
                  />
                  <input
                    type="number"
                    value={bronzeThreshold}
                    onChange={(e) => setBronzeThreshold(Number(e.target.value))}
                    className="w-20 px-3 py-2 bg-background border border-text/20 rounded-lg focus:border-orange-500 focus:outline-none text-text"
                  />
                </div>
              </div>

              {/* Silver */}
              <div>
                <label className="block text-sm font-medium mb-2 text-text/80">
                  Silver Tier (Trusted)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="200"
                    max="700"
                    step="10"
                    value={silverThreshold}
                    onChange={(e) => setSilverThreshold(Number(e.target.value))}
                    className="flex-1 cursor-pointer"
                  />
                  <input
                    type="number"
                    value={silverThreshold}
                    onChange={(e) => setSilverThreshold(Number(e.target.value))}
                    className="w-20 px-3 py-2 bg-background border border-text/20 rounded-lg focus:border-gray-400 focus:outline-none text-text"
                  />
                </div>
              </div>

              {/* Gold */}
              <div>
                <label className="block text-sm font-medium mb-2 text-text/80">
                  Gold Tier (Elite)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="400"
                    max="900"
                    step="10"
                    value={goldThreshold}
                    onChange={(e) => setGoldThreshold(Number(e.target.value))}
                    className="flex-1 cursor-pointer"
                  />
                  <input
                    type="number"
                    value={goldThreshold}
                    onChange={(e) => setGoldThreshold(Number(e.target.value))}
                    className="w-20 px-3 py-2 bg-background border border-text/20 rounded-lg focus:border-yellow-400 focus:outline-none text-text"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Auto-kick Toggle */}
          <div className="pt-6 border-t border-text/10">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium mb-1">Automatic Kick</h4>
                <p className="text-sm text-text/60">
                  Automatically remove members whose FairScore drops below Bronze threshold
                </p>
              </div>
              <button
                onClick={() => setAutoKickEnabled(!autoKickEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 cursor-pointer ${
                  autoKickEnabled ? 'bg-cta' : 'bg-text/20'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    autoKickEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-6 border-t border-text/10">
            <button
              onClick={handleSave}
              disabled={saving}
              className="cursor-pointer w-full flex items-center justify-center px-6 py-3 bg-primary hover:bg-primary/90 text-background font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {saving ? (
                'Saving...'
              ) : (
                <>
                  <Save className="mr-2 h-5 w-5" />
                  Save Settings
                </>
              )}
            </button>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`flex items-center p-4 rounded-lg border ${
                message.includes('success')
                  ? 'bg-green-900/20 border-green-500/30 text-green-300'
                  : 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300'
              }`}
            >
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <p className="text-sm">{message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
