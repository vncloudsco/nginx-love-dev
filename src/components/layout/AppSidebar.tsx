import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Globe,
  Shield,
  Lock,
  FileText,
  Bell,
  UserCog,
  Activity,
  Database,
  Users,
  Server
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar';

const menuItems = [
  { key: 'dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { key: 'domains', icon: Globe, path: '/domains' },
  { key: 'modsecurity', icon: Shield, path: '/modsecurity' },
  { key: 'ssl', icon: Lock, path: '/ssl' },
  { key: 'logs', icon: FileText, path: '/logs' },
  { key: 'alerts', icon: Bell, path: '/alerts' },
  { key: 'acl', icon: UserCog, path: '/acl' },
  { key: 'performance', icon: Activity, path: '/performance' },
  { key: 'backup', icon: Database, path: '/backup' },
  { key: 'users', icon: Users, path: '/users' },
  { key: 'nodes', icon: Server, path: '/nodes' }
];

export function AppSidebar() {
  const { t } = useTranslation();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary font-bold text-lg">
            {!isCollapsed && 'Nginx Admin'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'hover:bg-accent'
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{t(`nav.${item.key}`)}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
