import * as XLSX from 'xlsx';
import { Product, Transaction } from '@/types/pos';
import { formatCurrency, formatDateTime } from './formatCurrency';

export function exportProductsToExcel(products: Product[]) {
  const data = products.map((product, index) => ({
    No: index + 1,
    'Kode Produk': product.kode_produk,
    'Nama Produk': product.nama_produk,
    'Jumlah Stok': product.jumlah_stok,
    'Harga Beli': formatCurrency(product.harga_beli),
    'Harga Jual': formatCurrency(product.harga_jual),
    'Keuntungan': formatCurrency(product.keuntungan),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Stok Barang');
  XLSX.writeFile(wb, `Stok_Barang_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportTransactionsToExcel(transactions: Transaction[]) {
  const data = transactions.map((transaction) => ({
    No: transaction.no,
    Tanggal: formatDateTime(transaction.tanggal),
    'Nama Produk': transaction.nama_produk,
    Qty: transaction.qty,
    Harga: formatCurrency(transaction.harga),
    Total: formatCurrency(transaction.total),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transaksi');
  XLSX.writeFile(wb, `Transaksi_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportDashboardToExcel(
  products: Product[],
  transactions: Transaction[],
  stats: {
    totalPembelian: number;
    totalPenjualan: number;
    totalKeuntungan: number;
  }
) {
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    { Keterangan: 'Total Pembelian', Nilai: formatCurrency(stats.totalPembelian) },
    { Keterangan: 'Total Penjualan', Nilai: formatCurrency(stats.totalPenjualan) },
    { Keterangan: 'Total Keuntungan', Nilai: formatCurrency(stats.totalKeuntungan) },
  ];
  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Ringkasan');

  // Products sheet
  const productData = products.map((product, index) => ({
    No: index + 1,
    'Kode Produk': product.kode_produk,
    'Nama Produk': product.nama_produk,
    'Jumlah Stok': product.jumlah_stok,
    'Harga Beli': formatCurrency(product.harga_beli),
    'Harga Jual': formatCurrency(product.harga_jual),
    'Keuntungan per Unit': formatCurrency(product.keuntungan),
  }));
  const productWs = XLSX.utils.json_to_sheet(productData);
  XLSX.utils.book_append_sheet(wb, productWs, 'Stok Barang');

  // Transactions sheet
  const transactionData = transactions.map((transaction) => ({
    No: transaction.no,
    Tanggal: formatDateTime(transaction.tanggal),
    'Nama Produk': transaction.nama_produk,
    Qty: transaction.qty,
    Harga: formatCurrency(transaction.harga),
    Total: formatCurrency(transaction.total),
  }));
  const transactionWs = XLSX.utils.json_to_sheet(transactionData);
  XLSX.utils.book_append_sheet(wb, transactionWs, 'Transaksi');

  XLSX.writeFile(wb, `Laporan_Kertas_${new Date().toISOString().split('T')[0]}.xlsx`);
}
