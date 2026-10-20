import sharp from 'sharp';
import {fail} from './security.mjs';

export async function identityPhoto(value){
 if(typeof value!=='string'||value.length>1400000)fail(400,'Прикрепите фото УДО: JPEG, PNG или WebP до 1 МБ после подготовки');
 const match=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
 if(!match)fail(415,'Фото УДО: только JPEG, PNG или WebP');
 const bytes=Buffer.from(match[2],'base64');
 if(!bytes.length||bytes.length>1048576||bytes.toString('base64')!==match[2])fail(400,'Некорректное или слишком большое фото УДО');
 try{
  const input=sharp(bytes,{limitInputPixels:16000000,failOn:'warning',animated:false});
  const meta=await input.metadata();
  if(!['jpeg','png','webp'].includes(meta.format)||meta.format!==match[1]||(meta.pages||1)>1)fail(415,'Прикрепите обычное изображение JPEG, PNG или WebP');
  // Decode and re-encode, remove EXIF and all source metadata; never serve uploaded bytes directly.
  const photo=await input.rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true})
   .flatten({background:'#ffffff'}).jpeg({quality:80}).toBuffer();
  if(photo.length>1048576)fail(400,'Фото УДО слишком большое');
  return photo;
 }catch(e){if(e.status)throw e;fail(415,'Не удалось прочитать фото УДО. Выберите исправное изображение');}
}
