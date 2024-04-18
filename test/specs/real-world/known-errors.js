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

    {
      api: 'autotask.net',
      error: '/definitions/Expression[Func[AccountAlert,Int64]] has an invalid name',
      whatToDo: 'ignore',
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
      api: 'azure.com:deviceprovisioningservices-iotdps',
      error: 'Definition names should match against: /^[a-zA-Z0-9.-_]+$/',
      whatToDo: 'ignore',
    },

    {
      api: 'azure.com:labservices-ML',
      error: 'Definition names should match against: /^[a-zA-Z0-9.-_]+$/',
      whatToDo: 'ignore',
    },

    {
      api: 'azure.com:migrateprojects-migrate',
      error: 'Definition names should match against: /^[a-zA-Z0-9.-_]+$/',
      whatToDo: 'ignore',
    },

    {
      api: 'azure.com:provisioningservices-iotdps',
      error: 'Definition names should match against: /^[a-zA-Z0-9.-_]+$/',
      whatToDo: 'ignore',
    },

    {
      api: 'azure.com:web-service',
      error: 'Definition names should match against: /^[a-zA-Z0-9.-_]+$/',
      whatToDo: 'ignore',
    },

    {
      api: 'avaza.com',
      error: 'has a file parameter, so it must consume multipart/form-data or application/x-www-form-urlencoded',
      whatToDo: 'ignore',
    },

    {
      api: 'adyen.com:CheckoutService',
      error: 'source is not expected to be here',
      whatToDo: 'ignore',
    },
    {
      api: 'adyen.com:PaymentService',
      error: 'source is not expected to be here',
      whatToDo: 'ignore',
    },
    {
      api: 'adyen.com:PayoutService',
      error: 'source is not expected to be here',
      whatToDo: 'ignore',
    },
    {
      api: 'adyen.com:RecurringService',
      error: 'source is not expected to be here',
      whatToDo: 'ignore',
    },
    {
      api: 'amadeus.com:amadeus-hotel-ratings',
      error:
        "Property 'avgHotelAvailabilityResponseTime' listed as required but does not exist in '/definitions/HotelSentiment'",
      whatToDo: 'ignore',
    },
    {
      api: 'billbee.io',
      error: 'Definition names should match against: /^[a-zA-Z0-9.-_]+$/',
      whatToDo: 'ignore',
    },
    {
      api: 'blazemeter.com',
      error: 'Definition names should match against: /^[a-zA-Z0-9.-_]+$/',
      whatToDo: 'ignore',
    },
    {
      api: 'clarify.io',
      error: 'Definition names should match against: /^[a-zA-Z0-9.-_]+$/',
      whatToDo: 'ignore',
    },
    {
      api: 'clicksend.com',
      error: '/paths/uploads?convert={convert}/post is missing path parameter(s) for {convert}',
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
      api: 'dnd5eapi.co',
      error: 'TYPE must be array',
      whatToDo: 'ignore',
    },
    {
      api: 'enode.io',
      error: 'explode is not expected to be here',
      whatToDo: 'ignore',
    },
    {
      api: 'frankiefinancial.io',
      error: "Property 'rowid' listed as required but does not exist",
      whatToDo: 'ignore',
    },
    {
      api: 'geneea.com',
      error: 'Definition names should match against: /^[a-zA-Z0-9.-_]+$/',
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
      error: 'source is not expected to be here',
      whatToDo: 'ignore',
    },

    {
      api: 'hetras-certification.net:booking',
      error: 'Definition names should match against: /^[a-zA-Z0-9.-_]+$/',
      whatToDo: 'ignore',
    },
    {
      api: 'hetras-certification.net:hotel',
      error: 'Definition names should match against: /^[a-zA-Z0-9.-_]+$/',
      whatToDo: 'ignore',
    },
    {
      api: 'icons8.com',
      error:
        '/paths/api/iconsets/v3/latest?term={term}&amount={amount}&offset={offset}&platform={platform}&language={language}/get is missing path parameter(s) for {term}',
      whatToDo: 'ignore',
    },
    {
      api: 'motaword.com',
      error: 'descriptipon is not expected to be here',
      whatToDo: 'ignore',
    },
    {
      api: 'naviplancentral.com:plan',
      error: 'Definition names should match against: /^[a-zA-Z0-9.-_]+$/',
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
      api: 'osisoft.com',
      error: '/definitions/Item[Attribute] has an invalid name',
      whatToDo: 'ignore',
    },
    {
      api: 'parliament.uk',
      error: '/definitions/ResourceCollection[BusinessItem] has an invalid name',
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
      api: 'semantria.com',
      error: '/definitions/Request class has an invalid name',
      whatToDo: 'ignore',
    },
    {
      api: 'staging-ecotaco.com',
      error: '/paths/rides?page={page}&per_page={per_page}/post is missing path parameter(s) for {page},{per_page}',
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
      api: 'wedpax.com',
      error: '/definitions/ListResultDto[PermissionDto] has an invalid name',
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

  return errors;
}
