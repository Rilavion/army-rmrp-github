import pg from 'pg';
import {readdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const client=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL||process.env.DATABASE_URL,ssl:process.env.PGSSL==='verify-full'?{rejectUnauthorized:true}:undefined});
await client.connect();
try{
 await client.query("SELECT pg_advisory_lock(12132)");
 await client.query('CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())');
 for(const name of (await readdir(new URL('../database/',import.meta.url))).filter(n=>/^\d{3}-.*\.sql$/.test(n)).sort()){
  const sql=await readFile(new URL('../database/'+name,import.meta.url),'utf8'),sum=createHash('sha256').update(sql).digest('hex');
  const {rows:[existing]}=await client.query('SELECT sha256 FROM schema_migrations WHERE name=$1',[name]);
  if(existing){if(existing.sha256!==sum) throw new Error('Applied migration changed: '+name);continue;}
  await client.query('BEGIN');
  try{await client.query(sql.replace(/^\s*(?:BEGIN|COMMIT);\s*$/gmi,''));await client.query('INSERT INTO schema_migrations(name,sha256) VALUES($1,$2)',[name,sum]);await client.query('COMMIT');console.log('Applied',name);}catch(e){await client.query('ROLLBACK');throw e;}
 }
}finally{await client.query('SELECT pg_advisory_unlock(12132)');await client.end();}

