import application_form_encoded from './application-form-encoded.har.js';
import application_json from './application-json.har.js';
import application_zip from './application-zip.har.js';
import cookies from './cookies.har.js';
import full from './full.har.js';
import headers from './headers.har.js';
import https from './https.har.js';
import image_png_no_filename from './image-png-no-filename.har.js';
import image_png from './image-png.har.js';
import jsonObj_multiline from './jsonObj-multiline.har.js';
import jsonObj_null_value from './jsonObj-null-value.har.js';
import multipart_data_dataurl from './multipart-data-dataurl.har.js';
import multipart_data from './multipart-data.har.js';
import multipart_file from './multipart-file.har.js';
import multipart_form_data from './multipart-form-data.har.js';
import query_encoded from './query-encoded.har.js';
import query from './query.har.js';
import short from './short.har.js';
import text_plain from './text-plain.har.js';
import xml from './xml.har.js';

const examples = {
  'application-form-encoded': application_form_encoded,
  'application-json': application_json,
  'application-zip': application_zip,
  cookies,
  full,
  headers,
  https,
  'image-png-no-filename': image_png_no_filename,
  'image-png': image_png,
  'jsonObj-multiline': jsonObj_multiline,
  'jsonObj-null-value': jsonObj_null_value,
  'multipart-data-dataurl': multipart_data_dataurl,
  'multipart-data': multipart_data,
  'multipart-file': multipart_file,
  'multipart-form-data': multipart_form_data,
  'query-encoded': query_encoded,
  query,
  short,
  'text-plain': text_plain,
  xml,
};

export default examples;
