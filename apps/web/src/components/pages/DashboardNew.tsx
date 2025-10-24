import { useTranslation } from "react-i18next";
import { Suspense, useState } from "react";
import {
  LayoutDashboard,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Shield,
  TrendingUp,
  Clock,
  Users,
  Eye,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  useSuspenseDashboardStats,
  useSuspenseRequestTrend,
  useSuspenseSlowRequests,
  useSuspenseLatestAttackStats,
  useSuspenseLatestNews,
  useSuspenseRequestAnalytics,
  useSuspenseAttackRatio,
} from "@/queries";
import { SkeletonStatsCard, SkeletonChart, SkeletonTable } from "@/components/ui/skeletons";

// Component for stats overview
function DashboardStatsOverview() {
  const { t } = useTranslation();
  const { data: stats } = useSuspenseDashboardStats();

  const activeDomains = stats?.domains.active || 0;
  const errorDomains = stats?.domains.errors || 0;
  const unacknowledgedAlerts = stats?.alerts.unacknowledged || 0;
  const criticalAlerts = stats?.alerts.critical || 0;

  const statsCards = [
    {
      title: t("dashboard.domains"),
      value: stats?.domains.total || 0,
      description: `${activeDomains} active, ${errorDomains} errors`,
      icon: Globe,
      color: "text-primary",
    },
    {
      title: t("dashboard.traffic"),
      value: stats?.traffic.requestsPerDay || "0",
      description: "Requests/day",
      icon: LayoutDashboard,
      color: "text-success",
    },
    {
      title: t("dashboard.errors"),
      value: errorDomains,
      description: "Domains with issues",
      icon: AlertTriangle,
      color: "text-destructive",
    },
    {
      title: t("dashboard.uptime"),
      value: `${stats?.uptime || "0"}%`,
      description: "Last 30 days",
      icon: CheckCircle2,
      color: "text-success",
    },
  ];

  return (
    <>
      {unacknowledgedAlerts > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              You have <strong>{unacknowledgedAlerts}</strong> unacknowledged
              alerts
              {criticalAlerts > 0 && `, including ${criticalAlerts} critical`}.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

// Component for Request Trend Chart
function RequestTrendChart() {
  const { t } = useTranslation();
  const { data: trendData } = useSuspenseRequestTrend(5);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t("dashboard.requestTrend")}
            </CardTitle>
            <CardDescription>{t("dashboard.requestTrendDesc")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {trendData && trendData.length > 0 ? (
          <ChartContainer
            config={{
              status200: { label: t("dashboard.status200"), color: "#22c55e" },
              status301: { label: t("dashboard.status301"), color: "#3b82f6" },
              status302: { label: t("dashboard.status302"), color: "#06b6d4" },
              status400: { label: t("dashboard.status400"), color: "#f59e0b" },
              status403: { label: t("dashboard.status403"), color: "#f97316" },
              status404: { label: t("dashboard.status404"), color: "#eab308" },
              status500: { label: t("dashboard.status500"), color: "#ef4444" },
              status502: { label: t("dashboard.status502"), color: "#dc2626" },
              status503: { label: t("dashboard.status503"), color: "#b91c1c" },
            }}
            className="h-[280px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                  }}
                />
                <YAxis />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(label: any) => {
                        const date = new Date(label);
                        return date.toLocaleString();
                      }}
                    />
                  }
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="status200"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  name={t("dashboard.status200")}
                />
                <Line
                  type="monotone"
                  dataKey="status301"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name={t("dashboard.status301")}
                />
                <Line
                  type="monotone"
                  dataKey="status302"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={false}
                  name={t("dashboard.status302")}
                />
                <Line
                  type="monotone"
                  dataKey="status400"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  name={t("dashboard.status400")}
                />
                <Line
                  type="monotone"
                  dataKey="status403"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                  name={t("dashboard.status403")}
                />
                <Line
                  type="monotone"
                  dataKey="status404"
                  stroke="#eab308"
                  strokeWidth={2}
                  dot={false}
                  name={t("dashboard.status404")}
                />
                <Line
                  type="monotone"
                  dataKey="status500"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  name={t("dashboard.status500")}
                />
                <Line
                  type="monotone"
                  dataKey="status502"
                  stroke="#dc2626"
                  strokeWidth={2}
                  dot={false}
                  name={t("dashboard.status502")}
                />
                <Line
                  type="monotone"
                  dataKey="status503"
                  stroke="#b91c1c"
                  strokeWidth={2}
                  dot={false}
                  name={t("dashboard.status503")}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {t("dashboard.noData")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Component for Slow Requests
function SlowRequestsCard() {
  const { t } = useTranslation();
  const { data: slowRequests } = useSuspenseSlowRequests(10);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {t("dashboard.slowRequests")}
        </CardTitle>
        <CardDescription>{t("dashboard.slowRequestsDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        {slowRequests && slowRequests.length > 0 ? (
          <div className="space-y-2">
            {slowRequests.slice(0, 3).map((req, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg bg-secondary/50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{req.path}</p>
                  <p className="text-xs text-muted-foreground">
                    {req.requestCount} requests
                  </p>
                </div>
                <Badge variant="outline" className="ml-2 shrink-0">
                  {req.avgResponseTime.toFixed(2)}ms
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {t("dashboard.noData")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Component for Attack Ratio
function AttackRatioCard() {
  const { t } = useTranslation();
  const { data: attackRatio } = useSuspenseAttackRatio();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {t("dashboard.attackRatio")}
        </CardTitle>
        <CardDescription>{t("dashboard.attackRatioDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        {attackRatio ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t("dashboard.totalRequests")}</span>
              <span className="text-2xl font-bold">{attackRatio.totalRequests.toLocaleString()}</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("dashboard.attackRequests")}</span>
                <Badge variant="destructive">{attackRatio.attackRequests.toLocaleString()}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("dashboard.normalRequests")}</span>
                <Badge variant="secondary">{attackRatio.normalRequests.toLocaleString()}</Badge>
              </div>
            </div>
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t("dashboard.attackPercentage")}</span>
                <span
                  className={`text-xl font-bold ${
                    attackRatio.attackPercentage > 10
                      ? "text-destructive"
                      : attackRatio.attackPercentage > 5
                      ? "text-warning"
                      : "text-success"
                  }`}
                >
                  {attackRatio.attackPercentage.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {t("dashboard.noData")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Component for Latest Attacks
function LatestAttacksCard() {
  const { t } = useTranslation();
  const { data: attacks } = useSuspenseLatestAttackStats(5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          {t("dashboard.latestAttacks")}
        </CardTitle>
        <CardDescription>{t("dashboard.latestAttacksDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        {attacks && attacks.length > 0 ? (
          <div className="space-y-3">
            {attacks.map((attack, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">{attack.attackType}</p>
                  <p className="text-xs text-muted-foreground">
                    Last: {new Date(attack.lastOccurred).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      attack.severity === "CRITICAL" || attack.severity === "2"
                        ? "destructive"
                        : "default"
                    }
                  >
                    {attack.count}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {t("dashboard.noData")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Component for Latest News Table
function LatestNewsTable() {
  const { t } = useTranslation();
  const { data: news } = useSuspenseLatestNews(10);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {t("dashboard.latestNews")}
        </CardTitle>
        <CardDescription>{t("dashboard.latestNewsDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        {news && news.length > 0 ? (
          <div className="rounded-md border max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">{t("dashboard.timestamp")}</TableHead>
                  <TableHead className="w-[120px]">{t("dashboard.attackerIp")}</TableHead>
                  <TableHead className="w-[140px]">{t("dashboard.domain")}</TableHead>
                  <TableHead>{t("dashboard.attackType")}</TableHead>
                  <TableHead>{t("dashboard.action")}</TableHead>
                  <TableHead className="text-right">{t("dashboard.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {news.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.attackerIp}
                    </TableCell>
                    <TableCell className="text-sm truncate max-w-[140px]">
                      {item.domain || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.attackType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">{item.action}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Navigate to logs page with ruleId or attackType for better search
                          const searchTerm = item.ruleId || item.attackType;
                          window.location.href = `/logs?search=${encodeURIComponent(searchTerm)}`;
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {t("dashboard.viewDetails")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {t("dashboard.noData")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Component for Request Analytics (IP Analytics)
function RequestAnalyticsCard() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const { data: analytics } = useSuspenseRequestAnalytics(period);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t("dashboard.requestAnalytics")}
            </CardTitle>
            <CardDescription>{t("dashboard.requestAnalyticsDesc")}</CardDescription>
          </div>
          <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">{t("dashboard.period.day")}</SelectItem>
              <SelectItem value="week">{t("dashboard.period.week")}</SelectItem>
              <SelectItem value="month">{t("dashboard.period.month")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {analytics && analytics.topIps.length > 0 ? (
          <div className="rounded-md border max-h-[300px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("dashboard.sourceIp")}</TableHead>
                  <TableHead className="text-right">{t("dashboard.requestCount")}</TableHead>
                  <TableHead className="text-right">Errors</TableHead>
                  <TableHead className="text-right">Attacks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.topIps.map((ip, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono">{ip.ip}</TableCell>
                    <TableCell className="text-right font-medium">
                      {ip.requestCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {ip.errorCount > 0 ? (
                        <Badge variant="destructive">{ip.errorCount}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {ip.attackCount > 0 ? (
                        <Badge variant="destructive">{ip.attackCount}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {t("dashboard.noData")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Main Dashboard component with Suspense boundaries
export default function DashboardNew() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <LayoutDashboard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t("dashboard.title")}
            </h1>
            <p className="text-muted-foreground">{t("dashboard.overview")}</p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <Suspense
        fallback={
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonStatsCard key={i} />
            ))}
          </div>
        }
      >
        <DashboardStatsOverview />
      </Suspense>

      {/* Row 1: Request Trend Chart (Full Width) + Attack Ratio */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Suspense
          fallback={
            <SkeletonChart
              title={t("dashboard.requestTrend")}
              description={t("dashboard.requestTrendDesc")}
              height="h-[320px]"
            />
          }
        >
          <div className="lg:col-span-2">
            <RequestTrendChart />
          </div>
        </Suspense>

        <Suspense fallback={<SkeletonChart title={t("dashboard.attackRatio")} />}>
          <AttackRatioCard />
        </Suspense>
      </div>

      {/* Row 2: Latest Attacks + Request Analytics */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Suspense fallback={<SkeletonChart title={t("dashboard.latestAttacks")} />}>
          <LatestAttacksCard />
        </Suspense>

        <Suspense
          fallback={
            <SkeletonTable
              rows={5}
              columns={4}
              title={t("dashboard.requestAnalytics")}
            />
          }
        >
          <RequestAnalyticsCard />
        </Suspense>
      </div>

      {/* Row 3: Slow Requests + Latest News */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Suspense fallback={<SkeletonChart title={t("dashboard.slowRequests")} />}>
          <SlowRequestsCard />
        </Suspense>

        <Suspense
          fallback={
            <SkeletonTable
              rows={8}
              columns={6}
              title={t("dashboard.latestNews")}
            />
          }
        >
          <LatestNewsTable />
        </Suspense>
      </div>
    </div>
  );
}
