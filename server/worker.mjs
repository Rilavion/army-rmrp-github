import {createPool} from './db.mjs';
import {deliverOne} from './delivery.mjs';
import {expireViolations} from './maintenance.mjs';
const db=createPool();let stopped=false,lastMaintenance=0;
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>{stopped=true;});
console.log('Discord delivery worker started');
while(!stopped){try{if(Date.now()-lastMaintenance>60000){await expireViolations(db);lastMaintenance=Date.now();}const worked=await deliverOne(db,process.env.WEBHOOK_ENCRYPTION_KEY);await new Promise(r=>setTimeout(r,worked?500:5000));}catch{console.error('worker_cycle_failed');await new Promise(r=>setTimeout(r,5000));}}
await db.end();
