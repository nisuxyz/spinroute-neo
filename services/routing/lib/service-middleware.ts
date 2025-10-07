import type { Context, Next } from 'hono';
import { config } from './config';

// Middleware to validate requests from API Gateway
export async function apiGatewayAuth(c: Context, next: Next) {
  const gatewaySecret = process.env.API_GATEWAY_SECRET;
  
  if (!gatewaySecret) {
    return c.json({ error: 'API Gateway authentication not configured' }, 500);
  }

  const authHeader = c.req.header('x-gateway-auth');
  
  if (!authHeader || authHeader !== gatewaySecret) {
    return c.json({ error: 'Unauthorized - Invalid gateway credentials' }, 401);
  }

  await next();
}

// Middleware for internal service communication
export async function internalServiceAuth(c: Context, next: Next) {
  const serviceSecret = process.env.INTERNAL_SERVICE_SECRET;
  
  if (!serviceSecret) {
    return c.json({ error: 'Internal service authentication not configured' }, 500);
  }

  const authHeader = c.req.header('x-service-auth');
  
  if (!authHeader || authHeader !== serviceSecret) {
    return c.json({ error: 'Unauthorized - Invalid service credentials' }, 401);
  }

  await next();
}

// Rate limiting middleware (basic implementation)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(maxRequests: number = 100, windowMs: number = 60000) {
  return async (c: Context, next: Next) => {
    const clientIp = c.req.header('x-forwarded-for') || 
                     c.req.header('x-real-ip') || 
                     'unknown';
    
    const now = Date.now();
    const clientData = requestCounts.get(clientIp);
    
    if (!clientData || now > clientData.resetTime) {
      requestCounts.set(clientIp, { count: 1, resetTime: now + windowMs });
      await next();
      return;
    }
    
    if (clientData.count >= maxRequests) {
      return c.json({ error: 'Rate limit exceeded' }, 429);
    }
    
    clientData.count++;
    await next();
  };
}
