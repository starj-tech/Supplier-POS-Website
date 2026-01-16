import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, Transaction, CartItem, PaymentMethod, OtherExpense, ExpenseCategory } from '@/types/pos';

interface StoreSettings {
  storeName: string;
  storeLogo: string;
}

interface POSStore {
  products: Product[];
  transactions: Transaction[];
  cart: CartItem[];
  otherExpenses: OtherExpense[];
  storeSettings: StoreSettings;
  
  // Product actions
  addProduct: (product: Omit<Product, 'id' | 'keuntungan' | 'created_at' | 'updated_at'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  
  // Cart actions
  addToCart: (product: Product, qty: number) => void;
  updateCartItem: (productId: string, qty: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  
  // Transaction actions
  processTransaction: (paymentMethod: PaymentMethod) => void;
  updateTransaction: (id: string, data: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  
  // Other expenses actions
  addOtherExpense: (expense: Omit<OtherExpense, 'id' | 'created_at' | 'updated_at'>) => void;
  updateOtherExpense: (id: string, data: Partial<OtherExpense>) => void;
  deleteOtherExpense: (id: string) => void;
  
  // Store settings actions
  updateStoreSettings: (settings: Partial<StoreSettings>) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export const usePOSStore = create<POSStore>()(
  persist(
    (set, get) => ({
      products: [
        {
          id: '1',
          kode_produk: 'PRD001',
          nama_produk: 'Indomie Goreng',
          gambar: '/placeholder.svg',
          jumlah_stok: 100,
          harga_beli: 2500,
          harga_jual: 3500,
          keuntungan: 1000,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: '2',
          kode_produk: 'PRD002',
          nama_produk: 'Aqua 600ml',
          gambar: '/placeholder.svg',
          jumlah_stok: 50,
          harga_beli: 3000,
          harga_jual: 4000,
          keuntungan: 1000,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: '3',
          kode_produk: 'PRD003',
          nama_produk: 'Teh Botol Sosro',
          gambar: '/placeholder.svg',
          jumlah_stok: 30,
          harga_beli: 4000,
          harga_jual: 5500,
          keuntungan: 1500,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      transactions: [],
      cart: [],
      otherExpenses: [],
      storeSettings: {
        storeName: 'TokoPOS',
        storeLogo: '',
      },

      addProduct: (productData) => {
        const keuntungan = productData.harga_jual - productData.harga_beli;
        const newProduct: Product = {
          ...productData,
          id: generateId(),
          keuntungan,
          created_at: new Date(),
          updated_at: new Date(),
        };
        set((state) => ({ products: [...state.products, newProduct] }));
      },

      updateProduct: (id, productData) => {
        set((state) => ({
          products: state.products.map((p) => {
            if (p.id === id) {
              const harga_beli = productData.harga_beli ?? p.harga_beli;
              const harga_jual = productData.harga_jual ?? p.harga_jual;
              return {
                ...p,
                ...productData,
                keuntungan: harga_jual - harga_beli,
                updated_at: new Date(),
              };
            }
            return p;
          }),
        }));
      },

      deleteProduct: (id) => {
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        }));
      },

      addToCart: (product, qty) => {
        set((state) => {
          const existingItem = state.cart.find((item) => item.product.id === product.id);
          if (existingItem) {
            return {
              cart: state.cart.map((item) =>
                item.product.id === product.id
                  ? { ...item, qty: item.qty + qty }
                  : item
              ),
            };
          }
          return { cart: [...state.cart, { product, qty }] };
        });
      },

      updateCartItem: (productId, qty) => {
        set((state) => ({
          cart: state.cart.map((item) =>
            item.product.id === productId ? { ...item, qty } : item
          ),
        }));
      },

      removeFromCart: (productId) => {
        set((state) => ({
          cart: state.cart.filter((item) => item.product.id !== productId),
        }));
      },

      clearCart: () => {
        set({ cart: [] });
      },

      processTransaction: (paymentMethod: PaymentMethod) => {
        const { cart, products, transactions } = get();
        const newTransactions: Transaction[] = [];
        const lastNo = transactions.length > 0 ? Math.max(...transactions.map((t) => t.no)) : 0;

        cart.forEach((item, index) => {
          newTransactions.push({
            id: generateId(),
            no: lastNo + index + 1,
            tanggal: new Date(),
            nama_produk: item.product.nama_produk,
            product_id: item.product.id,
            qty: item.qty,
            harga: item.product.harga_jual,
            total: item.product.harga_jual * item.qty,
            metode_pembayaran: paymentMethod,
          });
        });

        // Update stock
        const updatedProducts = products.map((product) => {
          const cartItem = cart.find((item) => item.product.id === product.id);
          if (cartItem) {
            return {
              ...product,
              jumlah_stok: product.jumlah_stok - cartItem.qty,
              updated_at: new Date(),
            };
          }
          return product;
        });

        set({
          transactions: [...transactions, ...newTransactions],
          products: updatedProducts,
          cart: [],
        });
      },

      updateTransaction: (id, data) => {
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, ...data } : t
          ),
        }));
      },

      deleteTransaction: (id) => {
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        }));
      },

      addOtherExpense: (expenseData) => {
        const newExpense: OtherExpense = {
          ...expenseData,
          id: generateId(),
          created_at: new Date(),
          updated_at: new Date(),
        };
        set((state) => ({ otherExpenses: [...state.otherExpenses, newExpense] }));
      },

      updateOtherExpense: (id, data) => {
        set((state) => ({
          otherExpenses: state.otherExpenses.map((e) =>
            e.id === id ? { ...e, ...data, updated_at: new Date() } : e
          ),
        }));
      },

      deleteOtherExpense: (id) => {
        set((state) => ({
          otherExpenses: state.otherExpenses.filter((e) => e.id !== id),
        }));
      },

      updateStoreSettings: (settings) => {
        set((state) => ({
          storeSettings: { ...state.storeSettings, ...settings },
        }));
      },
    }),
    {
      name: 'pos-storage',
    }
  )
);
