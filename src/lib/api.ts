// API Configuration - Update this URL to your PHP API server
// IMPORTANT: Must use HTTPS to avoid mixed content blocking
const API_BASE_URL = 'https://dede.kantahkabbogor.id/api';

// Token management
const TOKEN_KEY = 'auth-token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Generic API request function with authentication
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  requiresAuth: boolean = true
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Add auth token if required and available
    if (requiresAuth) {
      const token = getAuthToken();
      if (!token) {
        return { 
          success: false, 
          error: 'Sesi login telah berakhir. Silakan login kembali.' 
        };
      }
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log(`[API] ${options.method || 'GET'} ${endpoint}`);
    console.log(`[API] Request headers:`, headers);
    if (options.body) {
      console.log(`[API] Request body:`, options.body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      mode: 'cors',
    });

    console.log(`[API] Response status:`, response.status);

    // Try to parse JSON response
    let result;
    const responseText = await response.text();
    console.log(`[API] Raw response:`, responseText);
    
    try {
      result = responseText ? JSON.parse(responseText) : {};
      console.log(`[API] Parsed response:`, result);
    } catch (parseError) {
      console.error('[API] Failed to parse response:', responseText);
      return { 
        success: false, 
        error: `Server error: Invalid JSON response (${response.status})` 
      };
    }

    if (!response.ok) {
      // Handle 401 Unauthorized - token expired or invalid
      // But DON'T auto-remove token for verify endpoint (let AuthContext handle it)
      if (response.status === 401 && !endpoint.includes('verify')) {
        removeAuthToken();
        return { 
          success: false, 
          error: result.error || 'Sesi login telah berakhir. Silakan login kembali.' 
        };
      }
      return { success: false, error: result.error || 'Request failed' };
    }

    // Handle both direct data and wrapped data response
    // PHP API returns: { success: true, data: [...] } for GET
    // Or: { success: true, message: "...", data: {...} } for POST/PUT
    const data = result.data !== undefined ? result.data : result;
    
    return { success: true, data };
  } catch (error) {
    console.error('[API] Error:', error);
    // Return more descriptive error for debugging
    const errorMessage = error instanceof Error ? error.message : 'Network error';
    return { 
      success: false, 
      error: `Network error: ${errorMessage}` 
    };
  }
}

// Products API (protected - requires auth)
// Uses basic schema: id, nama, harga, stok
export const productsApi = {
  getAll: () => apiRequest<any[]>('/products/'),
  
  getById: (id: string) => apiRequest<any>(`/products/?id=${id}`),
  
  create: (data: { nama: string; harga: number; stok?: number; kode_produk?: string; harga_beli?: number; gambar?: string }) =>
    apiRequest<any>('/products/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (data: { id: string; nama?: string; harga?: number; stok?: number; kode_produk?: string; harga_beli?: number; gambar?: string }) =>
    apiRequest<any>('/products/', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    apiRequest<any>('/products/', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    }),
};

// Transactions API (protected - requires auth)
// NOTE: Must use trailing slash for PHP API compatibility
export const transactionsApi = {
  getAll: () => apiRequest<any[]>('/transactions/'),
  
  create: (data: {
    nama_produk: string;
    qty: number;
    harga: number;
    metode_pembayaran?: string;
    product_id?: string;
  }) =>
    apiRequest<any>('/transactions/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (data: {
    id: string;
    nama_produk?: string;
    qty?: number;
    harga?: number;
    metode_pembayaran?: string;
  }) =>
    apiRequest<any>('/transactions/', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    apiRequest<any>('/transactions/', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    }),
};

// Expenses API (protected - requires auth)
// NOTE: Must use trailing slash for PHP API compatibility
export const expensesApi = {
  getAll: () => apiRequest<any[]>('/expenses/'),
  
  create: (data: {
    category: string;
    description?: string;
    cost: number;
    date: string;
    notes?: string;
  }) =>
    apiRequest<any>('/expenses/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (data: {
    id: string;
    category?: string;
    description?: string;
    cost?: number;
    date?: string;
    notes?: string;
  }) =>
    apiRequest<any>('/expenses/', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    apiRequest<any>('/expenses/', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    }),
};

// Auth API (public - no auth required for login/register)
export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<{ id: string; email: string; full_name: string; token: string }>(
      '/auth/?action=login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
      false // No auth required for login
    ),
  
  register: (email: string, password: string, full_name: string) =>
    apiRequest<{ id: string; email: string; full_name: string; token: string }>(
      '/auth/?action=register',
      {
        method: 'POST',
        body: JSON.stringify({ email, password, full_name }),
      },
      false // No auth required for register
    ),

  logout: () =>
    apiRequest<{ message: string }>(
      '/auth/?action=logout',
      { method: 'POST' },
      true // Requires auth to invalidate token
    ),

  verifyToken: () =>
    apiRequest<{ id: string; email: string; full_name: string }>(
      '/auth/?action=verify',
      { method: 'POST' },
      true // Requires auth to verify token
    ),
};

// Settings API (protected - requires auth)
export const settingsApi = {
  get: () => apiRequest<{ store_name: string; store_logo: string | null }>('/settings'),
  
  update: (data: { store_name?: string; store_logo?: string }) =>
    apiRequest<any>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// Upload API (protected - requires auth)
// Handles file uploads to the server
export const uploadApi = {
  uploadImage: async (file: File): Promise<{ success: boolean; data?: { filename: string; path: string; url: string }; error?: string }> => {
    try {
      const token = getAuthToken();
      if (!token) {
        return { success: false, error: 'Sesi login telah berakhir. Silakan login kembali.' };
      }

      const formData = new FormData();
      formData.append('image', file);

      console.log('[uploadApi] Uploading file:', file.name, 'size:', file.size);

      const response = await fetch(`${API_BASE_URL}/upload/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type - browser will set it with boundary for FormData
        },
        body: formData,
        mode: 'cors',
      });

      const responseText = await response.text();
      console.log('[uploadApi] Response:', responseText);

      let result;
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('[uploadApi] Failed to parse response:', responseText);
        return { success: false, error: 'Server error: Invalid response' };
      }

      if (!response.ok) {
        return { success: false, error: result.error || 'Upload failed' };
      }

      return { success: true, data: result.data };
    } catch (error) {
      console.error('[uploadApi] Error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Network error' };
    }
  },

  deleteImage: (filename: string) =>
    apiRequest<any>('/upload/', {
      method: 'DELETE',
      body: JSON.stringify({ filename }),
    }),
};
