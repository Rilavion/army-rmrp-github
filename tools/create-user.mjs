import {createInterface} from 'node:readline/promises';
import {createPool,transaction} from '../server/db.mjs';
import {strictStatic} from '../server/accounts.mjs';
import {passwordHash} from '../server/security.mjs';
// JSON from stdin keeps credentials out of command arguments and shell history.
let raw='';for await(const line of createInterface({input:process.stdin,terminal:false}))raw+=line;
const b=JSON.parse(raw);
const staticId=strictStatic(b.static_id);if(!b.display_name)throw Error('display_name required');
const db=createPool();
try{await transaction(db,async c=>{
 await c.query('LOCK TABLE users IN EXCLUSIVE MODE');
 if((await c.query('SELECT 1 FROM users LIMIT 1')).rows.length)throw Error('Initial provisioning requires an empty users table. Existing installations use offline maintenance.');
 const {rows:[u]}=await c.query('INSERT INTO users(email,static_id,password_hash,password_reset_required,user_metadata) VALUES($1,$2,$3,false,$4) RETURNING id',[staticId+'@accounts.vsrf.invalid',staticId,await passwordHash(b.password),JSON.stringify({display_name:b.display_name})]);
 await c.query("INSERT INTO user_roles(user_id,role,display_name) VALUES($1,'admin',$2)",[u.id,b.display_name]);
});console.log('Initial administrator created');}finally{await db.end();}
