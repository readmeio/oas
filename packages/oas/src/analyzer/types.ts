export interface OASAnalysisFeature {
  locations: string[];
  present: boolean;
}

export interface OASAnalysisGeneral {
  found: string[] | number;
  name: string;
}

export interface OASAnalysis {
  general: {
    mediaTypes: OASAnalysisGeneral;
    operationTotal: OASAnalysisGeneral;
    securityTypes: OASAnalysisGeneral;
  };
  openapi: {
    additionalProperties: OASAnalysisFeature;
    callbacks: OASAnalysisFeature;
    circularRefs: OASAnalysisFeature;
    discriminators: OASAnalysisFeature;
    links: OASAnalysisFeature;
    polymorphism: OASAnalysisFeature;
    serverVariables: OASAnalysisFeature;
    style: OASAnalysisFeature;
    webhooks: OASAnalysisFeature;
    xml: OASAnalysisFeature;
  };
  readme: {
    /**
     * RAW_BODY is specific to our Manual API editor and we don't recommend anyone writing their
     * own API definition should use it so this is considered deprecated.
     */
    raw_body?: OASAnalysisFeature;
    'x-default': OASAnalysisFeature;
    'x-readme.code-samples': OASAnalysisFeature;
    'x-readme.explorer-enabled': OASAnalysisFeature;
    'x-readme.headers': OASAnalysisFeature;
    'x-readme.proxy-enabled': OASAnalysisFeature;

    /**
     * This extension is deprecated.
     */
    'x-readme.samples-enabled'?: OASAnalysisFeature;

    'x-readme.samples-languages'?: OASAnalysisFeature;
  };
}
