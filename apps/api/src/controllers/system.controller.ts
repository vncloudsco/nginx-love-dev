import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { runAlertMonitoring } from '../utils/alert-monitoring.service';
import os from 'os';

const execAsync = promisify(exec);
const INSTALL_STATUS_FILE = '/var/run/nginx-modsecurity-install.status';

/**
 * Get installation status
 */
export const getInstallationStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check if status file exists
    try {
      const statusContent = await fs.readFile(INSTALL_STATUS_FILE, 'utf-8');
      const status = JSON.parse(statusContent);
      
      res.json({
        success: true,
        data: status,
      });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist - check if nginx is installed
        try {
          await execAsync('which nginx');
          // Nginx exists, installation is complete
          res.json({
            success: true,
            data: {
              step: 'completed',
              status: 'success',
              message: 'Nginx and ModSecurity are installed',
              timestamp: new Date().toISOString(),
            },
          });
        } catch {
          // Nginx not installed
          res.json({
            success: true,
            data: {
              step: 'pending',
              status: 'not_started',
              message: 'Installation not started',
              timestamp: new Date().toISOString(),
            },
          });
        }
      } else {
        throw error;
      }
    }
  } catch (error) {
    logger.error('Get installation status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get installation status',
    });
  }
};

/**
 * Get nginx status
 */
export const getNginxStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { stdout } = await execAsync('systemctl status nginx');
    
    res.json({
      success: true,
      data: {
        running: stdout.includes('active (running)'),
        output: stdout,
      },
    });
  } catch (error: any) {
    res.json({
      success: true,
      data: {
        running: false,
        output: error.stdout || error.message,
      },
    });
  }
};

/**
 * Start installation
 */
export const startInstallation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Only admins can start installation',
      });
      return;
    }

    // Check if already installed
    try {
      await execAsync('which nginx');
      res.status(400).json({
        success: false,
        message: 'Nginx is already installed',
      });
      return;
    } catch {
      // Not installed, continue
    }

    // Start installation script in background
    const scriptPath = '/home/waf/nginx-love-ui/scripts/install-nginx-modsecurity.sh';
    exec(`sudo ${scriptPath} > /var/log/nginx-install-output.log 2>&1 &`);

    logger.info(`Installation started by user ${req.user!.username}`);

    res.json({
      success: true,
      message: 'Installation started in background',
    });
  } catch (error) {
    logger.error('Start installation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start installation',
    });
  }
};

/**
 * Get current system metrics
 */
export const getSystemMetrics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // CPU Usage
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    const cpuUsage = 100 - (100 * totalIdle / totalTick);

    // Memory Usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memUsage = ((totalMem - freeMem) / totalMem) * 100;

    // Disk Usage
    let diskUsage = 0;
    try {
      const { stdout } = await execAsync("df / | tail -1 | awk '{print $5}' | sed 's/%//'");
      diskUsage = parseFloat(stdout.trim());
    } catch (error) {
      logger.error('Failed to get disk usage:', error);
    }

    // Uptime
    const uptime = os.uptime();

    res.json({
      success: true,
      data: {
        cpu: Math.round(cpuUsage * 10) / 10,
        memory: Math.round(memUsage * 10) / 10,
        disk: diskUsage,
        uptime: Math.round(uptime),
        totalMemory: Math.round(totalMem / (1024 * 1024 * 1024) * 100) / 100,
        freeMemory: Math.round(freeMem / (1024 * 1024 * 1024) * 100) / 100,
        cpuCount: cpus.length,
        loadAverage: os.loadavg()
      }
    });
  } catch (error) {
    logger.error('Get system metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Manually trigger alert monitoring check
 */
export const triggerAlertCheck = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    logger.info(`User ${req.user?.username} manually triggered alert monitoring check`);
    
    // Run monitoring immediately
    await runAlertMonitoring();

    res.json({
      success: true,
      message: 'Alert monitoring check triggered successfully. Check logs for details.'
    });
  } catch (error: any) {
    logger.error('Trigger alert check error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};
