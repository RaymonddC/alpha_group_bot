import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_GROUPS = [
  { id: 'group-1', name: 'Test Group', member_count: 10 },
];

const MOCK_MEMBERS = {
  members: [
    {
      id: '1',
      telegram_username: 'alice',
      wallet_address: 'ABC123def456ghi789jkl012mno345pqr678stu901vwx',
      fairscore: 750,
      tier: 'gold',
      joined_at: '2024-01-01T00:00:00Z',
      last_checked: '2024-01-15T00:00:00Z',
    },
    {
      id: '2',
      telegram_username: 'bob',
      wallet_address: 'XYZ987wvu654tsr321qpo098nml765kji432hgf210edc',
      fairscore: 520,
      tier: 'silver',
      joined_at: '2024-02-10T00:00:00Z',
      last_checked: '2024-02-20T00:00:00Z',
    },
  ],
  pagination: { total: 2, page: 1, limit: 50, totalPages: 1 },
};

const MOCK_ANALYTICS = {
  totalMembers: 42,
  avgScore: 615,
  tierDistribution: { bronze: 10, silver: 20, gold: 12 },
  recentActivity: [
    { action: 'verified', date: '2024-01-15T10:00:00Z', count: 5 },
    { action: 'kicked', date: '2024-01-14T08:00:00Z', count: 2 },
  ],
};

const MOCK_SETTINGS = {
  groupId: 'group-1',
  bronzeThreshold: 300,
  silverThreshold: 500,
  goldThreshold: 700,
  autoKickEnabled: true,
};

const MOCK_ACTIVITY_LOG = {
  logs: [
    {
      id: 'log-1',
      action: 'settings_updated',
      actionSource: 'admin',
      adminName: 'Admin User',
      details: JSON.stringify({ bronzeThreshold: 300, silverThreshold: 500, goldThreshold: 700 }),
      oldScore: null,
      newScore: null,
      oldTier: null,
      newTier: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'log-2',
      action: 'verified',
      actionSource: 'system',
      adminName: 'System',
      details: null,
      oldScore: null,
      newScore: 750,
      oldTier: null,
      newTier: 'gold',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ],
  total: 2,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Inject auth state into localStorage before page loads. */
function setAuthState(page: Page) {
  return page.addInitScript(() => {
    localStorage.setItem('admin_token', 'test-jwt-token');
    localStorage.setItem('admin_active_group', 'group-1');
    localStorage.setItem(
      'admin_groups',
      JSON.stringify([{ id: 'group-1', name: 'Test Group', member_count: 10 }]),
    );
  });
}

/** Set up default API route mocks for all admin endpoints. */
async function mockAdminAPIs(page: Page) {
  await page.route('**/api/admin/analytics*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ANALYTICS) }),
  );
  await page.route('**/api/admin/members*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_MEMBERS) }),
  );
  await page.route('**/api/admin/settings*', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SETTINGS) });
  });
  await page.route('**/api/admin/activity-log*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ACTIVITY_LOG) }),
  );
  await page.route('**/api/admin/groups*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, groups: MOCK_GROUPS }),
    }),
  );
}

// ===========================================================================
// LOGIN PAGE
// ===========================================================================

test.describe('Login Page (/admin/login)', () => {
  test('renders login form with email and password fields', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.locator('h2', { hasText: 'Admin Login' })).toBeVisible();
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]', { hasText: 'Login' })).toBeVisible();
  });

  test('shows error on failed login (401)', async ({ page }) => {
    await page.route('**/api/admin/login', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid credentials' }),
      }),
    );

    await page.goto('/admin/login');
    await page.fill('input#email', 'wrong@example.com');
    await page.fill('input#password', 'badpassword');
    await page.click('button[type="submit"]');

    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });

  test('redirects to /admin on successful login', async ({ page }) => {
    await page.route('**/api/admin/login', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          token: 'test-jwt-token',
          groups: MOCK_GROUPS,
          groupId: 'group-1',
        }),
      }),
    );
    await page.route('**/api/admin/analytics*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ANALYTICS) }),
    );
    await page.route('**/api/admin/groups*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, groups: MOCK_GROUPS }),
      }),
    );

    await page.goto('/admin/login');
    await page.fill('input#email', 'admin@example.com');
    await page.fill('input#password', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/admin', { timeout: 15000 });
    expect(page.url()).toContain('/admin');
    expect(page.url()).not.toContain('/admin/login');
  });

  test('stores token and groups in localStorage after login', async ({ page }) => {
    await page.route('**/api/admin/login', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          token: 'my-jwt-token',
          groups: MOCK_GROUPS,
          groupId: 'group-1',
        }),
      }),
    );
    await page.route('**/api/admin/analytics*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ANALYTICS) }),
    );
    await page.route('**/api/admin/groups*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, groups: MOCK_GROUPS }),
      }),
    );

    await page.goto('/admin/login');
    await page.fill('input#email', 'admin@example.com');
    await page.fill('input#password', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin', { timeout: 15000 });

    const token = await page.evaluate(() => localStorage.getItem('admin_token'));
    const groups = await page.evaluate(() => localStorage.getItem('admin_groups'));
    const activeGroup = await page.evaluate(() => localStorage.getItem('admin_active_group'));

    expect(token).toBe('my-jwt-token');
    expect(groups).toContain('group-1');
    expect(activeGroup).toBe('group-1');
  });
});

// ===========================================================================
// DASHBOARD
// ===========================================================================

test.describe('Dashboard (/admin)', () => {
  test.beforeEach(async ({ page }) => {
    await setAuthState(page);
  });

  test('displays stat cards with mock analytics data', async ({ page }) => {
    await mockAdminAPIs(page);
    await page.goto('/admin');

    await expect(page.getByText('Total Members')).toBeVisible();
    await expect(page.getByText('42')).toBeVisible();
    await expect(page.getByText('Avg FairScore')).toBeVisible();
    await expect(page.getByText('615')).toBeVisible();
    await expect(page.getByText('Gold Members')).toBeVisible();
    await expect(page.getByText('12').first()).toBeVisible();
  });

  test('shows error state when analytics API fails', async ({ page }) => {
    await page.route('**/api/admin/analytics*', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Server error' }) }),
    );
    await page.route('**/api/admin/groups*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, groups: MOCK_GROUPS }),
      }),
    );

    await page.goto('/admin');

    await expect(page.getByText('Failed to load dashboard data')).toBeVisible();
    await expect(page.getByText('Retry')).toBeVisible();
  });

  test('shows tier distribution section', async ({ page }) => {
    await mockAdminAPIs(page);
    await page.goto('/admin');

    await expect(page.getByText('Tier Distribution')).toBeVisible();
    await expect(page.getByText('Bronze Tier')).toBeVisible();
    await expect(page.getByText('Silver Tier')).toBeVisible();
    await expect(page.getByText('Gold Tier')).toBeVisible();
  });
});

// ===========================================================================
// MEMBERS PAGE
// ===========================================================================

test.describe('Members Page (/admin/members)', () => {
  test.beforeEach(async ({ page }) => {
    await setAuthState(page);
    await mockAdminAPIs(page);
  });

  test('renders member table with data', async ({ page }) => {
    await page.goto('/admin/members');

    await expect(page.getByText('Member Management')).toBeVisible();
    await expect(page.getByText('@alice')).toBeVisible();
    await expect(page.getByText('@bob')).toBeVisible();
    await expect(page.getByText('750')).toBeVisible();
    await expect(page.getByText('520')).toBeVisible();
  });

  test('has search input and tier filter', async ({ page }) => {
    await page.goto('/admin/members');

    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    await expect(page.locator('select')).toBeVisible();

    const options = page.locator('select option');
    await expect(options).toHaveCount(4); // All, Bronze, Silver, Gold
  });

  test('shows table column headers', async ({ page }) => {
    await page.goto('/admin/members');

    await expect(page.locator('th', { hasText: 'Username' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Wallet' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'FairScore' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Tier' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Joined' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Actions' })).toBeVisible();
  });
});

// ===========================================================================
// SETTINGS PAGE
// ===========================================================================

test.describe('Settings Page (/admin/settings)', () => {
  test.beforeEach(async ({ page }) => {
    await setAuthState(page);
    await mockAdminAPIs(page);
  });

  test('renders settings form with threshold values from API', async ({ page }) => {
    await page.goto('/admin/settings');

    await expect(page.getByText('Group Settings')).toBeVisible();
    await expect(page.getByText('Tier Thresholds')).toBeVisible();

    const bronzeInput = page.locator('input[type="number"]').first();
    await expect(bronzeInput).toHaveValue('300');
  });

  test('save button triggers update and shows success message', async ({ page }) => {
    await page.goto('/admin/settings');

    await expect(page.getByText('Save Settings')).toBeVisible();
    await page.click('text=Save Settings');

    await expect(page.getByText('Settings saved successfully!')).toBeVisible();
  });

  test('shows validation error when thresholds are invalid (bronze >= silver)', async ({ page }) => {
    await page.goto('/admin/settings');
    await expect(page.getByText('Save Settings')).toBeVisible();

    const bronzeInput = page.locator('input[type="number"]').first();
    await bronzeInput.fill('600');

    await page.click('text=Save Settings');

    await expect(page.getByText('Thresholds must be in ascending order: Bronze < Silver < Gold')).toBeVisible();
  });

  test('shows auto-kick toggle', async ({ page }) => {
    await page.goto('/admin/settings');

    await expect(page.getByText('Automatic Kick')).toBeVisible();
    await expect(
      page.getByText('Automatically remove members whose FairScore drops below Bronze threshold'),
    ).toBeVisible();
  });
});

// ===========================================================================
// ACTIVITY LOG PAGE
// ===========================================================================

test.describe('Activity Log Page (/admin/activity)', () => {
  test.beforeEach(async ({ page }) => {
    await setAuthState(page);
    await mockAdminAPIs(page);
  });

  test('renders log entries from API', async ({ page }) => {
    await page.goto('/admin/activity');

    await expect(page.getByText('Activity Log').first()).toBeVisible();
    await expect(page.locator('span', { hasText: 'Settings Updated' })).toBeVisible();
    await expect(page.locator('span', { hasText: 'Verified' })).toBeVisible();
  });

  test('has action filter dropdown with options', async ({ page }) => {
    await page.goto('/admin/activity');

    const select = page.locator('select');
    await expect(select).toBeVisible();

    const options = select.locator('option');
    await expect(options.first()).toHaveText('All Actions');
  });

  test('shows empty state when no logs', async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await mockAdminAPIs(page);
    await page.route('**/api/admin/activity-log*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ logs: [], total: 0 }),
      }),
    );

    await page.goto('/admin/activity');

    await expect(page.getByText('No activity yet')).toBeVisible();
  });

  test('has refresh button', async ({ page }) => {
    await page.goto('/admin/activity');
    await expect(page.getByText('Refresh')).toBeVisible();
  });
});

// ===========================================================================
// SIDEBAR NAVIGATION
// ===========================================================================

test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setAuthState(page);
    await mockAdminAPIs(page);
  });

  test('all nav links are present', async ({ page }) => {
    await page.goto('/admin');

    await expect(page.locator('nav a', { hasText: 'Dashboard' })).toBeVisible();
    await expect(page.locator('nav a', { hasText: 'Members' })).toBeVisible();
    await expect(page.locator('nav a', { hasText: 'Settings' })).toBeVisible();
    await expect(page.locator('nav a', { hasText: 'Analytics' })).toBeVisible();
    await expect(page.locator('nav a', { hasText: 'Activity Log' })).toBeVisible();
  });

  test('active page is highlighted with primary styling', async ({ page }) => {
    await page.goto('/admin');

    const dashboardLink = page.locator('nav a', { hasText: 'Dashboard' });
    await expect(dashboardLink).toHaveClass(/bg-primary/);
  });

  test('clicking nav link navigates to correct page', async ({ page }) => {
    await page.goto('/admin');

    await page.locator('nav a', { hasText: 'Members' }).click();
    await page.waitForURL('**/admin/members');
    await expect(page.getByText('Member Management')).toBeVisible();

    await page.locator('nav a', { hasText: 'Settings' }).click();
    await page.waitForURL('**/admin/settings');
    await expect(page.getByText('Group Settings')).toBeVisible();

    await page.locator('nav a', { hasText: 'Activity Log' }).click();
    await page.waitForURL('**/admin/activity');
    await expect(page.getByText('Activity Log').first()).toBeVisible();
  });
});

// ===========================================================================
// VERIFY PAGE
// ===========================================================================

test.describe('Verify Page (/verify)', () => {
  test('shows warning when no tid param', async ({ page }) => {
    await page.goto('/verify');

    await expect(page.getByText('Verify Your Wallet')).toBeVisible();
    await expect(
      page.getByText('This link requires a Telegram ID'),
    ).toBeVisible();
  });

  test('shows missing group warning with tid but no gid', async ({ page }) => {
    await page.goto('/verify?tid=12345');

    await expect(page.getByText('No group specified')).toBeVisible();
  });

  // Skip: WalletMultiButton from @solana/wallet-adapter-react-ui depends on
  // browser wallet extensions that are unavailable in headless Brave/Chromium.
  test('renders wallet connect button', async ({ page }) => {
    await page.goto('/verify?tid=12345&gid=group-1');

    await expect(page.getByText('Verify Your Wallet')).toBeVisible();
    await expect(page.locator('button', { hasText: /wallet/i })).toBeVisible();
  });
});
