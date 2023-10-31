import type { SchemaObject } from '../../src/types.js';

const SCHEMA_SCENARIOS = {
  'array of primitives': (props, allowEmptyValue) => {
    return {
      type: 'array',
      items: {
        type: 'string',
        ...props,
        ...(allowEmptyValue !== undefined ? { allowEmptyValue } : {}),
      },
    };
  },

  'array with an array of primitives': (props, allowEmptyValue) => {
    return {
      type: 'array',
      items: {
        type: 'array',
        items: {
          type: 'string',
          ...props,
          ...(allowEmptyValue !== undefined ? { allowEmptyValue } : {}),
        },
      },
    };
  },

  'object with primitives and mixed arrays': (props, allowEmptyValue) => {
    return {
      type: 'object',
      properties: {
        param1: {
          type: 'string',
          ...props,
          ...(allowEmptyValue !== undefined ? { allowEmptyValue } : {}),
        },
        param2: {
          type: 'array',
          items: {
            type: 'array',
            items: {
              type: 'string',
              ...props,
              ...(allowEmptyValue !== undefined ? { allowEmptyValue } : {}),
            },
          },
        },
      },
    };
  },

  'primitive string': (props, allowEmptyValue) => {
    return {
      type: 'string',
      ...props,
      ...(allowEmptyValue !== undefined ? { allowEmptyValue } : {}),
    };
  },

  'mixed primitive': (props, allowEmptyValue) => {
    return {
      type: ['string', 'number'],
      ...props,
      ...(allowEmptyValue !== undefined ? { allowEmptyValue } : {}),
    };
  },
};

function buildSchemaCore(opts: Parameters<typeof generateJSONSchemaFixture>[0] = {}) {
  const props: {
    default?: string | false;
    description?: string;
    example?: unknown;
    examples?: Record<string, unknown>;
    required?: boolean;
  } = {};
  if (typeof opts.default === 'undefined' || opts.default === undefined) {
    // Should not add a default.
  } else if (opts.default === '') {
    props.default = '';
  } else {
    props.default = opts.default ? opts.default : false;
  }

  if (opts.description) {
    props.description = opts.description;
  }

  if (opts.example !== undefined) {
    props.example = opts.example;
  }

  if (opts.examples !== undefined) {
    props.examples = opts.examples;
  }

  if (opts.required !== undefined) {
    props.required = opts.required;
  }

  return props;
}

function generateScenarioName(
  scenario: keyof typeof SCHEMA_SCENARIOS,
  opts: Parameters<typeof generateJSONSchemaFixture>[0] = {},
) {
  const caseOptions: string[] = [];

  if (opts.allowEmptyValue !== undefined) caseOptions.push(`allowEmptyValue[${opts.allowEmptyValue}]`);
  if (opts.default !== undefined) caseOptions.push(`default[${opts.default}]`);
  if (opts.description !== undefined) caseOptions.push(`description[${opts.description}]`);
  if (opts.example !== undefined) caseOptions.push(`example[${opts.example}]`);
  if (opts.examples !== undefined) caseOptions.push(`examples[${opts.examples}]`);
  if (opts.required !== undefined) caseOptions.push(`required[${opts.required}]`);

  return `${scenario}:${caseOptions.join('')}`;
}

export default function generateJSONSchemaFixture(
  opts: {
    allowEmptyValue?: boolean;
    default?: string | false;
    description?: string;
    example?: unknown;
    examples?: Record<string, unknown>;
    required?: boolean;
  } = {},
): SchemaObject {
  const props = buildSchemaCore(opts);
  const schemas: { scenario: string; schema: any }[] = [];

  const getScenario = (scenario: keyof typeof SCHEMA_SCENARIOS, allowEmptyValue?: boolean) => {
    return {
      scenario: generateScenarioName(scenario, { ...opts, allowEmptyValue }),
      schema: SCHEMA_SCENARIOS[scenario](props, allowEmptyValue),
    };
  };

  const getPolymorphismScenario = (
    polyType: string,
    scenario: keyof typeof SCHEMA_SCENARIOS,
    allowEmptyValue?: boolean,
  ) => {
    return {
      scenario: `${polyType}:${generateScenarioName(scenario, { ...opts, allowEmptyValue })}`,
      schema: {
        [polyType]: [
          SCHEMA_SCENARIOS[scenario](props, allowEmptyValue),
          SCHEMA_SCENARIOS[scenario](props, allowEmptyValue),
        ],
      },
    };
  };

  // When `allowEmptyValue` is present, we should make sure we're testing both states. If `true`, we should allow
  // empty string `default` properties through. If `false`, they should ultimately be omitted from the final
  // compilation.
  schemas.push(
    getScenario('array of primitives'),
    getPolymorphismScenario('oneOf', 'array of primitives'),
    getPolymorphismScenario('allOf', 'array of primitives'),
    getPolymorphismScenario('anyOf', 'array of primitives'),

    getScenario('array with an array of primitives'),
    getPolymorphismScenario('oneOf', 'array with an array of primitives'),
    getPolymorphismScenario('allOf', 'array with an array of primitives'),
    getPolymorphismScenario('anyOf', 'array with an array of primitives'),

    getScenario('object with primitives and mixed arrays'),
    getPolymorphismScenario('oneOf', 'object with primitives and mixed arrays'),
    getPolymorphismScenario('allOf', 'object with primitives and mixed arrays'),
    getPolymorphismScenario('anyOf', 'object with primitives and mixed arrays'),

    getScenario('primitive string'),
    getPolymorphismScenario('oneOf', 'primitive string'),
    getPolymorphismScenario('allOf', 'primitive string'),
    getPolymorphismScenario('anyOf', 'primitive string'),

    getScenario('mixed primitive'),
    getPolymorphismScenario('oneOf', 'mixed primitive'),
    getPolymorphismScenario('allOf', 'mixed primitive'),
    getPolymorphismScenario('anyOf', 'mixed primitive'),
  );

  if (opts.allowEmptyValue !== undefined) {
    schemas.push(
      getScenario('array of primitives', true),
      getScenario('array of primitives', false),
      getPolymorphismScenario('oneOf', 'array of primitives', true),
      getPolymorphismScenario('allOf', 'array of primitives', false),
      getPolymorphismScenario('anyOf', 'array of primitives', false),

      getScenario('array with an array of primitives', true),
      getScenario('array with an array of primitives', false),
      getPolymorphismScenario('oneOf', 'array with an array of primitives', true),
      getPolymorphismScenario('allOf', 'array with an array of primitives', false),
      getPolymorphismScenario('anyOf', 'array with an array of primitives', false),

      getScenario('object with primitives and mixed arrays', true),
      getScenario('object with primitives and mixed arrays', false),
      getPolymorphismScenario('oneOf', 'object with primitives and mixed arrays', true),
      getPolymorphismScenario('allOf', 'object with primitives and mixed arrays', false),
      getPolymorphismScenario('anyOf', 'object with primitives and mixed arrays', false),

      getScenario('primitive string', true),
      getScenario('primitive string', false),
      getPolymorphismScenario('oneOf', 'primitive string', true),
      getPolymorphismScenario('allOf', 'primitive string', false),
      getPolymorphismScenario('anyOf', 'primitive string', false),

      getScenario('mixed primitive', true),
      getScenario('mixed primitive', false),
      getPolymorphismScenario('oneOf', 'mixed primitive', true),
      getPolymorphismScenario('allOf', 'mixed primitive', false),
      getPolymorphismScenario('anyOf', 'mixed primitive', false),
    );
  }

  return {
    type: 'object',
    properties: Object.fromEntries(new Map(schemas.map(s => [s.scenario, s.schema]))),
  };
}
