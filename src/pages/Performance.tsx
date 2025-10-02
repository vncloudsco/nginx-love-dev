import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, TrendingUp, TrendingDown, Clock, Zap, RefreshCw } from "lucide-react";
import { PerformanceMetric } from "@/types";
import performanceService from "@/services/performance.service";
import { domainService } from "@/services/domain.service";
import { useToast } from "@/hooks/use-toast";

const Performance = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [domains, setDomains] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("1h");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Fetch domains on mount
  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const domainsData = await domainService.getAll();
        setDomains(domainsData);
      } catch (error) {
        console.error('Failed to fetch domains:', error);
      }
    };
    fetchDomains();
  }, []);

  // Fetch metrics
  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const data = await performanceService.getMetrics(selectedDomain, timeRange);
      setMetrics(data);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch performance metrics"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchMetrics();
  }, [selectedDomain, timeRange]);

  // Manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMetrics();
    setRefreshing(false);
  };

  const filteredMetrics = metrics;

  // Calculate aggregated stats
  const avgResponseTime = filteredMetrics.length > 0 
    ? filteredMetrics.reduce((sum, m) => sum + m.responseTime, 0) / filteredMetrics.length 
    : 0;
  const avgThroughput = filteredMetrics.length > 0
    ? filteredMetrics.reduce((sum, m) => sum + m.throughput, 0) / filteredMetrics.length
    : 0;
  const avgErrorRate = filteredMetrics.length > 0
    ? filteredMetrics.reduce((sum, m) => sum + m.errorRate, 0) / filteredMetrics.length
    : 0;
  const totalRequests = filteredMetrics.reduce((sum, m) => sum + m.requestCount, 0);

  const getStatusColor = (value: number, threshold: number) => {
    if (value > threshold) return "text-red-500";
    if (value > threshold * 0.7) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance Monitoring</h1>
          <p className="text-muted-foreground">Real-time performance metrics and analytics</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Select value={selectedDomain} onValueChange={setSelectedDomain}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select domain" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Domains</SelectItem>
              {domains.map(domain => (
                <SelectItem key={domain.id} value={domain.name}>{domain.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5m">Last 5 minutes</SelectItem>
              <SelectItem value="15m">Last 15 minutes</SelectItem>
              <SelectItem value="1h">Last hour</SelectItem>
              <SelectItem value="6h">Last 6 hours</SelectItem>
              <SelectItem value="24h">Last 24 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(avgResponseTime, 200)}`}>
              {loading ? '...' : avgResponseTime.toFixed(0) + 'ms'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average across all requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Throughput</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {loading ? '...' : avgThroughput.toFixed(0) + ' req/s'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Requests per second
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(avgErrorRate, 3)}`}>
              {loading ? '...' : avgErrorRate.toFixed(2) + '%'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              4xx and 5xx responses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : totalRequests.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              In selected time range
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Timeline</CardTitle>
          <CardDescription>Detailed performance metrics over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Response Time</TableHead>
                  <TableHead>Throughput</TableHead>
                  <TableHead>Error Rate</TableHead>
                  <TableHead>Requests</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMetrics.slice(0, 15).map((metric) => (
                  <TableRow key={metric.id}>
                    <TableCell className="font-mono text-xs">
                      {new Date(metric.timestamp).toLocaleTimeString()}
                    </TableCell>
                    <TableCell className="font-medium">{metric.domain}</TableCell>
                    <TableCell className={getStatusColor(metric.responseTime, 200)}>
                      {metric.responseTime.toFixed(0)}ms
                    </TableCell>
                    <TableCell>{metric.throughput.toFixed(0)} req/s</TableCell>
                    <TableCell className={getStatusColor(metric.errorRate, 3)}>
                      {metric.errorRate.toFixed(2)}%
                    </TableCell>
                    <TableCell>{metric.requestCount}</TableCell>
                    <TableCell>
                      <Badge variant={
                        metric.responseTime > 200 || metric.errorRate > 3 ? 'destructive' :
                        metric.responseTime > 140 || metric.errorRate > 2 ? 'warning' : 'default'
                      }>
                        {metric.responseTime > 200 || metric.errorRate > 3 ? 'Degraded' :
                         metric.responseTime > 140 || metric.errorRate > 2 ? 'Warning' : 'Healthy'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Slow Requests</CardTitle>
            <CardDescription>Requests with response time &gt; 200ms</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredMetrics
                .filter(m => m.responseTime > 200)
                .slice(0, 5)
                .map((metric) => (
                  <div key={metric.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{metric.domain}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(metric.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="destructive">{metric.responseTime.toFixed(0)}ms</Badge>
                  </div>
                ))}
              {filteredMetrics.filter(m => m.responseTime > 200).length === 0 && (
                <p className="text-center text-muted-foreground py-4">No slow requests detected</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>High Error Rate Periods</CardTitle>
            <CardDescription>Time periods with error rate &gt; 3%</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredMetrics
                .filter(m => m.errorRate > 3)
                .slice(0, 5)
                .map((metric) => (
                  <div key={metric.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{metric.domain}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(metric.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="destructive">{metric.errorRate.toFixed(2)}%</Badge>
                  </div>
                ))}
              {filteredMetrics.filter(m => m.errorRate > 3).length === 0 && (
                <p className="text-center text-muted-foreground py-4">No high error rate detected</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Performance;
