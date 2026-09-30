'use strict';
importScripts('../vendor/exceljs.js','../vendor/xlsx.js','../services/textos-tabulares.js?v=2.0.111');
self.onmessage=async event=>{
  try {self.postMessage({data:await self.ETTextosTabulares.readBuffer(event.data.name,event.data.buffer)});}
  catch(error){self.postMessage({error:error.message||'No se pudo leer el archivo.'});}
};
