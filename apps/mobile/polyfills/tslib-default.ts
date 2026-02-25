// Ensures that consumers expecting a default export from 'tslib'
// (e.g., transpiled vendor ESM with default import) will work under Metro/Babel.
// Some bundles access `_tslib.default.__extends` which would be undefined
// if the environment returns the namespace object without a default.
// We safely assign `default` to the namespace when missing.
import * as tslibNS from 'tslib';
export * from 'tslib';

const ns: any = tslibNS as any;
if (ns && typeof ns === 'object' && (!('default' in ns) || !ns.default)) {
  ns.default = ns;
}

export default ns;


