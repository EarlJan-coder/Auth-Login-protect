export const openapiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Auth Practice API',
    version: '1.0.0',
    description: 'Express + Supabase authentication: signup, login, logout, and middleware-protected routes.',
  },
  servers: [{ url: 'http://localhost:3000' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
  paths: {
    '/auth/signup': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } },
              },
            },
          },
        },
        responses: { 201: { description: 'User created' }, 400: { description: 'Bad Request' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Sign in and receive tokens',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Returns access_token and refresh_token' },
          400: { description: 'Bad Request' },
          401: { description: 'Invalid login credentials' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Revoke the current session',
        security: [{ bearerAuth: [] }],
        responses: { 204: { description: 'No Content' }, 401: { description: 'Unauthorized' } },
      },
    },
    '/public/info': {
      get: {
        tags: ['Public'],
        summary: 'Public info (no auth)',
        responses: { 200: { description: 'Welcome message' } },
      },
    },
    '/protected/profile': {
      get: {
        tags: ['Protected'],
        summary: 'Current user profile (requires Bearer token)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'id, email, created_at' },
          401: { description: 'Access token required / Invalid or expired token' },
        },
      },
    },
    '/protected/dashboard': {
      get: {
        tags: ['Protected'],
        summary: 'Dashboard (requires Bearer token)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Welcome-back payload' },
          401: { description: 'Unauthorized' },
        },
      },
    },
  },
};
