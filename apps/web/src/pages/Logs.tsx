import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, RefreshCw, Loader2 } from "lucide-react";
import { LogEntry } from "@/types";
import { getLogs, downloadLogs, getAvailableDomains, DomainInfo } from "@/services/logs.service";
import { useToast } from "@/hooks/use-toast";

const Logs = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Fetch domains list
  const fetchDomains = async () => {
    try {
      const data = await getAvailableDomains();
      setDomains(data);
    } catch (error: any) {
      console.error('Failed to fetch domains:', error);
    }
  };

  // Fetch logs from backend
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 100 };
      
      if (levelFilter !== 'all') {
        params.level = levelFilter;
      }
      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }
      if (domainFilter !== 'all') {
        params.domain = domainFilter;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }

      const data = await getLogs(params);
      setLogs(data);
    } catch (error: any) {
      console.error('Failed to fetch logs:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to fetch logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchDomains();
    fetchLogs();
  }, []);

  // Auto refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchLogs();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, levelFilter, typeFilter, domainFilter, searchTerm]);

  // Refetch when filters change
  useEffect(() => {
    fetchLogs();
  }, [levelFilter, typeFilter, domainFilter]);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (log.ip && log.ip.includes(searchTerm));
    const matchesLevel = levelFilter === "all" || log.level === levelFilter;
    const matchesType = typeFilter === "all" || log.type === typeFilter;
    return matchesSearch && matchesLevel && matchesType;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'destructive';
      case 'warning': return 'warning';
      case 'info': return 'default';
      default: return 'secondary';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'access': return 'default';
      case 'error': return 'destructive';
      case 'system': return 'secondary';
      default: return 'outline';
    }
  };

  const handleDownloadLogs = async () => {
    try {
      const params: any = { limit: 1000 };
      
      if (levelFilter !== 'all') {
        params.level = levelFilter;
      }
      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }
      if (domainFilter !== 'all') {
        params.domain = domainFilter;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }

      await downloadLogs(params);
      toast({
        title: "Success",
        description: "Logs downloaded successfully",
      });
    } catch (error: any) {
      console.error('Failed to download logs:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to download logs",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logs</h1>
          <p className="text-muted-foreground">View and analyze nginx access and error logs</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={autoRefresh ? "default" : "outline"} 
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchLogs}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadLogs} disabled={loading}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log Filters</CardTitle>
          <CardDescription>Filter and search through log entries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="md:col-span-2 lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      fetchLogs();
                    }
                  }}
                  className="pl-10"
                  disabled={loading}
                />
                {searchTerm && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="absolute right-2 top-1.5"
                    onClick={fetchLogs}
                    disabled={loading}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <Select value={domainFilter} onValueChange={setDomainFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by domain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Domains</SelectItem>
                {domains.map((domain) => (
                  <SelectItem key={domain.name} value={domain.name}>
                    {domain.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="access">Access</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log Entries ({filteredLogs.length})</CardTitle>
          <CardDescription>
            {loading ? "Loading logs..." : "Real-time log streaming from nginx and ModSecurity"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      <p className="mt-2">Loading logs...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getLevelColor(log.level)}>
                          {log.level}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTypeColor(log.type)}>
                          {log.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{log.source}</TableCell>
                      <TableCell className="text-sm">
                        {log.domain ? (
                          <Badge variant="outline" className="font-mono">
                            {log.domain}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-md truncate">{log.message}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.ip && <div>IP: {log.ip}</div>}
                        {log.method && log.path && <div>{log.method} {log.path}</div>}
                        {log.statusCode && <div>Status: {log.statusCode}</div>}
                        {log.responseTime && <div>RT: {log.responseTime}ms</div>}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Logs;
