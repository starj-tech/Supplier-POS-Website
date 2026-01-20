import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ShoppingCart, 
  ArrowRight,
  MessageCircle,
  MapPin,
  Calendar,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Star
} from 'lucide-react';
import { usePOSStore } from '@/store/posStore';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';

// Import slideshow images
import slide1 from '@/assets/slide-1.jpeg';
import slide2 from '@/assets/slide-2.jpeg';
import slide3 from '@/assets/slide-3.jpeg';
import slide4 from '@/assets/slide-4.jpeg';
import slide5 from '@/assets/slide-5.jpeg';

// Import best seller product images
import copyPaperImg from '@/assets/copy-paper.jpeg';
import campusImg from '@/assets/campus.jpeg';
import aoneImg from '@/assets/aone.jpeg';

const WHATSAPP_NUMBER = '6285890040522';
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`;

const slides = [slide1, slide2, slide3, slide4, slide5];

const bestSellers = [
  {
    name: 'Kertas HVS Copy Paper 75 gsm',
    image: copyPaperImg,
    description: 'Kertas HVS berkualitas tinggi untuk kebutuhan fotocopy dan printing.',
  },
  {
    name: 'Buku Tulis Campus 42 Lembar',
    image: campusImg,
    description: 'Buku tulis premium dengan kertas berkualitas untuk pelajar dan mahasiswa.',
  },
  {
    name: 'Kertas HVS Aone 70 gsm',
    image: aoneImg,
    description: 'Kertas multi purpose quality paper untuk segala kebutuhan.',
  },
];

const storeProfile = {
  yearFounded: '2025',
  address: 'Jl. Rawa Gembira, Perumahan PURI ASRI 3 JONGGOL Blok D.2 No.1, Bogor, Jawa Barat',
  phone: '+62 858-9004-0522',
  email: 'muthiaratk25@gmail.com',
  description: 'MuthiarATK merupakan perusahaan Multi Business Company yang berdiri pada tahun 2025 dimana salah satu bisnisnya bergerak dibidang supplier penyedia barang dan jasa, mencakup : Distributor Kertas HVS, ATK, Kebutuhan Sekolah serta percetakan dan printing. Kami Bekerja sama dengan semua Produk Kertas terutama dengan APP SINARMAS dan APRIL GROUP dengan tujuan untuk membangun Supplier terpercaya yang hanya memberikan produk yang original keluaran pabrik langsung dengan harga yang kompetitif. Kami percaya bahwa “Kepuasan Pelanggan” adalah prioritas utama dalam berbisnis. Sehingga prioritas tersebut kami bangun dengan memberikan pelayanan yang optimal serta professional melalui SDM yang kami miliki, dan juga dengan relasi yang kami bangun melalui produsen serta distributor yang hanya membuat produk original dan harga yang kompetitif. Oleh karena itu, hal tersebut kami jadikan sebagai standard untuk memberikan pelayanan mutu yang terbaik kepada seluruh pelanggan kami',
};

export default function Landing() {
  const { storeSettings } = usePOSStore();
  const { user } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-slide every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary overflow-hidden">
              {storeSettings.storeLogo ? (
                <img src={storeSettings.storeLogo} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <ShoppingCart className="h-5 w-5 text-primary-foreground" />
              )}
            </div>
            <span className="text-xl font-bold text-foreground">
              {storeSettings.storeName}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/dashboard">
                <Button className="gap-2">
                  Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button className="gap-2">
                  Log In
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section - Image Slideshow */}
      <section className="relative w-full overflow-hidden">
        <div className="relative h-[300px] sm:h-[400px] md:h-[500px]">
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={slide}
                alt={`Slide ${index + 1}`}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
          ))}
          
          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background/80 text-foreground shadow-lg transition-all hover:bg-background hover:scale-110"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background/80 text-foreground shadow-lg transition-all hover:bg-background hover:scale-110"
            aria-label="Next slide"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2.5 w-2.5 rounded-full transition-all ${
                  index === currentSlide
                    ? 'bg-primary w-8'
                    : 'bg-background/60 hover:bg-background'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Store Profile Section */}
      <section className="border-t border-border bg-secondary/30 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Profile Toko
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {storeProfile.description}
            </p>
          </div>
          
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-6 text-center transition-all hover:shadow-lg">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 font-semibold text-foreground">Tahun Pendirian</h3>
              <p className="mt-1 text-muted-foreground">{storeProfile.yearFounded}</p>
            </Card>
            
            <Card className="p-6 text-center transition-all hover:shadow-lg">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 font-semibold text-foreground">Alamat</h3>
              <p className="mt-1 text-sm text-muted-foreground">{storeProfile.address}</p>
            </Card>
            
            <Card className="p-6 text-center transition-all hover:shadow-lg">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Phone className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 font-semibold text-foreground">Telepon</h3>
              <p className="mt-1 text-muted-foreground">{storeProfile.phone}</p>
            </Card>
            
            <Card className="p-6 text-center transition-all hover:shadow-lg">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 font-semibold text-foreground">Email</h3>
              <p className="mt-1 text-muted-foreground">{storeProfile.email}</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Best Seller Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Best Seller
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Produk terlaris yang paling diminati pelanggan kami.
            </p>
          </div>
          
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {bestSellers.map((product, index) => (
              <Card
                key={product.name}
                className="group overflow-hidden border-border transition-all duration-300 hover:shadow-xl"
              >
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    <Star className="h-3 w-3 fill-current" />
                    Best Seller
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-foreground">
                    {product.name}
                  </h3>
                  <p className="mt-2 text-muted-foreground">
                    {product.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Google Maps Section */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Lokasi Toko
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Kunjungi toko kami di alamat berikut
            </p>
          </div>
          
          <Card className="mx-auto max-w-4xl overflow-hidden border-border">
            <div className="relative w-full h-[400px]">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d126867.50040793895!2d106.99330949797205!3d-6.4441736013547315!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e6997a2d5e703a7%3A0xfe81de73c7393b24!2sDistributor%20Supplier%20Kertas%20HVS!5e0!3m2!1sid!2sid!4v1768309394187!5m2!1sid!2sid"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Lokasi Toko"
                className="absolute inset-0"
              />
            </div>
            <div className="p-6 bg-background">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground">{storeSettings.storeName}</h3>
                  <p className="text-muted-foreground">{storeProfile.address}</p>
                  <a
                    href="https://share.google/A3cvB5U1BOhmsqhXI"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Buka di Google Maps
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-secondary/30 py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary overflow-hidden">
              {storeSettings.storeLogo ? (
                <img src={storeSettings.storeLogo} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <ShoppingCart className="h-4 w-4 text-primary-foreground" />
              )}
            </div>
            <span className="font-semibold text-foreground">
              {storeSettings.storeName}
            </span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            © {new Date().getFullYear()} {storeSettings.storeName}. All rights reserved.
          </p>
        </div>
      </footer>

      {/* WhatsApp Floating Button */}
      <a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110 hover:shadow-xl animate-pulse-soft"
        aria-label="Chat via WhatsApp"
      >
        <MessageCircle className="h-7 w-7" />
      </a>
    </div>
  );
}
