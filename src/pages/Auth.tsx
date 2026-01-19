import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, Mail, Lock, User, ArrowLeft, Loader2 } from 'lucide-react';
import { usePOSStore } from '@/store/posStore';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

const signupSchema = z.object({
  fullName: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Password tidak cocok',
  path: ['confirmPassword'],
});

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const { storeSettings } = usePOSStore();
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ 
    fullName: '', 
    email: '', 
    password: '', 
    confirmPassword: '' 
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect if already logged in
  if (user) {
    navigate('/dashboard');
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    try {
      loginSchema.parse(loginForm);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          if (error.path[0]) {
            fieldErrors[error.path[0] as string] = error.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
    }

    setLoading(true);
    const { error } = await signIn(loginForm.email, loginForm.password);
    setLoading(false);

    if (error) {
      toast({
        title: 'Login Gagal',
        description: error.message === 'Invalid login credentials' 
          ? 'Email atau password salah' 
          : error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Login Berhasil',
        description: 'Selamat datang kembali!',
      });
      navigate('/dashboard');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      signupSchema.parse(signupForm);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          if (error.path[0]) {
            fieldErrors[error.path[0] as string] = error.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
    }

    setLoading(true);
    const { error } = await signUp(signupForm.email, signupForm.password, signupForm.fullName);
    setLoading(false);

    if (error) {
      let errorMessage = error.message;
      if (error.message.includes('already registered')) {
        errorMessage = 'Email sudah terdaftar. Silakan login.';
      }
      toast({
        title: 'Registrasi Gagal',
        description: errorMessage,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Registrasi Berhasil',
        description: 'Akun Anda telah dibuat. Silakan login.',
      });
      navigate('/dashboard');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Home
          </Link>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary overflow-hidden">
            {storeSettings.storeLogo ? (
              <img src={storeSettings.storeLogo} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <ShoppingCart className="h-7 w-7 text-primary-foreground" />
            )}
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">{storeSettings.storeName}</h1>
          <p className="mt-2 text-muted-foreground">Masuk untuk mengelola bisnis Anda</p>
        </div>

        <Card className="card-shadow border-border">
          <CardHeader className="pb-4">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Masuk</TabsTrigger>
                <TabsTrigger value="signup">Daftar</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-6">
                <CardTitle className="text-xl">Selamat Datang</CardTitle>
                <CardDescription className="mt-1">
                  Masukkan email dan password Anda untuk melanjutkan
                </CardDescription>
                <CardContent className="mt-4 p-0">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="nama@email.com"
                          value={loginForm.email}
                          onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                          className="pl-10"
                        />
                      </div>
                      {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="••••••••"
                          value={loginForm.password}
                          onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                          className="pl-10"
                        />
                      </div>
                      {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Memproses...
                        </>
                      ) : (
                        'Masuk'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <CardTitle className="text-xl">Buat Akun Baru</CardTitle>
                <CardDescription className="mt-1">
                  Isi formulir di bawah untuk membuat akun
                </CardDescription>
                <CardContent className="mt-4 p-0">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Nama Lengkap</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="Nama Anda"
                          value={signupForm.fullName}
                          onChange={(e) => setSignupForm({ ...signupForm, fullName: e.target.value })}
                          className="pl-10"
                        />
                      </div>
                      {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="nama@email.com"
                          value={signupForm.email}
                          onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                          className="pl-10"
                        />
                      </div>
                      {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="••••••••"
                          value={signupForm.password}
                          onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                          className="pl-10"
                        />
                      </div>
                      {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm">Konfirmasi Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="signup-confirm"
                          type="password"
                          placeholder="••••••••"
                          value={signupForm.confirmPassword}
                          onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                          className="pl-10"
                        />
                      </div>
                      {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Memproses...
                        </>
                      ) : (
                        'Daftar'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
