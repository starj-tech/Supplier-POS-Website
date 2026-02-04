import { useState, useRef, ChangeEvent } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useApiProducts } from '@/hooks/useApiSync';
import { formatCurrency, formatNumber } from '@/lib/formatCurrency';
import { exportProductsToExcel } from '@/lib/exportExcel';
import { uploadApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogDescription,
  DialogFooter,
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
import { Plus, Pencil, Trash2, Download, Search, Package, ImageIcon, Upload, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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

const StokBarang = () => {
  const { products, loading, addProduct, updateProduct, deleteProduct, refetch } = useApiProducts();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<LocalProduct | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    kode_produk: '',
    nama_produk: '',
    gambar: '',
    jumlah_stok: 0,
    harga_beli: 0,
    harga_jual: 0,
  });

  // Handle image selection - store file for later upload
  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'File harus berupa gambar (JPG, PNG, dll).',
        variant: 'destructive',
      });
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'Ukuran gambar maksimal 5MB.',
        variant: 'destructive',
      });
      return;
    }

    // Store the file for later upload
    setSelectedFile(file);
    
    // Create preview URL
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    
    toast({
      title: 'Gambar Dipilih',
      description: `File: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`,
    });
  };

  const clearImage = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
    setFormData({ ...formData, gambar: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const filteredProducts = products.filter(
    (product) =>
      product.nama_produk.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.kode_produk.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      kode_produk: '',
      nama_produk: '',
      gambar: '',
      jumlah_stok: 0,
      harga_beli: 0,
      harga_jual: 0,
    });
    clearImage();
  };

  const handleAdd = async () => {
    if (!formData.kode_produk || !formData.nama_produk) {
      toast({
        title: 'Error',
        description: 'Kode dan Nama Produk wajib diisi.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    // Upload image first if file is selected
    let imageUrl = formData.gambar;
    if (selectedFile) {
      setIsUploading(true);
      const uploadResult = await uploadApi.uploadImage(selectedFile);
      setIsUploading(false);
      
      if (uploadResult.success && uploadResult.data) {
        imageUrl = uploadResult.data.url;
        console.log('[handleAdd] Image uploaded:', imageUrl);
      } else {
        toast({
          title: 'Error',
          description: uploadResult.error || 'Gagal mengupload gambar',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }
    }
    
    const result = await addProduct({ ...formData, gambar: imageUrl });
    setIsSubmitting(false);
    
    if (result.success) {
      toast({
        title: 'Berhasil',
        description: 'Produk berhasil ditambahkan.',
      });
      resetForm();
      setIsAddOpen(false);
    }
  };

  const handleEdit = async () => {
    if (!editingProduct) return;
    
    setIsSubmitting(true);
    
    // Upload image first if new file is selected
    let imageUrl = formData.gambar;
    if (selectedFile) {
      setIsUploading(true);
      const uploadResult = await uploadApi.uploadImage(selectedFile);
      setIsUploading(false);
      
      if (uploadResult.success && uploadResult.data) {
        imageUrl = uploadResult.data.url;
        console.log('[handleEdit] Image uploaded:', imageUrl);
      } else {
        toast({
          title: 'Error',
          description: uploadResult.error || 'Gagal mengupload gambar',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }
    }
    
    // Send ALL fields when updating product
    const result = await updateProduct(editingProduct.id, {
      kode_produk: formData.kode_produk,
      nama_produk: formData.nama_produk,
      gambar: imageUrl,
      harga_beli: formData.harga_beli,
      harga_jual: formData.harga_jual,
      jumlah_stok: formData.jumlah_stok,
    });
    setIsSubmitting(false);
    
    if (result.success) {
      toast({
        title: 'Berhasil',
        description: 'Produk berhasil diperbarui.',
      });
      setEditingProduct(null);
      resetForm();
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteProduct(id);
    if (result.success) {
      toast({
        title: 'Berhasil',
        description: 'Produk berhasil dihapus.',
      });
    }
  };

  const openEditDialog = (product: LocalProduct) => {
    setEditingProduct(product);
    setSelectedFile(null);
    setPreviewUrl('');
    setFormData({
      kode_produk: product.kode_produk,
      nama_produk: product.nama_produk,
      gambar: product.gambar || '',
      jumlah_stok: product.jumlah_stok,
      harga_beli: product.harga_beli,
      harga_jual: product.harga_jual,
    });
  };

  const handleExport = () => {
    exportProductsToExcel(products as any);
    toast({
      title: 'Export Berhasil',
      description: 'Data stok barang telah diunduh.',
    });
  };

  const keuntungan = formData.harga_jual - formData.harga_beli;

  const ProductForm = (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="kode_produk">Kode Produk</Label>
          <Input
            id="kode_produk"
            placeholder="PRD001"
            value={formData.kode_produk}
            onChange={(e) =>
              setFormData({ ...formData, kode_produk: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nama_produk">Nama Produk</Label>
          <Input
            id="nama_produk"
            placeholder="Nama produk"
            value={formData.nama_produk}
            onChange={(e) =>
              setFormData({ ...formData, nama_produk: e.target.value })
            }
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Gambar Produk</Label>
        <div className="flex gap-3 items-center">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary">
            {(previewUrl || formData.gambar) ? (
              <img
                src={previewUrl || formData.gambar}
                alt="Preview"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                }}
              />
            ) : (
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={triggerFileInput}
              className="gap-2"
              disabled={isUploading || isSubmitting}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Mengupload...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Pilih Gambar
                </>
              )}
            </Button>
            {(previewUrl || formData.gambar) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearImage}
                className="text-destructive hover:text-destructive"
                disabled={isUploading || isSubmitting}
              >
                Hapus Gambar
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Gambar akan diupload ke server (maks. 5MB)
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="jumlah_stok">Jumlah Stok</Label>
        <Input
          id="jumlah_stok"
          type="number"
          placeholder="0"
          value={formData.jumlah_stok}
          onChange={(e) =>
            setFormData({ ...formData, jumlah_stok: parseInt(e.target.value) || 0 })
          }
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="harga_beli">Harga Beli</Label>
          <Input
            id="harga_beli"
            type="number"
            placeholder="0"
            value={formData.harga_beli}
            onChange={(e) =>
              setFormData({ ...formData, harga_beli: parseInt(e.target.value) || 0 })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="harga_jual">Harga Jual</Label>
          <Input
            id="harga_jual"
            type="number"
            placeholder="0"
            value={formData.harga_jual}
            onChange={(e) =>
              setFormData({ ...formData, harga_jual: parseInt(e.target.value) || 0 })
            }
          />
        </div>
      </div>
      <div className="rounded-lg bg-secondary p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Keuntungan per Unit</span>
          <span
            className={`text-lg font-bold ${
              keuntungan >= 0 ? 'text-success' : 'text-destructive'
            }`}
          >
            {formatCurrency(keuntungan)}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Stok Barang</h1>
            <p className="mt-1 text-muted-foreground">
              Kelola inventaris dan stok produk Anda
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refetch} className="gap-2" disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={resetForm}>
                  <Plus className="h-4 w-4" />
                  Tambah Produk
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Produk Baru</DialogTitle>
                  <DialogDescription>
                    Masukkan detail produk yang ingin ditambahkan.
                  </DialogDescription>
                </DialogHeader>
                {ProductForm}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSubmitting}>
                    Batal
                  </Button>
                  <Button onClick={handleAdd} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Simpan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari produk..."
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
                  <TableHead className="w-[80px]">Gambar</TableHead>
                  <TableHead>Kode Produk</TableHead>
                  <TableHead>Nama Produk</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead className="text-right">Harga Beli</TableHead>
                  <TableHead className="text-right">Harga Jual</TableHead>
                  <TableHead className="text-right">Keuntungan</TableHead>
                  <TableHead className="w-[100px] text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-12 w-12 rounded-lg" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-16 mx-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Package className="h-8 w-8" />
                        <span>Tidak ada produk ditemukan</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product, index) => (
                    <TableRow key={product.id} className="animate-fade-in">
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary">
                          <img
                            src={product.gambar || DEFAULT_PRODUCT_IMAGE}
                            alt={product.nama_produk}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                            }}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {product.kode_produk}
                      </TableCell>
                      <TableCell className="font-medium">
                        {product.nama_produk}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            product.jumlah_stok < 10
                              ? 'font-medium text-destructive'
                              : ''
                          }
                        >
                          {formatNumber(product.jumlah_stok)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(product.harga_beli)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(product.harga_jual)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-success">
                        {formatCurrency(product.keuntungan)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          <Dialog
                            open={editingProduct?.id === product.id}
                            onOpenChange={(open) => {
                              if (!open) setEditingProduct(null);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(product)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Produk</DialogTitle>
                                <DialogDescription>
                                  Perbarui detail produk.
                                </DialogDescription>
                              </DialogHeader>
                              {ProductForm}
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => setEditingProduct(null)}
                                  disabled={isSubmitting}
                                >
                                  Batal
                                </Button>
                                <Button onClick={handleEdit} disabled={isSubmitting}>
                                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  Simpan
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Produk?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Apakah Anda yakin ingin menghapus produk "
                                  {product.nama_produk}"? Tindakan ini tidak dapat
                                  dibatalkan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(product.id)}
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

export default StokBarang;
