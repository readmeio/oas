export namespace Postman {}

export namespace PostmanV2 {
  export interface Collection {
    auth?: AuthObject | null;
    event?: EventListObject;
    info: InfoObject;
    item: (ItemGroupObject | ItemObject)[];
    protocolProfileBehavior?: ProtocolProfileBehaviorObject;
    variable?: VariableListObject;
  }

  export interface AuthObject {
    apikey?: object;
    awsv4?: object;
    basic?: object;
    bearer?: object;
    digest?: object;
    edgegrid?: object;
    hawk?: object;
    noauth?: never;
    ntlm?: object;
    oauth1?: object;
    oauth2?: object;
    type:
      | 'apikey'
      | 'awsv4'
      | 'basic'
      | 'bearer'
      | 'digest'
      | 'edgegrid'
      | 'hawk'
      | 'noauth'
      | 'ntlm'
      | 'oauth1'
      | 'oauth2';
  }

  export type CertificateListObject = CertificateObject[];

  export interface CertificateObject {
    cert?: {
      src: string;
    };
    key?: {
      src: string;
    };
    matches: string[];
    name?: string;
    passphrase?: string;
  }

  export type CookieListObject = CookieObject[];

  export interface CookieObject {
    domain: string;
    expires?: string | null;
    extensions?: any[];
    hostOnly?: boolean;
    httpOnly?: boolean;
    maxAge?: string;
    name?: string;
    path: string;
    secure?: boolean;
    session?: boolean;
    value?: string;
  }

  export type DescriptionObject =
    | string
    | {
        content?: string;
        type?: string;
        version?: string;
      }
    | null;

  export type EventListObject = EventObject[];

  export interface EventObject {
    disabled?: boolean;
    id?: string;
    listen: string;
    script?: ScriptObject;
  }

  export type HeaderListObject = HeaderObject[];

  export interface HeaderObject {
    description?: DescriptionObject;
    disabled?: boolean;
    key: string;
    value: string;
  }

  export interface InfoObject {
    _postman_id?: string;
    description?: DescriptionObject;
    name: string;
    schema: string;
    version?: VersionObject;
  }

  export interface ItemGroupObject {
    auth?: AuthObject | null;
    description?: DescriptionObject;
    event?: EventListObject;
    item?: (ItemGroupObject | ItemObject)[];
    name: string;
    protocolProfileBehavior: ProtocolProfileBehaviorObject;
    variable?: VariableListObject;
  }

  export interface ItemObject {
    description?: DescriptionObject;
    event?: EventListObject;
    id?: string;
    name?: string;
    protocolProfileBehavior?: ProtocolProfileBehaviorObject;
    request: RequestObject;
    response?: ResponseObject[];
    variable?: VariableListObject;
  }

  export interface ProtocolProfileBehaviorObject {}

  export interface ProxyConfigObject {
    disabled?: boolean;
    host?: string;
    match?: string;
    port?: number;
    tunnel?: boolean;
  }

  export type RequestObject =
    | string
    | {
        auth: AuthObject | null;
        body: {
          disabled: boolean;
          file: {
            content?: string;
            src?: string | null;
          };
          formdata: FormParameter[];
          graphql?: object;
          mode?: 'file' | 'formdata' | 'graphql' | 'raw' | 'urlencoded';
          options: object;
          raw?: 'string';
          urlencoded: {
            description?: DescriptionObject;
            disabled?: boolean;
            key: string;
            value?: string;
          }[];
        } | null;
        certificate: CertificateObject;
        description: DescriptionObject;
        header: HeaderListObject | string;
        method:
          | string
          | 'COPY'
          | 'DELETE'
          | 'GET'
          | 'HEAD'
          | 'LINK'
          | 'LOCK'
          | 'OPTIONS'
          | 'PATCH'
          | 'POST'
          | 'PROPFIND'
          | 'PURGE'
          | 'PUT'
          | 'UNLINK'
          | 'UNLOCK'
          | 'VIEW';
        proxy: ProxyConfigObject;
        url: UrlObject;
      };

  export interface ResponseObject {
    body?: 'null' | 'string';
    code?: number;
    cookie?: CookieObject[];
    header?: (HeaderObject | string)[] | string | null;
    id?: string;
    originalRequest?: RequestObject;
    responseTime?: number | string | null;
    status?: string;
    timings?: object | null;
  }

  export interface ScriptObject {
    exec?: string[] | string;
    id?: string;
    name?: string;
    src?: UrlObject;
    type?: string;
  }

  export type UrlObject =
    | string
    | {
        hash: string;
        host: string[] | string;
        path: (string | { type: string; value: string })[] | string;
        port: string;
        protocol: string;
        query: {
          description: DescriptionObject;
          disabled: boolean;
          key: string | null;
          value: string | null;
        }[];
        raw: string;
        variable: VariableObject[];
      };

  export type VariableListObject = VariableObject[];

  export type VariableObject =
    | {
        description?: DescriptionObject;
        disabled?: boolean;
        id: string;
        key: string;
        name?: string;
        system?: boolean;
        type?: any | boolean | number | string;
        value?: string;
      }
    | {
        description?: DescriptionObject;
        disabled?: boolean;
        id: string;
        key?: string;
        name?: string;
        system?: boolean;
        type?: any | boolean | number | string;
        value?: string;
      }
    | {
        description?: DescriptionObject;
        disabled?: boolean;
        id?: string;
        key: string;
        name?: string;
        system?: boolean;
        type?: any | boolean | number | string;
        value?: string;
      };

  export type VersionObject =
    | string
    | {
        identifier?: string;
        major: number;
        meta?: object;
        minor: number;
        patch: number;
      };

  export type FormParameter =
    | {
        contentType?: string;
        description?: DescriptionObject;
        disabled?: boolean;
        key: string;
        src?: 'array' | 'null' | 'string';
        type?: 'file';
      }
    | {
        contentType?: string;
        description?: DescriptionObject;
        disabled?: boolean;
        key: string;
        type?: 'text';
        value?: string;
      };
}
