/**
 * Okobiz Enterprise ERP Frontend API Client
 * Connects React UI to NestJS Backend with automatic token injection and scope resolution.
 */

const API_BASE = '/api/v1';

export const TOKEN_STORAGE_KEY = 'okobiz_erp_access_token';
export const REFRESH_TOKEN_KEY = 'okobiz_erp_refresh_token';
export const ACTIVE_ORG_KEY = 'okobiz_erp_active_org';

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  correlationId?: string;
}

export class ApiException extends Error {
  constructor(public readonly error: ApiError, public readonly status: number) {
    super(error.message);
    this.name = 'ApiException';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  const activeOrgId = localStorage.getItem(ACTIVE_ORG_KEY);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (activeOrgId) {
    headers['X-Organization-Id'] = activeOrgId;
  }

  // Generate correlation ID
  headers['X-Correlation-Id'] = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      window.dispatchEvent(new CustomEvent('okobiz:unauthorized'));
    }

    const errorData: ApiError = json?.error || {
      code: 'REQUEST_FAILED',
      message: response.statusText || 'An error occurred with the server request',
    };
    throw new ApiException(errorData, response.status);
  }

  // Handle standard { data, page, meta } envelope
  if (json && typeof json === 'object' && 'data' in json) {
    return json.data as T;
  }

  return json as T;
}

export interface LoginPayload {
  employeeId: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    employeeId: string;
    email: string;
    name: string;
    status: string;
  };
  activeAssignment: {
    id: string;
    roleKey: string;
    roleName: string;
    organizationId: string;
    organizationName: string;
    companyId: string | null;
    title?: string;
  };
  availableAssignments: Array<{
    id: string;
    roleKey: string;
    roleName: string;
    organizationId: string;
    organizationName: string;
    companyId: string | null;
    title?: string;
  }>;
  scope: any;
  permissions: string[];
}

export interface CreateEmployeePayload {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  nationalId?: string;
  taxId?: string;
  companyId: string;
  organizationId: string;
  roleKey: string;
  title?: string;
  baseSalary?: number;
  bankName?: string;
  bankAccount?: string;
  initialPassword: string;
  scopeMode?: 'SELF' | 'NODE' | 'SUBTREE' | 'CROSS';
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  refresh: async (refreshToken: string) => {
    return request<{ accessToken: string; refreshToken: string; scope: any }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },

  switchContext: async (organizationId: string) => {
    return request<{ accessToken: string; activeAssignment: any; scope: any }>('/auth/switch-context', {
      method: 'POST',
      body: JSON.stringify({ organizationId }),
    });
  },

  logout: async () => {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(ACTIVE_ORG_KEY);
    }
  },

  getMe: async () => {
    return request<{ user: any; scope: any }>('/auth/me');
  },

  getSessions: async () => {
    return request<any[]>('/auth/sessions');
  },
};

export const iamApi = {
  getUsers: async () => {
    return request<any[]>('/iam/users');
  },

  createEmployeeUser: async (payload: CreateEmployeePayload) => {
    return request<any>('/iam/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getRoles: async () => {
    return request<any[]>('/iam/roles');
  },

  getPermissions: async () => {
    return request<any[]>('/iam/permissions');
  },
};

export const orgApi = {
  getHierarchyTree: async () => {
    return request<any>('/organizations/tree');
  },

  getCompanies: async () => {
    return request<any[]>('/organizations/companies');
  },

  getScopedNodes: async () => {
    return request<any[]>('/organizations/nodes');
  },

  createCompany: async (payload: {
    name: string;
    code: string;
    sector?: string;
    currency?: string;
    legalName?: string;
    taxId?: string;
    binNumber?: string;
    incorporatedYear?: number;
    modules?: string[];
  }) => {
    return request<any>('/organizations/companies', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateCompany: async (id: string, payload: {
    name?: string;
    code?: string;
    sector?: string;
    currency?: string;
    status?: string;
    legalName?: string;
    taxId?: string;
    binNumber?: string;
    incorporatedYear?: number;
    metadata?: any;
  }) => {
    return request<any>(`/organizations/companies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  configureCompanyModules: async (id: string, payload: {
    modules: Array<{ moduleKey: string; status: 'ACTIVE' | 'INACTIVE'; settings?: any }>;
  }) => {
    return request<any>(`/organizations/companies/${id}/modules`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  createNode: async (payload: {
    parentId: string;
    type: string;
    code: string;
    name: string;
    sector?: string;
    city?: string;
    headPerson?: string;
    annualBudget?: number;
    currency?: string;
    metadata?: any;
  }) => {
    return request<any>('/organizations/nodes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateNode: async (id: string, payload: {
    name?: string;
    code?: string;
    status?: string;
    city?: string;
    headPerson?: string;
    annualBudget?: number;
    metadata?: any;
  }) => {
    return request<any>(`/organizations/nodes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  archiveNode: async (id: string) => {
    return request<any>(`/organizations/nodes/${id}`, {
      method: 'DELETE',
    });
  },
};

