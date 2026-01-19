import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useApiProducts, useApiTransactions } from '@/hooks/useApiSync';
import { formatCurrency, formatNumber } from '@/lib/formatCurrency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Plus,
  Minus,
  Trash2,
  Search,
  ShoppingCart,
  CreditCard,
  Package,
  Smartphone,
  Banknote,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PaymentMethod } from '@/types/pos';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { PrintReceipt } from '@/components/PrintReceipt';
import { Skeleton } from '@/components/ui/skeleton';

const DEFAULT_PRODUCT_IMAGE = '/placeholder.svg';

interface LocalProduct {
  id: string;
  kode_produk: string;
  nama_produk: string;
  gambar: string;
  jumlah_stok: number;
  harga_beli: number;
  harga_jual: number;
  keuntungan: number;
  created_at: Date;
  updated_at: Date;
}

interface LocalCartItem {
  product: LocalProduct;
  qty: number;
}

const POSTransaksi = () => {
  const { products, loading: loadingProducts, refetch: refetchProducts } = useApiProducts();
  const { createTransaction } = useApiTransactions();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Tunai');
  const [showReceipt, setShowReceipt] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cart, setCart] = useState<LocalCartItem[]>([]);
  const [lastTransaction, setLastTransaction] = useState<{
    items: LocalCartItem[];
    total: number;
    paymentMethod: PaymentMethod;
    date: Date;
  } | null>(null);

  const filteredProducts = products.filter(
    (product) =>
      (product.nama_produk.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.kode_produk.toLowerCase().includes(searchTerm.toLowerCase())) &&
      product.jumlah_stok > 0
  );

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalAmount = cart.reduce(
    (sum, item) => sum + item.product.harga_jual * item.qty,
    0
  );

  const addToCart = (product: typeof products[0]) => {
    const cartItem = cart.find((item) => item.product.id === product.id);
    const currentQty = cartItem ? cartItem.qty : 0;

    if (currentQty >= product.jumlah_stok) {
      toast({
        title: 'Stok Tidak Cukup',
        description: `Stok ${product.nama_produk} hanya tersedia ${product.jumlah_stok} unit.`,
        variant: 'destructive',
      });
      return;
    }

    if (cartItem) {
      setCart(cart.map(item => 
        item.product.id === product.id 
          ? { ...item, qty: item.qty + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, qty: 1 }]);
    }
  };

  const updateCartQty = (productId: string, delta: number) => {
    const cartItem = cart.find((item) => item.product.id === productId);
    if (!cartItem) return;

    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const newQty = cartItem.qty + delta;

    if (newQty <= 0) {
      setCart(cart.filter(item => item.product.id !== productId));
      return;
    }

    if (newQty > product.jumlah_stok) {
      toast({
        title: 'Stok Tidak Cukup',
        description: `Stok ${product.nama_produk} hanya tersedia ${product.jumlah_stok} unit.`,
        variant: 'destructive',
      });
      return;
    }

    setCart(cart.map(item => 
      item.product.id === productId 
        ? { ...item, qty: newQty }
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const handleProcess = async () => {
    if (cart.length === 0) {
      toast({
        title: 'Keranjang Kosong',
        description: 'Tambahkan produk ke keranjang terlebih dahulu.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    
    // Create transactions for each cart item
    let allSuccess = true;
    for (const item of cart) {
      const result = await createTransaction({
        nama_produk: item.product.nama_produk,
        qty: item.qty,
        harga: item.product.harga_jual,
        product_id: item.product.id,
      });
      
      if (!result.success) {
        allSuccess = false;
        break;
      }
    }

    setIsProcessing(false);

    if (allSuccess) {
      // Save transaction data before clearing cart
      setLastTransaction({
        items: [...cart],
        total: totalAmount,
        paymentMethod: paymentMethod,
        date: new Date(),
      });

      toast({
        title: 'Transaksi Berhasil',
        description: `${totalItems} item dengan total ${formatCurrency(totalAmount)} telah diproses via ${paymentMethod}.`,
      });
      
      clearCart();
      setPaymentMethod('Tunai');
      setShowReceipt(true);
      
      // Refresh products to update stock
      refetchProducts();
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">POS Transaksi</h1>
            <p className="mt-1 text-muted-foreground">
              Proses penjualan dengan cepat dan mudah
            </p>
          </div>
          <Button variant="outline" onClick={refetchProducts} className="gap-2" disabled={loadingProducts}>
            <RefreshCw className={`h-4 w-4 ${loadingProducts ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Product List */}
          <div className="lg:col-span-2">
            <Card className="card-shadow border-border p-4">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cari produk..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Product Grid */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {loadingProducts ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-lg border border-border bg-card p-3">
                      <Skeleton className="mb-3 aspect-square w-full rounded-lg" />
                      <Skeleton className="mb-1 h-4 w-16" />
                      <Skeleton className="mb-2 h-4 w-full" />
                      <div className="flex justify-between">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </div>
                  ))
                ) : filteredProducts.length === 0 ? (
                  <div className="col-span-full flex h-40 items-center justify-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-8 w-8" />
                      <span>Tidak ada produk tersedia</span>
                    </div>
                  </div>
                ) : (
                  filteredProducts.map((product) => {
                    const cartItem = cart.find(
                      (item) => item.product.id === product.id
                    );
                    return (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className="group animate-fade-in rounded-lg border border-border bg-card p-3 text-left transition-all duration-200 hover:border-primary hover:shadow-md"
                      >
                        {/* Product Image */}
                        <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-lg bg-secondary">
                          <img
                            src={product.gambar || DEFAULT_PRODUCT_IMAGE}
                            alt={product.nama_produk}
                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                            }}
                          />
                          {cartItem && (
                            <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground shadow-md">
                              {cartItem.qty}
                            </span>
                          )}
                        </div>
                        <div className="mb-1 flex items-start justify-between">
                          <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs text-muted-foreground">
                            {product.kode_produk}
                          </span>
                        </div>
                        <h3 className="line-clamp-2 text-sm font-medium text-foreground group-hover:text-primary">
                          {product.nama_produk}
                        </h3>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-base font-bold text-primary">
                            {formatCurrency(product.harga_jual)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Stok: {formatNumber(product.jumlah_stok)}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </Card>
          </div>

          {/* Cart */}
          <div className="lg:col-span-1">
            <Card className="card-shadow sticky top-6 border-border p-4">
              <div className="mb-4 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">
                  Keranjang
                </h2>
                {totalItems > 0 && (
                  <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                    {totalItems} item
                  </span>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <ShoppingCart className="h-8 w-8" />
                    <span>Keranjang kosong</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="max-h-[400px] space-y-3 overflow-y-auto">
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="animate-scale-in rounded-lg border border-border bg-secondary/50 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium text-foreground">
                              {item.product.nama_produk}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(item.product.harga_jual)} × {item.qty}
                            </p>
                          </div>
                          <p className="font-semibold text-foreground">
                            {formatCurrency(item.product.harga_jual * item.qty)}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateCartQty(item.product.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-medium">
                            {item.qty}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateCartQty(item.product.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="ml-auto h-8 w-8"
                            onClick={() => removeFromCart(item.product.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 space-y-4 border-t border-border pt-4">
                    {/* Payment Method Selection */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Metode Pembayaran</Label>
                      <RadioGroup
                        value={paymentMethod}
                        onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                        className="space-y-2"
                      >
                        {/* Online Methods */}
                        <div className="space-y-2">
                          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Smartphone className="h-3 w-3" />
                            Online
                          </span>
                          <div className="ml-4 space-y-2">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="Shopee" id="shopee" />
                              <Label htmlFor="shopee" className="cursor-pointer font-normal">
                                Shopee
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="Tokopedia" id="tokopedia" />
                              <Label htmlFor="tokopedia" className="cursor-pointer font-normal">
                                Tokopedia
                              </Label>
                            </div>
                          </div>
                        </div>
                        {/* Offline Methods */}
                        <div className="space-y-2">
                          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Banknote className="h-3 w-3" />
                            Offline
                          </span>
                          <div className="ml-4">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="Tunai" id="tunai" />
                              <Label htmlFor="tunai" className="cursor-pointer font-normal">
                                Tunai
                              </Label>
                            </div>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">{formatCurrency(totalAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold">Total</span>
                      <span className="text-2xl font-bold text-primary">
                        {formatCurrency(totalAmount)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={clearCart}
                        disabled={isProcessing}
                      >
                        Batal
                      </Button>
                      <Button className="flex-1 gap-2" onClick={handleProcess} disabled={isProcessing}>
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CreditCard className="h-4 w-4" />
                        )}
                        Bayar
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Print Receipt Modal */}
      {lastTransaction && (
        <PrintReceipt
          open={showReceipt}
          onClose={() => setShowReceipt(false)}
          items={lastTransaction.items}
          total={lastTransaction.total}
          paymentMethod={lastTransaction.paymentMethod}
          transactionDate={lastTransaction.date}
        />
      )}
    </MainLayout>
  );
};

export default POSTransaksi;
