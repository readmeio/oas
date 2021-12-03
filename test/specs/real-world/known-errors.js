const { host } = require('@jsdevtools/host-environment');

const knownErrors = {
  /**
   * An array of known validation errors in certain API definitions on APIs.guru
   */
  all: getKnownApiErrors(),

  /**
   * Determines whether an API and error match a known error.
   */
  find(api, error) {
    for (const knownError of knownErrors.all) {
      if (typeof knownError.api === 'string' && !api.name.includes(knownError.api)) {
        // eslint-disable-next-line no-continue
        continue;
      }

      if (typeof knownError.error === 'string' && !error.message.includes(knownError.error)) {
        // eslint-disable-next-line no-continue
        continue;
      }

      if (knownError.error instanceof RegExp && !knownError.error.test(error.message)) {
        // eslint-disable-next-line no-continue
        continue;
      }

      return knownError;
    }

    return false;
  },
};

module.exports = knownErrors;

/**
 * Returns a list of known validation errors in certain API definitions on APIs.guru.
 */
function getKnownApiErrors() {
  const errors = [
    // Many of the Azure API definitions have references to external files that don't exist
    // NOTE: This entry must come FIRST, otherwise every broken Azure API is retried multiple times
    {
      api: 'azure.com',
      error: /Error downloading https?:/,
      whatToDo: 'ignore',
    },

    // If the API definition failed to download, then retry
    {
      error: /Error downloading https?:/,
      whatToDo: 'retry',
    },
    {
      error: 'socket hang up',
      whatToDo: 'retry',
    },

    // Many Azure API definitions erroneously reference external files that don't exist
    {
      api: 'azure.com',
      error: /Error downloading .*\.json\s+HTTP ERROR 404/,
      whatToDo: 'ignore',
    },

    // Many Azure API definitions have endpoints with multiple "location" placeholders, which is invalid.
    {
      api: 'azure.com',
      error: 'has multiple path placeholders named {location}',
      whatToDo: 'ignore',
    },

    {
      api: 'avaza.com',
      error: 'has a file parameter, so it must consume multipart/form-data or application/x-www-form-urlencoded',
      whatToDo: 'ignore',
    },

    {
      api: 'adyen.com:CheckoutService',
      error: 'unevaluatedProperties must NOT have unevaluated properties',
      whatToDo: 'ignore',
    },
    {
      api: 'adyen.com:PaymentService',
      error: 'unevaluatedProperties must NOT have unevaluated properties',
      whatToDo: 'ignore',
    },
    {
      api: 'adyen.com:PayoutService',
      error: 'unevaluatedProperties must NOT have unevaluated properties',
      whatToDo: 'ignore',
    },
    {
      api: 'adyen.com:RecurringService',
      error: 'unevaluatedProperties must NOT have unevaluated properties',
      whatToDo: 'ignore',
    },

    // Cloudmersive.com's API definition contains invalid JSON Schema types
    {
      api: 'cloudmersive.com:ocr',
      error: 'ENUM must be equal to one of the allowed values',
      whatToDo: 'ignore',
    },

    // Contribly's API has a misspelled field name
    {
      api: 'contribly.com',
      error: "Property 'includeThumbnail' listed as required but does not exist",
      whatToDo: 'ignore',
    },

    {
      api: 'enode.io',
      error: 'ADDTIONAL PROPERTY must NOT have additional properties',
      whatToDo: 'ignore',
    },
    {
      api: 'frankiefinancial.io',
      error: "Property 'rowid' listed as required but does not exist",
      whatToDo: 'ignore',
    },
    {
      api: 'github.com',
      error: 'Token "0" does not exist',
      whatToDo: 'ignore',
    },
    {
      api: 'github.com',
      error: 'Token "expires_at" does not exist',
      whatToDo: 'ignore',
    },

    // Some Google APIs have a `source` property at the root.
    {
      api: 'googleapis.com',
      error: 'ADDTIONAL PROPERTY must NOT have additional properties',
      whatToDo: 'ignore',
    },

    {
      api: 'motaword.com',
      error: 'descriptipon is not expected to be here',
      whatToDo: 'ignore',
    },
    {
      api: 'openapi-generator.tech',
      error: 'originalRef is not expected to be here!',
      whatToDo: 'ignore',
    },
    {
      api: 'opensuse.org',
      error: 'example is not expected to be here!',
      whatToDo: 'ignore',
    },

    // Missing a required field
    {
      api: 'opto22.com:groov',
      error: "Property 'isCoreInUse' listed as required but does not exist",
      whatToDo: 'ignore',
    },

    {
      api: 'personio.de',
      error: 'Token "comment" does not exist',
      whatToDo: 'ignore',
    },

    // Missing a required field
    {
      api: 'postmarkapp.com:server',
      error: "Property 'TemplateId' listed as required but does not exist",
      whatToDo: 'ignore',
    },

    {
      api: 'rebilly.com',
      error: 'Token "feature" does not exist',
      whatToDo: 'ignore',
    },
    {
      api: 'statsocial.com',
      error: 'Token "18_24" does not exist',
      whatToDo: 'ignore',
    },
    {
      api: 'testfire.net:altoroj',
      error: "Property 'passwrod1' listed as required but does not exist",
      whatToDo: 'ignore',
    },
    {
      api: 'turbinelabs.io',
      error: "Property 'listener_key' listed as required but does not exist",
      whatToDo: 'ignore',
    },

    // VersionEye's API definition is missing MIME types
    {
      api: 'versioneye.com',
      error: 'has a file parameter, so it must consume multipart/form-data or application/x-www-form-urlencoded',
      whatToDo: 'ignore',
    },

    {
      api: 'vestorly.com',
      error: "Property 'orginator_email' listed as required but does not exist",
      whatToDo: 'ignore',
    },
    {
      api: 'viator.com',
      error: 'Token "pas" does not exist',
      whatToDo: 'ignore',
    },
    {
      api: 'whapi.com:accounts',
      error: "Property 'nif (italy only)' listed as required but does not exist",
      whatToDo: 'ignore',
    },
    {
      api: 'xero.com:xero_accounting',
      error: 'type is not expected to be here',
      whatToDo: 'ignore',
    },
  ];

  if ((host.node && host.node.version < 8) || (host.browser && !host.browser.chrome)) {
    // Many AWS APIs contain RegEx patterns that are invalid on older versions of Node
    // and some browsers. They work fine on Node 8+ and Chrome though.
    //
    // Examples of problematic RegExp include:
    //    ^[0-9A-Za-z\.\-_]*(?<!\.)$
    //    jdbc:(redshift|postgresql)://((?!-)[A-Za-z0-9-]{1,63}(?<!-)\.)+redshift\.amazonaws\.com:\d{1,5}/[a-zA-Z0-9_$]+
    //
    errors.push({
      api: 'amazonaws.com',
      error: "Object didn't pass validation for format regex",
      whatToDo: 'ignore',
    });
  }

  return errors;
}
