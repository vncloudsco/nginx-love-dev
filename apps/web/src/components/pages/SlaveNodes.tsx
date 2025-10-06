import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Server, RefreshCw, Trash2, CheckCircle2, XCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import { SlaveNode } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { slaveNodesQueryOptions } from "@/queries/slave.query-options";
import { slaveNodeService } from "@/services/slave.service";

const SlaveNodes = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    host: "",
    port: 3001,
    syncInterval: 60
  });
  const [apiKeyDialog, setApiKeyDialog] = useState<{ open: boolean; apiKey: string }>({
    open: false,
    apiKey: ''
  });

  // Fetch slave nodes
  const { data: nodes = [], isLoading } = useQuery(slaveNodesQueryOptions.all);

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: slaveNodeService.register,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['slave-nodes'] });
      setIsDialogOpen(false);
      resetForm();
      
      // Show API key in separate dialog (critical info!)
      setApiKeyDialog({
        open: true,
        apiKey: data.data.apiKey
      });
      
      // Also show toast
      toast({ 
        title: "Slave node registered successfully",
        description: `Node ${data.data.name} has been registered`,
      });
    },
    onError: (error: any) => {
      console.error('Registration error:', error);
      
      let errorMessage = "Failed to register node";
      
      if (error.response?.status === 401) {
        errorMessage = "Authentication required. Please login first.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Registration failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000
      });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: slaveNodeService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slave-nodes'] });
      toast({ title: "Node removed successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.response?.data?.message || "Failed to delete node",
        variant: "destructive"
      });
    }
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: ({ id, force }: { id: string; force?: boolean }) => 
      slaveNodeService.syncToNode(id, { force }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['slave-nodes'] });
      const message = data.data?.skipped 
        ? "Configuration already up to date" 
        : `Synced ${data.data?.changesCount || 0} changes in ${data.data?.duration || 0}ms`;
      toast({ title: "Sync completed", description: message });
    },
    onError: (error: any) => {
      toast({
        title: "Sync failed",
        description: error.response?.data?.message || "Failed to sync configuration",
        variant: "destructive"
      });
    }
  });

  // Sync all mutation
  const syncAllMutation = useMutation({
    mutationFn: slaveNodeService.syncToAll,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['slave-nodes'] });
      toast({ 
        title: "Sync to all nodes completed",
        description: `${data.data.success}/${data.data.total} nodes synced successfully`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync all failed",
        description: error.response?.data?.message || "Failed to sync to all nodes",
        variant: "destructive"
      });
    }
  });

  const handleAddNode = () => {
    if (!formData.name || !formData.host) {
      toast({
        title: "Validation error",
        description: "Name and host are required",
        variant: "destructive"
      });
      return;
    }

    console.log('Registering node:', formData);
    
    registerMutation.mutate({
      name: formData.name,
      host: formData.host,
      port: formData.port,
      syncInterval: formData.syncInterval
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      host: "",
      port: 3001,
      syncInterval: 60
    });
  };

  const handleSync = (nodeId: string) => {
    syncMutation.mutate({ id: nodeId, force: false });
  };

  const handleSyncAll = () => {
    syncAllMutation.mutate();
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to remove this node?")) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'default';
      case 'offline': return 'destructive';
      case 'syncing': return 'secondary';
      case 'error': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle2 className="h-4 w-4" />;
      case 'offline': return <XCircle className="h-4 w-4" />;
      case 'syncing': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const isNodeInSync = (node: SlaveNode) => {
    // Legacy support for old mock data
    if (node.syncStatus?.inSync !== undefined) {
      return node.syncStatus.inSync;
    }
    // New logic: check if configHash exists and lastSyncAt is recent
    return !!node.configHash && node.lastSyncAt;
  };

  // Check authentication
  const isAuthenticated = !!localStorage.getItem('accessToken');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Authentication Warning */}
      {!isAuthenticated && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Authentication Required
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  You need to login to register and manage slave nodes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Server className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Slave Nodes</h1>
            <p className="text-muted-foreground">Manage distributed nginx nodes and configuration sync</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleSyncAll}
            disabled={syncAllMutation.isPending || nodes.length === 0 || !isAuthenticated}
          >
            {syncAllMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sync All
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!isAuthenticated}>
                <Server className="h-4 w-4 mr-2" />
                Register Node
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register Slave Node</DialogTitle>
                <DialogDescription>
                  Add a new slave node to the cluster
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Node Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="nginx-slave-01"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="host">Host/IP Address</Label>
                  <Input
                    id="host"
                    value={formData.host}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                    placeholder="10.0.10.11"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                    placeholder="3001"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="syncInterval">Sync Interval (seconds)</Label>
                  <Input
                    id="syncInterval"
                    type="number"
                    value={formData.syncInterval}
                    onChange={(e) => setFormData({ ...formData, syncInterval: Number(e.target.value) })}
                    placeholder="60"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button 
                  onClick={handleAddNode} 
                  disabled={registerMutation.isPending || !formData.name || !formData.host}
                >
                  {registerMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {registerMutation.isPending ? 'Registering...' : 'Register Node'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* API Key Dialog - Critical Information */}
          <Dialog open={apiKeyDialog.open} onOpenChange={(open) => setApiKeyDialog({ ...apiKeyDialog, open })}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  Save Your API Key
                </DialogTitle>
                <DialogDescription>
                  This is the only time you'll see this API key. Copy it now and store it securely.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                    ⚠️ Important: You will need this API key to configure your slave node.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="apiKey"
                      value={apiKeyDialog.apiKey}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(apiKeyDialog.apiKey);
                        toast({
                          title: "Copied!",
                          description: "API key copied to clipboard"
                        });
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <p className="text-sm font-medium">Next Steps:</p>
                  <ol className="text-sm space-y-1 list-decimal list-inside">
                    <li>Copy the API key above</li>
                    <li>Save it in your slave node's environment variables</li>
                    <li>Configure: <code className="text-xs bg-background px-1 py-0.5 rounded">SLAVE_API_KEY={apiKeyDialog.apiKey.substring(0, 16)}...</code></li>
                    <li>Start your slave node application</li>
                  </ol>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setApiKeyDialog({ open: false, apiKey: '' })}>
                  I've Saved the API Key
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nodes</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nodes.length}</div>
            <p className="text-xs text-muted-foreground">
              Registered slave nodes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Nodes</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {nodes.filter(n => n.status === 'online').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Active and healthy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {nodes.filter(n => isNodeInSync(n)).length}/{nodes.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Nodes in sync
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Nodes ({nodes.length})</CardTitle>
          <CardDescription>View and manage slave node cluster</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Host:Port</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Sync Status</TableHead>
                  <TableHead>Config Hash</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nodes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No slave nodes registered. Click "Register Node" to add one.
                    </TableCell>
                  </TableRow>
                ) : (
                  nodes.map((node) => (
                    <TableRow key={node.id}>
                      <TableCell className="font-medium">{node.name}</TableCell>
                      <TableCell className="font-mono text-sm">{node.host}:{node.port}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(node.status)}>
                          {getStatusIcon(node.status)}
                          <span className="ml-1">{node.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>{node.version || 'N/A'}</TableCell>
                      <TableCell className="text-sm">
                        {node.lastSeen ? new Date(node.lastSeen).toLocaleString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        {isNodeInSync(node) ? (
                          <Badge variant="default">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            In Sync
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Out of Sync
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {node.configHash?.substring(0, 12) || 'N/A'}...
                      </TableCell>
                      <TableCell>
                        <Badge variant={node.syncEnabled ? 'default' : 'secondary'}>
                          {node.syncEnabled ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleSync(node.id)}
                          disabled={syncMutation.isPending || node.status === 'syncing' || !node.syncEnabled}
                          title="Sync configuration"
                        >
                          {syncMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(node.id)}
                          disabled={deleteMutation.isPending}
                          title="Remove node"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cluster Topology</CardTitle>
          <CardDescription>Visual representation of node cluster</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8 space-x-4">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-lg bg-primary flex items-center justify-center mb-2">
                <Server className="h-10 w-10 text-primary-foreground" />
              </div>
              <p className="text-sm font-medium">Master Node</p>
              <p className="text-xs text-muted-foreground">Primary</p>
            </div>
            {nodes.length > 0 && (
              <>
                <div className="flex-1 h-0.5 bg-border"></div>
                <div className="grid grid-cols-3 gap-4">
                  {nodes.map((node) => (
                    <div key={node.id} className="flex flex-col items-center">
                      <div className={`w-16 h-16 rounded-lg ${
                        node.status === 'online' ? 'bg-green-100 dark:bg-green-900' : 
                        node.status === 'syncing' ? 'bg-yellow-100 dark:bg-yellow-900' :
                        node.status === 'error' ? 'bg-red-100 dark:bg-red-900' :
                        'bg-gray-100 dark:bg-gray-800'
                      } flex items-center justify-center mb-2`}>
                        <Server className="h-8 w-8" />
                      </div>
                      <p className="text-xs font-medium">{node.name}</p>
                      <Badge variant={getStatusColor(node.status)} className="text-xs mt-1">
                        {node.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SlaveNodes;
