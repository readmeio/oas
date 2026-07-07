// oxlint-disable perfectionist/sort-interfaces
export const AnalyzerQueries = [
  // General
  'mediaTypes',
  'operationTotal',
  'securityTypes',

  // OpenAPI
  'additionalProperties',
  'callbacks',
  'circularRefs',
  'commonParameters',
  'discriminators',
  'links',
  'style',
  'polymorphism',
  'references',
  'serverVariables',
  'xmlRequests',
  'xmlResponses',
  'xmlSchemas',
  'webhooks',
] as const;

export type AnalyzerQuery = (typeof AnalyzerQueries)[number];

export interface OASAnalysisFeature {
  locations: string[];
  present: boolean;
}

export interface OASAnalysisGeneral {
  found: string[] | number;
  name: string;
}

export interface OASAnalysis {
  // General
  mediaTypes?: OASAnalysisGeneral;
  operationTotal?: OASAnalysisGeneral;
  securityTypes?: OASAnalysisGeneral;

  // OpenAPI
  additionalProperties?: OASAnalysisFeature;
  callbacks?: OASAnalysisFeature;
  circularRefs?: OASAnalysisFeature;
  commonParameters?: OASAnalysisFeature;
  discriminators?: OASAnalysisFeature;
  links?: OASAnalysisFeature;
  polymorphism?: OASAnalysisFeature;
  references?: OASAnalysisFeature;
  serverVariables?: OASAnalysisFeature;
  style?: OASAnalysisFeature;
  xmlRequests?: OASAnalysisFeature;
  xmlResponses?: OASAnalysisFeature;
  xmlSchemas?: OASAnalysisFeature;
  webhooks?: OASAnalysisFeature;
}
