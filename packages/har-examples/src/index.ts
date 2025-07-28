import type { Har } from 'har-format';

import application_form_encoded from './application-form-encoded.har.js';
import application_json from './application-json.har.js';
import application_zip from './application-zip.har.js';
import cookies from './cookies.har.js';
import full from './full.har.js';
import headers from './headers.har.js';
import https from './https.har.js';
import image_png from './image-png.har.js';
import image_png_no_filename from './image-png-no-filename.har.js';
import jsonObj_multiline from './jsonObj-multiline.har.js';
import jsonObj_null_value from './jsonObj-null-value.har.js';
import multipart_data from './multipart-data.har.js';
import multipart_data_dataurl from './multipart-data-dataurl.har.js';
import multipart_file from './multipart-file.har.js';
import multipart_form_data from './multipart-form-data.har.js';
import query from './query.har.js';
import query_encoded from './query-encoded.har.js';
import short from './short.har.js';
import text_plain from './text-plain.har.js';
import xml from './xml.har.js';

const examples = {
  'application-form-encoded': application_form_encoded satisfies Har as Har,
  'application-json': application_json satisfies Har as Har,
  'application-zip': application_zip satisfies Har as Har,
  cookies: cookies satisfies Har as Har,
  full: full satisfies Har as Har,
  headers: headers satisfies Har as Har,
  https: https satisfies Har as Har,
  'image-png-no-filename': image_png_no_filename satisfies Har as Har,
  'image-png': image_png satisfies Har as Har,
  'jsonObj-multiline': jsonObj_multiline satisfies Har as Har,
  'jsonObj-null-value': jsonObj_null_value satisfies Har as Har,
  'multipart-data-dataurl': multipart_data_dataurl satisfies Har as Har,
  'multipart-data': multipart_data satisfies Har as Har,
  'multipart-file': multipart_file satisfies Har as Har,
  'multipart-form-data': multipart_form_data satisfies Har as Har,
  'query-encoded': query_encoded satisfies Har as Har,
  query: query satisfies Har as Har,
  short: short satisfies Har as Har,
  'text-plain': text_plain satisfies Har as Har,
  xml: xml satisfies Har as Har,
};

export default examples;
