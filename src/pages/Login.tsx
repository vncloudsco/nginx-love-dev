import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';
import { authService } from '@/services/auth.service';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setUser } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactor, setTwoFactor] = useState('');
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [userId, setUserId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (requires2FA && userId) {
        // Verify 2FA token
        const response = await authService.verify2FA({ userId, token: twoFactor });
        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('refreshToken', response.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.user));
        setUser(response.user);
        toast.success('Login successful');
        navigate('/dashboard');
      } else {
        // Initial login
        const response = await authService.login({ username, password });
        
        if (response.requires2FA) {
          setRequires2FA(true);
          setUserId(response.user.id);
          toast.info('Please enter your 2FA code');
        } else {
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('refreshToken', response.refreshToken);
          localStorage.setItem('user', JSON.stringify(response.user));
          setUser(response.user);
          toast.success('Login successful');
          navigate('/dashboard');
        }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {requires2FA ? 'Two-Factor Authentication' : t('login.title')}
          </CardTitle>
          <CardDescription>
            {requires2FA 
              ? 'Enter the 6-digit code from your authenticator app'
              : 'Nginx + ModSecurity Management Portal'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!requires2FA && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username">{t('login.username')}</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t('login.password')}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </>
            )}
            
            {requires2FA && (
              <div className="space-y-2">
                <Label htmlFor="twoFactor">Authentication Code</Label>
                <Input
                  id="twoFactor"
                  type="text"
                  value={twoFactor}
                  onChange={(e) => setTwoFactor(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  className="text-center text-2xl tracking-widest font-mono"
                  required
                />
                <p className="text-xs text-muted-foreground text-center">
                  Enter the code from your authenticator app
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || (requires2FA && twoFactor.length !== 6)}>
              {loading ? 'Verifying...' : requires2FA ? 'Verify & Sign In' : t('login.signin')}
            </Button>

            {requires2FA && (
              <Button 
                type="button" 
                variant="outline" 
                className="w-full" 
                onClick={() => {
                  setRequires2FA(false);
                  setUserId('');
                  setTwoFactor('');
                }}
              >
                Back to Login
              </Button>
            )}

            {!requires2FA && (
              <p className="text-xs text-center text-muted-foreground mt-4">
                Demo credentials: <code className="bg-muted px-1 py-0.5 rounded">admin / Admin@123</code>
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
