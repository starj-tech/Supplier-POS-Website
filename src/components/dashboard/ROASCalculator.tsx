import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatCurrency';
import { Target, DollarSign, Package, Percent, TrendingUp, ArrowLeft, ArrowRight, Calculator, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ROASResult {
  roasBEP: number;
  roasIdeal: number;
  anggaranIklanMaksimal: number;
  anggaranIklanIdeal: number;
  profitPerProduk: number;
}

const ROASCalculator = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [hargaJual, setHargaJual] = useState<string>('');
  const [hpp, setHpp] = useState<string>('');
  const [biayaAdmin, setBiayaAdmin] = useState<string>('');
  const [targetProfit, setTargetProfit] = useState<string>('');
  const [result, setResult] = useState<ROASResult | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);

  const steps = [
    { number: 1, label: 'Mulai', icon: Target },
    { number: 2, label: 'Harga Jual', icon: DollarSign },
    { number: 3, label: 'HPP', icon: Package },
    { number: 4, label: 'Biaya Admin', icon: Percent },
    { number: 5, label: 'Target Profit', icon: TrendingUp },
  ];

  const calculateROAS = () => {
    const harga = parseFloat(hargaJual) || 0;
    const biayaPokok = parseFloat(hpp) || 0;
    const admin = parseFloat(biayaAdmin) || 0;
    const profit = parseFloat(targetProfit) || 0;

    // Biaya admin dalam rupiah
    const biayaAdminRp = (admin / 100) * harga;
    
    // Profit per produk untuk BEP (tanpa keuntungan)
    const marginBEP = harga - biayaPokok - biayaAdminRp;
    
    // Profit per produk dengan target profit
    const targetProfitRp = (profit / 100) * harga;
    const marginIdeal = harga - biayaPokok - biayaAdminRp - targetProfitRp;

    // ROAS = Harga Jual / Margin
    const roasBEP = marginBEP > 0 ? harga / marginBEP : 0;
    const roasIdeal = marginIdeal > 0 ? harga / marginIdeal : 0;

    // Anggaran iklan
    const anggaranIklanMaksimal = marginBEP > 0 ? marginBEP : 0;
    const anggaranIklanIdeal = marginIdeal > 0 ? marginIdeal : 0;

    setResult({
      roasBEP: Math.round(roasBEP * 100) / 100,
      roasIdeal: Math.round(roasIdeal * 100) / 100,
      anggaranIklanMaksimal,
      anggaranIklanIdeal,
      profitPerProduk: targetProfitRp,
    });
    setCurrentStep(5);
  };

  const resetCalculator = () => {
    setCurrentStep(0);
    setHargaJual('');
    setHpp('');
    setBiayaAdmin('');
    setTargetProfit('');
    setResult(null);
    setShowCalculator(false);
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      calculateROAS();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return true;
      case 1:
        return parseFloat(hargaJual) > 0;
      case 2:
        return parseFloat(hpp) > 0 && parseFloat(hpp) < parseFloat(hargaJual);
      case 3:
        return parseFloat(biayaAdmin) >= 0 && parseFloat(biayaAdmin) <= 100;
      case 4:
        return parseFloat(targetProfit) >= 0 && parseFloat(targetProfit) <= 100;
      default:
        return false;
    }
  };

  const renderStepIndicator = () => (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all',
                currentStep >= index
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {currentStep > index ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                step.number
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'mx-1 h-1 w-6 rounded-full transition-all sm:w-10 md:w-14',
                  currentStep > index ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Target className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Kalkulator Target ROAS</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              <strong>ROAS (Return On Ad Spend)</strong> adalah metrik kunci untuk mengukur efisiensi iklan Anda. Dengan kalkulator ini, Anda bisa menentukan:
            </p>
            <ul className="ml-4 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                ROAS minimal untuk mencapai <strong>Break Even Point (BEP)</strong>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                ROAS target untuk mendapatkan <strong>profit yang diinginkan</strong>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                Batasan anggaran iklan yang <strong>aman dan optimal</strong>
              </li>
            </ul>
            <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
              <p className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                <Info className="h-4 w-4" />
                <strong>Tips:</strong> ROAS 4 berarti setiap Rp1.000 iklan menghasilkan Rp4.000 penjualan
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <DollarSign className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Harga Jual Produk</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Masukkan harga jual produk (setelah diskon) yang tampil di marketplace.
            </p>
            <div className="relative">
              <Input
                type="number"
                placeholder="100000"
                value={hargaJual}
                onChange={(e) => setHargaJual(e.target.value)}
                className="pr-12 text-lg"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                Rp
              </span>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Package className="h-6 w-6" />
              <h3 className="text-lg font-semibold">HPP (Harga Pokok Produksi)</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Total biaya modal per pcs termasuk biaya produksi, pengemasan, dan lainnya.
            </p>
            <div className="relative">
              <Input
                type="number"
                placeholder="55000"
                value={hpp}
                onChange={(e) => setHpp(e.target.value)}
                className="pr-12 text-lg"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                Rp
              </span>
            </div>
            {parseFloat(hpp) > 0 && parseFloat(hpp) >= parseFloat(hargaJual) && (
              <div className="rounded-lg bg-destructive/10 p-3">
                <p className="flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <strong>Perhatian:</strong> HPP tidak boleh lebih dari harga jual. Jika lebih, Anda akan mengalami kerugian.
                </p>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Percent className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Biaya Admin Marketplace</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Masukkan persentase total biaya admin, layanan, dan program marketplace.
            </p>
            <div className="relative">
              <Input
                type="number"
                placeholder="10"
                value={biayaAdmin}
                onChange={(e) => setBiayaAdmin(e.target.value)}
                className="pr-12 text-lg"
                min="0"
                max="100"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                %
              </span>
            </div>
            <div className="rounded-lg bg-info/10 p-3 dark:bg-info/20">
              <p className="text-sm text-info">
                <strong>ℹ️ Butuh bantuan menghitung biaya admin?</strong>
                <br />
                Gunakan kalkulator biaya admin yang lebih detail untuk estimasi akurat.
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <TrendingUp className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Target Profit</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Masukkan persentase profit yang ingin Anda dapatkan dari penjualan.
            </p>
            <div className="relative">
              <Input
                type="number"
                placeholder="15"
                value={targetProfit}
                onChange={(e) => setTargetProfit(e.target.value)}
                className="pr-12 text-lg"
                min="0"
                max="100"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                %
              </span>
            </div>
            <div className="rounded-lg bg-success/10 p-3 dark:bg-success/20">
              <p className="text-sm text-success">
                <strong>💡 Rekomendasi:</strong> Untuk bisnis sustainable, target profit minimal 10-20% dari harga jual.
              </p>
            </div>
          </div>
        );

      case 5:
        return result && (
          <div className="space-y-5">
            {/* ROAS BEP */}
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
              <div className="flex items-center gap-2 text-destructive">
                <Target className="h-5 w-5" />
                <h4 className="font-semibold">ROAS Break Even Point (BEP)</h4>
              </div>
              <p className="mt-2 text-center text-4xl font-bold text-destructive">
                {result.roasBEP.toFixed(2)}
              </p>
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                <p>
                  <strong>Anggaran iklan maksimal:</strong>{' '}
                  <span className="text-foreground">{formatCurrency(result.anggaranIklanMaksimal)}</span>
                </p>
                <p className="text-xs">
                  Di titik ini, penjualan hanya menutup biaya dan Anda <strong>belum mendapatkan keuntungan</strong>.
                </p>
              </div>
            </div>

            {/* ROAS Ideal */}
            <div className="rounded-xl border border-success/20 bg-success/5 p-4">
              <div className="flex items-center gap-2 text-success">
                <TrendingUp className="h-5 w-5" />
                <h4 className="font-semibold">ROAS Ideal dengan Profit</h4>
              </div>
              <p className="mt-2 text-center text-4xl font-bold text-success">
                {result.roasIdeal.toFixed(2)}
              </p>
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                <p>
                  <strong>Profit per produk:</strong>{' '}
                  <span className="text-foreground">{formatCurrency(result.profitPerProduk)}</span>
                </p>
                <p>
                  <strong>Anggaran iklan ideal:</strong>{' '}
                  <span className="text-foreground">{formatCurrency(result.anggaranIklanIdeal)}</span>
                </p>
                <p className="text-xs">
                  Jika ROAS di bawah angka ini, profit akan <strong>mengecil atau habis</strong>.
                </p>
              </div>
            </div>

            {/* Kesimpulan */}
            <div className="rounded-xl border border-border bg-muted/50 p-4">
              <h4 className="mb-2 flex items-center gap-2 font-semibold">
                <Info className="h-5 w-5 text-primary" />
                Kesimpulan
              </h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Target ROAS minimal: <strong className="text-foreground">{result.roasBEP.toFixed(2)}</strong> (BEP)</li>
                <li>• Target ROAS ideal: <strong className="text-foreground">{result.roasIdeal.toFixed(2)}</strong> (dengan profit)</li>
                <li>• Budget iklan aman: <strong className="text-foreground">{formatCurrency(result.anggaranIklanIdeal)}</strong> per produk</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!showCalculator) {
    return (
      <Card className="card-shadow overflow-hidden border-border">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-5 w-5 text-primary" />
            Kalkulator ROAS
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <p className="mb-4 text-sm text-muted-foreground">
            Hitung ROAS optimal untuk iklan marketplace Anda dan tentukan anggaran iklan yang tepat.
          </p>
          <Button 
            onClick={() => setShowCalculator(true)} 
            className="w-full gap-2"
          >
            <Target className="h-4 w-4" />
            Mulai Hitung ROAS
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-shadow overflow-hidden border-border">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-primary" />
          Kalkulator ROAS
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {renderStepIndicator()}
        
        <div className="min-h-[280px]">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="mt-6 flex gap-3">
          {currentStep > 0 && currentStep < 5 && (
            <Button variant="outline" onClick={prevStep} className="flex-1 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Button>
          )}
          
          {currentStep < 5 ? (
            <Button
              onClick={nextStep}
              disabled={!canProceed()}
              className="flex-1 gap-2"
            >
              {currentStep === 4 ? (
                <>
                  <Calculator className="h-4 w-4" />
                  Hitung ROAS
                </>
              ) : currentStep === 0 ? (
                <>
                  <Target className="h-4 w-4" />
                  Mulai Hitung ROAS
                </>
              ) : (
                <>
                  Lanjut
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          ) : (
            <Button onClick={resetCalculator} className="w-full gap-2">
              <Calculator className="h-4 w-4" />
              Hitung Ulang
            </Button>
          )}
        </div>

        {/* Disclaimer */}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          📋 <strong>Disclaimer:</strong> Kalkulator ini bersifat simulasi dan edukasi. Hasil aktual bisa berbeda tergantung performa iklan, kondisi pasar, dan faktor lainnya.
        </p>
      </CardContent>
    </Card>
  );
};

export default ROASCalculator;
