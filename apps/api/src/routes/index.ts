import { Router } from 'express';
import authRoutes from './auth.routes';
import accountRoutes from './account.routes';
import domainRoutes from './domain.routes';
import systemRoutes from './system.routes';
import sslRoutes from './ssl.routes';
import modsecRoutes from './modsec.routes';
import logsRoutes from './logs.routes';
import alertsRoutes from './alerts.routes';
import aclRoutes from './acl.routes';
import performanceRoutes from './performance.routes';
import userRoutes from './user.routes';
import dashboardRoutes from './dashboard.routes';
import backupRoutes from './backup.routes';
import slaveRoutes from './slave.routes';
import systemConfigRoutes from './system-config.routes';
import nodeSyncRoutes from './node-sync.routes';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/account', accountRoutes);
router.use('/domains', domainRoutes);
router.use('/system', systemRoutes);
router.use('/ssl', sslRoutes);
router.use('/modsec', modsecRoutes);
router.use('/logs', logsRoutes);
router.use('/alerts', alertsRoutes);
router.use('/acl', aclRoutes);
router.use('/performance', performanceRoutes);
router.use('/users', userRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/backup', backupRoutes);
router.use('/slave', slaveRoutes);
router.use('/system-config', systemConfigRoutes);
router.use('/node-sync', nodeSyncRoutes);

export default router;
