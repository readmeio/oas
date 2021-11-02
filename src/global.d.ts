// @todo pull these iunto rmoas.types
type primitive = string | number;

interface User {
  [key: string]: unknown;
  keys?: Array<{
    name: primitive;
    user?: primitive;
    pass?: primitive;
    [key: string]: unknown;
  }>;
}
