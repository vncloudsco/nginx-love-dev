/**
 * Plugin Card Component
 * Display plugin information in a card
 */

import { Link } from '@tanstack/react-router';
import {
  Package,
  Power,
  PowerOff,
  Settings,
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Plugin } from '@/types/plugin';
import { useActivatePlugin, useDeactivatePlugin, useUninstallPlugin } from '@/queries/plugins';
import { MoreVertical } from 'lucide-react';

interface PluginCardProps {
  plugin: Plugin;
}

export function PluginCard({ plugin }: PluginCardProps) {
  const activateMutation = useActivatePlugin();
  const deactivateMutation = useDeactivatePlugin();
  const uninstallMutation = useUninstallPlugin();

  const metadata = plugin.metadata;

  const handleActivate = () => {
    activateMutation.mutate(plugin.id);
  };

  const handleDeactivate = () => {
    deactivateMutation.mutate(plugin.id);
  };

  const handleUninstall = () => {
    if (confirm(`Are you sure you want to uninstall ${plugin.name}?`)) {
      uninstallMutation.mutate(plugin.id);
    }
  };

  const getStatusBadge = () => {
    if (plugin.status === 'error') {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Error
        </Badge>
      );
    }
    if (plugin.isActive) {
      return (
        <Badge variant="default" className="gap-1 bg-green-600">
          <CheckCircle className="h-3 w-3" />
          Active
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <PowerOff className="h-3 w-3" />
          Inactive
        </Badge>
      );
    };

  const isLoading =
    activateMutation.isPending || deactivateMutation.isPending || uninstallMutation.isPending;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {metadata.icon ? (
              <img src={metadata.icon} alt={plugin.name} className="h-10 w-10 rounded" />
            ) : (
              <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <CardTitle className="text-lg">{plugin.name}</CardTitle>
              <CardDescription className="text-sm">v{plugin.version}</CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreVertical className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/plugins/$pluginId`} params={{ pluginId: plugin.id }}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configure
                </Link>
              </DropdownMenuItem>
              {plugin.isActive ? (
                <DropdownMenuItem onClick={handleDeactivate}>
                  <PowerOff className="mr-2 h-4 w-4" />
                  Deactivate
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleActivate}>
                  <Power className="mr-2 h-4 w-4" />
                  Activate
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleUninstall} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Uninstall
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2">{plugin.description}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {getStatusBadge()}
          <Badge variant="outline">{metadata.type}</Badge>
          {metadata.category && <Badge variant="outline">{metadata.category}</Badge>}
        </div>

        {metadata.tags && metadata.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {metadata.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground"
              >
                {tag}
              </span>
            ))}
            {metadata.tags.length > 3 && (
              <span className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground">
                +{metadata.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="text-sm text-muted-foreground">
        <div className="flex items-center justify-between w-full">
          <span>By {metadata.author.name}</span>
          <Link
            to={`/plugins/$pluginId`}
            params={{ pluginId: plugin.id }}
            className="text-primary hover:underline"
          >
            View Details →
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
