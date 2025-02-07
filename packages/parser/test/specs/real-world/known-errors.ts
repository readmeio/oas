interface KnownError {
  api: string;
  error: RegExp | string;
}

const knownErrors: KnownError[] = [
  {
    api: 'autotask.net',
    error: '/definitions/Expression[Func[AccountAlert,Int64]] has an invalid name',
  },

  // Many Azure API definitions erroneously reference external files that don't exist
  {
    api: 'azure.com',
    error: /Error downloading .*\.json\s+HTTP ERROR 404/,
  },

  // Many Azure API definitions have endpoints with multiple "location" placeholders, which is invalid.
  {
    api: 'azure.com',
    error: 'has multiple path placeholders named {location}',
  },

  {
    api: 'azure.com:deviceprovisioningservices-iotdps',
    error: 'Definition names should match against: /^[a-zA-Z0-9.-_]+$/',
  },

  {
    api: 'azure.com:labservices-ML',
    error: 'Definition names should match against: /^[a-zA-Z0-9.-_]+$/',
  },

  {
    api: 'azure.com:migrateprojects-migrate',
    error: 'Definition names should match against: /^[a-zA-Z0-9.-_]+$/',
  },

  {
    api: 'azure.com:provisioningservices-iotdps',
    error: 'Definition names should match against: /^[a-zA-Z0-9.-_]+$/',
  },

  {
    api: 'azure.com:web-service',
    error: 'Definition names should match against: /^[a-zA-Z0-9.-_]+$/',
  },

  {
    api: 'avaza.com',
    error: 'has a file parameter, so it must consume multipart/form-data or application/x-www-form-urlencoded',
  },

  {
    api: 'adyen.com:CheckoutService',
    error: 'source is not expected to be here',
  },
  {
    api: 'adyen.com:PaymentService',
    error: 'source is not expected to be here',
  },
  {
    api: 'adyen.com:PayoutService',
    error: 'source is not expected to be here',
  },
  {
    api: 'adyen.com:RecurringService',
    error: 'source is not expected to be here',
  },
  {
    api: 'amadeus.com:amadeus-hotel-ratings',
    error:
      "Property 'avgHotelAvailabilityResponseTime' listed as required but does not exist in '/definitions/HotelSentiment'",
  },
  {
    api: 'billbee.io',
    error: 'Definition names should match against: /^[a-zA-Z0-9.-_]+$/',
  },
  {
    api: 'blazemeter.com',
    error: 'Definition names should match against: /^[a-zA-Z0-9.-_]+$/',
  },
  {
    api: 'clarify.io',
    error: 'Definition names should match against: /^[a-zA-Z0-9.-_]+$/',
  },
  {
    api: 'clicksend.com',
    error: '/paths/uploads?convert={convert}/post is missing path parameter(s) for {convert}',
  },

  // Cloudmersive.com's API definition contains invalid JSON Schema types
  {
    api: 'cloudmersive.com:ocr',
    error: 'ENUM must be equal to one of the allowed values',
  },

  // Contribly's API has a misspelled field name
  {
    api: 'contribly.com',
    error: "Property 'includeThumbnail' listed as required but does not exist",
  },

  {
    api: 'dnd5eapi.co',
    error: 'TYPE must be array',
  },
  {
    api: 'enode.io',
    error: 'explode is not expected to be here',
  },
  {
    api: 'frankiefinancial.io',
    error: "Property 'rowid' listed as required but does not exist",
  },
  {
    api: 'geneea.com',
    error: 'Definition names should match against: /^[a-zA-Z0-9.-_]+$/',
  },
  {
    api: 'github.com',
    error: 'Token "0" does not exist',
  },
  {
    api: 'github.com',
    error: 'Token "expires_at" does not exist',
  },

  // Some Google APIs have a `source` property at the root.
  {
    api: 'googleapis.com',
    error: 'source is not expected to be here',
  },

  {
    api: 'hetras-certification.net:booking',
    error: 'Definition names should match against: /^[a-zA-Z0-9.-_]+$/',
  },
  {
    api: 'hetras-certification.net:hotel',
    error: 'Definition names should match against: /^[a-zA-Z0-9.-_]+$/',
  },
  {
    api: 'icons8.com',
    error:
      '/paths/api/iconsets/v3/latest?term={term}&amount={amount}&offset={offset}&platform={platform}&language={language}/get is missing path parameter(s) for {term}',
  },
  {
    api: 'motaword.com',
    error: 'descriptipon is not expected to be here',
  },
  {
    api: 'naviplancentral.com:plan',
    error: 'Definition names should match against: /^[a-zA-Z0-9.-_]+$/',
  },
  {
    api: 'openapi-generator.tech',
    error: 'originalRef is not expected to be here!',
  },
  {
    api: 'opensuse.org',
    error: 'example is not expected to be here!',
  },

  // Missing a required field
  {
    api: 'opto22.com:groov',
    error: "Property 'isCoreInUse' listed as required but does not exist",
  },

  {
    api: 'osisoft.com',
    error: '/definitions/Item[Attribute] has an invalid name',
  },
  {
    api: 'parliament.uk',
    error: '/definitions/ResourceCollection[BusinessItem] has an invalid name',
  },
  {
    api: 'personio.de',
    error: 'Token "comment" does not exist',
  },

  // Missing a required field
  {
    api: 'postmarkapp.com:server',
    error: "Property 'TemplateId' listed as required but does not exist",
  },

  {
    api: 'rebilly.com',
    error: 'Token "feature" does not exist',
  },
  {
    api: 'semantria.com',
    error: '/definitions/Request class has an invalid name',
  },
  {
    api: 'staging-ecotaco.com',
    error: '/paths/rides?page={page}&per_page={per_page}/post is missing path parameter(s) for {page},{per_page}',
  },
  {
    api: 'statsocial.com',
    error: 'Token "18_24" does not exist',
  },
  {
    api: 'testfire.net:altoroj',
    error: "Property 'passwrod1' listed as required but does not exist",
  },
  {
    api: 'turbinelabs.io',
    error: "Property 'listener_key' listed as required but does not exist",
  },

  // VersionEye's API definition is missing MIME types
  {
    api: 'versioneye.com',
    error: 'has a file parameter, so it must consume multipart/form-data or application/x-www-form-urlencoded',
  },

  {
    api: 'vestorly.com',
    error: "Property 'orginator_email' listed as required but does not exist",
  },
  {
    api: 'viator.com',
    error: 'Token "pas" does not exist',
  },
  {
    api: 'wedpax.com',
    error: '/definitions/ListResultDto[PermissionDto] has an invalid name',
  },
  {
    api: 'whapi.com:accounts',
    error: "Property 'nif (italy only)' listed as required but does not exist",
  },
  {
    api: 'xero.com:xero_accounting',
    error: 'type is not expected to be here',
  },
];

/**
 * Determines whether an API and error match a known error.
 *
 */
export function isKnownError(api: string, error: Error) {
  for (const knownError of knownErrors) {
    if (typeof knownError.api === 'string' && !api.includes(knownError.api)) {
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
}
