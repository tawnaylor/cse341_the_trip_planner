// OWNER: Jacquelyn Kulmus
// Generates Swagger documentation from the project's routes

const swaggerAutogen = require('swagger-autogen')();
const fs = require('fs');
const path = require('path');

const id = {
  type: 'string',
  pattern: '^[a-fA-F0-9]{24}$'
};

const activityFields = {
  title: {
    type: 'string',
    minLength: 1,
    pattern: '\\S',
    description: 'Required. Must contain non-whitespace text'
  },
  description: {
    type: 'string',
    description: 'Optional activity details'
  },
  date: {
    type: 'string',
    format: 'date',
    description:
      'Optional YYYY-MM-DD date within the trip dates, using UTC calendar days'
  },
  estimatedCost: {
    type: 'number',
    minimum: 0,
    description: 'Optional estimated cost in the agreed trip currency'
  }
};

const doc = {
  info: {
    title: 'Group Trip Planner API',
    version: '1.0.0',
    description:
      'Activities CRUD and voting for group trips. Protected routes require a signed-in ' +
      'session. Authentication integration is still pending; Activities ' +
      'return 401 until a valid session is available'
  },

  consumes: ['application/json'],
  produces: ['application/json'],

  tags: [
    {
      name: 'Activities',
      description: 'Create, view, update, delete, and vote on trip activities'
    }
  ],

  // Use standard Swagger schemas without automatic schema conversion
  '@definitions': {
    ActivityInput: {
      type: 'object',
      required: ['title'],
      additionalProperties: false,
      properties: activityFields,
      example: {
        title: 'Visit the night market',
        description: 'Explore the food stalls together',
        estimatedCost: 15
      }
    },

    Activity: {
      type: 'object',
      required: [
        '_id',
        'tripId',
        'proposedBy',
        'title',
        'votes',
        'status'
      ],
      properties: {
        ...activityFields,
        _id: id,
        tripId: id,
        proposedBy: id,
        votes: {
          type: 'array',
          items: id,
          uniqueItems: true
        },
        status: {
          type: 'string',
          enum: ['proposed', 'selected', 'rejected']
        }
      }
    },

    VoteResult: {
      type: 'object',
      required: ['message', 'activityId', 'voted', 'voteCount'],
      properties: {
        message: { type: 'string' },
        activityId: id,
        voted: { type: 'boolean', description: 'Whether you have a vote after this request' },
        voteCount: { type: 'integer', minimum: 0 }
      },
      example: {
        message: 'Vote added',
        activityId: '67a123456789abcdef000003',
        voted: true,
        voteCount: 1
      }
    },

    Message: {
      type: 'object',
      required: ['message'],
      properties: {
        message: {
          type: 'string'
        }
      }
    },

    Error: {
      type: 'object',
      required: ['message'],
      properties: {
        message: {
          type: 'string'
        },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: {
                type: 'string'
              },
              message: {
                type: 'string'
              }
            }
          }
        }
      }
    }
  }
};

async function generate() {
  const outputFile = path.join(__dirname, 'swagger-generated.json');
  const routeFiles = [path.join(__dirname, 'server.js')];

  const result = await swaggerAutogen(outputFile, routeFiles, doc);

  if (!result || !result.success) {
    throw new Error('Swagger generation failed.');
  }

  const generated = JSON.parse(
    fs.readFileSync(outputFile, 'utf8')
  );

  // Supports both local previews and the deployed app
  delete generated.host;
  delete generated.schemes;

  const activityPaths = [
    '/trips/{tripId}/activities',
    '/trips/{tripId}/activities/{activityId}',
    '/trips/{tripId}/activities/{activityId}/vote'
  ];

  const errorResponses = {
    400:
      'Invalid request, activity date outside the trip dates, ' +
      'or trip not open for planning.',
    401: 'Sign in is required.',
    403:
      'Not a trip member, or not permitted to change this activity',
    404: 'Trip or activity not found',
    500: 'An unexpected server or database error occurred'
  };

  const successDescriptions = {
    200: 'Successful request',
    201: 'Activity created',
    204: 'Activity deleted. No response body'
  };

  for (const [route, operations] of Object.entries(generated.paths)) {
    if (!activityPaths.includes(route)) {
      continue;
    }

    for (const method of ['get', 'post', 'put', 'delete']) {
      const operation = operations[method];

      if (!operation) {
        continue;
      }

      // These endpoints accept path parameters and JSON bodies
      operation.parameters = (operation.parameters || []).filter(
        (parameter) =>
          parameter.in === 'path' || (parameter.in === 'body' && !route.endsWith('/vote'))
      );

      // Describe MongoDB IDs consistently
      for (const parameter of operation.parameters) {
        if (parameter.in === 'path') {
          Object.assign(parameter, id, { required: true });
        }
      }

      let successStatus = '200';

      if (method === 'post') {
        successStatus = '201';
      } else if (method === 'delete') {
        successStatus = '204';
      }

      // Preserve the success schema supplied by the route comments
      const successResponse =
        operation.responses?.[successStatus] || {
          description: successDescriptions[successStatus]
        };

      operation.responses = {
        [successStatus]: successResponse
      };

      // Add shared errors without repeating them in every route
      for (const [status, description] of Object.entries(errorResponses)) {
        operation.responses[status] = {
          description,
          schema: {
            $ref: '#/definitions/Error'
          }
        };
      }
    }
  }

  fs.writeFileSync(
    outputFile,
    JSON.stringify(generated, null, 2) + '\n'
  );

  console.log('Updated swagger-generated.json');
}

generate().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});