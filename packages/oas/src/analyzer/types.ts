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
    dereferencedFileSize: OASAnalysisGeneral;
    mediaTypes: OASAnalysisGeneral;
    operationTotal: OASAnalysisGeneral;
    rawFileSize: OASAnalysisGeneral;
    securityTypes: OASAnalysisGeneral;
  };
  openapi: {
    additionalProperties: OASAnalysisFeature;
    callbacks: OASAnalysisFeature;
    circularRefs: OASAnalysisFeature;
    commonParameters: OASAnalysisFeature;
    discriminators: OASAnalysisFeature;
    links: OASAnalysisFeature;
    polymorphism: OASAnalysisFeature;
    refNames: OASAnalysisFeature;
    serverVariables: OASAnalysisFeature;
    style: OASAnalysisFeature;
    xmlRequests: OASAnalysisFeature;
    xmlResponses: OASAnalysisFeature;
    xmlSchemas: OASAnalysisFeature;
    webhooks: OASAnalysisFeature;
  };
}
