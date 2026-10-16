import pg from 'pg';
export function createPool() {
 if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
 if(!['disable','verify-full',undefined].includes(process.env.PGSSL)) throw new Error('PGSSL: disable or verify-full');
 return new pg.Pool({connectionString:process.env.DATABASE_URL,max:10,connectionTimeoutMillis:10000,idleTimeoutMillis:30000,
 ssl:process.env.PGSSL==='verify-full'?{rejectUnauthorized:true}:undefined});
}
export async function transaction(pool,fn) {const c=await pool.connect();try{await c.query('BEGIN');const value=await fn(c);await c.query('COMMIT');return value;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
export async function audit(db,user,action,type,id,details={}) {await db.query('INSERT INTO audit_log(actor_id,action,entity_type,entity_id,details) VALUES($1,$2,$3,$4,$5)',[user?.id||null,action,type,String(id||''),JSON.stringify(details)]);}
export async function queue(db,route,type,id,payload) {
 await db.query(`INSERT INTO outbox(route_id,entity_type,entity_id,payload) VALUES($1,$2,$3,$4)
 ON CONFLICT(route_id,entity_type,entity_id) DO UPDATE SET payload=excluded.payload,version=outbox.version+1,
 status=CASE WHEN outbox.status IN ('sending','uncertain') THEN outbox.status ELSE 'pending' END,
 next_attempt=now(), updated_at=now()`,[route,type,String(id),JSON.stringify(payload)]);
}
