/**
 * Plugins List Page
 * Display all installed plugins
 */

import { createFileRoute } from '@tanstack/react-router';
import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePlugins } from '@/queries/plugins';
import { PluginCard } from '@/components/plugins/PluginCard';
import { PluginInstallDialog } from '@/components/plugins/PluginInstallDialog';

export const Route = createFileRoute('/plugins/')({
  component: PluginsPage,
});

function PluginsPage() {
  const [search, setSearch] = useState('');
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const { data: plugins, isLoading } = usePlugins();

  const filteredPlugins = plugins?.filter((plugin) => {
    const searchLower = search.toLowerCase();
    return (
      plugin.name.toLowerCase().includes(searchLower) ||
      plugin.description.toLowerCase().includes(searchLower) ||
      plugin.metadata.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Plugins</h1>
          <p className="text-muted-foreground mt-1">
            Manage and configure plugins to extend your WAF platform
          </p>
        </div>
        <Button onClick={() => setInstallDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Install Plugin
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search plugins..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      {plugins && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border rounded-lg p-4">
            <div className="text-2xl font-bold">{plugins.length}</div>
            <div className="text-sm text-muted-foreground">Total Plugins</div>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">
              {plugins.filter((p) => p.isActive).length}
            </div>
            <div className="text-sm text-muted-foreground">Active</div>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {plugins.filter((p) => !p.isActive && p.enabled).length}
            </div>
            <div className="text-sm text-muted-foreground">Inactive</div>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="text-2xl font-bold text-red-600">
              {plugins.filter((p) => p.status === 'error').length}
            </div>
            <div className="text-sm text-muted-foreground">Error</div>
          </div>
        </div>
      )}

      {/* Plugins Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filteredPlugins && filteredPlugins.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlugins.map((plugin) => (
            <PluginCard key={plugin.id} plugin={plugin} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <p className="text-muted-foreground">
            {search ? 'No plugins found matching your search' : 'No plugins installed yet'}
          </p>
          <Button onClick={() => setInstallDialogOpen(true)} className="mt-4" variant="outline">
            Install Your First Plugin
          </Button>
        </div>
      )}

      {/* Install Dialog */}
      <PluginInstallDialog open={installDialogOpen} onOpenChange={setInstallDialogOpen} />
    </div>
  );
}
