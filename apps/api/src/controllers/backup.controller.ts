import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';
import prisma from '../config/database';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const BACKUP_DIR = process.env.BACKUP_DIR || '/var/backups/nginx-love';
const NGINX_SITES_AVAILABLE = '/etc/nginx/sites-available';
const NGINX_SITES_ENABLED = '/etc/nginx/sites-enabled';
const SSL_CERTS_PATH = '/etc/nginx/ssl';

/**
 * Ensure backup directory exists
 */
async function ensureBackupDir(): Promise<void> {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch (error) {
    logger.error('Failed to create backup directory:', error);
    throw new Error('Failed to create backup directory');
  }
}

/**
 * Reload nginx configuration
 */
async function reloadNginx(): Promise<boolean> {
  try {
    // Test nginx configuration first
    logger.info('Testing nginx configuration...');
    await execAsync('nginx -t');
    
    // Reload nginx
    logger.info('Reloading nginx...');
    await execAsync('systemctl reload nginx');
    
    logger.info('Nginx reloaded successfully');
    return true;
  } catch (error: any) {
    logger.error('Failed to reload nginx:', error);
    logger.error('Nginx test/reload output:', error.stdout || error.stderr);
    
    // Try alternative reload methods
    try {
      logger.info('Trying alternative reload method...');
      await execAsync('nginx -s reload');
      logger.info('Nginx reloaded successfully (alternative method)');
      return true;
    } catch (altError) {
      logger.error('Alternative reload also failed:', altError);
      return false;
    }
  }
}

/**
 * Format bytes to human readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get all backup schedules
 */
export const getBackupSchedules = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const schedules = await prisma.backupSchedule.findMany({
      include: {
        backups: {
          take: 1,
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Format the response
    const formattedSchedules = schedules.map(schedule => ({
      id: schedule.id,
      name: schedule.name,
      schedule: schedule.schedule,
      enabled: schedule.enabled,
      lastRun: schedule.lastRun?.toISOString(),
      nextRun: schedule.nextRun?.toISOString(),
      status: schedule.status,
      size: schedule.backups[0] ? formatBytes(Number(schedule.backups[0].size)) : undefined,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt
    }));

    res.json({
      success: true,
      data: formattedSchedules
    });
  } catch (error) {
    logger.error('Get backup schedules error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get single backup schedule
 */
export const getBackupSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const schedule = await prisma.backupSchedule.findUnique({
      where: { id },
      include: {
        backups: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!schedule) {
      res.status(404).json({
        success: false,
        message: 'Backup schedule not found'
      });
      return;
    }

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    logger.error('Get backup schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Create backup schedule
 */
export const createBackupSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, schedule, enabled } = req.body;

    const newSchedule = await prisma.backupSchedule.create({
      data: {
        name,
        schedule,
        enabled: enabled ?? true
      }
    });

    logger.info(`Backup schedule created: ${name}`, {
      userId: req.user?.userId,
      scheduleId: newSchedule.id
    });

    res.status(201).json({
      success: true,
      message: 'Backup schedule created successfully',
      data: newSchedule
    });
  } catch (error) {
    logger.error('Create backup schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Update backup schedule
 */
export const updateBackupSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, schedule, enabled } = req.body;

    const updatedSchedule = await prisma.backupSchedule.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(schedule && { schedule }),
        ...(enabled !== undefined && { enabled })
      }
    });

    logger.info(`Backup schedule updated: ${id}`, {
      userId: req.user?.userId
    });

    res.json({
      success: true,
      message: 'Backup schedule updated successfully',
      data: updatedSchedule
    });
  } catch (error) {
    logger.error('Update backup schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Delete backup schedule
 */
export const deleteBackupSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.backupSchedule.delete({
      where: { id }
    });

    logger.info(`Backup schedule deleted: ${id}`, {
      userId: req.user?.userId
    });

    res.json({
      success: true,
      message: 'Backup schedule deleted successfully'
    });
  } catch (error) {
    logger.error('Delete backup schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Toggle backup schedule enabled status
 */
export const toggleBackupSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const schedule = await prisma.backupSchedule.findUnique({
      where: { id }
    });

    if (!schedule) {
      res.status(404).json({
        success: false,
        message: 'Backup schedule not found'
      });
      return;
    }

    const updated = await prisma.backupSchedule.update({
      where: { id },
      data: {
        enabled: !schedule.enabled
      }
    });

    logger.info(`Backup schedule toggled: ${id} (enabled: ${updated.enabled})`, {
      userId: req.user?.userId
    });

    res.json({
      success: true,
      message: `Backup schedule ${updated.enabled ? 'enabled' : 'disabled'}`,
      data: updated
    });
  } catch (error) {
    logger.error('Toggle backup schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Run backup now (manual backup)
 */
export const runBackupNow = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    await ensureBackupDir();

    // Update schedule status to running
    await prisma.backupSchedule.update({
      where: { id },
      data: {
        status: 'running',
        lastRun: new Date()
      }
    });

    // Collect backup data
    const backupData = await collectBackupData();

    // Generate filename
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `backup-${timestamp}.json`;
    const filepath = path.join(BACKUP_DIR, filename);

    // Write backup file
    await fs.writeFile(filepath, JSON.stringify(backupData, null, 2), 'utf-8');

    // Get file size
    const stats = await fs.stat(filepath);

    // Create backup file record
    const backupFile = await prisma.backupFile.create({
      data: {
        scheduleId: id,
        filename,
        filepath,
        size: BigInt(stats.size),
        status: 'success',
        type: 'manual',
        metadata: {
          domainsCount: backupData.domains.length,
          sslCount: backupData.ssl.length,
          modsecRulesCount: backupData.modsec.customRules.length,
          aclRulesCount: backupData.acl.length
        }
      }
    });

    // Update schedule status
    await prisma.backupSchedule.update({
      where: { id },
      data: {
        status: 'success'
      }
    });

    logger.info(`Manual backup completed: ${filename}`, {
      userId: req.user?.userId,
      size: stats.size
    });

    res.json({
      success: true,
      message: 'Backup completed successfully',
      data: {
        filename,
        size: formatBytes(stats.size)
      }
    });
  } catch (error) {
    logger.error('Run backup error:', error);
    
    // Update schedule status to failed
    const { id } = req.params;
    if (id) {
      await prisma.backupSchedule.update({
        where: { id },
        data: { status: 'failed' }
      }).catch(() => {});
    }

    res.status(500).json({
      success: false,
      message: 'Backup failed'
    });
  }
};

/**
 * Export configuration (download as JSON)
 */
export const exportConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureBackupDir();

    // Collect backup data
    const backupData = await collectBackupData();

    // Generate filename
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `nginx-config-${timestamp}.json`;

    // Set headers for download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    logger.info('Configuration exported', {
      userId: req.user?.userId
    });

    res.json(backupData);
  } catch (error) {
    logger.error('Export config error:', error);
    res.status(500).json({
      success: false,
      message: 'Export failed'
    });
  }
};

/**
 * Import configuration (restore from backup)
 */
export const importConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const backupData = req.body;

    if (!backupData || typeof backupData !== 'object') {
      res.status(400).json({
        success: false,
        message: 'Invalid backup data'
      });
      return;
    }

    const results = {
      domains: 0,
      vhostConfigs: 0,
      upstreams: 0,
      loadBalancers: 0,
      ssl: 0,
      sslFiles: 0,
      modsecCRS: 0,
      modsecCustom: 0,
      acl: 0,
      alertChannels: 0,
      alertRules: 0,
      users: 0,
      nginxConfigs: 0
    };

    // 1. Restore domains with all configurations
    if (backupData.domains && Array.isArray(backupData.domains)) {
      for (const domainData of backupData.domains) {
        try {
          // Create or update domain
          const domain = await prisma.domain.upsert({
            where: { name: domainData.name },
            update: {
              status: domainData.status,
              sslEnabled: domainData.sslEnabled,
              modsecEnabled: domainData.modsecEnabled
            },
            create: {
              name: domainData.name,
              status: domainData.status,
              sslEnabled: domainData.sslEnabled,
              modsecEnabled: domainData.modsecEnabled
            }
          });
          results.domains++;

          // Restore upstreams
          if (domainData.upstreams && Array.isArray(domainData.upstreams)) {
            // Delete existing upstreams for this domain
            await prisma.upstream.deleteMany({
              where: { domainId: domain.id }
            });

            // Create new upstreams
            for (const upstream of domainData.upstreams) {
              await prisma.upstream.create({
                data: {
                  domainId: domain.id,
                  host: upstream.host,
                  port: upstream.port,
                  protocol: upstream.protocol || 'http',
                  sslVerify: upstream.sslVerify ?? false,
                  weight: upstream.weight || 1,
                  maxFails: upstream.maxFails || 3,
                  failTimeout: upstream.failTimeout || 30,
                  status: upstream.status || 'up'
                }
              });
              results.upstreams++;
            }
          }

          // Restore load balancer config
          if (domainData.loadBalancer) {
            const lb = domainData.loadBalancer;
            // Check if healthCheck exists (legacy format)
            const healthCheck = lb.healthCheck || {};
            
            await prisma.loadBalancerConfig.upsert({
              where: { domainId: domain.id },
              update: {
                algorithm: lb.algorithm || 'round_robin',
                healthCheckEnabled: lb.healthCheckEnabled ?? healthCheck.enabled ?? true,
                healthCheckInterval: lb.healthCheckInterval ?? healthCheck.interval ?? 30,
                healthCheckTimeout: lb.healthCheckTimeout ?? healthCheck.timeout ?? 5,
                healthCheckPath: lb.healthCheckPath ?? healthCheck.path ?? '/'
              },
              create: {
                domainId: domain.id,
                algorithm: lb.algorithm || 'round_robin',
                healthCheckEnabled: lb.healthCheckEnabled ?? healthCheck.enabled ?? true,
                healthCheckInterval: lb.healthCheckInterval ?? healthCheck.interval ?? 30,
                healthCheckTimeout: lb.healthCheckTimeout ?? healthCheck.timeout ?? 5,
                healthCheckPath: lb.healthCheckPath ?? healthCheck.path ?? '/'
              }
            });
            results.loadBalancers++;
          }

          // Restore nginx vhost configuration file
          if (domainData.vhostConfig) {
            await writeNginxVhostConfig(
              domainData.name,
              domainData.vhostConfig,
              domainData.vhostEnabled ?? true
            );
            results.vhostConfigs++;
            logger.info(`Nginx vhost config restored for: ${domainData.name}`);
          } else {
            // If vhostConfig not in backup, generate it from domain data
            logger.info(`Generating nginx vhost config for: ${domainData.name} (not in backup)`);
            try {
              // Re-fetch full domain with all relations for config generation
              const fullDomain = await prisma.domain.findUnique({
                where: { id: domain.id },
                include: {
                  upstreams: true,
                  loadBalancer: true,
                  sslCertificate: true
                }
              });
              
              if (fullDomain) {
                await generateNginxConfigForBackup(fullDomain);
                results.vhostConfigs++;
              }
            } catch (error) {
              logger.error(`Failed to generate nginx config for ${domainData.name}:`, error);
            }
          }

        } catch (error) {
          logger.error(`Failed to restore domain ${domainData.name}:`, error);
        }
      }
    }

    // 2. Restore SSL certificates with files
    if (backupData.ssl && Array.isArray(backupData.ssl)) {
      for (const sslCert of backupData.ssl) {
        try {
          const domain = await prisma.domain.findUnique({
            where: { name: sslCert.domainName }
          });

          if (!domain) {
            logger.warn(`Domain not found for SSL cert: ${sslCert.domainName}`);
            continue;
          }

          // Restore SSL certificate files if present
          if (sslCert.files && sslCert.files.certificate && sslCert.files.privateKey) {
            await prisma.sSLCertificate.upsert({
              where: { domainId: domain.id },
              update: {
                commonName: sslCert.commonName,
                sans: sslCert.sans || [],
                issuer: sslCert.issuer,
                certificate: sslCert.files.certificate,
                privateKey: sslCert.files.privateKey,
                chain: sslCert.files.chain || null,
                autoRenew: sslCert.autoRenew || false
              },
              create: {
                domain: { connect: { id: domain.id } },
                commonName: sslCert.commonName,
                sans: sslCert.sans || [],
                issuer: sslCert.issuer,
                certificate: sslCert.files.certificate,
                privateKey: sslCert.files.privateKey,
                chain: sslCert.files.chain || null,
                validFrom: sslCert.validFrom ? new Date(sslCert.validFrom) : new Date(),
                validTo: sslCert.validTo ? new Date(sslCert.validTo) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                autoRenew: sslCert.autoRenew || false
              }
            });

            // Write files to disk
            await writeSSLCertificateFiles(sslCert.domainName, {
              certificate: sslCert.files.certificate,
              privateKey: sslCert.files.privateKey,
              chain: sslCert.files.chain
            });
            
            results.ssl++;
            results.sslFiles++;
          }
        } catch (error) {
          logger.error(`Failed to restore SSL cert for ${sslCert.domainName}:`, error);
        }
      }
    }

    // 3. Restore ModSecurity configurations
    if (backupData.modsec) {
      // Restore CRS rules
      if (backupData.modsec.crsRules && Array.isArray(backupData.modsec.crsRules)) {
        for (const rule of backupData.modsec.crsRules) {
          try {
            await prisma.modSecCRSRule.upsert({
              where: {
                ruleFile_domainId: {
                  ruleFile: rule.ruleFile,
                  domainId: rule.domainId || null
                }
              },
              update: {
                enabled: rule.enabled
              },
              create: {
                ruleFile: rule.ruleFile,
                domainId: rule.domainId || null,
                name: rule.name || rule.ruleFile,
                category: rule.category || 'OWASP',
                paranoia: rule.paranoia || 1,
                enabled: rule.enabled
              }
            });
            results.modsecCRS++;
          } catch (error) {
            logger.error(`Failed to restore CRS rule ${rule.ruleFile}:`, error);
          }
        }
      }

      // Restore custom rules
      if (backupData.modsec.customRules && Array.isArray(backupData.modsec.customRules)) {
        for (const rule of backupData.modsec.customRules) {
          try {
            await prisma.modSecRule.create({
              data: {
                domainId: rule.domainId,
                name: rule.name,
                ruleContent: rule.content || rule.ruleContent || '',
                enabled: rule.enabled,
                category: rule.category || 'custom'
              }
            });
            results.modsecCustom++;
          } catch (error) {
            logger.error(`Failed to restore custom ModSec rule ${rule.name}:`, error);
          }
        }
      }
    }

    // 4. Restore ACL rules
    if (backupData.acl && Array.isArray(backupData.acl)) {
      for (const rule of backupData.acl) {
        try {
          await prisma.aclRule.create({
            data: {
              name: rule.name,
              type: rule.type,
              conditionField: rule.condition.field,
              conditionOperator: rule.condition.operator,
              conditionValue: rule.condition.value,
              action: rule.action,
              enabled: rule.enabled
            }
          });
          results.acl++;
        } catch (error) {
          logger.error(`Failed to restore ACL rule ${rule.name}:`, error);
        }
      }
    }

    // 5. Restore notification channels
    if (backupData.notificationChannels && Array.isArray(backupData.notificationChannels)) {
      for (const channel of backupData.notificationChannels) {
        try {
          await prisma.notificationChannel.create({
            data: {
              name: channel.name,
              type: channel.type,
              enabled: channel.enabled,
              config: channel.config
            }
          });
          results.alertChannels++;
        } catch (error) {
          logger.error(`Failed to restore notification channel ${channel.name}:`, error);
        }
      }
    }

    // 6. Restore alert rules
    if (backupData.alertRules && Array.isArray(backupData.alertRules)) {
      for (const rule of backupData.alertRules) {
        try {
          const alertRule = await prisma.alertRule.create({
            data: {
              name: rule.name,
              condition: rule.condition,
              threshold: rule.threshold,
              severity: rule.severity,
              enabled: rule.enabled
            }
          });

          // Link channels
          if (rule.channels && Array.isArray(rule.channels)) {
            for (const channelName of rule.channels) {
              const channel = await prisma.notificationChannel.findFirst({
                where: { name: channelName }
              });
              if (channel) {
                await prisma.alertRuleChannel.create({
                  data: {
                    ruleId: alertRule.id,
                    channelId: channel.id
                  }
                });
              }
            }
          }
          results.alertRules++;
        } catch (error) {
          logger.error(`Failed to restore alert rule ${rule.name}:`, error);
        }
      }
    }

        // 7. Restore users (with hashed passwords)
    if (backupData.users && Array.isArray(backupData.users)) {
      for (const userData of backupData.users) {
        try {
          // Check if user already exists
          const existingUser = await prisma.user.findUnique({
            where: { username: userData.username }
          });

          if (!existingUser) {
            // Create user with password from backup (already hashed)
            await prisma.user.create({
              data: {
                username: userData.username,
                email: userData.email,
                password: userData.password, // Use hashed password from backup
                fullName: userData.fullName || userData.username,
                status: userData.status || 'active', // Keep original status
                role: userData.role || 'viewer',
                avatar: userData.avatar,
                phone: userData.phone,
                timezone: userData.timezone || 'UTC',
                language: userData.language || 'en',
                lastLogin: userData.lastLogin ? new Date(userData.lastLogin) : null,
                profile: userData.profile ? {
                  create: {
                    bio: userData.profile.bio || null,
                    location: userData.profile.location || null,
                    website: userData.profile.website || null
                  }
                } : undefined
              }
            });
            results.users++;
            logger.info(`User ${userData.username} restored with original password`);
          }
        } catch (error) {
          logger.error(`Failed to restore user ${userData.username}:`, error);
        }
      }
    }

    // 8. Restore nginx global configs
    if (backupData.nginxConfigs && Array.isArray(backupData.nginxConfigs)) {
      for (const config of backupData.nginxConfigs) {
        try {
          await prisma.nginxConfig.upsert({
            where: { id: config.id },
            update: {
              content: config.content || config.config || config.value || '',
              enabled: config.enabled ?? true
            },
            create: {
              id: config.id,
              configType: config.configType || 'main',
              name: config.name || 'config',
              content: config.content || config.config || config.value || '',
              enabled: config.enabled ?? true
            }
          });
          results.nginxConfigs++;
        } catch (error) {
          logger.error(`Failed to restore nginx config ${config.id}:`, error);
        }
      }
    }

    logger.info('Configuration imported successfully', {
      userId: req.user?.userId,
      results
    });

    // Reload nginx to apply all changes
    logger.info('Reloading nginx after restore...');
    const nginxReloaded = await reloadNginx();
    
    if (!nginxReloaded) {
      logger.warn('Nginx reload failed, but restore completed. Manual reload may be required.');
    }

    res.json({
      success: true,
      message: nginxReloaded 
        ? 'Configuration restored successfully and nginx reloaded' 
        : 'Configuration restored successfully, but nginx reload failed. Please reload manually.',
      data: results,
      nginxReloaded
    });
  } catch (error) {
    logger.error('Import config error:', error);
    res.status(500).json({
      success: false,
      message: 'Import failed'
    });
  }
};

/**
 * Get all backup files
 */
export const getBackupFiles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { scheduleId } = req.query;

    const backups = await prisma.backupFile.findMany({
      where: scheduleId ? { scheduleId: scheduleId as string } : {},
      include: {
        schedule: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formattedBackups = backups.map(backup => ({
      ...backup,
      size: formatBytes(Number(backup.size))
    }));

    res.json({
      success: true,
      data: formattedBackups
    });
  } catch (error) {
    logger.error('Get backup files error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Download backup file
 */
export const downloadBackup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const backup = await prisma.backupFile.findUnique({
      where: { id }
    });

    if (!backup) {
      res.status(404).json({
        success: false,
        message: 'Backup file not found'
      });
      return;
    }

    // Check if file exists
    try {
      await fs.access(backup.filepath);
    } catch {
      res.status(404).json({
        success: false,
        message: 'Backup file not found on disk'
      });
      return;
    }

    // Send file
    res.download(backup.filepath, backup.filename);

    logger.info(`Backup downloaded: ${backup.filename}`, {
      userId: req.user?.userId
    });
  } catch (error) {
    logger.error('Download backup error:', error);
    res.status(500).json({
      success: false,
      message: 'Download failed'
    });
  }
};

/**
 * Delete backup file
 */
export const deleteBackupFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const backup = await prisma.backupFile.findUnique({
      where: { id }
    });

    if (!backup) {
      res.status(404).json({
        success: false,
        message: 'Backup file not found'
      });
      return;
    }

    // Delete file from disk
    try {
      await fs.unlink(backup.filepath);
    } catch (error) {
      logger.warn(`Failed to delete backup file from disk: ${backup.filepath}`, error);
    }

    // Delete from database
    await prisma.backupFile.delete({
      where: { id }
    });

    logger.info(`Backup deleted: ${backup.filename}`, {
      userId: req.user?.userId
    });

    res.json({
      success: true,
      message: 'Backup file deleted successfully'
    });
  } catch (error) {
    logger.error('Delete backup file error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Helper function to generate nginx vhost configuration for a domain during backup restore
 * This is simplified version of generateNginxConfig from domain.controller
 */
async function generateNginxConfigForBackup(domain: any): Promise<void> {
  const configPath = path.join(NGINX_SITES_AVAILABLE, `${domain.name}.conf`);
  const enabledPath = path.join(NGINX_SITES_ENABLED, `${domain.name}.conf`);

  // Determine if any upstream uses HTTPS
  const hasHttpsUpstream = domain.upstreams?.some(
    (u: any) => u.protocol === "https"
  ) || false;
  const upstreamProtocol = hasHttpsUpstream ? "https" : "http";

  // Generate upstream block
  const upstreamBlock = `
upstream ${domain.name.replace(/\./g, "_")}_backend {
    ${domain.loadBalancer?.algorithm === "least_conn" ? "least_conn;" : ""}
    ${domain.loadBalancer?.algorithm === "ip_hash" ? "ip_hash;" : ""}
    
    ${(domain.upstreams || [])
      .map(
        (u: any) =>
          `server ${u.host}:${u.port} weight=${u.weight || 1} max_fails=${u.maxFails || 3} fail_timeout=${u.failTimeout || 10}s;`
      )
      .join("\n    ")}
}
`;

  // HTTP server block (always present)
  let httpServerBlock = `
server {
    listen 80;
    server_name ${domain.name};
    
    # Include ACL rules (IP whitelist/blacklist)
    include /etc/nginx/conf.d/acl-rules.conf;
    
    # Include ACME challenge location for Let's Encrypt
    include /etc/nginx/snippets/acme-challenge.conf;
    
    ${
      domain.sslEnabled
        ? `
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
    `
        : `
    ${domain.modsecEnabled ? "modsecurity on;" : "modsecurity off;"}
    
    access_log /var/log/nginx/${domain.name}_access.log main;
    error_log /var/log/nginx/${domain.name}_error.log warn;
    
    location / {
        proxy_pass ${upstreamProtocol}://${domain.name.replace(/\./g, "_")}_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        ${
          hasHttpsUpstream
            ? `
        # HTTPS Backend Settings
        ${
          domain.upstreams?.some((u: any) => u.protocol === "https" && !u.sslVerify)
            ? "proxy_ssl_verify off;"
            : "proxy_ssl_verify on;"
        }
        proxy_ssl_server_name on;
        proxy_ssl_name ${domain.name};
        proxy_ssl_protocols TLSv1.2 TLSv1.3;
        `
            : ""
        }
        
        ${
          domain.loadBalancer?.healthCheckEnabled
            ? `
        # Health check settings
        proxy_next_upstream error timeout http_502 http_503 http_504;
        proxy_next_upstream_tries 3;
        proxy_next_upstream_timeout ${domain.loadBalancer.healthCheckTimeout || 5}s;
        `
            : ""
        }
    }
    
    location /nginx_health {
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }
    `
    }
}
`;

  // HTTPS server block (only if SSL enabled)
  let httpsServerBlock = "";
  if (domain.sslEnabled && domain.sslCertificate) {
    httpsServerBlock = `
server {
    listen 443 ssl http2;
    server_name ${domain.name};
    
    # Include ACL rules (IP whitelist/blacklist)
    include /etc/nginx/conf.d/acl-rules.conf;
    
    # SSL Certificate Configuration
    ssl_certificate /etc/nginx/ssl/${domain.name}.crt;
    ssl_certificate_key /etc/nginx/ssl/${domain.name}.key;
    ${
      domain.sslCertificate.chain
        ? `ssl_trusted_certificate /etc/nginx/ssl/${domain.name}.chain.crt;`
        : ""
    }
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-DSS-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-DSS-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-DSS-AES256-SHA:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!3DES:!MD5:!PSK;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    ${domain.modsecEnabled ? "modsecurity on;" : "modsecurity off;"}
    
    access_log /var/log/nginx/${domain.name}_ssl_access.log main;
    error_log /var/log/nginx/${domain.name}_ssl_error.log warn;
    
    location / {
        proxy_pass ${upstreamProtocol}://${domain.name.replace(/\./g, "_")}_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        ${
          hasHttpsUpstream
            ? `
        # HTTPS Backend Settings
        ${
          domain.upstreams?.some((u: any) => u.protocol === "https" && !u.sslVerify)
            ? "proxy_ssl_verify off;"
            : "proxy_ssl_verify on;"
        }
        proxy_ssl_server_name on;
        proxy_ssl_name ${domain.name};
        proxy_ssl_protocols TLSv1.2 TLSv1.3;
        `
            : ""
        }
        
        ${
          domain.loadBalancer?.healthCheckEnabled
            ? `
        # Health check settings
        proxy_next_upstream error timeout http_502 http_503 http_504;
        proxy_next_upstream_tries 3;
        proxy_next_upstream_timeout ${domain.loadBalancer.healthCheckTimeout || 5}s;
        `
            : ""
        }
    }
    
    location /nginx_health {
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }
}
`;
  }

  const fullConfig = upstreamBlock + httpServerBlock + httpsServerBlock;

  // Write configuration file
  try {
    await fs.mkdir(NGINX_SITES_AVAILABLE, { recursive: true });
    await fs.mkdir(NGINX_SITES_ENABLED, { recursive: true });
    await fs.writeFile(configPath, fullConfig);

    // Create symlink if domain is active
    if (domain.status === "active") {
      try {
        await fs.unlink(enabledPath);
      } catch (e) {
        // File doesn't exist, ignore
      }
      await fs.symlink(configPath, enabledPath);
    }

    logger.info(`Nginx configuration generated for ${domain.name} during backup restore`);
  } catch (error) {
    logger.error(`Failed to write nginx config for ${domain.name}:`, error);
    throw error;
  }
}

/**
 * Helper function to read nginx vhost configuration file for a domain
 */
async function readNginxVhostConfig(domainName: string) {
  try {
    const vhostPath = path.join(NGINX_SITES_AVAILABLE, `${domainName}.conf`);
    const vhostConfig = await fs.readFile(vhostPath, 'utf-8');
    
    // Check if symlink exists in sites-enabled
    let isEnabled = false;
    try {
      const enabledPath = path.join(NGINX_SITES_ENABLED, `${domainName}.conf`);
      await fs.access(enabledPath);
      isEnabled = true;
    } catch {
      isEnabled = false;
    }

    return {
      domainName,
      config: vhostConfig,
      enabled: isEnabled
    };
  } catch (error) {
    logger.warn(`Nginx vhost config not found for ${domainName}`);
    return null;
  }
}

/**
 * Helper function to write nginx vhost configuration file for a domain
 */
async function writeNginxVhostConfig(domainName: string, config: string, enabled: boolean = true) {
  try {
    await fs.mkdir(NGINX_SITES_AVAILABLE, { recursive: true });
    await fs.mkdir(NGINX_SITES_ENABLED, { recursive: true });

    const vhostPath = path.join(NGINX_SITES_AVAILABLE, `${domainName}.conf`);
    await fs.writeFile(vhostPath, config, 'utf-8');
    logger.info(`Nginx vhost config written for ${domainName}`);

    // Create symlink in sites-enabled if enabled
    if (enabled) {
      const enabledPath = path.join(NGINX_SITES_ENABLED, `${domainName}.conf`);
      try {
        await fs.unlink(enabledPath);
      } catch {
        // Ignore if doesn't exist
      }
      await fs.symlink(vhostPath, enabledPath);
      logger.info(`Nginx vhost enabled for ${domainName}`);
    }
  } catch (error) {
    logger.error(`Error writing nginx vhost config for ${domainName}:`, error);
    throw error;
  }
}

/**
 * Helper function to read SSL certificate files for a domain
 */
async function readSSLCertificateFiles(domainName: string) {
  try {
    const certPath = path.join(SSL_CERTS_PATH, `${domainName}.crt`);
    const keyPath = path.join(SSL_CERTS_PATH, `${domainName}.key`);
    const chainPath = path.join(SSL_CERTS_PATH, `${domainName}.chain.crt`);

    const sslFiles: {
      certificate?: string;
      privateKey?: string;
      chain?: string;
    } = {};

    // Try to read certificate file
    try {
      sslFiles.certificate = await fs.readFile(certPath, 'utf-8');
    } catch (error) {
      logger.warn(`SSL certificate not found for ${domainName}: ${certPath}`);
    }

    // Try to read private key file
    try {
      sslFiles.privateKey = await fs.readFile(keyPath, 'utf-8');
    } catch (error) {
      logger.warn(`SSL private key not found for ${domainName}: ${keyPath}`);
    }

    // Try to read chain file (optional)
    try {
      sslFiles.chain = await fs.readFile(chainPath, 'utf-8');
    } catch (error) {
      // Chain is optional, don't log warning
    }

    return sslFiles;
  } catch (error) {
    logger.error(`Error reading SSL files for ${domainName}:`, error);
    return {};
  }
}

/**
 * Helper function to write SSL certificate files for a domain
 */
async function writeSSLCertificateFiles(domainName: string, sslFiles: {
  certificate?: string;
  privateKey?: string;
  chain?: string;
}) {
  try {
    await fs.mkdir(SSL_CERTS_PATH, { recursive: true });

    if (sslFiles.certificate) {
      const certPath = path.join(SSL_CERTS_PATH, `${domainName}.crt`);
      await fs.writeFile(certPath, sslFiles.certificate, 'utf-8');
      logger.info(`SSL certificate written for ${domainName}`);
    }

    if (sslFiles.privateKey) {
      const keyPath = path.join(SSL_CERTS_PATH, `${domainName}.key`);
      await fs.writeFile(keyPath, sslFiles.privateKey, 'utf-8');
      // Set proper permissions for private key
      await fs.chmod(keyPath, 0o600);
      logger.info(`SSL private key written for ${domainName}`);
    }

    if (sslFiles.chain) {
      const chainPath = path.join(SSL_CERTS_PATH, `${domainName}.chain.crt`);
      await fs.writeFile(chainPath, sslFiles.chain, 'utf-8');
      logger.info(`SSL chain written for ${domainName}`);
    }
  } catch (error) {
    logger.error(`Error writing SSL files for ${domainName}:`, error);
    throw error;
  }
}

/**
 * Helper function to collect all backup data
 */
async function collectBackupData() {
  // Get all domains with full relations
  const domains = await prisma.domain.findMany({
    include: {
      upstreams: true,
      loadBalancer: true,
      sslCertificate: true
    }
  });

  // Read nginx vhost config files for each domain
  const domainsWithVhostConfig = await Promise.all(
    domains.map(async (d) => {
      const vhostConfig = await readNginxVhostConfig(d.name);
      
      return {
        name: d.name,
        status: d.status,
        sslEnabled: d.sslEnabled,
        modsecEnabled: d.modsecEnabled,
        upstreams: d.upstreams,
        loadBalancer: d.loadBalancer,
        // Include nginx vhost configuration file
        vhostConfig: vhostConfig?.config,
        vhostEnabled: vhostConfig?.enabled
      };
    })
  );

  // Get all SSL certificates with actual certificate files
  const ssl = await prisma.sSLCertificate.findMany({
    include: {
      domain: true
    }
  });

  // Read SSL certificate files for each certificate
  const sslWithFiles = await Promise.all(
    ssl.map(async (s) => {
      if (!s.domain?.name) {
        return {
          domainName: s.domain?.name,
          commonName: s.commonName,
          sans: s.sans,
          issuer: s.issuer,
          autoRenew: s.autoRenew,
          validFrom: s.validFrom,
          validTo: s.validTo
        };
      }

      const sslFiles = await readSSLCertificateFiles(s.domain.name);
      
      return {
        domainName: s.domain.name,
        commonName: s.commonName,
        sans: s.sans,
        issuer: s.issuer,
        autoRenew: s.autoRenew,
        validFrom: s.validFrom,
        validTo: s.validTo,
        // Include actual certificate files
        files: sslFiles
      };
    })
  );

  // Get ModSecurity CRS rules
  const modsecCRSRules = await prisma.modSecCRSRule.findMany();

  // Get ModSecurity custom rules
  const modsecCustomRules = await prisma.modSecRule.findMany();

  // Get ModSecurity global settings
  const modsecGlobalSettings = await prisma.nginxConfig.findMany();

  // Get ACL rules
  const aclRules = await prisma.aclRule.findMany();

  // Get notification channels
  const notificationChannels = await prisma.notificationChannel.findMany();

  // Get alert rules
  const alertRules = await prisma.alertRule.findMany({
    include: {
      channels: {
        include: {
          channel: true
        }
      }
    }
  });

  // Get all users (including hashed passwords for complete backup)
  const users = await prisma.user.findMany({
    include: {
      profile: true
    }
  });

  // Keep passwords as they are already hashed (bcrypt)
  // This allows users to login immediately after restore without password reset

  // Get nginx configs
  const nginxConfigs = await prisma.nginxConfig.findMany();

  return {
    version: '2.0', // Bumped version for complete backup
    timestamp: new Date().toISOString(),
    
    // Domain configurations with vhost files
    domains: domainsWithVhostConfig,
    
    // SSL certificates with actual files
    ssl: sslWithFiles,
    
    // ModSecurity configurations
    modsec: {
      globalSettings: modsecGlobalSettings,
      crsRules: modsecCRSRules,
      customRules: modsecCustomRules
    },
    
    // ACL rules
    acl: aclRules.map(r => ({
      name: r.name,
      type: r.type,
      condition: {
        field: r.conditionField,
        operator: r.conditionOperator,
        value: r.conditionValue
      },
      action: r.action,
      enabled: r.enabled
    })),
    
    // Alert and notification configurations
    notificationChannels,
    alertRules: alertRules.map(r => ({
      name: r.name,
      condition: r.condition,
      threshold: r.threshold,
      severity: r.severity,
      enabled: r.enabled,
      channels: r.channels.map(c => c.channel.name)
    })),
    
    // Users (with hashed passwords for complete restore)
    users: users,
    
    // Global nginx configurations
    nginxConfigs
  };
}
