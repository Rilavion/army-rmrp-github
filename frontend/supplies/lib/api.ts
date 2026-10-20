import type {Supply, SupplyDraft} from './types';
const api = (window as any).VSRF_API;
export const isApiConfigured = true;
export const canEdit = () => !!(window as any).VSRF_ROLES?.can('supply','replace');
async function call(path:string,body?:unknown,method='POST'){const r=await api.call(path,body,method);if(r.error)throw Error(r.error.message);return r.data;}
function map(r:any):Supply{return {...r,trucksArrived:r.trucks_arrived,trucksPlanned:r.trucks_planned,escortStatus:r.escort_status,eventAt:new Date(r.event_at),createdAt:new Date(r.created_at),updatedAt:new Date(r.updated_at)};}
const body=(d:SupplyDraft)=>({location:d.location,recipient:d.recipient,status:d.status,trucks_arrived:d.trucksArrived,trucks_planned:d.trucksPlanned,escort_status:d.escortStatus,event_at:d.eventAt.toISOString(),organizations:d.organizations,comment:d.comment});
const listeners=new Set<()=>void>();
export function subscribeToSupplies(onData:(s:Supply[],ready:boolean)=>void,onError:(e:Error)=>void){let alive=true,running=false;async function refresh(){if(!alive||running||document.hidden)return;running=true;try{let rows:any[]=[],offset=0;while(alive){const r=await call('/supply-ledger?offset='+offset,undefined,'GET');rows.push(...r.rows);if(r.rows.length<100)break;offset+=100;}if(alive)onData(rows.map(map),true);}catch(e){if(alive)onError(e instanceof Error?e:Error('Ошибка загрузки'));}finally{running=false;}}listeners.add(refresh);void refresh();const timer=setInterval(refresh,30000);return ()=>{alive=false;clearInterval(timer);listeners.delete(refresh);};}
const changed=()=>listeners.forEach(f=>f());
export async function createSupply(d:SupplyDraft,key:string){await call('/supply-ledger',{...body(d),idempotency_key:key});changed();}
export async function updateSupply(id:string,d:SupplyDraft,revision:number){await call('/supply-ledger/'+id+'/update',{...body(d),revision});changed();}
export async function removeSupply(id:string,revision:number){await call('/supply-ledger/'+id+'/delete',{revision});changed();}

export async function sendSupply(s:Supply){await call('/supply-ledger/'+s.id+'/send',{revision:s.revision});changed();}
