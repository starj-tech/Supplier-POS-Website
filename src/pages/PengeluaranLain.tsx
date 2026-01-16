import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useApiExpenses } from '@/hooks/useApiSync';
import { formatCurrency } from '@/lib/formatCurrency';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DialogTrigger,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Pencil, Trash2, CalendarIcon, Receipt, RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ExpenseCategory } from '@/types/pos';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const expenseCategories: ExpenseCategory[] = [
  'Biaya Packing',
  'Iklan',
  'Bensin',
  'Tip Kurir',
  'Gaji Karyawan',
];

interface LocalExpense {
  id: string;
  kategori: ExpenseCategory;
  keterangan: string;
  tanggal: Date;
  biaya: number;
  catatan: string;
  created_at: Date;
  updated_at: Date;
}

const PengeluaranLain = () => {
  const { expenses, loading, addExpense, updateExpense, deleteExpense, refetch } = useApiExpenses();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<LocalExpense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [kategori, setKategori] = useState<ExpenseCategory>('Biaya Packing');
  const [keterangan, setKeterangan] = useState('');
  const [tanggal, setTanggal] = useState<Date>(new Date());
  const [biaya, setBiaya] = useState('');
  const [catatan, setCatatan] = useState('');

  const resetForm = () => {
    setKategori('Biaya Packing');
    setKeterangan('');
    setTanggal(new Date());
    setBiaya('');
    setCatatan('');
    setEditingExpense(null);
  };

  const handleOpenDialog = (expense?: LocalExpense) => {
    if (expense) {
      setEditingExpense(expense);
      setKategori(expense.kategori);
      setKeterangan(expense.keterangan);
      setTanggal(new Date(expense.tanggal));
      setBiaya(expense.biaya.toString());
      setCatatan(expense.catatan);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!keterangan.trim() || !biaya) {
      toast({
        title: 'Error',
        description: 'Mohon lengkapi semua field yang wajib diisi.',
        variant: 'destructive',
      });
      return;
    }

    const expenseData = {
      kategori,
      keterangan: keterangan.trim(),
      tanggal,
      biaya: parseFloat(biaya),
      catatan: catatan.trim(),
    };

    setIsSubmitting(true);
    
    if (editingExpense) {
      const result = await updateExpense(editingExpense.id, expenseData);
      if (result.success) {
        toast({
          title: 'Berhasil',
          description: 'Pengeluaran berhasil diperbarui.',
        });
        setDialogOpen(false);
        resetForm();
      }
    } else {
      const result = await addExpense(expenseData);
      if (result.success) {
        toast({
          title: 'Berhasil',
          description: 'Pengeluaran berhasil ditambahkan.',
        });
        setDialogOpen(false);
        resetForm();
      }
    }
    
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const result = await deleteExpense(id);
    if (result.success) {
      toast({
        title: 'Berhasil',
        description: 'Pengeluaran berhasil dihapus.',
      });
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.biaya, 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Pengeluaran Lain-lain</h1>
            <p className="mt-1 text-muted-foreground">
              Kelola pengeluaran operasional seperti packing, iklan, bensin, dll.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refetch} className="gap-2" disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Tambah Pengeluaran
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingExpense ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Kategori Pengeluaran</Label>
                    <Select value={kategori} onValueChange={(v) => setKategori(v as ExpenseCategory)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="keterangan">Keterangan Pengeluaran *</Label>
                    <Input
                      id="keterangan"
                      value={keterangan}
                      onChange={(e) => setKeterangan(e.target.value)}
                      placeholder="Contoh: Beli plastik packing"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tanggal</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !tanggal && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {tanggal ? format(tanggal, 'PPP', { locale: localeId }) : 'Pilih tanggal'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={tanggal}
                          onSelect={(date) => date && setTanggal(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="biaya">Biaya Pengeluaran *</Label>
                    <Input
                      id="biaya"
                      type="number"
                      value={biaya}
                      onChange={(e) => setBiaya(e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="catatan">Catatan</Label>
                    <Textarea
                      id="catatan"
                      value={catatan}
                      onChange={(e) => setCatatan(e.target.value)}
                      placeholder="Catatan tambahan (opsional)"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
                    Batal
                  </Button>
                  <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingExpense ? 'Simpan Perubahan' : 'Tambah'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Card */}
        <div className="card-shadow rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <Receipt className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Pengeluaran Lain-lain</p>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card-shadow rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Biaya</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-16 mx-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      Belum ada data pengeluaran
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense, index) => (
                    <TableRow key={expense.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          {expense.kategori}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{expense.keterangan}</TableCell>
                      <TableCell>
                        {format(new Date(expense.tanggal), 'dd MMM yyyy', { locale: localeId })}
                      </TableCell>
                      <TableCell className="text-right font-medium text-destructive">
                        {formatCurrency(expense.biaya)}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {expense.catatan || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(expense)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Pengeluaran</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Apakah Anda yakin ingin menghapus pengeluaran "{expense.keterangan}"?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(expense.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Hapus
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default PengeluaranLain;
