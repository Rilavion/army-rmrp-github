// Rebuild identical fallback menus after changing public/js/ui/navigation.js.
import fs from 'node:fs/promises';
import vm from 'node:vm';
import * as cheerio from 'cheerio';
const context={window:{}};vm.runInNewContext(await fs.readFile('public/js/ui/navigation.js','utf8'),context);
const items=context.window.VSRF_NAV;
const html=items.map(i=>`<a href="${i.page}" data-page="${i.page}"${i.perm?` data-perm="${i.perm}"`:''}${i.group!=='public'?' data-loggedin=""':''}>${i.label}</a>`).join('\n');
let count=0;
for(const file of (await fs.readdir('public')).filter(f=>f.endsWith('.html'))){
 const path='public/'+file,$=cheerio.load(await fs.readFile(path,'utf8'));
 if(!$('.topbar-inner').length)throw Error('No shared header: '+file);
 if(!$('#mainNav').length)$('.header-actions').before('<nav class="nav" id="mainNav"></nav>');
 $('#mainNav').html('\n'+html+'\n');
 if(!$('#burger').length)$('.header-actions').append('<button class="burger" id="burger" aria-label="Меню" aria-expanded="false" aria-controls="mainNav"><span></span><span></span><span></span></button>');
 if(!$('script[src="js/ui/navigation.js"]').length)$('script[src*="js/ui/main.js"]').before('<script src="js/ui/navigation.js"></script>');
 if(!$('script[src*="js/core/roles-engine.js"]').length)$('script[src*="js/core/auth.js"]').after('<script src="js/core/roles-engine.js"></script>');
 if(!$('script[src*="js/ui/settings-panel.js"]').length)$('body').append('<script src="js/ui/settings-panel.js"></script>');
 await fs.writeFile(path,$.html());count++;
}
console.log(`Navigation synchronized: ${count} pages`);
