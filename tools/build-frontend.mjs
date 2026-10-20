import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
await fs.mkdir('public/assets',{recursive:true});
await build({entryPoints:['frontend/supplies/entry.tsx'],outfile:'public/assets/supplies.js',bundle:true,minify:true,format:'esm',jsx:'automatic',alias:{'@':'./frontend/supplies'},define:{'process.env.NODE_ENV':'"production"'}});
execFileSync(process.execPath,['node_modules/@tailwindcss/cli/dist/index.mjs','-i','frontend/supplies/theme.css','-o','public/assets/supplies.css','--minify'],{stdio:'inherit'});
