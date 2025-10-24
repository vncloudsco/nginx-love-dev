/**
 * Plugin Install Dialog
 * Dialog to install new plugin
 */

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useInstallPlugin } from '@/queries/plugins';
import type { PluginInstallOptions } from '@/types/plugin';

interface PluginInstallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PluginInstallDialog({ open, onOpenChange }: PluginInstallDialogProps) {
  const installMutation = useInstallPlugin();
  const [source, setSource] = useState<'file' | 'npm' | 'url' | 'marketplace'>('file');
  const [filePath, setFilePath] = useState('');
  const [packageName, setPackageName] = useState('');
  const [url, setUrl] = useState('');
  const [version, setVersion] = useState('');
  const [force, setForce] = useState(false);

  const handleInstall = () => {
    const options: PluginInstallOptions = {
      source,
      force,
    };

    if (source === 'file' && filePath) {
      options.filePath = filePath;
    } else if (source === 'npm' && packageName) {
      options.packageName = packageName;
      if (version) options.version = version;
    } else if (source === 'url' && url) {
      options.url = url;
    }

    installMutation.mutate(options, {
      onSuccess: () => {
        onOpenChange(false);
        // Reset form
        setFilePath('');
        setPackageName('');
        setUrl('');
        setVersion('');
        setForce(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Install Plugin</DialogTitle>
          <DialogDescription>
            Install a new plugin from various sources
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Source Selection */}
          <div className="space-y-2">
            <Label>Installation Source</Label>
            <Select value={source} onValueChange={(v: any) => setSource(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="file">Local File/Directory</SelectItem>
                <SelectItem value="npm">NPM Package</SelectItem>
                <SelectItem value="url">URL</SelectItem>
                <SelectItem value="marketplace">Marketplace</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* File Path Input */}
          {source === 'file' && (
            <div className="space-y-2">
              <Label htmlFor="filePath">File Path</Label>
              <Input
                id="filePath"
                placeholder="/absolute/path/to/plugin"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Absolute path to plugin directory
              </p>
            </div>
          )}

          {/* NPM Package Input */}
          {source === 'npm' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="packageName">Package Name</Label>
                <Input
                  id="packageName"
                  placeholder="@nginx-love/plugin-name"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="version">Version (Optional)</Label>
                <Input
                  id="version"
                  placeholder="1.0.0"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                />
              </div>
            </>
          )}

          {/* URL Input */}
          {source === 'url' && (
            <div className="space-y-2">
              <Label htmlFor="url">Download URL</Label>
              <Input
                id="url"
                placeholder="https://example.com/plugin.zip"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          )}

          {/* Marketplace - Coming Soon */}
          {source === 'marketplace' && (
            <div className="text-center py-4 text-muted-foreground">
              <p>Marketplace integration coming soon!</p>
            </div>
          )}

          {/* Force Reinstall */}
          <div className="flex items-center space-x-2">
            <Checkbox id="force" checked={force} onCheckedChange={(checked) => setForce(!!checked)} />
            <Label htmlFor="force" className="text-sm font-normal cursor-pointer">
              Force reinstall if plugin already exists
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={installMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleInstall} disabled={installMutation.isPending}>
            {installMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Install
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
