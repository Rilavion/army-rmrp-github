import {randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash, createCipheriv, createDecipheriv} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt = promisify(scryptCallback);
export const hash = value => createHash('sha256').update(String(value)).digest('hex');
export const token = () => randomBytes(32).toString('base64url');
export const fail = (status,message) => {throw Object.assign(new Error(message),{status});};
export async function passwordHash(password) {
 if(typeof password!=='string'||password.length<12||password.length>128) fail(400,'Пароль: от 12 до 128 символов');
 const salt=randomBytes(16).toString('hex'); return salt+':'+Buffer.from(await scrypt(password,salt,64)).toString('hex');
}
export async function verifyPassword(password,stored) {
 if(typeof password!=='string'||password.length>128) return false;
 const [salt,hex]=stored.split(':'); const actual=Buffer.from(await scrypt(password,salt,64));
 const expected=Buffer.from(hex,'hex'); return expected.length===actual.length&&timingSafeEqual(expected,actual);
}
export const permissions = ['supplies.read','supplies.write','requests.review','personnel.write','content.write','academy.manage','academy.review','warehouse.write','audit.read','users.manage','roles.manage','webhooks.manage'];
export function can(user,permission) {return !!user&&!user.disabled&&(user.role_id==='tech_admin'||user.permissions.includes(permission));}
export function need(user,permission) {if(!user) fail(401,'Войдите в аккаунт'); if(!can(user,permission)) fail(403,'Недостаточно прав');}
export function scope(user,department) {if(user.department_id&&user.department_id!==department&&user.role_id!=='tech_admin') fail(403,'Доступ ограничен вашим подразделением');}
export function text(value,min=1,max=200) {if(typeof value!=='string'||value.trim().length<min||value.trim().length>max) fail(400,`Текст: от ${min} до ${max} символов`);return value.trim();}
export function integer(value,min,max) {if(!Number.isInteger(value)||value<min||value>max) fail(400,`Число: от ${min} до ${max}`);return value;}
export function bool(value) {if(typeof value!=='boolean') fail(400,'Ожидается логическое значение');return value;}
export function uuid(value) {if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value||'')) fail(400,'Некорректный ID'); return value;}
export function identity(data) {
 const fio=text(data.fio,3,120), static_id=text(data.static_id,7,7), discord_id=text(data.discord_id,17,20);
 if(!/^\d{3}-\d{3}$/.test(static_id)||!/^\d{17,20}$/.test(discord_id)) fail(400,'Укажите статик 000-000 и числовой Discord ID');
 return {fio,static_id,discord_id};
}
export function safeURL(value,{optional=false,media=false}={}) {
 if(!value&&optional) return null;
 let url;try{url=new URL(value);}catch{fail(400,'Некорректная ссылка');}
 if(url.protocol!=='https:'||url.username||url.password||String(value).length>1500) fail(400,'Требуется ссылка HTTPS');
 if(media&&!['www.youtube.com','www.youtube-nocookie.com','rutube.ru','vkvideo.ru'].includes(url.hostname)) fail(400,'Видео: YouTube, RuTube или VK Видео');
 return url.href;
}
export function webhookURL(value) {
 let url;try{url=new URL(value);}catch{fail(400,'Некорректный URL вебхука');}if(url.origin!=='https://discord.com'||url.username||url.password||url.search||url.hash||!/^\/api(?:\/v10)?\/webhooks\/\d{17,20}\/[A-Za-z0-9_-]{50,200}$/.test(url.pathname)) fail(400,'Требуется URL вебхука discord.com без дополнительных параметров');
 return url.href;
}
function key(secret) {if(!/^[a-f0-9]{64}$/i.test(secret||'')) throw new Error('WEBHOOK_ENCRYPTION_KEY must be 64 hex characters');return Buffer.from(secret,'hex');}
export function encrypt(value,secret) {const iv=randomBytes(12), cipher=createCipheriv('aes-256-gcm',key(secret),iv);const data=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return [iv,cipher.getAuthTag(),data].map(b=>b.toString('base64')).join('.');}
export function decrypt(value,secret) {const [iv,tag,data]=value.split('.').map(s=>Buffer.from(s,'base64'));const cipher=createDecipheriv('aes-256-gcm',key(secret),iv);cipher.setAuthTag(tag);return Buffer.concat([cipher.update(data),cipher.final()]).toString('utf8');}
