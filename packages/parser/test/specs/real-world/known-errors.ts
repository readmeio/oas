import { expect } from 'vitest';

// type KnownError = { message: (typeof expect)['stringContaining'] | string }[];
interface KnownError {
  // It's **very** difficult to properly type this array because `expect.arrayContaining` and
  // `expect.stringContaining` both are typed to return `any`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: any[];
  total: number;
}

export const knownErrors: Record<string, KnownError> = {
  'amadeus.com:amadeus-hotel-ratings': {
    errors: [
      {
        message:
          'Property `avgHotelAvailabilityResponseTime` is listed as required but does not exist in `/definitions/HotelSentiment`.',
      },
    ],
    total: 1,
  },

  // Autotask has a number of improperly named definitions.
  'autotask.net': {
    errors: expect.arrayContaining([
      { message: expect.stringContaining('Definition names should match against: /^[a-zA-Z0-9.-_]+$/') },
    ]),
    total: 514,
  },

  'avaza.com': {
    errors: [
      {
        message: expect.stringContaining(
          'it must consume `multipart/form-data` or `application/x-www-form-urlencoded`',
        ),
      },
    ],
    total: 1,
  },

  // Many Azure API definitions have endpoints with multiple "location" placeholders or uncompliant
  // schema names.
  'azure.com:azsadmin-Operations': {
    errors: expect.arrayContaining([
      { message: expect.stringContaining('has multiple path placeholders named `{location}`') },
    ]),
    total: 4,
  },
  'azure.com:deviceprovisioningservices-iotdps': {
    errors: [{ message: expect.stringContaining('Definition names should match against: /^[a-zA-Z0-9.-_]+$/') }],
    total: 1,
  },
  'azure.com:labservices-ML': {
    errors: expect.arrayContaining([
      { message: expect.stringContaining('Definition names should match against: /^[a-zA-Z0-9.-_]+$/') },
    ]),
    total: 6,
  },
  'azure.com:migrateprojects-migrate': {
    errors: [{ message: expect.stringContaining('Definition names should match against: /^[a-zA-Z0-9.-_]+$/') }],
    total: 1,
  },
  'azure.com:provisioningservices-iotdps': {
    errors: [{ message: expect.stringContaining('Definition names should match against: /^[a-zA-Z0-9.-_]+$') }],
    total: 1,
  },
  'azure.com:web-service': {
    errors: [{ message: expect.stringContaining('Definition names should match against: /^[a-zA-Z0-9.-_]+$') }],
    total: 1,
  },

  'blazemeter.com': {
    errors: [{ message: expect.stringContaining('Token "blazemeter" does not exist.') }],
    total: 1,
  },

  // Clarify has a number of uncompliant definition names.
  'clarify.io': {
    errors: expect.arrayContaining([
      { message: expect.stringContaining('Definition names should match against: /^[a-zA-Z0-9.-_]+$') },
    ]),
    total: 5,
  },

  'clicksend.com': {
    errors: [{ message: '`/paths/uploads?convert={convert}/post` is missing path parameter(s) for `{convert}`.' }],
    total: 1,
  },

  'cloudmersive.com:ocr': {
    errors: [{ message: expect.stringContaining('Unexpected value, should be equal to one of the allowed values') }],
    total: 1,
  },

  'dnd5eapi.co': {
    errors: [{ message: expect.stringContaining('type must be array') }],
    total: 1,
  },
  'enode.io': {
    errors: [{ message: expect.stringContaining('explode is not expected to be here') }],
    total: 1,
  },

  'frankiefinancial.io': {
    errors: expect.arrayContaining([
      {
        message: expect.stringContaining(
          'Property `rowid` is listed as required but does not exist in `/definitions/UBOResponse`.',
        ),
      },
    ]),
    total: 2,
  },

  'geneea.com': {
    errors: expect.arrayContaining([
      { message: expect.stringContaining('Definition names should match against: /^[a-zA-Z0-9.-_]+$/') },
    ]),
    total: 3,
  },

  'hetras-certification.net:booking': {
    errors: expect.arrayContaining([
      { message: expect.stringContaining('Definition names should match against: /^[a-zA-Z0-9.-_]+$/') },
    ]),
    total: 2,
  },

  'hetras-certification.net:hotel': {
    errors: expect.arrayContaining([
      { message: expect.stringContaining('Definition names should match against: /^[a-zA-Z0-9.-_]+$/') },
    ]),
    total: 4,
  },

  'icons8.com': {
    errors: expect.arrayContaining([{ message: expect.stringContaining('is missing path parameter(s) for `{term}`') }]),
    total: 2,
  },

  'medium.com': {
    errors: expect.arrayContaining([
      { message: expect.stringContaining('is missing path parameter(s) for `{query}`') },
    ]),
    total: 5,
  },

  // Motaword has a `"/continuous_projects/{id}/translate/{targetLanguage}": null` schema property
  // sibling to a `$ref` and `better-ajv-errors` chokes on this currently.
  'motaword.com': {
    errors: expect.arrayContaining([
      {
        message:
          "Couldn't find property  of /paths/~1continuous_projects~1{projectId}~1documents/get/responses/404/content/application~1json/schema//continuous_projects/{id}/translate/{targetLanguage}",
      },
    ]),
    total: 1,
  },

  'naviplancentral.com:plan': {
    errors: expect.arrayContaining([
      { message: expect.stringContaining('Definition names should match against: /^[a-zA-Z0-9.-_]+$/') },
    ]),
    total: 23,
  },

  'opensuse.org:obs': {
    errors: expect.arrayContaining([{ message: expect.stringContaining('example is not expected to be here') }]),
    total: 2,
  },

  'opto22.com:groov': {
    errors: expect.arrayContaining([
      {
        message: expect.stringContaining(
          'Property `isCoreInUse` is listed as required but does not exist in `/definitions/groovInfo`.',
        ),
      },
    ]),
    total: 2,
  },

  'osisoft.com': {
    errors: expect.arrayContaining([
      { message: expect.stringContaining('Definition names should match against: /^[a-zA-Z0-9.-_]+$/') },
    ]),
    total: 53,
  },

  'personio.de:personnel': {
    errors: expect.arrayContaining([{ message: expect.stringContaining('Token "comment" does not exist.') }]),
    total: 1,
  },

  'postmarkapp.com:server': {
    errors: expect.arrayContaining([
      {
        message:
          'Property `TemplateId` is listed as required but does not exist in `/paths/templates/{templateIdOrAlias}/put/parameters/body`.',
      },
    ]),
    total: 2,
  },

  'rebilly.com': {
    errors: expect.arrayContaining([{ message: expect.stringContaining('Token "feature" does not exist.') }]),
    total: 1,
  },

  'royalmail.com:click-and-drop': {
    errors: expect.arrayContaining([{ message: expect.stringContaining('schema is missing here') }]),
    total: 3,
  },

  'semantria.com': {
    errors: [{ message: expect.stringContaining('Definition names should match against: /^[a-zA-Z0-9.-_]+$/') }],
    total: 1,
  },

  'staging-ecotaco.com': {
    errors: [
      {
        message:
          '`/paths/rides?page={page}&per_page={per_page}/post` is missing path parameter(s) for `{page}` and `{per_page}`.',
      },
    ],
    total: 1,
  },

  'statsocial.com': {
    errors: expect.arrayContaining([{ message: expect.stringContaining('Token "18_24" does not exist.') }]),
    total: 1,
  },

  'testfire.net:altoroj': {
    errors: expect.arrayContaining([
      { message: expect.stringContaining('Property `passwrod1` is listed as required but does not exist') },
    ]),
    total: 2,
  },

  'turbinelabs.io': {
    errors: expect.arrayContaining([
      { message: expect.stringContaining('Property `host` is listed as required but does not exist') },
    ]),
    total: 6,
  },

  'vestorly.com': {
    errors: expect.arrayContaining([
      { message: expect.stringContaining('Property `orginator_email` is listed as required but does not exist') },
    ]),
    total: 20,
  },

  'viator.com': {
    errors: expect.arrayContaining([{ message: expect.stringContaining('Token "pas" does not exist') }]),
    total: 1,
  },

  'whapi.com:accounts': {
    errors: expect.arrayContaining([
      { message: expect.stringContaining('Property `nif (italy only)` is listed as required but does not exist') },
    ]),
    total: 2,
  },

  'xero.com:xero_accounting': {
    errors: [{ message: expect.stringContaining('type is not expected to be here') }],
    total: 1,
  },
};
