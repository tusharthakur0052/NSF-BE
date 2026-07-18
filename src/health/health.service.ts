import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class HealthService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async checkHealth() {
    const readyState = this.connection.readyState;
    // Mongoose connection states: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const dbStatus = readyState === 1 ? 'up' : 'down';

    const healthInfo = {
      status: dbStatus === 'up' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(process.uptime())}s`,
      memory: {
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      },
      details: {
        database: {
          status: dbStatus,
          readyState,
        },
      },
    };

    if (dbStatus === 'down') {
      throw new ServiceUnavailableException(healthInfo);
    }

    return healthInfo;
  }
}
