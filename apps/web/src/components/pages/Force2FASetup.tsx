import { useState, useEffect } from 'react';
import { Shield, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { accountService } from '@/services/auth.service';

interface Force2FASetupProps {
  onComplete: () => void;
}

export default function Force2FASetup({ onComplete }: Force2FASetupProps) {
  const [twoFactorSetup, setTwoFactorSetup] = useState<{ secret: string; qrCode: string; backupCodes: string[] } | null>(null);
  const [verificationToken, setVerificationToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Setup 2FA on component mount
    const setup2FA = async () => {
      try {
        const setup = await accountService.setup2FA();
        setTwoFactorSetup(setup);
      } catch (error: any) {
        toast.error('Failed to setup 2FA', {
          description: error.response?.data?.message || 'Please try again',
        });
      } finally {
        setIsLoading(false);
      }
    };

    setup2FA();
  }, []);

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verificationToken || verificationToken.length !== 6) {
      toast.error('Invalid token', {
        description: 'Please enter a 6-digit code',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await accountService.enable2FA(verificationToken);
      toast.success('🛡️ 2FA Enabled Successfully', {
        description: 'Your account is now secured with two-factor authentication!',
      });
      
      // Complete the setup
      onComplete();
    } catch (error: any) {
      toast.error('Verification failed', {
        description: error.response?.data?.message || 'Invalid verification code',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">Setting up 2FA...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!twoFactorSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-6">
            <Alert className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
              <AlertDescription className="text-red-800 dark:text-red-200">
                Failed to setup 2FA. Please contact administrator.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Enable Two-Factor Authentication</CardTitle>
          <CardDescription>
            For security, you must enable 2FA before using this system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              This is a mandatory security requirement. You cannot proceed without enabling 2FA.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Step 1: Scan QR Code</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)
              </p>
              <div className="flex items-center justify-center p-4 bg-white rounded-lg border">
                <img 
                  src={twoFactorSetup.qrCode} 
                  alt="2FA QR Code" 
                  className="w-48 h-48"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center font-mono">
                Manual Entry: {twoFactorSetup.secret}
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Step 2: Save Backup Codes</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Save these backup codes in a secure location. You can use them to access your account if you lose your device.
              </p>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                {twoFactorSetup.backupCodes.map((code, index) => (
                  <div key={index} className="font-mono text-sm flex items-center justify-between">
                    <span>{code}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(code);
                        toast.success('Code copied to clipboard');
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Step 3: Verify Setup</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Enter the 6-digit code from your authenticator app to verify and enable 2FA.
                </p>
                <Input
                  placeholder="Enter 6-digit code"
                  value={verificationToken}
                  onChange={(e) => setVerificationToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest font-mono"
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={verificationToken.length !== 6 || isSubmitting}
              >
                {isSubmitting ? 'Verifying...' : 'Verify & Enable 2FA'}
              </Button>
            </form>
          </div>

          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Once verified, you'll be able to access the system with your new password and 2FA enabled.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
