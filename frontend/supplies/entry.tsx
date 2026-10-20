import React from 'react';
import {createRoot} from 'react-dom/client';
import {SupplySystem} from './components/system/SupplySystem';
async function start(){const host=document.getElementById('supplySystem');if(!host)return;await (window as any).ARMY_UI.ready();if(!(window as any).VSRF_AUTH.state.user){host.textContent='Войдите в аккаунт для просмотра поставок.';return;}const shadow=host.attachShadow({mode:'open'});const link=document.createElement('link');link.rel='stylesheet';link.href='/assets/supplies.css';shadow.append(link);const root=document.createElement('div');shadow.append(root);createRoot(root).render(<SupplySystem/>);}
void start();

