(function (global) {
  'use strict';
  const fontURL = new URL('../vendor/fonts/NotoSans-Regular.ttf', document.currentScript.src);
  let font;
  async function loadFont() {
    if (!font) font = fetch(fontURL).then(r => { if (!r.ok) throw Error('No se pudo cargar la fuente del PDF.'); return r.arrayBuffer(); }).then(buffer => {
      let binary = ''; const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      return btoa(binary);
    }).catch(e => { font = null; throw e; });
    return font;
  }
  const formats = {
    clasico: { label:'Clásico', accent:'#334155', title:25, align:'left', band:false },
    ejecutivo: { label:'Ejecutivo azul', accent:'#164e78', title:28, align:'right', band:true },
    minimalista: { label:'Minimalista', accent:'#202020', title:22, align:'center', band:false },
    elegante: { label:'Elegante verde', accent:'#285847', title:27, align:'center', band:true },
    moderno: { label:'Moderno borgoña', accent:'#7c3048', title:30, align:'left', band:true }
  };
  async function build(q, format = 'clasico') {
    const theme = formats[format] || formats.clasico;
    const totals = global.ETCotizacionXML.validate(q);
    const pdf = new global.jspdf.jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait', compress: true });
    pdf.addFileToVFS('NotoSans.ttf', await loadFont()); pdf.addFont('NotoSans.ttf', 'NotoSans', 'normal'); pdf.setFont('NotoSans');
    const commands = [], width = 552;
    const compact = q.items.length > 20 || q.nota.length > 1500;
    const leading = compact ? 1.15 : 1.35, gap = compact ? 3 : 6, margin = compact ? 24 : 30;
    let y = 0;
    const line = (text, size = 9, color = '#292524', x = 0, w = width, align = 'left') => {
      pdf.setFontSize(size);
      const lines = pdf.splitTextToSize(String(text || ''), w);
      for (const value of lines) { commands.push({ type: 'text', text: value, x: x + (align === 'right' ? w : align === 'center' ? w / 2 : 0), y: y + size, size, color, align }); y += size * leading; }
      return lines.length;
    };
    const rule = () => { y += 5; commands.push({ type: 'line', x: 0, y, w: width, color: theme.accent }); y += 9; };
    if (theme.band) { commands.push({type:'rect',x:0,y:0,w:width,h:48,color:theme.accent}); y=5; }
    line('COTIZACIÓN', theme.title, theme.band ? '#ffffff' : theme.accent, theme.band ? 10 : 0, theme.band ? width-20 : width, theme.align);
    if (theme.band) y=58;
    line('Fecha: ' + q.fecha, 10);
    rule();
    line('PROVEEDOR', 10, '#7c4a2d');
    line(q.emisor.Nombre, 12);
    line('RFC: ' + (q.emisor.Rfc || 'No especificado') + '    Régimen fiscal: ' + (q.emisor.RegimenFiscal || 'No especificado'));
    y += 5;
    line('RECEPTOR', 10, '#7c4a2d'); line(q.receptor.Nombre || 'No especificado', 11);
    line('RFC: ' + (q.receptor.Rfc || 'No especificado') + '    Domicilio fiscal: ' + (q.receptor.DomicilioFiscalReceptor || 'No especificado'));
    line('Régimen: ' + (q.receptor.RegimenFiscalReceptor || 'No especificado'));
    line('Moneda: ' + q.origen.Moneda + '    Tipo de cambio: ' + (q.origen.TipoCambio || 'No especificado'));
    line('Forma de pago: ' + (q.origen.FormaPago || 'No especificado') + '    Método de pago: ' + (q.origen.MetodoPago || 'No especificado'));
    rule();
    const columns = [0, 34, 260, 312, 386, 461];
    const widths = [30, 221, 47, 69, 70, 91];
    const row = (values, size, color) => {
      const top = y; let bottom = y;
      values.forEach((value, index) => { y = top; line(value, size, color, columns[index], widths[index]); bottom = Math.max(bottom, y); });
      y = bottom + gap;
      commands.push({ type: 'line', x: 0, y: y - 3, w: width, color: '#e7e0d8' });
    };
    row(['Cant.', 'Descripción / unidad', 'Precio', 'Descuento', 'Impuestos', 'Total'], 8, '#7c4a2d');
    totals.items.forEach(item => {
      const taxes = item.taxes.map(t => (t.tipo === 'Retencion' ? 'Ret. ' : '') + (t.impuesto === '002' ? 'IVA' : t.impuesto) + ' ' + (t.factor === 'Exento' ? 'Exento' : (t.factor === 'Cuota' ? 'Cuota ' + t.tasa : (Number(t.tasa) * 100).toFixed(4).replace(/\.?0+$/, '') + '%') + ': ' + t.calculado)).join('\n');
      row([item.cantidad, item.descripcion + '\n' + [item.unidad, item.claveUnidad, item.clave, item.identificacion].filter(Boolean).join(' · '), item.precio, item.descuento, taxes || 'Sin impuestos', item.total], 8, '#292524');
    });
    y += 6;
    for (const [label,value] of [['Subtotal',totals.subtotal],['Descuentos',totals.descuento],['Impuestos',totals.traslados],['Retenciones',totals.retenciones]]) {
      line(label + ': ' + value, 10, '#292524', 260, width-260, 'right');
    }
    y += 4;
    line('TOTAL: ' + totals.total + ' ' + q.origen.Moneda, 16, theme.accent, 200, width-200, 'right');
    if (q.nota.trim()) { rule(); line('NOTA', 9, '#7c4a2d'); line(q.nota, 9); }
    const height = y + 2, scale = Math.min(1, (792 - margin * 2) / height), offsetX = (612 - width * scale) / 2;
    for (const c of commands) {
      if (c.color === '#7c4a2d') c.color = theme.accent;
      if (c.type === 'rect') { pdf.setFillColor(c.color); pdf.rect(offsetX+c.x*scale,margin+c.y*scale,c.w*scale,c.h*scale,'F'); }
      else if (c.type === 'text') { pdf.setTextColor(c.color); pdf.setFontSize(c.size * scale); pdf.text(c.text, offsetX + c.x * scale, margin + c.y * scale, {align:c.align}); }
      else { pdf.setDrawColor(c.color); pdf.setLineWidth(.5 * scale); pdf.line(offsetX, margin + c.y * scale, offsetX + c.w * scale, margin + c.y * scale); }
    }
    pdf.setProperties({ title: 'Cotización', author: '', subject: 'Cotización' });
    if (pdf.getNumberOfPages() !== 1) throw Error('No se pudo ajustar el documento a una página.');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 612 792'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Vista previa de cotización en una página carta');
    const bg = document.createElementNS(svg.namespaceURI, 'rect'); bg.setAttribute('width', '612'); bg.setAttribute('height', '792'); bg.setAttribute('fill', '#fff'); svg.append(bg);
    for (const c of commands) {
      const node = document.createElementNS(svg.namespaceURI, c.type);
      if (c.type === 'rect') {
        node.setAttribute('x',offsetX+c.x*scale); node.setAttribute('y',margin+c.y*scale); node.setAttribute('width',c.w*scale); node.setAttribute('height',c.h*scale); node.setAttribute('fill',c.color);
      } else if (c.type === 'text') {
        node.setAttribute('text-anchor',c.align === 'right' ? 'end' : c.align === 'center' ? 'middle' : 'start');
        node.textContent = c.text; node.setAttribute('x', offsetX + c.x * scale); node.setAttribute('y', margin + c.y * scale);
        node.setAttribute('font-size', c.size * scale); node.setAttribute('font-family', 'CotizacionNoto, sans-serif'); node.setAttribute('fill', c.color);
      } else { node.setAttribute('x1', offsetX); node.setAttribute('x2', offsetX + c.w * scale); node.setAttribute('y1', margin + c.y * scale); node.setAttribute('y2', margin + c.y * scale); node.setAttribute('stroke', c.color); node.setAttribute('stroke-width', .5 * scale); }
      svg.append(node);
    }
    return { pdf, svg, scale, height, totals, filename: ('Cotizacion_' + (q.folio || 'Borrador') + '_' + q.emisor.Nombre).replace(/[^\p{L}\p{N}_-]/gu, '_').slice(0, 160) + '.pdf' };
  }
  global.ETCotizacionPDF = { build, formats };
})(window);
