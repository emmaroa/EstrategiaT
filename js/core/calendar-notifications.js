(function (global) {
  'use strict';
  const LEAD = 30 * 60 * 1000;
  function build(events, user, now = Date.now()) {
    if (!user?.id || String(user.rol).toLowerCase() === 'proveedor') return [];
    const result = [];
    for (const event of events) {
      const own = event.creado_por === user.id;
      if (!own && event.alcance !== 'Todos' && !(event.alcance === 'Seleccionados' && (event.destinatarios || []).includes(user.id))) continue;
      const start = Date.parse(event.fecha_inicio), end = Date.parse(event.fecha_fin);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end < now) continue;
      const date = new Date(start);
      const day = [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-');
      const link = 'modulos/calendario.html?fecha=' + day + '&evento=' + encodeURIComponent(event.id);
      const when = date.toLocaleString('es-MX', {dateStyle:'medium',timeStyle:'short'});
      const detail = event.titulo + ' · ' + when + (event.ubicacion ? ' · ' + event.ubicacion : '');
      if (!own) result.push({id:'calendar:assignment:' + event.id + ':' + (event.actualizado_en || event.creado_en || event.fecha_inicio), tipo:'calendario', titulo:'Evento agendado en tu calendario', mensaje:detail, enlace:link, created_at:event.actualizado_en || event.creado_en || event.fecha_inicio, calendar:true});
      if (start >= now && start - now <= LEAD) result.push({id:'calendar:reminder:' + event.id + ':' + event.fecha_inicio, tipo:'calendario_recordatorio', titulo:'Tu evento está por comenzar', mensaje:detail, enlace:link, created_at:new Date(start-LEAD).toISOString(), calendar:true});
    }
    return result;
  }
  function create(client, user) {
    const key = 'etCalendarNotifications:v1:' + user.id;
    function read() { try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch (_) { return {}; } }
    function save(state) { try { localStorage.setItem(key, JSON.stringify(state)); } catch (_) {} }
    function mark(items) { const state=read(); items.forEach(item=>{state[item.id]={...state[item.id],read:true};});save(state); }
    async function load() {
      if (String(user.rol).toLowerCase()==='proveedor' || (global.ETPermissions?.puedeAcceder && !global.ETPermissions.puedeAcceder(user,'Calendario'))) return {items:[],fresh:[]};
      const events=[], now=Date.now();
      for(let offset=0;;offset+=500) {
        const response=await client.from('eventos_calendario').select('id,titulo,ubicacion,alcance,destinatarios,creado_por,fecha_inicio,fecha_fin,creado_en,actualizado_en')
          .gte('fecha_fin',new Date(now).toISOString()).or('alcance.eq.Todos,creado_por.eq.'+user.id+',destinatarios.cs.{'+user.id+'}')
          .order('fecha_inicio',{ascending:true}).order('id',{ascending:true}).range(offset,offset+499);
        if(response.error)throw response.error;
        events.push(...(response.data||[]));if((response.data||[]).length<500)break;
      }
      const state=read(), items=build(events,user,now), fresh=[];
      const next={};
      items.forEach(item=>{
        item.leida=Boolean(state[item.id]?.read);
        if(!state[item.id]?.seen&&!item.leida)fresh.push(item);
        next[item.id]={read:item.leida,seen:true};
      });
      save(next);return {items,fresh};
    }
    return {load,mark};
  }
  global.ETCalendarNotifications={build,create};
})(typeof window !== 'undefined' ? window : globalThis);
