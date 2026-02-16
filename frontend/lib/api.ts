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
}) {
  const response = await fetch(`${API_URL}/api/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

// Admin API
export async function adminLogin(email: string, password: string) {
  const response = await fetch(`${API_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
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
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.search) queryParams.append('search', params.search);
  if (params?.tier) queryParams.append('tier', params.tier);
  if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

  const response = await fetch(`${API_URL}/api/admin/members?${queryParams.toString()}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function getGroupSettings() {
  const response = await fetch(`${API_URL}/api/admin/settings`, {
    headers: getAuthHeaders(),
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
    body: JSON.stringify(settings),
  });
  return handleResponse(response);
}

export async function kickMember(memberId: string) {
  const response = await fetch(`${API_URL}/api/admin/kick`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ memberId }),
  });
  return handleResponse(response);
}

export async function getAnalytics(period: string = '30d') {
  const response = await fetch(`${API_URL}/api/admin/analytics?period=${period}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}
