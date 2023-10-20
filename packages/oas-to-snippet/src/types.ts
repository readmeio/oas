import type supportedLanguages from './supportedLanguages.js';
import type { ClientId, TargetId } from '@readme/httpsnippet/targets';

export type Language =
  | keyof typeof supportedLanguages
  | [keyof typeof supportedLanguages, ClientId]
  | 'node-simple'
  | 'curl';

export type SupportedTargets = Exclude<TargetId, 'objc'> | 'cplusplus' | 'objectivec';
export type SupportedLanguages = Record<
  SupportedTargets,
  {
    highlight: string;
    httpsnippet: {
      default: ClientId;
      lang: TargetId;
      targets: Record<
        ClientId,
        {
          install?: string;
          name: string;
          opts?: Record<string, unknown>;
        }
      >;
    };
  }
>;
