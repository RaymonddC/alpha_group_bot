const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

function getAuthHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse(response: Response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
}

// Public API
export async function verifyWallet(data: {
  telegramId: string;
  publicKey: string;
  signature: number[];
  message: string;
  groupId?: string;
}) {
  const response = await fetch(`${API_URL}/api/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

// Admin API
export async function adminLogin(email: string, password: string): Promise<{
  success: boolean;
  token: string;
  groups: Array<{ id: string; name: string; member_count: number }>;
  groupId: string | null;
}> {
  const response = await fetch(`${API_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(response);
}

export function getGroupId(): string {
  return typeof window !== 'undefined' ? localStorage.getItem('admin_active_group') || localStorage.getItem('admin_group_id') || '' : '';
}

export async function getAdminGroups(): Promise<{
  success: boolean;
  groups: Array<{ id: string; name: string; member_count: number }>;
}> {
  const response = await fetch(`${API_URL}/api/admin/groups`, {
    headers: getAuthHeaders(),
    cache: 'no-store',
  });
  return handleResponse(response);
}

export async function getMembers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  tier?: string;
  sortBy?: string;
  sortOrder?: string;
}) {
  const queryParams = new URLSearchParams();
  queryParams.append('groupId', getGroupId());
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.search) queryParams.append('search', params.search);
  if (params?.tier) queryParams.append('tier', params.tier);
  if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

  const response = await fetch(`${API_URL}/api/admin/members?${queryParams.toString()}`, {
    headers: getAuthHeaders(),
    cache: 'no-store',
  });
  return handleResponse(response);
}

export async function getGroupSettings() {
  const response = await fetch(`${API_URL}/api/admin/settings?groupId=${getGroupId()}`, {
    headers: getAuthHeaders(),
    cache: 'no-store',
  });
  return handleResponse(response);
}

export async function updateGroupSettings(settings: {
  bronzeThreshold: number;
  silverThreshold: number;
  goldThreshold: number;
  autoKickEnabled: boolean;
}) {
  const response = await fetch(`${API_URL}/api/admin/settings`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ ...settings, groupId: getGroupId() }),
  });
  return handleResponse(response);
}

export async function kickMember(memberId: string) {
  const response = await fetch(`${API_URL}/api/admin/kick`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ memberId, groupId: getGroupId() }),
  });
  return handleResponse(response);
}

export async function getAnalytics(period: string = '30d') {
  const response = await fetch(`${API_URL}/api/admin/analytics?groupId=${getGroupId()}&period=${period}`, {
    headers: getAuthHeaders(),
    cache: 'no-store',
  });
  return handleResponse(response);
}

// Activity Log
export async function getActivityLog(params?: {
  action?: string;
  page?: number;
  limit?: number;
}) {
  const queryParams = new URLSearchParams();
  queryParams.append('groupId', getGroupId());
  if (params?.action) queryParams.append('action', params.action);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const response = await fetch(`${API_URL}/api/admin/activity-log?${queryParams.toString()}`, {
    headers: getAuthHeaders(),
    cache: 'no-store',
  });
  return handleResponse(response);
}

// Admin Registration
export async function validateRegistrationToken(token: string) {
  const response = await fetch(`${API_URL}/api/admin/register/validate?token=${token}`);
  return handleResponse(response);
}

export async function adminRegister(data: { token: string; name: string; email: string; password: string }) {
  const response = await fetch(`${API_URL}/api/admin/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}
