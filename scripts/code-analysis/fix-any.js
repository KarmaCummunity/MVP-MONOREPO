const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = glob.sync('src/**/*.ts');
for (const f of files) {
  let initial = fs.readFileSync(f, 'utf8');
  let content = initial;
  
  // catch (error: any) -> catch (err: unknown) { const error = err as Error;
  content = content.replace(/catch \(([^:]+):\s*any\)\s*\{/g, 'catch ($1_: unknown) { const $1 = $1_ as Error;');
  
  // (req: any, res: any) -> (req: import('express').Request, res: import('express').Response)
  content = content.replace(/\breq:\s*any\b/g, "req: import('express').Request");
  content = content.replace(/\bres:\s*any\b/g, "res: import('express').Response");
  content = content.replace(/\bnext:\s*any\b/g, "next: import('express').NextFunction");
  
  // (body: any) -> (body: Record<string, unknown>)
  content = content.replace(/\b([a-zA-Z0-9_]+):\s*any(?!\s*\[)(?!\s*\()/g, "$1: Record<string, unknown>");
  
  // any[] -> Record<string, unknown>[]
  content = content.replace(/any\[\]/g, "Record<string, unknown>[]");
  
  if (content !== initial) {
    fs.writeFileSync(f, content);
  }
}
