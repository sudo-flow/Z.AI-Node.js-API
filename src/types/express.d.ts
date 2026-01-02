declare namespace Express {
  interface Request {
    startTime?: number;
    clientInfo?: {
      apiKey: string;
      ip: string;
      userAgent?: string;
    };
  }
}