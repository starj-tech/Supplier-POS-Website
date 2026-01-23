import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, FileText, Receipt, ChevronLeft, ChevronRight, Settings, Upload, X, LogOut, Home, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useRef } from 'react';
import { usePOSStore } from '@/store/posStore';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/stok', label: 'Stok Barang', icon: Package },
  { path: '/pos', label: 'POS Transaksi', icon: FileText },
  { path: '/riwayat', label: 'Riwayat Transaksi', icon: Receipt },
  { path: '/pengeluaran', label: 'Pengeluaran Lain', icon: CreditCard },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { storeSettings, updateStoreSettings } = usePOSStore();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [editName, setEditName] = useState(storeSettings.storeName);
  const [editLogo, setEditLogo] = useState(storeSettings.storeLogo);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogout = async () => {
    await signOut();
    toast({
      title: 'Logout Berhasil',
      description: 'Anda telah keluar dari sistem.',
    });
    navigate('/');
  };

  const handleSaveSettings = () => {
    updateStoreSettings({ storeName: editName, storeLogo: editLogo });
    setDialogOpen(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setEditLogo('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenDialog = () => {
    setEditName(storeSettings.storeName);
    setEditLogo(storeSettings.storeLogo);
    setDialogOpen(true);
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 ease-in-out',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary overflow-hidden">
              {storeSettings.storeLogo ? (
                  <img src={storeSettings.storeLogo} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <FileText className="h-5 w-5 text-sidebar-primary-foreground" />
                )}
              </div>
              <span className="text-lg font-bold text-sidebar-foreground">
                {storeSettings.storeName}
              </span>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    onClick={handleOpenDialog}
                    className="ml-1 rounded-md p-1 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Toko</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="store-name">Nama Toko</Label>
                      <Input
                        id="store-name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Masukkan nama toko"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Logo Toko</Label>
                      <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-border bg-muted overflow-hidden">
                        {editLogo ? (
                            <img src={editLogo} alt="Logo Preview" className="h-full w-full object-cover" />
                          ) : (
                            <FileText className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                            id="logo-upload"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="gap-2"
                          >
                            <Upload className="h-4 w-4" />
                            Upload Logo
                          </Button>
                          {editLogo && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleRemoveLogo}
                              className="gap-2 text-destructive hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                              Hapus Logo
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Batal
                    </Button>
                    <Button onClick={handleSaveSettings}>Simpan</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
          {collapsed && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <button
                  onClick={handleOpenDialog}
                  className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary overflow-hidden hover:ring-2 hover:ring-sidebar-primary/50 transition-all"
                >
                {storeSettings.storeLogo ? (
                    <img src={storeSettings.storeLogo} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                    <FileText className="h-5 w-5 text-sidebar-primary-foreground" />
                  )}
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Toko</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="store-name-collapsed">Nama Toko</Label>
                    <Input
                      id="store-name-collapsed"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Masukkan nama toko"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Logo Toko</Label>
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-border bg-muted overflow-hidden">
                        {editLogo ? (
                          <img src={editLogo} alt="Logo Preview" className="h-full w-full object-cover" />
                        ) : (
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                          id="logo-upload-collapsed"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          Upload Logo
                        </Button>
                        {editLogo && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveLogo}
                            className="gap-2 text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                            Hapus Logo
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button onClick={handleSaveSettings}>Simpan</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5 flex-shrink-0')} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-sidebar-border p-3 space-y-1">
          <Link
            to="/"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
          >
            <Home className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span style={{ fontFamily: "'Quicksand', sans-serif" }}>Distributor & Supplier Kertas</span>}
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Keluar</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent mt-2"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5" />
                <span>Tutup Menu</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
