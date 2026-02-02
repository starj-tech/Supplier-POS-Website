import { useState, useEffect, useCallback } from 'react';
import { productsApi, transactionsApi, expensesApi, getAuthToken } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

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
  qty: number;
  harga: number;
  total: number;
  metode_pembayaran: string;
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

// Transform API product to local format
function transformApiProduct(apiProduct: ApiProduct) {
  // Handle image - check if it's a valid base64 or URL
  let imageUrl = '/placeholder.svg';
  
  // Only process if gambar exists and has meaningful content (more than 50 chars)
  if (apiProduct.gambar && apiProduct.gambar.length > 50) {
    if (apiProduct.gambar.startsWith('data:')) {
      // Already a complete data URL
      imageUrl = apiProduct.gambar;
    } else if (apiProduct.gambar.startsWith('http')) {
      // HTTP/HTTPS URL
      imageUrl = apiProduct.gambar;
    } else {
      // Assume it's a raw base64 string without prefix
      imageUrl = `data:image/jpeg;base64,${apiProduct.gambar}`;
    }
  }
  
  console.log('[transformApiProduct] Product:', apiProduct.nama, 'Image length:', apiProduct.gambar?.length || 0);
  
  return {
    id: apiProduct.id,
    kode_produk: apiProduct.kode_produk || `PRD-${apiProduct.id.slice(0, 4)}`,
    nama_produk: apiProduct.nama,
    gambar: imageUrl,
    jumlah_stok: apiProduct.stok || 0,
    harga_beli: apiProduct.harga_beli || Math.floor(apiProduct.harga * 0.7),
    harga_jual: apiProduct.harga,
    keuntungan: apiProduct.harga - (apiProduct.harga_beli || Math.floor(apiProduct.harga * 0.7)),
    created_at: apiProduct.created_at ? new Date(apiProduct.created_at) : new Date(),
    updated_at: apiProduct.updated_at ? new Date(apiProduct.updated_at) : new Date(),
  };
}

// Transform API transaction to local format
function transformApiTransaction(apiTransaction: ApiTransaction, index: number) {
  return {
    id: apiTransaction.id,
    no: apiTransaction.no || index + 1,
    tanggal: apiTransaction.tanggal ? new Date(apiTransaction.tanggal) : new Date(apiTransaction.created_at || new Date()),
    nama_produk: apiTransaction.nama_produk,
    product_id: apiTransaction.product_id,
    qty: apiTransaction.qty,
    harga: apiTransaction.harga,
    total: apiTransaction.total,
    metode_pembayaran: apiTransaction.metode_pembayaran as 'Tunai' | 'Shopee' | 'Tokopedia',
  };
}

// Transform API expense to local format
function transformApiExpense(apiExpense: ApiExpense) {
  return {
    id: apiExpense.id,
    kategori: apiExpense.category as 'Biaya Packing' | 'Iklan' | 'Bensin' | 'Tip Kurir' | 'Gaji Karyawan',
    keterangan: apiExpense.description || apiExpense.category,
    tanggal: new Date(apiExpense.date),
    biaya: apiExpense.cost,
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
    if (!token) {
      setLoading(false);
      return; // Don't fetch if not logged in
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await productsApi.getAll();
      console.log('[useApiProducts] Fetch result:', result);
      
      if (result.success) {
        const data = Array.isArray(result.data) ? result.data : [];
        console.log('[useApiProducts] Setting products:', data.length, 'items');
        setProducts(data.map(transformApiProduct));
      } else {
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
      // Silently handle network errors
      console.warn('Failed to fetch products:', err);
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
    console.log('[useApiProducts] Adding product:', data);
    // Send ALL fields to backend - field names must match PHP API expectations
    const result = await productsApi.create({
      kode_produk: data.kode_produk,
      nama: data.nama_produk,
      gambar: data.gambar,
      harga_beli: data.harga_beli || 0,
      harga: data.harga_jual,
      stok: data.jumlah_stok,
    });
    
    console.log('[useApiProducts] Add result:', result);
    
    if (result.success) {
      // Force refetch products after successful add
      console.log('[useApiProducts] Add successful, refetching products...');
      await fetchProducts();
      return { success: true };
    } else {
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
    // Send ALL provided fields to backend
    const result = await productsApi.update({
      id,
      kode_produk: data.kode_produk,
      nama: data.nama_produk,
      gambar: data.gambar,
      harga_beli: data.harga_beli,
      harga: data.harga_jual,
      stok: data.jumlah_stok,
    });
    
    if (result.success) {
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
    if (!token) {
      setLoading(false);
      return; // Don't fetch if not logged in
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await transactionsApi.getAll();
      console.log('[useApiTransactions] Fetch result:', result);
      
      if (result.success) {
        const data = Array.isArray(result.data) ? result.data : [];
        console.log('[useApiTransactions] Setting transactions:', data.length, 'items');
        setTransactions(data.map((t, i) => transformApiTransaction(t, i)));
      } else {
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
      // Silently handle network errors
      console.warn('Failed to fetch transactions:', err);
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
    
    console.log('[useApiTransactions] Create result:', result);
    
    if (result.success) {
      await fetchTransactions();
      return { success: true };
    } else {
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
    if (!token) {
      setLoading(false);
      return; // Don't fetch if not logged in
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await expensesApi.getAll();
      console.log('[useApiExpenses] Fetch result:', result);
      
      if (result.success) {
        const data = Array.isArray(result.data) ? result.data : [];
        console.log('[useApiExpenses] Setting expenses:', data.length, 'items');
        setExpenses(data.map(transformApiExpense));
      } else {
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
      // Silently handle network errors
      console.warn('Failed to fetch expenses:', err);
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
    
    console.log('[useApiExpenses] Add result:', result);
    
    if (result.success) {
      await fetchExpenses();
      return { success: true };
    } else {
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
