(async()=>{
  const $=id=>document.getElementById(id),api=async(path,body)=>{
    const r=await fetch('/api/v1/accounts'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
    const result=await r.json();if(!r.ok||result.error)throw Error(result.error?.message||'Не удалось выполнить запрос');return result.data;
  };
  const message=(value)=>{$('accountMessage').textContent=value;};
  const states={pending:'Заявка ожидает проверки. После одобрения войдите с тем же статиком и паролем.',rejected:'Заявка отклонена.'};
  async function preparePhoto(file){
    if(!(file instanceof File)||!file.size)throw Error('Прикрепите фото игрового УДО');
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('Фото УДО: JPEG, PNG или WebP, не более 10 МБ');
    let bitmap;
    try{
      bitmap=await createImageBitmap(file);
      if(bitmap.width*bitmap.height>32000000)throw Error('Слишком большое разрешение фото УДО');
      const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      const data=canvas.toDataURL('image/jpeg',.8);
      if(data.length>1400000)throw Error('Фото УДО слишком большое. Выберите изображение меньшего размера');
      return data;
    }catch(e){throw Error(e.message||'Не удалось прочитать фото УДО');}finally{bitmap?.close();}
  }
  let previewURL;
  $('udoPhoto')?.addEventListener('change',()=>{
    if(previewURL)URL.revokeObjectURL(previewURL);
    const file=$('udoPhoto').files[0],preview=$('udoPreview');preview.hidden=true;preview.removeAttribute('src');
    if(file&&['image/jpeg','image/png','image/webp'].includes(file.type)&&file.size<=10*1024*1024){
      previewURL=URL.createObjectURL(file);preview.src=previewURL;preview.hidden=false;
    }
  });
  try{
    if($('staticRegister')){
      const config=await api('/config');
      if(!config.enabled){message('Приём заявок на регистрацию ещё не подключён.');return;}
    }
    document.querySelectorAll('[data-account-fields]').forEach(el=>el.disabled=false);
    message('Статик — шесть цифр с тире посередине, например 123-456.');
    for(const [id,path]of [['staticLogin','/login'],['staticRegister','/register']]){
      $(id)?.addEventListener('submit',async e=>{
        e.preventDefault();const form=e.currentTarget,fields=form.querySelector('fieldset'),body=Object.fromEntries(new FormData(form));
        if(body.static_id.length!==7||!/^\d{3}-\d{3}$/.test(body.static_id)){message('Введите статик строго в формате 000-000');return;}
        if(path==='/register'&&body.password!==body.confirm_password){message('Пароли не совпадают');return;}
        delete body.confirm_password;fields.disabled=true;message('Проверяем…');
        try{
          if(path==='/register')body.udo_photo=await preparePhoto(body.udo_photo);
          const data=await api(path,body);form.querySelectorAll('[type=password]').forEach(input=>input.value='');
          if(data.session){location.assign('lk.html');return;}
          message((states[data.status]||'Заявка сохранена.')+(data.review_note?' Причина: '+data.review_note:''));
          if(path==='/register'){form.reset();if(previewURL)URL.revokeObjectURL(previewURL);$('udoPreview').hidden=true;$('udoPreview').removeAttribute('src');}
        }catch(e){message(e.message);}finally{fields.disabled=false;}
      });
    }
  }catch(e){message('Сервер авторизации недоступен. '+e.message);}
})();
