import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatCurrency, formatNumber } from '@/lib/formatCurrency';
import { Printer, X } from 'lucide-react';
import { CartItem, PaymentMethod } from '@/types/pos';
import { usePOSStore } from '@/store/posStore';

interface PrintReceiptProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  total: number;
  paymentMethod: PaymentMethod;
  transactionDate: Date;
}

export function PrintReceipt({ 
  open, 
  onClose, 
  items, 
  total, 
  paymentMethod, 
  transactionDate 
}: PrintReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { storeSettings } = usePOSStore();

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Struk Transaksi - ${storeSettings.storeName}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              padding: 10px;
              max-width: 300px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              border-bottom: 1px dashed #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .store-name {
              font-size: 16px;
              font-weight: bold;
            }
            .date {
              margin-top: 5px;
              font-size: 11px;
            }
            .items {
              border-bottom: 1px dashed #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .item {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
            }
            .item-name {
              flex: 1;
            }
            .item-qty {
              width: 50px;
              text-align: center;
            }
            .item-price {
              width: 80px;
              text-align: right;
            }
            .total-section {
              border-bottom: 1px dashed #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
            }
            .total-row.grand-total {
              font-weight: bold;
              font-size: 14px;
            }
            .footer {
              text-align: center;
              font-size: 11px;
            }
            .print-btn {
              display: block;
              width: 100%;
              padding: 12px;
              margin-top: 20px;
              background: #4F46E5;
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 14px;
              font-weight: bold;
              cursor: pointer;
            }
            .print-btn:active {
              background: #4338CA;
            }
            @media print {
              body { width: 100%; max-width: none; }
              .print-btn { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <button class="print-btn" onclick="window.print()">🖨️ Cetak Struk</button>
          <script>
            // Auto print on desktop, show button on mobile
            if (window.matchMedia('(min-width: 768px)').matches) {
              window.onload = function() {
                window.print();
              };
            }
          </script>
        </body>
      </html>
    `;

    // Try to open new window/tab
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      printWindow.document.write(receiptHTML);
      printWindow.document.close();
    } else {
      // Fallback for mobile: use blob URL which works better on mobile browsers
      const blob = new Blob([receiptHTML], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      
      // Clean up blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Struk Transaksi</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-card p-4">
          <div ref={receiptRef}>
            <div className="header text-center border-b border-dashed border-border pb-4 mb-4">
              <p className="store-name text-lg font-bold">{storeSettings.storeName}</p>
              <p className="date text-sm text-muted-foreground mt-1">
                {formatDate(transactionDate)}
              </p>
            </div>

            <div className="items border-b border-dashed border-border pb-4 mb-4 space-y-2">
              {items.map((item) => (
                <div key={item.product.id} className="item flex justify-between text-sm">
                  <span className="item-name flex-1">{item.product.nama_produk}</span>
                  <span className="item-qty w-12 text-center">{formatNumber(item.qty)}x</span>
                  <span className="item-price w-24 text-right">
                    {formatCurrency(item.product.harga_jual * item.qty)}
                  </span>
                </div>
              ))}
            </div>

            <div className="total-section border-b border-dashed border-border pb-4 mb-4">
              <div className="total-row flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <div className="total-row flex justify-between text-sm">
                <span>Metode Pembayaran</span>
                <span>{paymentMethod}</span>
              </div>
              <div className="total-row grand-total flex justify-between font-bold text-lg mt-2">
                <span>TOTAL</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="footer text-center text-sm text-muted-foreground">
              <p>Terima kasih atas kunjungan Anda!</p>
              <p className="mt-1">Barang yang sudah dibeli tidak dapat dikembalikan</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Tutup
          </Button>
          <Button className="flex-1 gap-2" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Cetak Struk
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
