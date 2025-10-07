import prisma from '../config/database';
import logger from './logger';

/**
 * Check slave nodes and mark as offline if not seen for 5 minutes
 */
export async function checkSlaveNodeStatus() {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Find nodes that haven't been seen in 5 minutes and are currently online
    const staleNodes = await prisma.slaveNode.findMany({
      where: {
        status: 'online',
        lastSeen: {
          lt: fiveMinutesAgo
        }
      },
      select: {
        id: true,
        name: true,
        lastSeen: true
      }
    });

    if (staleNodes.length > 0) {
      logger.info('[SLAVE-STATUS] Marking stale nodes as offline', {
        count: staleNodes.length,
        nodes: staleNodes.map(n => n.name)
      });

      // Update to offline
      await prisma.slaveNode.updateMany({
        where: {
          id: {
            in: staleNodes.map(n => n.id)
          }
        },
        data: {
          status: 'offline'
        }
      });
    }
  } catch (error: any) {
    logger.error('[SLAVE-STATUS] Check slave status error:', error);
  }
}

/**
 * Start background job to check slave node status every 1 minute
 */
export function startSlaveNodeStatusCheck(): NodeJS.Timeout {
  logger.info('[SLAVE-STATUS] Starting slave node status checker (interval: 60s)');
  
  // Run immediately on start
  checkSlaveNodeStatus();
  
  // Then run every minute
  return setInterval(checkSlaveNodeStatus, 60 * 1000);
}

/**
 * Stop background job
 */
export function stopSlaveNodeStatusCheck(timer: NodeJS.Timeout) {
  logger.info('[SLAVE-STATUS] Stopping slave node status checker');
  clearInterval(timer);
}
