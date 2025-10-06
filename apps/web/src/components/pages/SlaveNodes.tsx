import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Server, RefreshCw, Trash2, CheckCircle2, XCircle, Clock, AlertCircle, Loader2, Power, Link as LinkIcon, KeyRound } from "lucide-react";
import { SlaveNode } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { slaveNodesQueryOptions } from "@/queries/slave.query-options";
import { systemConfigQueryOptions } from "@/queries/system-config.query-options";
import { slaveNodeService } from "@/services/slave.service";
import { systemConfigService } from "@/services/system-config.service";

const SlaveNodes = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMasterDialogOpen, setIsMasterDialogOpen] = useState(false);

  // Form data for Register Slave Node (Master mode)
  const [slaveFormData, setSlaveFormData] = useState({
    name: "",
    host: "",
    port: 3001,
    syncInterval: 60
  });

  // Form data for Connect to Master (Slave mode)  
  const [masterFormData, setMasterFormData] = useState({
    masterHost: "",
    masterPort: 3001,
    masterApiKey: ""
  });
  
  const [apiKeyDialog, setApiKeyDialog] = useState<{ open: boolean; apiKey: string }>({
    open: false,
    apiKey: ''
  });

  // Confirm mode change dialog
  const [modeChangeDialog, setModeChangeDialog] = useState<{ open: boolean; newMode: 'master' | 'slave' | null }>({
    open: false,
    newMode: null
  });

  // Fetch system configuration
  const { data: systemConfigData, isLoading: isConfigLoading } = useQuery(systemConfigQueryOptions.all);
  const systemConfig = systemConfigData?.data;

  // Fetch slave nodes (only in master mode)
  const { data: nodes = [], isLoading: isNodesLoading } = useQuery({
    ...slaveNodesQueryOptions.all,
    enabled: systemConfig?.nodeMode === 'master'
  });

  // Update node mode mutation
  const updateNodeModeMutation = useMutation({
    mutationFn: systemConfigService.updateNodeMode,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      queryClient.invalidateQueries({ queryKey: ['slave-nodes'] });
      
      toast({
        title: "Node mode changed",
        description: `Node is now in ${data.data.nodeMode} mode`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to change mode",
        description: error.response?.data?.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  // Register slave node mutation (Master mode)
  const registerMutation = useMutation({
    mutationFn: slaveNodeService.register,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['slave-nodes'] });
      setIsDialogOpen(false);
      resetSlaveForm();
      
      // Show API key in separate dialog (critical info!)
      setApiKeyDialog({
        open: true,
        apiKey: data.data.apiKey
      });
      
      toast({ 
        title: "Slave node registered successfully",
        description: `Node ${data.data.name} has been registered`,
      });
    },
    onError: (error: any) => {
      console.error('Registration error:', error);
      
      toast({
        title: "Registration failed",
        description: error.response?.data?.message || "Failed to register node",
        variant: "destructive",
        duration: 5000
      });
    }
  });

  // Connect to master mutation (Slave mode)
  const connectToMasterMutation = useMutation({
    mutationFn: systemConfigService.connectToMaster,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      setIsMasterDialogOpen(false);
      resetMasterForm();
      
      toast({
        title: "Connected to master",
        description: `Successfully connected to ${data.data.masterHost}:${data.data.masterPort}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection failed",
        description: error.response?.data?.message || "Failed to connect to master",
        variant: "destructive"
      });
    }
  });

  // Disconnect from master mutation
  const disconnectMutation = useMutation({
    mutationFn: systemConfigService.disconnectFromMaster,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      
      toast({
        title: "Disconnected",
        description: "Disconnected from master node",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Disconnect failed",
        description: error.response?.data?.message || "Failed to disconnect",
        variant: "destructive"
      });
    }
  });

  // Test master connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: systemConfigService.testMasterConnection,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      
      toast({
        title: "Connection test successful",
        description: `Latency: ${data.data.latency}ms | Master: ${data.data.masterStatus}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection test failed",
        description: error.response?.data?.message || "Failed to connect",
        variant: "destructive"
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

  const handleRegisterSlave = () => {
    if (!slaveFormData.name || !slaveFormData.host) {
      toast({
        title: "Validation error",
        description: "Name and host are required",
        variant: "destructive"
      });
      return;
    }

    registerMutation.mutate({
      name: slaveFormData.name,
      host: slaveFormData.host,
      port: slaveFormData.port,
      syncInterval: slaveFormData.syncInterval
    });
  };

  const handleConnectToMaster = () => {
    if (!masterFormData.masterHost || !masterFormData.masterApiKey) {
      toast({
        title: "Validation error",
        description: "Master host and API key are required",
        variant: "destructive"
      });
      return;
    }

    connectToMasterMutation.mutate({
      masterHost: masterFormData.masterHost,
      masterPort: masterFormData.masterPort,
      masterApiKey: masterFormData.masterApiKey
    });
  };

  const resetSlaveForm = () => {
    setSlaveFormData({
      name: "",
      host: "",
      port: 3001,
      syncInterval: 60
    });
  };

  const resetMasterForm = () => {
    setMasterFormData({
      masterHost: "",
      masterPort: 3001,
      masterApiKey: ""
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

  const handleModeChange = (newMode: 'master' | 'slave') => {
    if (systemConfig?.nodeMode === newMode) return;

    // Show custom dialog instead of browser confirm
    setModeChangeDialog({
      open: true,
      newMode
    });
  };

  const confirmModeChange = () => {
    if (modeChangeDialog.newMode) {
      updateNodeModeMutation.mutate(modeChangeDialog.newMode);
      setModeChangeDialog({ open: false, newMode: null });
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

  if (isConfigLoading || isNodesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentMode = systemConfig?.nodeMode || 'master';
  const isMasterMode = currentMode === 'master';
  const isSlaveMode = currentMode === 'slave';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Server className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Node Synchronization</h1>
            <p className="text-muted-foreground">Manage master-slave node configuration</p>
          </div>
        </div>
      </div>

      {/* Node Mode Status Card */}
      <Card className={isMasterMode ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-green-500 bg-green-50 dark:bg-green-900/20'}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isMasterMode ? (
                <Server className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              ) : (
                <LinkIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
              )}
              <div>
                <p className="text-lg font-semibold">
                  Current Mode: <span className={isMasterMode ? 'text-blue-700 dark:text-blue-300' : 'text-green-700 dark:text-green-300'}>
                    {isMasterMode ? 'MASTER' : 'SLAVE'}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {isMasterMode ? 'This node can register and manage slave nodes' : 'This node is connected to a master node'}
                </p>
              </div>
            </div>
            {isSlaveMode && systemConfig?.connected && (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connected to Master
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={currentMode} onValueChange={(value) => handleModeChange(value as 'master' | 'slave')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="master" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Master Mode
          </TabsTrigger>
          <TabsTrigger value="slave" className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Slave Mode
          </TabsTrigger>
        </TabsList>

        {/* MASTER MODE TAB */}
        <TabsContent value="master" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Master Node Configuration</CardTitle>
              <CardDescription>
                Register slave nodes and manage distributed configuration sync
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">Registered Slave Nodes</h3>
                  <p className="text-sm text-muted-foreground">
                    {nodes.length} slave node(s) registered
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSyncAll}
                    disabled={syncAllMutation.isPending || nodes.length === 0}
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
                      <Button size="sm">
                        <Server className="h-4 w-4 mr-2" />
                        Register Slave Node
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Register Slave Node</DialogTitle>
                        <DialogDescription>
                          Add a new slave node to receive configuration updates
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="name">Node Name</Label>
                          <Input
                            id="name"
                            value={slaveFormData.name}
                            onChange={(e) => setSlaveFormData({ ...slaveFormData, name: e.target.value })}
                            placeholder="slave-node-01"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="host">Slave Host/IP</Label>
                          <Input
                            id="host"
                            value={slaveFormData.host}
                            onChange={(e) => setSlaveFormData({ ...slaveFormData, host: e.target.value })}
                            placeholder="Enter slave node IP address"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="port">Port</Label>
                          <Input
                            id="port"
                            type="number"
                            value={slaveFormData.port}
                            onChange={(e) => setSlaveFormData({ ...slaveFormData, port: Number(e.target.value) })}
                            placeholder="3001"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="syncInterval">Sync Interval (seconds)</Label>
                          <Input
                            id="syncInterval"
                            type="number"
                            value={slaveFormData.syncInterval}
                            onChange={(e) => setSlaveFormData({ ...slaveFormData, syncInterval: Number(e.target.value) })}
                            placeholder="60"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={handleRegisterSlave}
                          disabled={registerMutation.isPending}
                        >
                          {registerMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Register
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Slave Nodes Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Host:Port</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Seen</TableHead>
                      <TableHead>Config Hash</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nodes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No slave nodes registered. Click "Register Slave Node" to add one.
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
                          <TableCell className="text-sm">
                            {node.lastSeen ? new Date(node.lastSeen).toLocaleString() : 'Never'}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {node.configHash?.substring(0, 12) || 'N/A'}...
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSync(node.id)}
                              disabled={syncMutation.isPending}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(node.id)}
                              disabled={deleteMutation.isPending}
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
        </TabsContent>

        {/* SLAVE MODE TAB */}
        <TabsContent value="slave" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Slave Node Configuration</CardTitle>
              <CardDescription>
                Connect to a master node to receive configuration updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!systemConfig?.connected ? (
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You are in Slave Mode but not connected to any master node.
                      Click "Connect to Master" to configure the connection.
                    </AlertDescription>
                  </Alert>

                  <Dialog open={isMasterDialogOpen} onOpenChange={setIsMasterDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full">
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Connect to Master Node
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Connect to Master Node</DialogTitle>
                        <DialogDescription>
                          Enter the master node details and API key to establish connection
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="masterHost">Master Host/IP</Label>
                          <Input
                            id="masterHost"
                            value={masterFormData.masterHost}
                            onChange={(e) => setMasterFormData({ ...masterFormData, masterHost: e.target.value })}
                            placeholder="Enter master node IP address"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="masterPort">Master Port</Label>
                          <Input
                            id="masterPort"
                            type="number"
                            value={masterFormData.masterPort}
                            onChange={(e) => setMasterFormData({ ...masterFormData, masterPort: Number(e.target.value) })}
                            placeholder="3001"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="masterApiKey">Master API Key</Label>
                          <Input
                            id="masterApiKey"
                            type="password"
                            value={masterFormData.masterApiKey}
                            onChange={(e) => setMasterFormData({ ...masterFormData, masterApiKey: e.target.value })}
                            placeholder="Enter API key from master node"
                          />
                          <p className="text-xs text-muted-foreground">
                            Get this API key from the master node when registering this slave
                          </p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsMasterDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={handleConnectToMaster}
                          disabled={connectToMasterMutation.isPending}
                        >
                          {connectToMasterMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Connect
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              ) : (
                <div className="space-y-4">
                  <Card className="border-green-500 bg-green-50 dark:bg-green-900/20">
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <span className="font-medium">Connected to Master</span>
                          </div>
                          <Badge variant="default" className="bg-green-600">
                            Active
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Master Host:</span>
                            <span className="font-mono">{systemConfig.masterHost}:{systemConfig.masterPort}</span>
                          </div>
                          {systemConfig.lastConnectedAt && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Last Connected:</span>
                              <span>{new Date(systemConfig.lastConnectedAt).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => testConnectionMutation.mutate()}
                            disabled={testConnectionMutation.isPending}
                          >
                            {testConnectionMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            Test Connection
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm('Are you sure you want to disconnect from the master node?')) {
                                disconnectMutation.mutate();
                              }
                            }}
                            disabled={disconnectMutation.isPending}
                          >
                            {disconnectMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4 mr-2" />
                            )}
                            Disconnect
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Mode Change Confirmation Dialog */}
      <Dialog open={modeChangeDialog.open} onOpenChange={(open) => setModeChangeDialog({ ...modeChangeDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Confirm Mode Change
            </DialogTitle>
            <DialogDescription>
              {modeChangeDialog.newMode === 'slave'
                ? "Switching to Slave mode will disable the ability to register slave nodes. You will need to connect to a master node."
                : "Switching to Master mode will disconnect from the current master and allow you to register slave nodes."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setModeChangeDialog({ open: false, newMode: null })}
              disabled={updateNodeModeMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmModeChange}
              disabled={updateNodeModeMutation.isPending}
            >
              {updateNodeModeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {updateNodeModeMutation.isPending ? 'Changing...' : 'Continue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Key Dialog */}
      <Dialog open={apiKeyDialog.open} onOpenChange={(open) => setApiKeyDialog({ ...apiKeyDialog, open })}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-yellow-500" />
              Slave Node API Key
            </DialogTitle>
            <DialogDescription>
              Save this API key! You'll need it to connect the slave node to this master.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This API key will only be shown once. Copy it now and store it securely.
              </AlertDescription>
            </Alert>

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
                <li>Go to the slave node web interface</li>
                <li>Switch to <strong>Slave Mode</strong></li>
                <li>Click "Connect to Master Node"</li>
                <li>Enter this API key along with master host/port</li>
                <li>Click "Connect" to establish synchronization</li>
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
  );
};

export default SlaveNodes;
