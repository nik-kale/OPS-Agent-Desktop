/**
 * Swagger/OpenAPI Configuration
 */
import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './index';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'OPS-Agent-Desktop API',
      version: '2.0.0',
      description: `
Visual Mission Control for AI-Powered SRE & Support Agents

This API powers the OPS-Agent-Desktop application, enabling autonomous operations
missions with browser automation, root cause analysis, and secure action execution.

## Features
- **Mission Management**: Create and monitor autonomous ops missions
- **Real-time Updates**: Stream mission progress and steps
- **Authentication**: JWT-based authentication with role-based access control
- **Rate Limiting**: Protection against API abuse
- **Secure by Default**: CORS, Helmet, input sanitization

## Integration
Part of the Autonomous Operations ecosystem:
- [AutoRCA-Core](https://github.com/nik-kale/AutoRCA-Core) - Graph-based root cause analysis
- [Secure-MCP-Gateway](https://github.com/nik-kale/Secure-MCP-Gateway) - Policy-based action approval
      `,
      contact: {
        name: 'API Support',
        url: 'https://github.com/nik-kale/OPS-Agent-Desktop',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
      {
        url: 'https://api.ops-agent.example.com',
        description: 'Production server (example)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
      schemas: {
        Mission: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique mission identifier',
            },
            prompt: {
              type: 'string',
              description: 'User-provided mission prompt',
              example: 'Diagnose 500 errors on checkout service',
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'AWAITING_APPROVAL'],
              description: 'Current mission status',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Mission creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
            steps: {
              type: 'array',
              items: { $ref: '#/components/schemas/MissionStep' },
              description: 'Ordered list of mission execution steps',
            },
            rcaSummary: {
              type: 'string',
              nullable: true,
              description: 'Root cause analysis summary from AutoRCA-Core',
            },
            remediationProposal: {
              type: 'string',
              nullable: true,
              description: 'Proposed remediation actions',
            },
          },
        },
        MissionStep: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
            type: {
              type: 'string',
              enum: ['OBSERVATION', 'ACTION', 'RCA', 'REMEDIATION'],
              description: 'Step type for transparency and auditing',
            },
            message: {
              type: 'string',
              description: 'Human-readable step description',
            },
            screenshotPath: {
              type: 'string',
              nullable: true,
              description: 'Filename of browser screenshot',
            },
            metadata: {
              type: 'object',
              nullable: true,
              description: 'Additional step metadata',
            },
          },
        },
        CreateMissionRequest: {
          type: 'object',
          required: ['prompt'],
          properties: {
            prompt: {
              type: 'string',
              description: 'Mission prompt describing the ops task',
              example: 'Check dashboard for service health and diagnose issues',
              minLength: 1,
            },
          },
        },
        CreateMissionResponse: {
          type: 'object',
          properties: {
            missionId: {
              type: 'string',
              format: 'uuid',
              description: 'ID of the created mission',
            },
          },
        },
        MissionStreamResponse: {
          type: 'object',
          properties: {
            mission: { $ref: '#/components/schemas/Mission' },
            latestScreenshot: {
              type: 'string',
              nullable: true,
              description: 'URL to latest screenshot',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Missions',
        description: 'Mission creation and management endpoints',
      },
      {
        name: 'Health',
        description: 'System health and monitoring',
      },
    ],
  },
  apis: ['./src/api/*.ts', './src/index.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

