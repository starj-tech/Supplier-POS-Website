export interface Product {
  id: string;
  kode_produk: string;
  nama_produk: string;
  gambar?: string; // URL gambar produk (static/local path)
  jumlah_stok: number;
  harga_beli: number;
  harga_jual: number;
  keuntungan: number;
  created_at: Date;
  updated_at: Date;
}

export type PaymentMethod = 'Shopee' | 'Tokopedia' | 'Tunai';

export type ExpenseCategory = 'Biaya Packing' | 'Iklan' | 'Bensin' | 'Tip Kurir' | 'Gaji Karyawan';

export interface Transaction {
  id: string;
  no: number;
  tanggal: Date;
  nama_produk: string;
  product_id: string;
  qty: number;
  harga: number;
  total: number;
  metode_pembayaran: PaymentMethod;
}

export interface OtherExpense {
  id: string;
  kategori: ExpenseCategory;
  keterangan: string;
  tanggal: Date;
  biaya: number;
  catatan: string;
  created_at: Date;
  updated_at: Date;
}

export interface CartItem {
  product: Product;
  qty: number;
}

export interface DashboardStats {
  totalPembelian: number;
  totalPenjualan: number;
  totalKeuntungan: number;
  totalProduk: number;
  stokRendah: number;
}

export interface LocalUser {
  id: string;
  email: string;
  fullName: string;
  password: string;
  createdAt: string;
}
