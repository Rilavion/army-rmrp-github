(async()=>{
  const $=id=>document.getElementById(id),ui=window.ARMY_UI;
  let loading=false;
  async function refresh(){
    if(loading)return;loading=true;$('registrationList').replaceChildren();ui.message('Загрузка…');
    try{
      const data=await ui.call('/accounts/review?status='+$('registrationStatus').value,undefined,'GET');
      for(const r of data.requests){
        const card=document.createElement('article');card.className='te-card';
        const heading=document.createElement('h2');heading.textContent=r.display_name+' · '+r.static_id;card.append(heading);
        const date=document.createElement('p');date.textContent='Подана: '+new Date(r.created_at).toLocaleString('ru-RU');card.append(date);
        for(const [label,value]of [['Должность',r.position],['Звание',r.military_rank],['Discord',r.discord]]){
          const p=document.createElement('p');p.textContent=label+': '+(value||'Не указано');card.append(p);
        }
        if(r.has_udo){
          const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Посмотреть фото УДО';details.append(summary);
          const image=document.createElement('img');image.alt='УДО заявителя';image.className='udo-photo';image.loading='lazy';
          details.addEventListener('toggle',()=>{if(details.open)image.src='/api/v1/accounts/review/'+encodeURIComponent(r.id)+'/udo';else image.removeAttribute('src');});
          details.append(image);card.append(details);
        }else{const p=document.createElement('p');p.textContent='Фото УДО отсутствует — одобрение недоступно';card.append(p);}
        if(r.status==='pending'){
          const form=document.createElement('form');
          const label=document.createElement('label');label.textContent='Роль после одобрения';
          const select=document.createElement('select');select.className='msg-input';select.required=true;select.name='custom_role_id';
          select.add(new Option('Выберите роль',''));for(const role of data.roles)select.add(new Option(role.name,role.id));label.append(select);form.append(label);
          const noteLabel=document.createElement('label');noteLabel.textContent='Комментарий (обязателен при отказе)';
          const note=document.createElement('textarea');note.className='msg-input';note.maxLength=1000;note.rows=3;noteLabel.append(note);form.append(noteLabel);
          const approve=document.createElement('button');approve.type='submit';approve.className='btn btn-gold';approve.textContent='Одобрить';approve.disabled=!data.roles.length;
          const reject=document.createElement('button');reject.type='button';reject.className='btn';reject.textContent='Отклонить';form.append(approve,reject);card.append(form);
          const decide=async decision=>{
            if(decision==='reject'&&note.value.trim().length<3){ui.message('Укажите причину отказа (минимум 3 символа)');note.focus();return;}
            approve.disabled=reject.disabled=true;
            try{await ui.call('/accounts/review/'+r.id,{decision,custom_role_id:select.value,note:note.value});await refresh();}
            catch(e){ui.message(e.message);approve.disabled=!data.roles.length;reject.disabled=false;}
          };
          form.addEventListener('submit',e=>{e.preventDefault();decide('approve');});reject.addEventListener('click',()=>decide('reject'));
        }else{
          const detail=document.createElement('p');detail.textContent=(r.status==='approved'?'Одобрена · '+(r.assigned_role||'Роль изменена'):'Отклонена')+(r.review_note?' · '+r.review_note:'');card.append(detail);
        }
        $('registrationList').append(card);
      }
      ui.message(data.requests.length?'Показано заявок: '+data.requests.length+(data.requests.length===200?' (последние 200)':''):'Заявок в этом разделе нет.');
    }catch(e){ui.message(e.message);}finally{loading=false;}
  }
  $('registrationRefresh').addEventListener('click',refresh);$('registrationStatus').addEventListener('change',refresh);
  await ui.ready();await refresh();
})();
