# PHP API untuk POS System

## Cara Install di Server Hosting

### 1. Upload File
Upload seluruh folder `php-api` ke server hosting Anda (misalnya ke folder `public_html/api/` atau subdomain khusus).

### 2. Setup Database
1. Login ke phpMyAdmin atau MySQL client
2. Jalankan file SQL di `setup/create_tables.sql` untuk membuat tabel-tabel yang diperlukan

### 3. Konfigurasi Database
Edit file `config/database.php` dan sesuaikan:
```php
private $host = "156.67.221.195";      // Host database
private $db_name = "admin_pos";         // Nama database
private $username = "admin_pos";        // Username database
private $password = "1GRyTauTW6";       // Password database
```

### 4. Permissions
Pastikan file PHP memiliki permission yang benar:
```bash
chmod 644 config/database.php
chmod 755 api/
```

## Endpoint API

### Products
- `GET /api/products/` - Ambil semua produk
- `GET /api/products/?id=xxx` - Ambil produk berdasarkan ID
- `POST /api/products/` - Tambah produk baru
- `PUT /api/products/` - Update produk
- `DELETE /api/products/` - Hapus produk

### Transactions
- `GET /api/transactions/` - Ambil semua transaksi
- `POST /api/transactions/` - Buat transaksi baru
- `PUT /api/transactions/` - Update transaksi
- `DELETE /api/transactions/` - Hapus transaksi

### Other Expenses
- `GET /api/expenses/` - Ambil semua pengeluaran
- `POST /api/expenses/` - Tambah pengeluaran
- `PUT /api/expenses/` - Update pengeluaran
- `DELETE /api/expenses/` - Hapus pengeluaran

### Authentication
- `POST /api/auth/?action=login` - Login
- `POST /api/auth/?action=register` - Register

### Store Settings
- `GET /api/settings/` - Ambil pengaturan toko
- `PUT /api/settings/` - Update pengaturan toko

## Contoh Request

### Login
```bash
curl -X POST https://your-domain.com/api/auth/?action=login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Tambah Produk
```bash
curl -X POST https://your-domain.com/api/products/ \
  -H "Content-Type: application/json" \
  -d '{"nama":"Kertas A4","harga":50000,"stok":100}'
```

### Buat Transaksi
```bash
curl -X POST https://your-domain.com/api/transactions/ \
  -H "Content-Type: application/json" \
  -d '{"nama_produk":"Kertas A4","qty":2,"harga":50000,"metode_pembayaran":"cash"}'
```
