import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useApiTransactions } from '@/hooks/useApiSync';
import { formatCurrency, formatDateTime } from '@/lib/formatCurrency';
import { exportTransactionsToExcel } from '@/lib/exportExcel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Download, Search, Receipt, Edit, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

interface LocalTransaction {
  id: string;
  no: number;
  tanggal: Date;
  nama_produk: string;
  product_id?: string;
  qty: number;
  harga: number;
  total: number;
  metode_pembayaran: 'Tunai' | 'Shopee' | 'Tokopedia';
}

const RiwayatTransaksi = () => {
  const { transactions, loading, updateTransaction, deleteTransaction, refetch } = useApiTransactions();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<LocalTransaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    nama_produk: '',
    qty: 0,
    harga: 0,
  });

  const filteredTransactions = transactions.filter((transaction) =>
    transaction.nama_produk.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = () => {
    exportTransactionsToExcel(transactions as any);
    toast({
      title: 'Export Berhasil',
      description: 'Data transaksi telah diunduh.',
    });
  };

  const handleEditClick = (transaction: LocalTransaction) => {
    setSelectedTransaction(transaction);
    setEditForm({
      nama_produk: transaction.nama_produk,
      qty: transaction.qty,
      harga: transaction.harga,
    });
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (transaction: LocalTransaction) => {
    setSelectedTransaction(transaction);
    setDeleteDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (selectedTransaction) {
      setIsSubmitting(true);
      const result = await updateTransaction(selectedTransaction.id, {
        nama_produk: editForm.nama_produk,
        qty: editForm.qty,
        harga: editForm.harga,
      });
      setIsSubmitting(false);
      
      if (result.success) {
        toast({
          title: 'Transaksi Diperbarui',
          description: 'Data transaksi berhasil diperbarui.',
        });
        setEditDialogOpen(false);
        setSelectedTransaction(null);
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (selectedTransaction) {
      setIsSubmitting(true);
      const result = await deleteTransaction(selectedTransaction.id);
      setIsSubmitting(false);
      
      if (result.success) {
        toast({
          title: 'Transaksi Dihapus',
          description: 'Data transaksi berhasil dihapus.',
          variant: 'destructive',
        });
        setDeleteDialogOpen(false);
        setSelectedTransaction(null);
      }
    }
  };

  // Helper to safely get numeric value with fallback calculation
  const safeNumber = (val: any): number => {
    if (typeof val === 'number' && isFinite(val) && !isNaN(val)) {
      return val;
    }
    return 0;
  };

  // Get display total - use calculated if stored is invalid
  const getDisplayTotal = (t: LocalTransaction): number => {
    const storedTotal = safeNumber(t.total);
    if (storedTotal > 0) return storedTotal;
    // Fallback: calculate from qty * harga
    return safeNumber(t.qty) * safeNumber(t.harga);
  };

  // Get display payment method - default to Tunai if empty
  const getDisplayPaymentMethod = (t: LocalTransaction): string => {
    return t.metode_pembayaran || 'Tunai';
  };

  const totalTransaksi = transactions.reduce((sum, t) => sum + getDisplayTotal(t), 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Riwayat Transaksi
            </h1>
            <p className="mt-1 text-muted-foreground">
              Lihat semua transaksi penjualan yang telah dilakukan
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refetch} className="gap-2" disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export ke Excel
            </Button>
          </div>
        </div>

        {/* Summary Card */}
        <div className="card-shadow rounded-xl border border-border bg-card p-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div>
              <p className="text-sm text-muted-foreground">Total Transaksi</p>
              <p className="text-2xl font-bold text-foreground">
                {transactions.length} transaksi
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Penjualan</p>
              <p className="text-2xl font-bold text-success">
                {formatCurrency(totalTransaksi)}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari transaksi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <div className="card-shadow rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">No</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Nama Produk</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Harga</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Metode Pembayaran</TableHead>
                  <TableHead className="w-[100px] text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-16 mx-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Receipt className="h-8 w-8" />
                        <span>Belum ada transaksi</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id} className="animate-fade-in">
                        <TableCell className="font-mono">
                          {transaction.no}
                        </TableCell>
                        <TableCell>
                          {formatDateTime(transaction.tanggal)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {transaction.nama_produk}
                        </TableCell>
                        <TableCell className="text-right">
                          {transaction.qty}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(transaction.harga)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-success">
                          {formatCurrency(getDisplayTotal(transaction))}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            getDisplayPaymentMethod(transaction) === 'Tunai' 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : getDisplayPaymentMethod(transaction) === 'Shopee'
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                              : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          }`}>
                            {getDisplayPaymentMethod(transaction)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditClick(transaction)}
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(transaction)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Transaksi</DialogTitle>
              <DialogDescription>
                Ubah data transaksi di bawah ini
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nama">Nama Produk</Label>
                <Input
                  id="edit-nama"
                  value={editForm.nama_produk}
                  onChange={(e) => setEditForm({ ...editForm, nama_produk: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-qty">Qty</Label>
                  <Input
                    id="edit-qty"
                    type="number"
                    min={1}
                    value={editForm.qty}
                    onChange={(e) => setEditForm({ ...editForm, qty: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-harga">Harga</Label>
                  <Input
                    id="edit-harga"
                    type="number"
                    min={0}
                    value={editForm.harga}
                    onChange={(e) => setEditForm({ ...editForm, harga: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-bold text-success">
                    {formatCurrency(editForm.qty * editForm.harga)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isSubmitting}>
                Batal
              </Button>
              <Button onClick={handleSaveEdit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Transaksi?</AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin menghapus transaksi "{selectedTransaction?.nama_produk}"? 
                Tindakan ini tidak dapat dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default RiwayatTransaksi;
