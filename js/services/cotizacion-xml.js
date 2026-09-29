(function (global) {
  'use strict';
  const SCALE = 1000000n;
  function decimal(value, name = 'Importe') {
    const s = String(value ?? '').trim();
    if (!/^\d{1,12}(\.\d{1,6})?$/.test(s)) throw Error(name + ': usa un número positivo con hasta seis decimales.');
    const [whole, fraction = ''] = s.split('.');
    return BigInt(whole) * SCALE + BigInt(fraction.padEnd(6, '0'));
  }
  const rounded = (n, d) => (n + d / 2n) / d;
  const cents = n => rounded(n, 10000n);
  const money = n => (n < 0n ? '-' : '') + ((n < 0n ? -n : n) / 100n).toString() + '.' + ((n < 0n ? -n : n) % 100n).toString().padStart(2, '0');
  const mul = (a, b) => rounded(decimal(a) * decimal(b), SCALE);
  function calculate(q) {
    let subtotal = 0n, discount = 0n, transfers = 0n, withholding = 0n;
    const items = q.items.map(item => {
      if (item.taxes.length > 100) throw Error('Un concepto admite hasta 100 impuestos.');
      if (!item.descripcion.trim() || decimal(item.cantidad, 'Cantidad') === 0n) throw Error('Cada concepto necesita descripción y cantidad mayor que cero.');
      const amount = item.importeOriginal === undefined ? mul(item.cantidad, item.precio) : decimal(item.importeOriginal);
      const off = decimal(item.descuento || '0', 'Descuento');
      if (off > amount) throw Error('El descuento no puede superar el importe del concepto.');
      let tax = 0n, retained = 0n;
      const taxes = item.taxes.map(t => {
        if (!['Traslado', 'Retencion'].includes(t.tipo)) throw Error('Tipo de impuesto inválido.');
        const base = t.base === '' ? amount - off : decimal(t.base, 'Base de impuesto');
        if (!['Tasa', 'Cuota', 'Exento'].includes(t.factor)) throw Error('Factor de impuesto inválido.');
        const value = t.factor === 'Exento' ? 0n : (t.manual ? decimal(t.importe || '0') : rounded(base * decimal(t.tasa || '0', 'Tasa'), SCALE));
        const result = cents(value);
        if (t.tipo === 'Retencion') retained += result; else tax += result;
        return { ...t, calculado: money(result) };
      });
      subtotal += cents(amount); discount += cents(off); transfers += tax; withholding += retained;
      return { ...item, taxes, importe: money(cents(amount)), total: money(cents(amount) - cents(off) + tax - retained) };
    });
    transfers += cents(decimal(q.trasladosExtra || '0'));
    withholding += cents(decimal(q.retencionesExtra || '0'));
    const total = subtotal - discount + transfers - withholding;
    if (total < 0n) throw Error('Las retenciones exceden el total.');
    return { items, subtotal: money(subtotal), descuento: money(discount), traslados: money(transfers), retenciones: money(withholding), total: money(total) };
  }
  const children = (node, name) => Array.from(node?.children || []).filter(x => x.localName === name);
  const first = (node, name) => children(node, name)[0];
  const attrs = (node, names) => Object.fromEntries(names.map(n => [n, node?.getAttribute(n) || '']));
  function parse(text, filename) {
    if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw Error('El XML contiene entidades o un DTD no permitido.');
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw Error('XML dañado o ilegible.');
    const root = doc.documentElement;
    if (root.localName !== 'Comprobante' || !/^https?:\/\/www\.sat\.gob\.mx\/cfd\/[34]$/.test(root.namespaceURI || '') || !['3.3', '4.0'].includes(root.getAttribute('Version')) || root.getAttribute('TipoDeComprobante') !== 'I') throw Error('Se requiere un CFDI de ingreso versión 3.3 o 4.0.');
    const nodes = children(first(root, 'Conceptos'), 'Concepto');
    if (!nodes.length) throw Error('El CFDI no contiene conceptos.');
    if (nodes.length > 1000) throw Error('El límite es de 1,000 conceptos por archivo.');
    const q = {
      id: null, folio: '', fecha: new Date().toLocaleDateString('en-CA'), nota: '', archivo: filename,
      origen: attrs(root, ['Version', 'Serie', 'Folio', 'Fecha', 'Moneda', 'TipoCambio', 'FormaPago', 'MetodoPago', 'SubTotal', 'Descuento', 'Total']),
      emisor: attrs(first(root, 'Emisor'), ['Rfc', 'Nombre', 'RegimenFiscal']),
      receptor: attrs(first(root, 'Receptor'), ['Rfc', 'Nombre', 'DomicilioFiscalReceptor', 'RegimenFiscalReceptor', 'UsoCFDI']),
      uuid: Array.from(doc.getElementsByTagNameNS('*', 'TimbreFiscalDigital'))[0]?.getAttribute('UUID') || '',
      trasladosExtra: '0', retencionesExtra: '0', items: []
    };
    if (!first(root, 'Emisor') || !first(root, 'Receptor')) throw Error('El CFDI debe contener emisor y receptor.');
    q.uuid = q.uuid.toUpperCase();
    q.items = nodes.map(n => {
      const taxes = [], taxNode = first(n, 'Impuestos');
      for (const [group, tag] of [['Traslados', 'Traslado'], ['Retenciones', 'Retencion']]) {
        for (const t of children(first(taxNode, group), tag)) taxes.push({
          tipo: tag, impuesto: t.getAttribute('Impuesto') || '', factor: t.getAttribute('TipoFactor') || 'Tasa',
          base: t.getAttribute('Base') || '', tasa: t.getAttribute('TasaOCuota') || '0',
          importe: t.getAttribute('Importe') || '0', manual: t.hasAttribute('Importe')
        });
      }
      return { clave: n.getAttribute('ClaveProdServ') || '', identificacion: n.getAttribute('NoIdentificacion') || '',
        cantidad: n.getAttribute('Cantidad') || '', claveUnidad: n.getAttribute('ClaveUnidad') || '', unidad: n.getAttribute('Unidad') || '',
        descripcion: n.getAttribute('Descripcion') || '', precio: n.getAttribute('ValorUnitario') || '',
        descuento: n.getAttribute('Descuento') || '0', importeOriginal: n.getAttribute('Importe') || undefined, taxes };
    });
    const totals = calculate(q), taxes = first(root, 'Impuestos');
    q.origen.TotalImpuestosTrasladados = taxes?.getAttribute('TotalImpuestosTrasladados') || '';
    q.origen.TotalImpuestosRetenidos = taxes?.getAttribute('TotalImpuestosRetenidos') || '';
    for (const [field, attr, calc] of [['trasladosExtra', 'TotalImpuestosTrasladados', 'traslados'], ['retencionesExtra', 'TotalImpuestosRetenidos', 'retenciones']]) {
      if (q.origen[attr]) {
        const diff = cents(decimal(q.origen[attr])) - cents(decimal(totals[calc]));
        if (diff > 0n) q[field] = money(diff);
      }
    }
    q.advertencia = q.origen.Total && calculate(q).total !== money(cents(decimal(q.origen.Total))) ? 'Los conceptos e impuestos no concilian con el total del XML. Revisa los importes antes de guardar.' : '';
    return q;
  }
  function validate(q) {
    if (!q.emisor.Nombre.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(q.fecha) || !q.origen.Moneda.trim() || !q.items.length) throw Error('Completa proveedor, fecha, moneda y conceptos.');
    if (q.nota.length > 10000) throw Error('La nota admite hasta 10,000 caracteres.');
    return calculate(q);
  }
  global.ETCotizacionXML = { parse, calculate, validate, decimal, money };
})(window);
