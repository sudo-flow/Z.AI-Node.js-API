import { Request, Response } from 'express';
import { zaiClient } from '../client/zaiClient';
import { logger } from '../middleware/errorHandler';
import config from '../config/environment';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    zai_api: 'healthy' | 'unhealthy';
    database?: 'healthy' | 'unhealthy';
    redis?: 'healthy' | 'unhealthy';
  };
  metrics?: {
    totalRequests: number;
    activeConnections: number;
    memoryUsage: NodeJS.MemoryUsage;
  };
}

export class HealthController {
  private startTime = Date.now();
  private requestCount = 0;
  private activeConnections = 0;

  async healthCheck(req: Request, res: Response) {
    const requestId = req.headers['x-request-id'] as string;
    const startTime = Date.now();

    // Increment request counter
    this.requestCount++;

    try {
      // Check Z.AI API connectivity
      const zaiApiStatus = await this.checkZaiApi();

      const healthStatus: HealthStatus = {
        status: zaiApiStatus ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        version: process.env.npm_package_version || '1.0.0',
        services: {
          zai_api: zaiApiStatus ? 'healthy' : 'unhealthy',
        },
      };

      // Add metrics if enabled
      if (config.monitoring.enabled) {
        healthStatus.metrics = {
          totalRequests: this.requestCount,
          activeConnections: this.activeConnections,
          memoryUsage: process.memoryUsage(),
        };
      }

      // Add additional service checks if configured
      if (config.redis.url) {
        healthStatus.services.redis = await this.checkRedis();
      }

      const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

      logger.info({
        requestId,
        status: healthStatus.status,
        responseTime: Date.now() - startTime,
        services: healthStatus.services,
      }, 'Health check completed');

      res.status(statusCode).json(healthStatus);
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      logger.error({
        requestId,
        error: error.message,
        responseTime,
      }, 'Health check failed');

      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        version: process.env.npm_package_version || '1.0.0',
        services: {
          zai_api: 'unhealthy',
        },
        error: error.message,
      });
    }
  }

  async readinessCheck(req: Request, res: Response) {
    const requestId = req.headers['x-request-id'] as string;

    try {
      // Check if service is ready to accept traffic
      const zaiApiHealthy = await this.checkZaiApi();

      if (zaiApiHealthy) {
        res.status(200).json({
          status: 'ready',
          timestamp: new Date().toISOString(),
          checks: {
            zai_api: 'pass',
          },
        });

        logger.debug({
          requestId,
        }, 'Readiness check passed');
      } else {
        res.status(503).json({
          status: 'not ready',
          timestamp: new Date().toISOString(),
          checks: {
            zai_api: 'fail',
          },
        });

        logger.warn({
          requestId,
        }, 'Readiness check failed - Z.AI API not available');
      }
    } catch (error: any) {
      logger.error({
        requestId,
        error: error.message,
      }, 'Readiness check failed');

      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  async livenessCheck(_req: Request, res: Response) {
    // Basic liveness check - if the process is running, we're alive
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      pid: process.pid,
    });
  }

  async getMetrics(req: Request, res: Response) {
    const requestId = req.headers['x-request-id'] as string;

    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        requestCount: this.requestCount,
        activeConnections: this.activeConnections,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        node: {
          version: process.version,
          pid: process.pid,
          platform: process.platform,
          arch: process.arch,
        },
      };

      logger.debug({
        requestId,
        requestCount: this.requestCount,
      }, 'Metrics retrieved');

      res.json(metrics);
    } catch (error: any) {
      logger.error({
        requestId,
        error: error.message,
      }, 'Failed to retrieve metrics');

      res.status(500).json({
        error: {
          message: 'Failed to retrieve metrics',
          type: 'api_error',
        },
      });
    }
  }

  // Helper methods
  private async checkZaiApi(): Promise<boolean> {
    try {
      // Simple health check by attempting to get models
      await zaiClient.getModels();
      return true;
    } catch (error) {
      return false;
    }
  }

  private async checkRedis(): Promise<'healthy' | 'unhealthy'> {
    try {
      // Redis health check would go here
      // For now, assume healthy if URL is configured
      return 'healthy';
    } catch (error) {
      return 'unhealthy';
    }
  }

  // Utility methods for tracking metrics
  incrementRequestCount(): void {
    this.requestCount++;
  }

  incrementActiveConnections(): void {
    this.activeConnections++;
  }

  decrementActiveConnections(): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
  }
}

export const healthController = new HealthController();