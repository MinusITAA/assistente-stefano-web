(function(){
 'use strict';
 document.addEventListener('DOMContentLoaded',()=>{
  const project=document.getElementById('project'),anchor=document.getElementById('btnLabFiles');
  if(!project||!anchor||typeof StefanoLearningEvidence==='undefined')return;
  const panel=document.createElement('details');panel.className='panel';panel.style.display='block';
  const summary=document.createElement('summary');summary.textContent='Memoria web verificata';panel.append(summary);
  const description=document.createElement('p');description.className='small';description.textContent='Fonti e test ricordati in questo browser per il progetto selezionato. Scadenza: 7 giorni. I test precedenti devono essere ripetuti sui file attuali.';panel.append(description);
  const refresh=document.createElement('button');refresh.type='button';refresh.textContent='Aggiorna ricordi';panel.append(refresh);
  const content=document.createElement('div');content.setAttribute('role','status');panel.append(content);
  function render(){
   content.replaceChildren();const id=project.value;
   if(!id){content.textContent='Seleziona un progetto per vedere i ricordi.';return;}
   try{
    const records=StefanoLearningEvidence.list(localStorage,id);
    if(!records.length){content.textContent='Nessun ricordo verificato attivo in questo progetto.';return;}
    for(const record of records){
     const card=document.createElement('div');card.className='panel small';
     const text=document.createElement('p');text.textContent=record.total+' test superati il '+new Date(record.recorded_at).toLocaleString('it-IT')+'. Scade il '+new Date(record.expires_at).toLocaleString('it-IT')+'.';card.append(text);
     for(const research of record.researches)for(const source of research.sources){
      const row=document.createElement('p'),link=document.createElement('a');link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=source.url;row.append(link);card.append(row);
     }
     const files=document.createElement('p');files.textContent='File verificati: '+Object.keys(record.hashes).join(', ');card.append(files);
     const forget=document.createElement('button');forget.type='button';forget.textContent='Dimentica questo ricordo';
     forget.addEventListener('click',()=>{try{StefanoLearningEvidence.remove(localStorage,id,record);render();}catch{content.textContent='Impossibile aggiornare la memoria locale.';}});card.append(forget);content.append(card);
    }
   }catch{content.textContent='Memoria locale non disponibile.';}
  }
  refresh.addEventListener('click',render);panel.addEventListener('toggle',()=>{if(panel.open)render();});project.addEventListener('change',render);
  anchor.closest('details').after(panel);
 });
})();
