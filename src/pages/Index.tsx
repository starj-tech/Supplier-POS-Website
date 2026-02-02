import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { useApiProducts, useApiTransactions, useApiExpenses } from '@/hooks/useApiSync';
import { formatCurrency, formatNumber } from '@/lib/formatCurrency';
import { exportDashboardToExcel } from '@/lib/exportExcel';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  ShoppingCart,
  TrendingUp,
  Package,
  AlertTriangle,
  Download,
  DollarSign,
  CalendarIcon,
  Receipt,
  Wallet,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import ROASCalculator from '@/components/dashboard/ROASCalculator';
import { useToast } from '@/hooks/use-toast';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

type FilterType = 'all' | 'day' | 'month' | 'year' | 'custom';

const Dashboard = () => {
  // Use API hooks instead of local store
  const { products, loading: productsLoading, refetch: refetchProducts } = useApiProducts();
  const { transactions, loading: transactionsLoading, refetch: refetchTransactions } = useApiTransactions();
  const { expenses: otherExpenses, loading: expensesLoading, refetch: refetchExpenses } = useApiExpenses();
  
  const { toast } = useToast();
  
  // Combined loading state
  const isLoading = productsLoading || transactionsLoading || expensesLoading;
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Date filter state
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Refresh all data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchProducts(), refetchTransactions(), refetchExpenses()]);
    setIsRefreshing(false);
    toast({
      title: 'Data Diperbarui',
      description: 'Data dashboard telah dimuat ulang dari server.',
    });
  };

  // Get date range based on filter type
  const getDateRange = () => {
    const now = selectedDate;
    switch (filterType) {
      case 'day':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'year':
        return { start: startOfYear(now), end: endOfYear(now) };
      case 'custom':
        if (startDate && endDate) {
          return { start: startOfDay(startDate), end: endOfDay(endDate) };
        }
        return null;
      default:
        return null;
    }
  };

  // Filter transactions and expenses by date
  const filteredData = useMemo(() => {
    const range = getDateRange();
    
    let filteredTransactions = transactions;
    let filteredExpenses = otherExpenses;
    
    if (range) {
      filteredTransactions = transactions.filter((t) => {
        const date = new Date(t.tanggal);
        return isWithinInterval(date, { start: range.start, end: range.end });
      });
      
      filteredExpenses = otherExpenses.filter((e) => {
        const date = new Date(e.tanggal);
        return isWithinInterval(date, { start: range.start, end: range.end });
      });
    }
    
    return { filteredTransactions, filteredExpenses };
  }, [transactions, otherExpenses, filterType, selectedDate, startDate, endDate]);

  // Calculate statistics based on filtered data
  const totalPembelian = products.reduce(
    (sum, p) => sum + p.harga_beli * p.jumlah_stok,
    0
  );
  const totalPenjualan = filteredData.filteredTransactions.reduce((sum, t) => sum + t.total, 0);
  const totalKeuntungan = filteredData.filteredTransactions.reduce(
    (sum, t) => {
      const product = products.find((p) => p.id === t.product_id);
      if (product) {
        return sum + product.keuntungan * t.qty;
      }
      return sum;
    },
    0
  );
  const stokRendah = products.filter((p) => p.jumlah_stok < 10).length;
  
  // Other expenses calculation
  const totalPengeluaranLain = filteredData.filteredExpenses.reduce((sum, e) => sum + e.biaya, 0);
  
  // Total overall expenses
  const totalPengeluaranKeseluruhan = totalPembelian + totalPengeluaranLain;

  const handleExport = () => {
    exportDashboardToExcel(products as any, transactions as any, {
      totalPembelian,
      totalPenjualan,
      totalKeuntungan,
    });
    toast({
      title: 'Export Berhasil',
      description: 'Laporan telah diunduh dalam format Excel.',
    });
  };

  const getFilterLabel = () => {
    switch (filterType) {
      case 'day':
        return format(selectedDate, 'dd MMMM yyyy', { locale: localeId });
      case 'month':
        return format(selectedDate, 'MMMM yyyy', { locale: localeId });
      case 'year':
        return format(selectedDate, 'yyyy', { locale: localeId });
      case 'custom':
        if (startDate && endDate) {
          return `${format(startDate, 'dd MMM', { locale: localeId })} - ${format(endDate, 'dd MMM yyyy', { locale: localeId })}`;
        }
        return 'Pilih rentang tanggal';
      default:
        return 'Semua Waktu';
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="mt-1 text-muted-foreground">
              Kelola bisnis Anda dengan mudah - Data dari database
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh} 
              className="gap-2"
              disabled={isLoading || isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              )}
              Refresh
            </Button>
            <Button onClick={handleExport} className="gap-2" disabled={isLoading}>
              <Download className="h-4 w-4" />
              Export ke Excel
            </Button>
          </div>
        </div>

        {/* Date Filter */}
        <div className="card-shadow rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Filter Periode:</span>
            </div>
            
            <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Waktu</SelectItem>
                <SelectItem value="day">Per Hari</SelectItem>
                <SelectItem value="month">Per Bulan</SelectItem>
                <SelectItem value="year">Per Tahun</SelectItem>
                <SelectItem value="custom">Kustom</SelectItem>
              </SelectContent>
            </Select>

            {filterType !== 'all' && filterType !== 'custom' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {getFilterLabel()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}

            {filterType === 'custom' && (
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('gap-2', !startDate && 'text-muted-foreground')}>
                      <CalendarIcon className="h-4 w-4" />
                      {startDate ? format(startDate, 'dd MMM yyyy', { locale: localeId }) : 'Dari'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">-</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('gap-2', !endDate && 'text-muted-foreground')}>
                      <CalendarIcon className="h-4 w-4" />
                      {endDate ? format(endDate, 'dd MMM yyyy', { locale: localeId }) : 'Sampai'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid - Penjualan */}
        <div>
          <h2 className="mb-3 text-lg font-semibold text-foreground">Ringkasan Penjualan</h2>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card-shadow rounded-xl border border-border bg-card p-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-32" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Pembelian (Modal)"
                value={formatCurrency(totalPembelian)}
                icon={<ShoppingCart className="h-6 w-6" />}
                variant="info"
              />
              <StatCard
                title="Total Penjualan"
                value={formatCurrency(totalPenjualan)}
                icon={<DollarSign className="h-6 w-6" />}
                variant="primary"
              />
              <StatCard
                title="Total Keuntungan"
                value={formatCurrency(totalKeuntungan)}
                icon={<TrendingUp className="h-6 w-6" />}
                variant="success"
              />
              <StatCard
                title="Stok Menipis"
                value={stokRendah}
                icon={<AlertTriangle className="h-6 w-6" />}
                variant="warning"
              />
            </div>
          )}
        </div>

        {/* Stats Grid - Pengeluaran */}
        <div>
          <h2 className="mb-3 text-lg font-semibold text-foreground">Ringkasan Pengeluaran</h2>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card-shadow rounded-xl border border-border bg-card p-6">
                  <Skeleton className="h-14 w-14 rounded-full mb-2" />
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-8 w-40" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="card-shadow rounded-xl border border-border bg-card p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/10">
                    <Receipt className="h-7 w-7 text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Total Pengeluaran Lain-lain</p>
                    <p className="text-2xl font-bold text-orange-500">{formatCurrency(totalPengeluaranLain)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Packing, Iklan, Bensin, Tip Kurir, Gaji
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="card-shadow rounded-xl border border-border bg-card p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                    <Wallet className="h-7 w-7 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Total Pengeluaran Keseluruhan</p>
                    <p className="text-2xl font-bold text-destructive">{formatCurrency(totalPengeluaranKeseluruhan)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Modal + Pengeluaran Lain-lain
                    </p>
                  </div>
                </div>
              </div>

              {/* ROAS Calculator */}
              <ROASCalculator />
            </div>
          )}
        </div>

        {/* Two Column Layout */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Stock Overview */}
          <div className="card-shadow rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Stok Barang
              </h2>
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="max-h-[300px] overflow-auto">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produk</TableHead>
                      <TableHead className="text-right">Stok</TableHead>
                      <TableHead className="text-right">Harga Jual</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.slice(0, 5).map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{product.nama_produk}</p>
                            <p className="text-xs text-muted-foreground">
                              {product.kode_produk}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              product.jumlah_stok < 10
                                ? 'font-medium text-destructive'
                                : 'text-foreground'
                            }
                          >
                            {formatNumber(product.jumlah_stok)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(product.harga_jual)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="card-shadow rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Transaksi Terbaru
              </h2>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="max-h-[300px] overflow-auto">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : filteredData.filteredTransactions.length === 0 ? (
                <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                  Belum ada transaksi
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No</TableHead>
                      <TableHead>Produk</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.filteredTransactions
                      .slice(-5)
                      .reverse()
                      .map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>{transaction.no}</TableCell>
                          <TableCell>{transaction.nama_produk}</TableCell>
                          <TableCell className="text-right">
                            {transaction.qty}
                          </TableCell>
                          <TableCell className="text-right font-medium text-success">
                            {formatCurrency(transaction.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;