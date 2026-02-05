import { useState, useEffect, useCallback } from 'react';
import { productsApi, transactionsApi, expensesApi, getAuthToken } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { normalizeImageUrl } from '@/lib/imageUtils';

// Types matching the API response
interface ApiProduct {
  id: string;
  nama: string;
  harga: number;
  stok: number;
  kode_produk?: string;
  harga_beli?: number;
  gambar?: string;
  created_at?: string;
  updated_at?: string;
}

// Payment method type matching frontend values
type PaymentMethodType = 'Tunai' | 'Shopee' | 'Tokopedia';

interface ApiTransaction {
  id: string;
  no?: number;
  nama_produk: string;
  qty: number | string;
  harga: number | string;
  total: number | string;
  metode_pembayaran?: string;
  payment_method?: string; // Alternative field name from API
  product_id?: string;
  tanggal?: string;
  created_at?: string;
}

interface ApiExpense {
  id: string;
  category: string;
  description?: string;
  cost: number;
  date: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// Helper to safely parse numbers from API (handles strings and floats)
function safeParseNumber(value: any, defaultValue: number = 0): number {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  // If it's already a number, round it to avoid floating point issues
  if (typeof value === 'number') {
    return Math.round(value);
  }
  // Parse string to number, handling both comma and dot as decimal separator
  const parsed = parseFloat(String(value).replace(',', '.'));
  return isNaN(parsed) ? defaultValue : Math.round(parsed);
}

// Transform API product to local format using centralized image utilities
function transformApiProduct(apiProduct: ApiProduct) {
  const imageUrl = normalizeImageUrl(apiProduct.gambar);
  
  // Parse numbers safely - ensure they're integers
  const hargaJual = safeParseNumber(apiProduct.harga, 0);
  const hargaBeli = safeParseNumber(apiProduct.harga_beli, Math.floor(hargaJual * 0.7));
  const stok = safeParseNumber(apiProduct.stok, 0);
  
  console.log('[transformApiProduct]', {
    nama: apiProduct.nama,
    rawHarga: apiProduct.harga,
    rawHargaBeli: apiProduct.harga_beli,
    parsedHargaJual: hargaJual,
    parsedHargaBeli: hargaBeli,
    gambarLength: apiProduct.gambar?.length || 0,
    imageUrlValid: imageUrl !== '/placeholder.svg',
  });

  return {
    id: apiProduct.id,
    kode_produk: apiProduct.kode_produk || `PRD-${apiProduct.id.slice(0, 4)}`,
    nama_produk: apiProduct.nama,
    gambar: imageUrl,
    jumlah_stok: stok,
    harga_beli: hargaBeli,
    harga_jual: hargaJual,
    keuntungan: hargaJual - hargaBeli,
    created_at: apiProduct.created_at ? new Date(apiProduct.created_at) : new Date(),
    updated_at: apiProduct.updated_at ? new Date(apiProduct.updated_at) : new Date(),
  };
}

// Transform API transaction to local format
function transformApiTransaction(apiTransaction: ApiTransaction, index: number) {
  // Safely parse numeric values
  const qty = safeParseNumber(apiTransaction.qty, 1);
  const harga = safeParseNumber(apiTransaction.harga, 0);
  const total = safeParseNumber(apiTransaction.total, qty * harga);
  
  // Handle payment method - check multiple possible field names
  const paymentMethod = apiTransaction.metode_pembayaran || 
                        apiTransaction.payment_method || 
                        'Tunai';
  
  // Validate payment method is one of the expected values
  const validMethods = ['Tunai', 'Shopee', 'Tokopedia'];
  const normalizedMethod = validMethods.includes(paymentMethod) 
    ? paymentMethod as 'Tunai' | 'Shopee' | 'Tokopedia'
    : 'Tunai';
  
  console.log('[transformApiTransaction]', {
    id: apiTransaction.id,
    rawQty: apiTransaction.qty,
    rawHarga: apiTransaction.harga,
    rawTotal: apiTransaction.total,
    rawMetode: apiTransaction.metode_pembayaran,
    parsedQty: qty,
    parsedHarga: harga,
    parsedTotal: total,
    normalizedMethod,
  });
  
  return {
    id: apiTransaction.id,
    no: apiTransaction.no || index + 1,
    tanggal: apiTransaction.tanggal ? new Date(apiTransaction.tanggal) : new Date(apiTransaction.created_at || new Date()),
    nama_produk: apiTransaction.nama_produk,
    product_id: apiTransaction.product_id,
    qty,
    harga,
    total,
    metode_pembayaran: normalizedMethod,
  };
}

// Transform API expense to local format
function transformApiExpense(apiExpense: ApiExpense) {
  // Parse cost safely to ensure it's a proper number
  const biaya = safeParseNumber(apiExpense.cost, 0);
  
  return {
    id: apiExpense.id,
    kategori: apiExpense.category as 'Biaya Packing' | 'Iklan' | 'Bensin' | 'Tip Kurir' | 'Gaji Karyawan',
    keterangan: apiExpense.description || apiExpense.category,
    tanggal: new Date(apiExpense.date),
    biaya: biaya,
    catatan: apiExpense.notes || '',
    created_at: apiExpense.created_at ? new Date(apiExpense.created_at) : new Date(),
    updated_at: apiExpense.updated_at ? new Date(apiExpense.updated_at) : new Date(),
  };
}

// Products Hook
export function useApiProducts() {
  const [products, setProducts] = useState<ReturnType<typeof transformApiProduct>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchProducts = useCallback(async () => {
    // Check if user is authenticated before making API call
    const token = getAuthToken();
    console.log('[useApiProducts] fetchProducts called, token exists:', !!token);
    
    if (!token) {
      console.log('[useApiProducts] No token, skipping fetch');
      setLoading(false);
      return; // Don't fetch if not logged in
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('[useApiProducts] Calling productsApi.getAll()...');
      const result = await productsApi.getAll();
      console.log('[useApiProducts] API result:', JSON.stringify(result).substring(0, 500));
      
      if (result.success) {
        const data = Array.isArray(result.data) ? result.data : [];
        console.log('[useApiProducts] Setting products:', data.length, 'items');
        if (data.length > 0) {
          console.log('[useApiProducts] First product sample:', JSON.stringify(data[0]).substring(0, 200));
        }
        const transformedProducts = data.map(transformApiProduct);
        console.log('[useApiProducts] Transformed products count:', transformedProducts.length);
        setProducts(transformedProducts);
      } else {
        console.error('[useApiProducts] API returned error:', result.error);
        setError(result.error || 'Gagal memuat produk');
        // Only show toast for non-auth and non-network errors
        if (result.error && !isAuthOrNetworkError(result.error)) {
          toast({
            title: 'Error',
            description: result.error,
            variant: 'destructive',
          });
        }
      }
    } catch (err) {
      console.error('[useApiProducts] Exception during fetch:', err);
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  const addProduct = useCallback(async (data: { 
    kode_produk?: string; 
    nama_produk: string; 
    gambar?: string;
    jumlah_stok: number; 
    harga_beli?: number; 
    harga_jual: number; 
  }) => {
    // Image is now handled as URL (uploaded to server) or kept as-is
    const imageUrl = data.gambar || '';
    
    console.log('[useApiProducts] Adding product:', {
      nama: data.nama_produk,
      kode: data.kode_produk,
      hasImage: !!imageUrl,
      imageIsUrl: imageUrl.startsWith('http'),
    });
    
    // Send ALL fields to backend - field names must match PHP API expectations
    const result = await productsApi.create({
      kode_produk: data.kode_produk,
      nama: data.nama_produk,
      gambar: imageUrl || undefined,
      harga_beli: data.harga_beli || 0,
      harga: data.harga_jual,
      stok: data.jumlah_stok,
    });
    
    console.log('[useApiProducts] Add result:', { success: result.success, error: result.error });
    
    if (result.success) {
      console.log('[useApiProducts] Add successful, waiting before refetch...');
      // Small delay to ensure database commit completes
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('[useApiProducts] Now refetching products...');
      await fetchProducts();
      console.log('[useApiProducts] Refetch completed');
      return { success: true };
    } else {
      console.error('[useApiProducts] Add failed:', result.error);
      toast({
        title: 'Error',
        description: result.error || 'Gagal menambah produk',
        variant: 'destructive',
      });
      return { success: false, error: result.error };
    }
  }, [fetchProducts, toast]);

  const updateProduct = useCallback(async (id: string, data: Partial<{
    kode_produk: string;
    nama_produk: string;
    gambar: string;
    harga_beli: number;
    harga_jual: number;
    jumlah_stok: number;
  }>) => {
    // Image is now handled as URL (uploaded to server) or kept as-is
    const imageUrl = data.gambar || '';
    
    console.log('[useApiProducts] Updating product:', {
      id,
      hasImage: !!imageUrl,
      imageIsUrl: imageUrl.startsWith('http'),
    });
    
    // Send ALL provided fields to backend
    const result = await productsApi.update({
      id,
      kode_produk: data.kode_produk,
      nama: data.nama_produk,
      gambar: imageUrl || undefined,
      harga_beli: data.harga_beli,
      harga: data.harga_jual,
      stok: data.jumlah_stok,
    });
    
    if (result.success) {
      // Small delay to ensure database commit completes
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchProducts();
      return { success: true };
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Gagal memperbarui produk',
        variant: 'destructive',
      });
      return { success: false, error: result.error };
    }
  }, [fetchProducts, toast]);

  const deleteProduct = useCallback(async (id: string) => {
    const result = await productsApi.delete(id);
    
    if (result.success) {
      // Small delay to ensure database commit completes
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchProducts();
      return { success: true };
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Gagal menghapus produk',
        variant: 'destructive',
      });
      return { success: false, error: result.error };
    }
  }, [fetchProducts, toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
  };
}

// Helper function to check for auth or network errors
function isAuthOrNetworkError(error: string): boolean {
  const errorLower = error.toLowerCase();
  return (
    errorLower.includes('login') ||
    errorLower.includes('sesi') ||
    errorLower.includes('network') ||
    errorLower.includes('fetch') ||
    errorLower.includes('failed to fetch') ||
    errorLower.includes('cors') ||
    errorLower.includes('timeout') ||
    errorLower.includes('401') ||
    errorLower.includes('unauthorized')
  );
}

// Transactions Hook
export function useApiTransactions() {
  const [transactions, setTransactions] = useState<ReturnType<typeof transformApiTransaction>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTransactions = useCallback(async () => {
    // Check if user is authenticated before making API call
    const token = getAuthToken();
    console.log('[useApiTransactions] fetchTransactions called, token exists:', !!token);
    
    if (!token) {
      console.log('[useApiTransactions] No token, skipping fetch');
      setLoading(false);
      return; // Don't fetch if not logged in
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('[useApiTransactions] Calling transactionsApi.getAll()...');
      const result = await transactionsApi.getAll();
      console.log('[useApiTransactions] API result success:', result.success, 'data count:', Array.isArray(result.data) ? result.data.length : 'N/A');
      
      if (result.success) {
        const data = Array.isArray(result.data) ? result.data : [];
        console.log('[useApiTransactions] Setting transactions:', data.length, 'items');
        const transformedTransactions = data.map((t, i) => transformApiTransaction(t, i));
        setTransactions(transformedTransactions);
      } else {
        console.error('[useApiTransactions] API returned error:', result.error);
        setError(result.error || 'Gagal memuat transaksi');
        // Only show toast for non-auth and non-network errors
        if (result.error && !isAuthOrNetworkError(result.error)) {
          toast({
            title: 'Error',
            description: result.error,
            variant: 'destructive',
          });
        }
      }
    } catch (err) {
      console.error('[useApiTransactions] Exception during fetch:', err);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createTransaction = useCallback(async (data: {
    nama_produk: string;
    qty: number;
    harga: number;
    metode_pembayaran?: PaymentMethodType;
    product_id?: string;
  }) => {
    console.log('[useApiTransactions] Creating transaction:', data);
    const result = await transactionsApi.create({
      nama_produk: data.nama_produk,
      qty: data.qty,
      harga: data.harga,
      metode_pembayaran: data.metode_pembayaran || 'Tunai',
      product_id: data.product_id,
    });
    
    console.log('[useApiTransactions] Create result success:', result.success);
    
    if (result.success) {
      console.log('[useApiTransactions] Create successful, waiting before refetch...');
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchTransactions();
      console.log('[useApiTransactions] Refetch completed');
      return { success: true };
    } else {
      console.error('[useApiTransactions] Create failed:', result.error);
      toast({
        title: 'Error',
        description: result.error || 'Gagal membuat transaksi',
        variant: 'destructive',
      });
      return { success: false, error: result.error };
    }
  }, [fetchTransactions, toast]);

  const updateTransaction = useCallback(async (id: string, data: Partial<{
    nama_produk: string;
    qty: number;
    harga: number;
    metode_pembayaran: string;
  }>) => {
    const result = await transactionsApi.update({ id, ...data });
    
    if (result.success) {
      await fetchTransactions();
      return { success: true };
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Gagal memperbarui transaksi',
        variant: 'destructive',
      });
      return { success: false, error: result.error };
    }
  }, [fetchTransactions, toast]);

  const deleteTransaction = useCallback(async (id: string) => {
    const result = await transactionsApi.delete(id);
    
    if (result.success) {
      await fetchTransactions();
      return { success: true };
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Gagal menghapus transaksi',
        variant: 'destructive',
      });
      return { success: false, error: result.error };
    }
  }, [fetchTransactions, toast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    refetch: fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
}

// Expenses Hook
export function useApiExpenses() {
  const [expenses, setExpenses] = useState<ReturnType<typeof transformApiExpense>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchExpenses = useCallback(async () => {
    // Check if user is authenticated before making API call
    const token = getAuthToken();
    console.log('[useApiExpenses] fetchExpenses called, token exists:', !!token);
    
    if (!token) {
      console.log('[useApiExpenses] No token, skipping fetch');
      setLoading(false);
      return; // Don't fetch if not logged in
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('[useApiExpenses] Calling expensesApi.getAll()...');
      const result = await expensesApi.getAll();
      console.log('[useApiExpenses] API result success:', result.success, 'data count:', Array.isArray(result.data) ? result.data.length : 'N/A');
      
      if (result.success) {
        const data = Array.isArray(result.data) ? result.data : [];
        console.log('[useApiExpenses] Setting expenses:', data.length, 'items');
        const transformedExpenses = data.map(transformApiExpense);
        setExpenses(transformedExpenses);
      } else {
        console.error('[useApiExpenses] API returned error:', result.error);
        setError(result.error || 'Gagal memuat pengeluaran');
        // Only show toast for non-auth and non-network errors
        if (result.error && !isAuthOrNetworkError(result.error)) {
          toast({
            title: 'Error',
            description: result.error,
            variant: 'destructive',
          });
        }
      }
    } catch (err) {
      console.error('[useApiExpenses] Exception during fetch:', err);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const addExpense = useCallback(async (data: {
    kategori: string;
    keterangan: string;
    tanggal: Date;
    biaya: number;
    catatan?: string;
  }) => {
    console.log('[useApiExpenses] Adding expense:', data);
    
    // Prepare payload - ensure notes is always a string (empty if not provided)
    const payload = {
      category: data.kategori,
      description: data.keterangan,
      cost: data.biaya,
      date: data.tanggal.toISOString().split('T')[0],
      notes: data.catatan?.trim() || '',
    };
    
    console.log('[useApiExpenses] Payload to API:', payload);
    
    const result = await expensesApi.create(payload);
    
    console.log('[useApiExpenses] Add result success:', result.success);
    
    if (result.success) {
      console.log('[useApiExpenses] Add successful, waiting before refetch...');
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchExpenses();
      console.log('[useApiExpenses] Refetch completed');
      return { success: true };
    } else {
      console.error('[useApiExpenses] Add failed:', result.error);
      toast({
        title: 'Error',
        description: result.error || 'Gagal menambah pengeluaran',
        variant: 'destructive',
      });
      return { success: false, error: result.error };
    }
  }, [fetchExpenses, toast]);

  const updateExpense = useCallback(async (id: string, data: Partial<{
    kategori: string;
    keterangan: string;
    tanggal: Date;
    biaya: number;
    catatan: string;
  }>) => {
    const result = await expensesApi.update({
      id,
      category: data.kategori,
      description: data.keterangan,
      cost: data.biaya,
      date: data.tanggal?.toISOString().split('T')[0],
      notes: data.catatan,
    });
    
    if (result.success) {
      await fetchExpenses();
      return { success: true };
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Gagal memperbarui pengeluaran',
        variant: 'destructive',
      });
      return { success: false, error: result.error };
    }
  }, [fetchExpenses, toast]);

  const deleteExpense = useCallback(async (id: string) => {
    const result = await expensesApi.delete(id);
    
    if (result.success) {
      await fetchExpenses();
      return { success: true };
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Gagal menghapus pengeluaran',
        variant: 'destructive',
      });
      return { success: false, error: result.error };
    }
  }, [fetchExpenses, toast]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  return {
    expenses,
    loading,
    error,
    refetch: fetchExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
  };
}
