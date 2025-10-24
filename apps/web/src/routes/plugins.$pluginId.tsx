/**
 * Plugin Detail Page
 * View and configure a specific plugin
 */

import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowLeft, Power, PowerOff, Trash2, Activity, Settings2 } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePlugin, usePluginHealth, useActivatePlugin, useDeactivatePlugin, useUninstallPlugin } from '@/queries/plugins';
import { PluginConfigForm } from '@/components/plugins/PluginConfigForm';

export const Route = createFileRoute('/plugins/$pluginId')({
  component: PluginDetailPage,
});

function PluginDetailPage() {
  const { pluginId } = Route.useParams();
  const { data: plugin, isLoading } = usePlugin(pluginId);
  const { data: health } = usePluginHealth(pluginId);
  const activateMutation = useActivatePlugin();
  const deactivateMutation = useDeactivatePlugin();
  const uninstallMutation = useUninstallPlugin();

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!plugin) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Plugin not found</p>
          <Link to="/plugins">
            <Button variant="outline" className="mt-4">
              Back to Plugins
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const metadata = plugin.metadata;

  const handleActivate = () => activateMutation.mutate(pluginId);
  const handleDeactivate = () => deactivateMutation.mutate(pluginId);
  const handleUninstall = () => {
    if (confirm(`Are you sure you want to uninstall ${plugin.name}?`)) {
      uninstallMutation.mutate(pluginId);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/plugins">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{plugin.name}</h1>
            <p className="text-muted-foreground">Version {plugin.version}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {plugin.isActive ? (
            <Button onClick={handleDeactivate} variant="outline" disabled={deactivateMutation.isPending}>
              <PowerOff className="mr-2 h-4 w-4" />
              Deactivate
            </Button>
          ) : (
            <Button onClick={handleActivate} disabled={activateMutation.isPending}>
              <Power className="mr-2 h-4 w-4" />
              Activate
            </Button>
          )}
          <Button onClick={handleUninstall} variant="destructive" disabled={uninstallMutation.isPending}>
            <Trash2 className="mr-2 h-4 w-4" />
            Uninstall
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Status</CardTitle>
          </CardHeader>
          <CardContent>
            {plugin.isActive ? (
              <Badge className="bg-green-600">Active</Badge>
            ) : (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Health</CardTitle>
          </CardHeader>
          <CardContent>
            {health ? (
              <div className="flex items-center gap-2">
                <Activity className={health.data.healthy ? 'text-green-600' : 'text-red-600'} />
                <span>{health.data.healthy ? 'Healthy' : 'Unhealthy'}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">Not available</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Type</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">{metadata.type}</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-muted-foreground">{plugin.description}</p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Author</h4>
                <p className="text-muted-foreground">{metadata.author.name}</p>
                {metadata.author.email && (
                  <p className="text-sm text-muted-foreground">{metadata.author.email}</p>
                )}
              </div>

              {metadata.tags && metadata.tags.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {metadata.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-1">License</h4>
                  <p className="text-sm text-muted-foreground">{metadata.license}</p>
                </div>
                {metadata.category && (
                  <div>
                    <h4 className="font-medium mb-1">Category</h4>
                    <p className="text-sm text-muted-foreground">{metadata.category}</p>
                  </div>
                )}
              </div>

              {(metadata.homepage || metadata.repository) && (
                <div className="flex gap-4">
                  {metadata.homepage && (
                    <a
                      href={metadata.homepage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Homepage →
                    </a>
                  )}
                  {metadata.repository && (
                    <a
                      href={metadata.repository}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Repository →
                    </a>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Plugin Configuration
              </CardTitle>
              <CardDescription>Configure plugin settings</CardDescription>
            </CardHeader>
            <CardContent>
              <PluginConfigForm plugin={plugin} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Required Permissions</CardTitle>
              <CardDescription>Permissions this plugin requires to function</CardDescription>
            </CardHeader>
            <CardContent>
              {metadata.permissions && metadata.permissions.length > 0 ? (
                <div className="space-y-4">
                  {metadata.permissions.map((perm, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="font-medium mb-2">{perm.resource}</div>
                      <div className="flex flex-wrap gap-2">
                        {perm.actions.map((action) => (
                          <Badge key={action} variant="secondary">
                            {action}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No special permissions required</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
