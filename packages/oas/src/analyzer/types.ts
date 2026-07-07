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
    commonParameters: OASAnalysisFeature;
    discriminators: OASAnalysisFeature;
    links: OASAnalysisFeature;
    polymorphism: OASAnalysisFeature;
    references: OASAnalysisFeature;
    serverVariables: OASAnalysisFeature;
    style: OASAnalysisFeature;
    xmlRequests: OASAnalysisFeature;
    xmlResponses: OASAnalysisFeature;
    xmlSchemas: OASAnalysisFeature;
    webhooks: OASAnalysisFeature;
  };
}
