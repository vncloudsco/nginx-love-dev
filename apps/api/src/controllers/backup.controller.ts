import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';
import prisma from '../config/database';
import * as fs from 'fs/promises';
import * as path from 'path';

const BACKUP_DIR = process.env.BACKUP_DIR || '/var/backups/nginx-love';
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
      ssl: 0,
      sslFiles: 0,
      modsec: 0,
      acl: 0,
      alertChannels: 0,
      alertRules: 0
    };

    // Restore domains (if present)
    if (backupData.domains && Array.isArray(backupData.domains)) {
      for (const domain of backupData.domains) {
        try {
          // Create or update domain
          await prisma.domain.upsert({
            where: { name: domain.name },
            update: {
              status: domain.status,
              sslEnabled: domain.sslEnabled,
              modsecEnabled: domain.modsecEnabled
            },
            create: {
              name: domain.name,
              status: domain.status,
              sslEnabled: domain.sslEnabled,
              modsecEnabled: domain.modsecEnabled
            }
          });
          results.domains++;
        } catch (error) {
          logger.error(`Failed to restore domain ${domain.name}:`, error);
        }
      }
    }

    // Restore SSL certificates (if present)
    if (backupData.ssl && Array.isArray(backupData.ssl)) {
      for (const sslCert of backupData.ssl) {
        try {
          // Find domain by name
          const domain = await prisma.domain.findUnique({
            where: { name: sslCert.domainName }
          });

          if (!domain) {
            logger.warn(`Domain not found for SSL cert: ${sslCert.domainName}`);
            continue;
          }

          // Restore SSL certificate files if present
          if (sslCert.files && sslCert.files.certificate && sslCert.files.privateKey) {
            // Create or update SSL certificate in database with actual certificate content
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
                domain: {
                  connect: { id: domain.id }
                },
                commonName: sslCert.commonName,
                sans: sslCert.sans || [],
                issuer: sslCert.issuer,
                certificate: sslCert.files.certificate,
                privateKey: sslCert.files.privateKey,
                chain: sslCert.files.chain || null,
                validFrom: new Date(),
                validTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
                autoRenew: sslCert.autoRenew || false
              }
            });

            // Also write files to disk
            await writeSSLCertificateFiles(sslCert.domainName, {
              certificate: sslCert.files.certificate,
              privateKey: sslCert.files.privateKey,
              chain: sslCert.files.chain
            });
            
            results.ssl++;
            results.sslFiles++;
            logger.info(`SSL certificate and files restored for domain: ${sslCert.domainName}`);
          } else {
            // Only create DB record if no files
            await prisma.sSLCertificate.upsert({
              where: { domainId: domain.id },
              update: {
                commonName: sslCert.commonName,
                sans: sslCert.sans || [],
                issuer: sslCert.issuer,
                autoRenew: sslCert.autoRenew || false
              },
              create: {
                domain: {
                  connect: { id: domain.id }
                },
                commonName: sslCert.commonName,
                sans: sslCert.sans || [],
                issuer: sslCert.issuer,
                certificate: '', // Empty placeholder
                privateKey: '', // Empty placeholder
                validFrom: new Date(),
                validTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                autoRenew: sslCert.autoRenew || false
              }
            });
            results.ssl++;
            logger.info(`SSL metadata restored for domain: ${sslCert.domainName} (no files)`);
          }
        } catch (error) {
          logger.error(`Failed to restore SSL cert for ${sslCert.domainName}:`, error);
        }
      }
    }

    // Restore ACL rules (if present)
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

    // Restore notification channels (if present)
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

    logger.info('Configuration imported successfully', {
      userId: req.user?.userId,
      results
    });

    res.json({
      success: true,
      message: 'Configuration imported successfully',
      data: results
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
  // Get all domains
  const domains = await prisma.domain.findMany({
    include: {
      upstreams: true,
      loadBalancer: true,
      sslCertificate: true
    }
  });

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
          autoRenew: s.autoRenew
        };
      }

      const sslFiles = await readSSLCertificateFiles(s.domain.name);
      
      return {
        domainName: s.domain.name,
        commonName: s.commonName,
        sans: s.sans,
        issuer: s.issuer,
        autoRenew: s.autoRenew,
        // Include actual certificate files
        files: sslFiles
      };
    })
  );

  // Get ModSecurity CRS rules
  const modsecCRSRules = await prisma.modSecCRSRule.findMany();

  // Get ModSecurity custom rules
  const modsecCustomRules = await prisma.modSecRule.findMany();

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

  // Get nginx configs
  const nginxConfigs = await prisma.nginxConfig.findMany();

  return {
    version: '1.0',
    timestamp: new Date().toISOString(),
    domains: domains.map(d => ({
      name: d.name,
      status: d.status,
      sslEnabled: d.sslEnabled,
      modsecEnabled: d.modsecEnabled,
      upstreams: d.upstreams,
      loadBalancer: d.loadBalancer
    })),
    ssl: sslWithFiles,
    modsec: {
      crsRules: modsecCRSRules,
      customRules: modsecCustomRules
    },
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
    notificationChannels,
    alertRules: alertRules.map(r => ({
      name: r.name,
      condition: r.condition,
      threshold: r.threshold,
      severity: r.severity,
      enabled: r.enabled,
      channels: r.channels.map(c => c.channel.name)
    })),
    nginxConfigs
  };
}
