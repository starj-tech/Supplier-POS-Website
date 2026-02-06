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
  
  // If it's already a valid number, use it
  if (typeof value === 'number') {
    if (isNaN(value) || !isFinite(value)) {
      return defaultValue;
    }
    return Math.round(value);
  }
  
  // Convert to string and clean up
  let strValue = String(value).trim();
  
  // Remove any currency symbols and whitespace
  strValue = strValue.replace(/[Rp\s]/gi, '');
  
  // Handle different number formats
  const dotCount = (strValue.match(/\./g) || []).length;
  const commaCount = (strValue.match(/,/g) || []).length;
  
  if (dotCount > 1) {
    strValue = strValue.replace(/\./g, '');
  } else if (commaCount > 1) {
    strValue = strValue.replace(/,/g, '');
  } else if (dotCount === 1 && commaCount === 1) {
    strValue = strValue.replace(/,/g, '');
  } else if (commaCount === 1) {
    const afterComma = strValue.split(',')[1];
    if (afterComma && afterComma.length === 3 && !afterComma.includes('.')) {
      strValue = strValue.replace(/,/g, '');
    } else {
      strValue = strValue.replace(',', '.');
    }
  }
  
  const parsed = parseFloat(strValue);
  
  if (isNaN(parsed) || !isFinite(parsed)) {
    return defaultValue;
  }
  
  return Math.round(parsed);
}

// Transform API product to local format using centralized image utilities
function transformApiProduct(apiProduct: ApiProduct) {
  const imageUrl = normalizeImageUrl(apiProduct.gambar);
  
  const hargaJual = safeParseNumber(apiProduct.harga, 0);
  const hargaBeli = safeParseNumber(apiProduct.harga_beli, Math.floor(hargaJual * 0.7));
  const stok = safeParseNumber(apiProduct.stok, 0);

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
  const qty = safeParseNumber(apiTransaction.qty, 1);
  const harga = safeParseNumber(apiTransaction.harga, 0);
  
  // Calculate total - ALWAYS recalculate if API value is 0, NaN, or suspicious
  let total = safeParseNumber(apiTransaction.total, 0);
  const calculatedTotal = qty * harga;
  
  if (total === 0 || !isFinite(total) || isNaN(total)) {
    total = calculatedTotal;
  }
  
  if (!isFinite(total) || isNaN(total)) {
    total = 0;
  }
  
  // Handle payment method - check multiple possible field names
  let rawPaymentMethod = apiTransaction.metode_pembayaran || 
                         apiTransaction.payment_method || 
                         '';
  
  if (typeof rawPaymentMethod === 'string') {
    rawPaymentMethod = rawPaymentMethod.trim();
  } else {
    rawPaymentMethod = '';
  }
  
  // Normalize payment method with case-insensitive matching
  let normalizedMethod: 'Tunai' | 'Shopee' | 'Tokopedia' = 'Tunai';
  
  if (rawPaymentMethod) {
    const lowerMethod = rawPaymentMethod.toLowerCase();
    if (lowerMethod === 'tunai' || lowerMethod === 'cash') {
      normalizedMethod = 'Tunai';
    } else if (lowerMethod === 'shopee') {
      normalizedMethod = 'Shopee';
    } else if (lowerMethod === 'tokopedia' || lowerMethod === 'tokped') {
      normalizedMethod = 'Tokopedia';
    } else {
      if (['Tunai', 'Shopee', 'Tokopedia'].includes(rawPaymentMethod)) {
        normalizedMethod = rawPaymentMethod as 'Tunai' | 'Shopee' | 'Tokopedia';
      }
    }
  }
  
  return {
    id: apiTransaction.id,
    no: apiTransaction.no || index + 1,
    tanggal: apiTransaction.tanggal ? new Date(apiTransaction.tanggal) : new Date(apiTransaction.created_at || new Date()),
    nama_produk: apiTransaction.nama_produk || 'Produk Tidak Diketahui',
    product_id: apiTransaction.product_id,
    qty: isFinite(qty) && !isNaN(qty) ? qty : 1,
    harga: isFinite(harga) && !isNaN(harga) ? harga : 0,
    total: isFinite(total) && !isNaN(total) ? total : 0,
    metode_pembayaran: normalizedMethod,
  };
}

// Transform API expense to local format
function transformApiExpense(apiExpense: ApiExpense) {
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

// Products Hook
export function useApiProducts() {
  const [products, setProducts] = useState<ReturnType<typeof transformApiProduct>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchProducts = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await productsApi.getAll();
      
      if (result.success) {
        const data = Array.isArray(result.data) ? result.data : [];
        const transformedProducts = data.map(transformApiProduct);
        setProducts(transformedProducts);
      } else {
        setError(result.error || 'Gagal memuat produk');
        if (result.error && !isAuthOrNetworkError(result.error)) {
          toast({
            title: 'Error',
            description: result.error,
            variant: 'destructive',
          });
        }
      }
    } catch (err) {
      // Silent catch - error already handled
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
    const imageUrl = data.gambar || '';
    
    const result = await productsApi.create({
      kode_produk: data.kode_produk,
      nama: data.nama_produk,
      gambar: imageUrl || undefined,
      harga_beli: data.harga_beli || 0,
      harga: data.harga_jual,
      stok: data.jumlah_stok,
    });
    
    if (result.success) {
      await new Promise(resolve => setTimeout(resolve, 500));
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
    const imageUrl = data.gambar || '';
    
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

// Transactions Hook
export function useApiTransactions() {
  const [transactions, setTransactions] = useState<ReturnType<typeof transformApiTransaction>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTransactions = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await transactionsApi.getAll();
      
      if (result.success) {
        const data = Array.isArray(result.data) ? result.data : [];
        const transformedTransactions = data.map((t, i) => transformApiTransaction(t, i));
        setTransactions(transformedTransactions);
      } else {
        setError(result.error || 'Gagal memuat transaksi');
        if (result.error && !isAuthOrNetworkError(result.error)) {
          toast({
            title: 'Error',
            description: result.error,
            variant: 'destructive',
          });
        }
      }
    } catch (err) {
      // Silent catch
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
    const result = await transactionsApi.create({
      nama_produk: data.nama_produk,
      qty: data.qty,
      harga: data.harga,
      metode_pembayaran: data.metode_pembayaran || 'Tunai',
      product_id: data.product_id,
    });
    
    if (result.success) {
      await new Promise(resolve => setTimeout(resolve, 500));
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
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await expensesApi.getAll();
      
      if (result.success) {
        const data = Array.isArray(result.data) ? result.data : [];
        const transformedExpenses = data.map(transformApiExpense);
        setExpenses(transformedExpenses);
      } else {
        setError(result.error || 'Gagal memuat pengeluaran');
        if (result.error && !isAuthOrNetworkError(result.error)) {
          toast({
            title: 'Error',
            description: result.error,
            variant: 'destructive',
          });
        }
      }
    } catch (err) {
      // Silent catch
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
    const payload = {
      category: data.kategori,
      description: data.keterangan,
      cost: data.biaya,
      date: data.tanggal.toISOString().split('T')[0],
      notes: data.catatan?.trim() || '',
    };
    
    const result = await expensesApi.create(payload);
    
    if (result.success) {
      await new Promise(resolve => setTimeout(resolve, 500));
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