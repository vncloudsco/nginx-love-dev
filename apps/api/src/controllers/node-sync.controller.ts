import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { SlaveRequest } from '../middleware/slaveAuth';
import logger from '../utils/logger';
import prisma from '../config/database';
import crypto from 'crypto';

/**
 * Export configuration for slave sync (NO timestamps to keep hash stable)
 * This is DIFFERENT from backup export - optimized for sync with hash comparison
 */
export const exportForSync = async (req: SlaveRequest, res: Response): Promise<any> => {
  try {
    logger.info('[NODE-SYNC] Exporting config for slave sync', {
      slaveNode: req.slaveNode?.name
    });

    // Collect data WITHOUT timestamps/IDs that change
    const syncData = await collectSyncData();

    // Calculate hash for comparison
    const dataString = JSON.stringify(syncData);
    const hash = crypto.createHash('sha256').update(dataString).digest('hex');

    res.json({
      success: true,
      data: {
        hash,
        config: syncData
      }
    });
  } catch (error) {
    logger.error('[NODE-SYNC] Export for sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Export for sync failed'
    });
  }
};

/**
 * Import configuration from master (slave imports synced config)
 */
export const importFromMaster = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { hash, config } = req.body;

    if (!hash || !config) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sync data: hash and config required'
      });
    }

    // Get current config hash
    const currentConfig = await collectSyncData();
    const currentHash = crypto.createHash('sha256').update(JSON.stringify(currentConfig)).digest('hex');

    logger.info('[NODE-SYNC] Import check', {
      currentHash,
      newHash: hash,
      needsImport: currentHash !== hash
    });

    // If hash is same, skip import
    if (currentHash === hash) {
      return res.json({
        success: true,
        message: 'Configuration already up to date (hash match)',
        data: {
          imported: false,
          hash: currentHash,
          changes: 0
        }
      });
    }

    // Hash different → Import config
    logger.info('[NODE-SYNC] Hash mismatch, importing config...');
    const results = await importSyncConfig(config);

    // Update SystemConfig with new hash
    const systemConfig = await prisma.systemConfig.findFirst();
    if (systemConfig) {
      await prisma.systemConfig.update({
        where: { id: systemConfig.id },
        data: {
          lastConnectedAt: new Date()
        }
      });
    }

    logger.info('[NODE-SYNC] Import completed', results);

    res.json({
      success: true,
      message: 'Configuration imported successfully',
      data: {
        imported: true,
        hash,
        changes: results.totalChanges,
        details: results
      }
    });
  } catch (error: any) {
    logger.error('[NODE-SYNC] Import error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Import failed'
    });
  }
};

/**
 * Collect sync data (NO timestamps, NO IDs - only actual config)
 */
async function collectSyncData() {
  const [domains, ssl, modsecCRS, modsecCustom, acl, users] = await Promise.all([
    prisma.domain.findMany({
      include: {
        upstreams: true,
        loadBalancer: true
      }
    }),
    prisma.sSLCertificate.findMany({
      include: {
        domain: true
      }
    }),
    prisma.modSecCRSRule.findMany(),
    prisma.modSecRule.findMany(),
    prisma.aclRule.findMany(),
    prisma.user.findMany()
  ]);

  return {
    version: '1.0-sync',
    
    // Domains (NO timestamps, NO IDs)
    domains: domains.map(d => ({
      name: d.name,
      status: d.status,
      sslEnabled: d.sslEnabled,
      modsecEnabled: d.modsecEnabled,
      upstreams: d.upstreams?.map(u => ({
        host: u.host,
        port: u.port,
        protocol: u.protocol,
        sslVerify: u.sslVerify,
        weight: u.weight,
        maxFails: u.maxFails,
        failTimeout: u.failTimeout
      })) || [],
      loadBalancer: d.loadBalancer ? {
        algorithm: d.loadBalancer.algorithm,
        healthCheckEnabled: d.loadBalancer.healthCheckEnabled,
        healthCheckPath: d.loadBalancer.healthCheckPath,
        healthCheckInterval: d.loadBalancer.healthCheckInterval,
        healthCheckTimeout: d.loadBalancer.healthCheckTimeout
      } : null
    })),
    
    // SSL Certificates (NO timestamps, NO IDs)
    ssl: ssl.map(s => ({
      domainName: s.domain?.name,
      commonName: s.commonName,
      sans: s.sans,
      issuer: s.issuer,
      certificate: s.certificate,
      privateKey: s.privateKey,
      chain: s.chain,
      validFrom: s.validFrom,
      validTo: s.validTo,
      autoRenew: s.autoRenew
    })),
    
    // ModSecurity CRS Rules
    modsecCRS: modsecCRS.map(r => ({
      ruleFile: r.ruleFile,
      name: r.name,
      category: r.category,
      description: r.description,
      enabled: r.enabled,
      paranoia: r.paranoia
    })),
    
    // ModSecurity Custom Rules
    modsecCustom: modsecCustom.map(r => ({
      name: r.name,
      category: r.category,
      ruleContent: r.ruleContent,
      enabled: r.enabled,
      description: r.description
    })),
    
    // ACL Rules
    acl: acl.map(r => ({
      name: r.name,
      type: r.type,
      conditionField: r.conditionField,
      conditionOperator: r.conditionOperator,
      conditionValue: r.conditionValue,
      action: r.action,
      enabled: r.enabled
    })),
    
    // Users (NO timestamps, NO IDs, keep password hashes)
    users: users.map(u => ({
      email: u.email,
      username: u.username,
      fullName: u.fullName,
      password: u.password, // Already hashed
      role: u.role
    }))
  };
}

/**
 * Import sync config into database
 */
async function importSyncConfig(config: any) {
  const results = {
    domains: 0,
    upstreams: 0,
    loadBalancers: 0,
    ssl: 0,
    modsecCRS: 0,
    modsecCustom: 0,
    acl: 0,
    users: 0,
    totalChanges: 0
  };

  try {
    // 1. Import Domains + Upstreams + Load Balancers
    if (config.domains && Array.isArray(config.domains)) {
      for (const domainData of config.domains) {
        try {
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

          // Import upstreams
          if (domainData.upstreams && Array.isArray(domainData.upstreams)) {
            await prisma.upstream.deleteMany({ where: { domainId: domain.id } });
            
            for (const upstream of domainData.upstreams) {
              await prisma.upstream.create({
                data: {
                  domainId: domain.id,
                  host: upstream.host,
                  port: upstream.port,
                  protocol: upstream.protocol || 'http',
                  sslVerify: upstream.sslVerify !== false,
                  weight: upstream.weight || 1,
                  maxFails: upstream.maxFails || 3,
                  failTimeout: upstream.failTimeout || 10
                }
              });
              results.upstreams++;
            }
          }

          // Import load balancer
          if (domainData.loadBalancer) {
            await prisma.loadBalancerConfig.upsert({
              where: { domainId: domain.id },
              update: {
                algorithm: domainData.loadBalancer.algorithm,
                healthCheckEnabled: domainData.loadBalancer.healthCheckEnabled,
                healthCheckPath: domainData.loadBalancer.healthCheckPath,
                healthCheckInterval: domainData.loadBalancer.healthCheckInterval,
                healthCheckTimeout: domainData.loadBalancer.healthCheckTimeout
              },
              create: {
                domainId: domain.id,
                algorithm: domainData.loadBalancer.algorithm,
                healthCheckEnabled: domainData.loadBalancer.healthCheckEnabled,
                healthCheckPath: domainData.loadBalancer.healthCheckPath,
                healthCheckInterval: domainData.loadBalancer.healthCheckInterval,
                healthCheckTimeout: domainData.loadBalancer.healthCheckTimeout
              }
            });
            results.loadBalancers++;
          }
        } catch (err: any) {
          logger.error(`[NODE-SYNC] Domain import error (${domainData.name}):`, err.message);
        }
      }
    }

    // 2. Import SSL Certificates
    if (config.ssl && Array.isArray(config.ssl)) {
      for (const sslData of config.ssl) {
        try {
          const domain = await prisma.domain.findUnique({
            where: { name: sslData.domainName }
          });

          if (!domain) continue;

          await prisma.sSLCertificate.upsert({
            where: { domainId: domain.id },
            update: {
              commonName: sslData.commonName,
              sans: sslData.sans || [],
              issuer: sslData.issuer,
              certificate: sslData.certificate,
              privateKey: sslData.privateKey,
              chain: sslData.chain,
              validFrom: sslData.validFrom ? new Date(sslData.validFrom) : new Date(),
              validTo: sslData.validTo ? new Date(sslData.validTo) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
              autoRenew: sslData.autoRenew || false
            },
            create: {
              domainId: domain.id,
              commonName: sslData.commonName,
              sans: sslData.sans || [],
              issuer: sslData.issuer,
              certificate: sslData.certificate,
              privateKey: sslData.privateKey,
              chain: sslData.chain,
              validFrom: sslData.validFrom ? new Date(sslData.validFrom) : new Date(),
              validTo: sslData.validTo ? new Date(sslData.validTo) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
              autoRenew: sslData.autoRenew || false
            }
          });
          results.ssl++;
        } catch (err: any) {
          logger.error(`[NODE-SYNC] SSL import error:`, err.message);
        }
      }
    }

    // 3. Import ModSecurity CRS Rules
    if (config.modsecCRS && Array.isArray(config.modsecCRS)) {
      await prisma.modSecCRSRule.deleteMany({});
      
      for (const rule of config.modsecCRS) {
        await prisma.modSecCRSRule.create({
          data: {
            ruleFile: rule.ruleFile,
            name: rule.name,
            category: rule.category,
            description: rule.description || '',
            enabled: rule.enabled,
            paranoia: rule.paranoia || 1
          }
        });
        results.modsecCRS++;
      }
    }

    // 4. Import ModSecurity Custom Rules
    if (config.modsecCustom && Array.isArray(config.modsecCustom)) {
      await prisma.modSecRule.deleteMany({});
      
      for (const rule of config.modsecCustom) {
        await prisma.modSecRule.create({
          data: {
            name: rule.name,
            category: rule.category,
            ruleContent: rule.ruleContent,
            enabled: rule.enabled,
            description: rule.description
          }
        });
        results.modsecCustom++;
      }
    }

    // 5. Import ACL Rules
    if (config.acl && Array.isArray(config.acl)) {
      await prisma.aclRule.deleteMany({});
      
      for (const rule of config.acl) {
        await prisma.aclRule.create({
          data: {
            name: rule.name,
            type: rule.type,
            conditionField: rule.conditionField,
            conditionOperator: rule.conditionOperator,
            conditionValue: rule.conditionValue,
            action: rule.action,
            enabled: rule.enabled
          }
        });
        results.acl++;
      }
    }

    // 6. Import Users
    if (config.users && Array.isArray(config.users)) {
      for (const userData of config.users) {
        try {
          await prisma.user.upsert({
            where: { email: userData.email },
            update: {
              username: userData.username,
              fullName: userData.fullName,
              role: userData.role
              // Don't update password for security
            },
            create: {
              email: userData.email,
              username: userData.username,
              fullName: userData.fullName,
              password: userData.password, // Already hashed
              role: userData.role
            }
          });
          results.users++;
        } catch (err: any) {
          logger.error(`[NODE-SYNC] User import error (${userData.email}):`, err.message);
        }
      }
    }

    results.totalChanges = results.domains + results.ssl + results.modsecCRS + 
                           results.modsecCustom + results.acl + results.users;

    return results;
  } catch (error) {
    logger.error('[NODE-SYNC] Import config error:', error);
    throw error;
  }
}
