(() => {
  const source = Array.isArray(window.HYDRO_OFFERS) ? window.HYDRO_OFFERS : [];
  const els = id => document.getElementById(id);
  const price = n => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(n||0));
  const num = n => new Intl.NumberFormat('pt-BR').format(Number(n||0));
  const pct = n => `${(Number(n||0)*100).toFixed(1).replace('.',',')}%`;
  const clean = v => (v ?? 'n/i').toString();
  const unique = (rows, key) => [...new Set(rows.map(r => clean(r[key])).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const median = values => { const arr = values.filter(Number.isFinite).sort((a,b)=>a-b); if(!arr.length) return 0; const mid=Math.floor(arr.length/2); return arr.length%2 ? arr[mid] : (arr[mid-1]+arr[mid])/2; };
  const average = values => values.length ? values.reduce((a,b)=>a+b,0)/values.length : 0;
  const groupBy = (rows,key) => rows.reduce((acc,row)=>{ const k=clean(row[key]); (acc[k] ||= []).push(row); return acc; },{});
  const slug = s => clean(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const htmlEscape = s => clean(s).replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));

  const filters = {
    item: els('filterItem'), store: els('filterStore'), brand: els('filterBrand'),
    level: els('filterLevel'), comp: els('filterComp'),
    search: els('filterSearch'), tableSearch: els('tableSearch')
  };

  let heatmapMode = 'store';

  function fillSelect(select, values, placeholder){
    select.innerHTML = `<option value="">${placeholder}</option>` + values.map(v=>`<option>${htmlEscape(v)}</option>`).join('');
  }

  function initFilters(){
    fillSelect(filters.item, unique(source,'ITEM_NORMALIZADO'),'Todos');
    fillSelect(filters.store, unique(source,'LOJA'),'Todas');
    fillSelect(filters.brand, unique(source,'MARCA'),'Todas');
    fillSelect(filters.level, unique(source,'NIVEL_PRODUTO'),'Todos');
    fillSelect(filters.comp, unique(source,'CLASSIFICACAO_COMPARABILIDADE'),'Todas');
    Object.values(filters).forEach(el => el && el.addEventListener('input', render));
    els('resetFilters').addEventListener('click', () => {
      Object.entries(filters).forEach(([key, el]) => {
        if(!el) return;
        el.value = '';
      });
      render();
    });
    els('heatModeStore').addEventListener('click', () => setHeatmapMode('store'));
    els('heatModeBrand').addEventListener('click', () => setHeatmapMode('brand'));
    els('exportCsv').addEventListener('click', exportFiltered);
  }

  function setHeatmapMode(mode){
    heatmapMode = mode === 'brand' ? 'brand' : 'store';
    els('heatModeStore').classList.toggle('active', heatmapMode === 'store');
    els('heatModeBrand').classList.toggle('active', heatmapMode === 'brand');
    renderHeatmap(filteredRows());
  }

  function filteredRows(){
    const query = slug(filters.search.value);
    return source.filter(r => {
      const matchItem = !filters.item.value || clean(r.ITEM_NORMALIZADO) === filters.item.value;
      const matchStore = !filters.store.value || clean(r.LOJA) === filters.store.value;
      const matchBrand = !filters.brand.value || clean(r.MARCA) === filters.brand.value;
      const matchLevel = !filters.level.value || clean(r.NIVEL_PRODUTO) === filters.level.value;
      const matchComp = !filters.comp.value || clean(r.CLASSIFICACAO_COMPARABILIDADE) === filters.comp.value;
      const hay = slug([r.ITEM_NORMALIZADO,r.LOJA,r.MARCA,r.DESCRICAO_COMERCIAL,r.MATERIAL,r.MEDIDA_PRINCIPAL].join(' '));
      const matchSearch = !query || hay.includes(query);
      return matchItem && matchStore && matchBrand && matchLevel && matchComp && matchSearch;
    });
  }

  function updateKpis(rows){
    const stores = unique(rows,'LOJA').length;
    const brands = unique(rows,'MARCA').length;
    const values = rows.map(r => Number(r.PRECO_UTILIZADO)).filter(Number.isFinite);
    const med = median(values);
    const quality = rows.length ? rows.filter(r => ['A','B'].includes(clean(r.CLASSIFICACAO_COMPARABILIDADE))).length / rows.length : 0;
    els('kpiOffers').textContent = num(rows.length);
    els('kpiStores').textContent = num(stores);
    els('kpiBrands').textContent = num(brands);
    els('kpiMedian').textContent = price(med);
    els('kpiQuality').textContent = pct(quality);
    els('sideQuality').textContent = pct(quality);
    els('resultLabel').textContent = `${num(rows.length)} oferta(s) na seleção`;
  }

  function itemStats(rows){
    return Object.entries(groupBy(rows,'ITEM_NORMALIZADO')).map(([item, data]) => {
      const values = data.map(r=>Number(r.PRECO_UTILIZADO)).filter(Number.isFinite);
      const min = Math.min(...values), max = Math.max(...values), med = median(values), avg = average(values);
      return { item, count:data.length, min, max, med, avg, amp:max-min };
    }).sort((a,b)=>b.med-a.med);
  }

  function renderPriceRange(rows){
    const stats = itemStats(rows);
    const container = els('priceRangeChart');
    if(!stats.length){container.innerHTML='<div class="empty">Sem dados na seleção.</div>'; return;}
    const W=880,H=264, L=54,R=18,T=18,B=58;
    const maxY = Math.max(...stats.map(s=>s.max),1)*1.08;
    const x = i => L + (W-L-R)*(stats.length===1?0.5:i/(stats.length-1));
    const y = v => T + (H-T-B)*(1-v/maxY);
    const path = key => stats.map((s,i)=>`${i?'L':'M'}${x(i).toFixed(1)} ${y(s[key]).toFixed(1)}`).join(' ');
    const grid = [0,.25,.5,.75,1].map(t=>{const yy=y(maxY*t);return `<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" class="grid-line"/><text x="${L-10}" y="${yy+4}" text-anchor="end" class="axis-label">${price(maxY*t).replace(',00','')}</text>`}).join('');
    const labels = stats.map((s,i)=>`<text x="${x(i)}" y="${H-28}" text-anchor="middle" class="axis-label">${abbrev(s.item,16)}</text>`).join('');
    const area = `M${x(0)} ${y(0)} ` + stats.map((s,i)=>`L${x(i)} ${y(s.med)}`).join(' ') + ` L${x(stats.length-1)} ${y(0)} Z`;
    const dots = key => stats.map((s,i)=>`<circle cx="${x(i)}" cy="${y(s[key])}" r="4" class="dot-${key}"/><title>${s.item}: ${price(s[key])}</title>`).join('');
    container.innerHTML = `<svg class="svg-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs><linearGradient id="medianGlow" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#43e6b3"/><stop offset="100%" stop-color="#43e6b3" stop-opacity="0"/></linearGradient></defs>${grid}<path d="${area}" class="area-median"/><path d="${path('min')}" class="line-min"/><path d="${path('med')}" class="line-median"/><path d="${path('max')}" class="line-max"/>${dots('min')}${dots('med')}${dots('max')}${labels}</svg>`;
  }

  function abbrev(text,max){ text=clean(text); return text.length>max ? text.slice(0,max-1)+'…' : text; }

  function renderDonut(rows){
    const order=['A','B','C','D'];
    const colors={A:'var(--green)',B:'var(--cyan)',C:'var(--orange)',D:'var(--pink)'};
    const counts=Object.fromEntries(order.map(k=>[k,0])); rows.forEach(r=>{ const k=clean(r.CLASSIFICACAO_COMPARABILIDADE); if(k in counts) counts[k]++; });
    const total=Math.max(rows.length,1);
    let cursor=0; const chunks=[];
    order.forEach(k=>{ const start=cursor; cursor += counts[k]/total*100; chunks.push(`${colors[k]} ${start}% ${cursor}%`); });
    els('qualityDonut').style.background=`conic-gradient(${chunks.join(',')})`;
    const q=(counts.A+counts.B)/total;
    els('donutCenter').textContent=pct(q);
    els('qualityLegend').innerHTML=order.map(k=>`<div class="legend-row"><span><i class="swatch" style="background:${colors[k]}"></i>${k}</span><b>${counts[k]}</b></div>`).join('');
  }

  function renderAmplitude(rows){
    const stats=itemStats(rows).sort((a,b)=>b.amp-a.amp).slice(0,6);
    const max=Math.max(...stats.map(s=>s.amp),1);
    els('amplitudeBars').innerHTML=stats.length?stats.map(s=>`<div class="hbar-row"><div class="hbar-label" title="${htmlEscape(s.item)}">${htmlEscape(abbrev(s.item,19))}</div><div class="hbar-track"><div class="hbar-fill risk" style="width:${(s.amp/max*100).toFixed(1)}%"></div></div><div class="hbar-value">${price(s.amp).replace(',00','')}</div></div>`).join(''):'<div class="empty">Sem dados.</div>';
  }

  function storeStats(rows){
    const marketAvg=average(rows.map(r=>Number(r.PRECO_UTILIZADO)).filter(Number.isFinite)) || 1;
    return Object.entries(groupBy(rows,'LOJA')).map(([store,data])=>{
      const avg=average(data.map(r=>Number(r.PRECO_UTILIZADO)).filter(Number.isFinite));
      return {store, avg, idx: avg/marketAvg, count:data.length};
    }).sort((a,b)=>a.idx-b.idx);
  }

  function renderStoreIndex(rows){
    const stats=storeStats(rows).slice(0,7);
    const max=Math.max(...stats.map(s=>s.idx),1.15);
    els('storeIndexBars').innerHTML=stats.length?stats.map(s=>`<div class="hbar-row"><div class="hbar-label" title="${htmlEscape(s.store)}">${htmlEscape(abbrev(s.store,17))}</div><div class="hbar-track"><div class="hbar-fill" style="width:${(s.idx/max*100).toFixed(1)}%"></div></div><div class="hbar-value">${s.idx.toFixed(2).replace('.',',')}x</div></div>`).join(''):'<div class="empty">Sem dados.</div>';
  }

  function renderMix(rows){
    const groups=Object.entries(groupBy(rows,'NIVEL_PRODUTO')).map(([level,data])=>({level,count:data.length,share:data.length/Math.max(rows.length,1)})).sort((a,b)=>b.count-a.count);
    els('levelMix').innerHTML=groups.length?groups.map(g=>`<div class="mix-row"><div class="mix-head"><span>${htmlEscape(g.level)}</span><strong>${pct(g.share)}</strong></div><div class="mix-track"><div class="mix-fill" style="width:${(g.share*100).toFixed(1)}%"></div></div></div>`).join(''):'<div class="empty">Sem dados.</div>';
    const top=groups[0]; els('levelInsight').textContent=top?`Predomínio de ${top.level}: ${pct(top.share)} da seleção atual.`:'Sem composição disponível.';
  }

  function heatColor(value,min,max){
    if(!Number.isFinite(value)) return 'transparent';
    const t=max===min?0.5:(value-min)/(max-min);
    const hue=188 + t*137; // cyan -> magenta-ish
    const alpha=.17 + t*.42;
    return `hsla(${hue},92%,61%,${alpha})`;
  }

  function renderHeatmap(rows){
    const rowKey = heatmapMode === 'brand' ? 'MARCA' : 'LOJA';
    const rowHeader = heatmapMode === 'brand' ? 'Marca' : 'Loja';
    const title = heatmapMode === 'brand' ? 'Heatmap por marca' : 'Heatmap por loja';
    const subtitle = heatmapMode === 'brand'
      ? 'Preço de referência por marca × item para mostrar o posicionamento dos concorrentes'
      : 'Preço médio por loja × item para avaliar posicionamento';
    els('heatmapTitle').textContent = title;
    els('heatmapSubtitle').textContent = subtitle;

    const rowsAxis = unique(rows,rowKey); const items=unique(rows,'ITEM_NORMALIZADO');
    const vals=[]; const matrix={};
    rowsAxis.forEach(label=>{
      matrix[label]={};
      items.forEach(item=>{
        const subset=rows
          .filter(r=>clean(r[rowKey])===label && clean(r.ITEM_NORMALIZADO)===item)
          .map(r=>Number(r.PRECO_UTILIZADO))
          .filter(Number.isFinite);
        const val=subset.length ? (heatmapMode === 'brand' ? median(subset) : average(subset)) : null;
        matrix[label][item]=val;
        if(val!==null) vals.push(val);
      });
    });
    const min=Math.min(...vals,0), max=Math.max(...vals,1);
    let html='<table class="heatmap"><thead><tr><th>'+rowHeader+'</th>'+items.map(i=>`<th title="${htmlEscape(i)}">${htmlEscape(abbrev(i,14))}</th>`).join('')+'</tr></thead><tbody>';
    html += rowsAxis.map(label=>'<tr><th>'+htmlEscape(label)+'</th>'+items.map(item=>{
      const v=matrix[label][item];
      return v===null?'<td class="heat-na">—</td>':`<td class="heat-cell" style="background:${heatColor(v,min,max)}">${price(v).replace(',00','')}</td>`;
    }).join('')+'</tr>').join('');
    html+='</tbody></table>';
    els('heatmapTable').innerHTML=rowsAxis.length?html:'<div class="empty">Sem dados.</div>';
  }

  function updateInsights(rows){
    const items=itemStats(rows).sort((a,b)=>b.amp-a.amp);
    const topItem=items[0];
    const stores=storeStats(rows);
    const bestStore=stores[0];
    const q=rows.length?rows.filter(r=>['A','B'].includes(clean(r.CLASSIFICACAO_COMPARABILIDADE))).length/rows.length:0;
    els('insightDispersion').textContent=topItem?topItem.item:'Sem item';
    els('insightDispersionText').textContent=topItem?`Maior amplitude observada: ${price(topItem.amp)} entre mínimo e máximo.`:'A seleção não possui ofertas suficientes.';
    els('insightStore').textContent=bestStore?bestStore.store:'Sem loja';
    els('insightStoreText').textContent=bestStore?`Índice médio ${bestStore.idx.toFixed(2).replace('.',',')}x do mercado na seleção.`:'Sem base de comparação.';
    els('insightQuality').textContent=pct(q)+' A/B';
    els('insightQualityText').textContent=q>=.6?'A amostra possui boa proporção de comparabilidade direta ou próxima.':'A seleção exige cuidado: comparabilidade A/B está abaixo de 60%.';
  }


  function blukitReferenceByItem(){
    const grouped = groupBy(source.filter(r => slug(r.MARCA) === 'blukit'), 'ITEM_NORMALIZADO');
    return Object.fromEntries(Object.entries(grouped).map(([item, data]) => {
      const values = data.map(r=>Number(r.PRECO_UTILIZADO)).filter(Number.isFinite);
      return [item, median(values)];
    }).filter(([, value]) => Number.isFinite(value) && value > 0));
  }

  function blukitReferenceStats(rows){
    const marketStats = itemStats(rows);
    const refs = blukitReferenceByItem();
    return marketStats.map(s => {
      const ref = refs[s.item];
      return {...s, ref};
    }).filter(s => Number.isFinite(s.ref));
  }

  function renderBlukitReference(rows){
    const stats = blukitReferenceStats(rows);
    const refs = stats.map(s=>s.ref).filter(Number.isFinite);
    const markets = stats.map(s=>s.med).filter(Number.isFinite);
    const blukitOfferCount = rows.filter(r => slug(r.MARCA) === 'blukit').length;

    els('blukitRefMedian').textContent = refs.length ? price(median(refs)) : '—';
    els('blukitMarketMedian').textContent = markets.length ? price(median(markets)) : '—';
    els('blukitCoverage').textContent = num(stats.length);
    els('blukitOfferCount').textContent = num(blukitOfferCount);

    const host = els('blukitReferenceCompare');
    if(!stats.length){
      host.innerHTML='<div class="empty">Sem itens com referência Blukit na seleção.</div>';
      return;
    }
    host.innerHTML = stats.sort((a,b)=>b.med-a.med).map(s=>{
      const maxVal = Math.max(s.med, s.ref, 1);
      const marketW = (s.med/maxVal*100).toFixed(1);
      const refW = (s.ref/maxVal*100).toFixed(1);
      return `<div class="scenario-row">
        <div class="scenario-name" title="${htmlEscape(s.item)}">${htmlEscape(abbrev(s.item,28))}</div>
        <div class="scenario-bars">
          <div class="scenario-line market"><span>Mercado</span><i style="width:${marketW}%"></i><b>${price(s.med)}</b></div>
          <div class="scenario-line blukit"><span>Blukit</span><i style="width:${refW}%"></i><b>${price(s.ref)}</b></div>
        </div>
      </div>`;
    }).join('');
  }

  const tableCols=[
    ['ITEM_NORMALIZADO','Item'],['LOJA','Loja'],['MARCA','Marca'],['GRUPO_COMPARAVEL','Grupo comparável'],['MATERIAL','Material'],['MEDIDA_PRINCIPAL','Medida'],['NIVEL_PRODUTO','Nível'],['CLASSIFICACAO_COMPARABILIDADE','Comp.'],['PRECO_UTILIZADO','Preço'],['OBSERVACAO_ANALITICA','Observação']
  ];
  function renderTable(rows){
    const q=slug(filters.tableSearch.value); const shown=rows.filter(r=>!q||slug(tableCols.map(([key])=>r[key]).join(' ')).includes(q));
    els('tableCount').textContent=`${num(shown.length)} linha(s) exibida(s)`;
    let html='<thead><tr>'+tableCols.map(([,label])=>`<th>${label}</th>`).join('')+'</tr></thead><tbody>';
    html+=shown.slice(0,220).map(r=>{
      const img=clean(r.IMAGEM_LOCAL||'');
      const imgLegend=clean(r.IMAGEM_LEGENDA||'');
      const rowAttrs = img && img !== 'n/i' ? ` data-img="${htmlEscape(img)}" data-imglegend="${htmlEscape(imgLegend)}" data-item="${htmlEscape(r.DESCRICAO_COMERCIAL)}" data-brand="${htmlEscape(r.MARCA)}" data-store="${htmlEscape(r.LOJA)}" data-price="${htmlEscape(price(r.PRECO_UTILIZADO))}"` : '';
      return `<tr${rowAttrs}>`+tableCols.map(([key])=>{
        const v=r[key];
        if(key==='PRECO_UTILIZADO') return `<td class="money">${price(v)}</td>`;
        if(key==='CLASSIFICACAO_COMPARABILIDADE'){const c=clean(v).toLowerCase(); return `<td><span class="tag ${c}">${htmlEscape(v)}</span></td>`;}
        if(key==='ITEM_NORMALIZADO'){
          const badge = img && img !== 'n/i' ? '<span class="photo-badge" title="Imagem cadastrada">◉</span>' : '';
          return `<td>${badge}${htmlEscape(v)}</td>`;
        }
        return `<td>${htmlEscape(v)}</td>`;
      }).join('')+'</tr>';
    }).join('');
    html+='</tbody>'; els('offersTable').innerHTML=html;
    bindOfferPreview();
  }

  function bindOfferPreview(){
    const table=els('offersTable');
    const tip=els('offerTooltip');
    if(!table || !tip) return;
    table.querySelectorAll('tbody tr[data-img]').forEach(row=>{
      row.addEventListener('mouseenter', ev=>showOfferPreview(row, ev));
      row.addEventListener('mousemove', ev=>moveOfferPreview(ev));
      row.addEventListener('mouseleave', hideOfferPreview);
    });
  }

  function showOfferPreview(row, ev){
    const tip=els('offerTooltip'); if(!tip) return;
    tip.innerHTML=`<img src="${htmlEscape(row.dataset.img)}" alt="Imagem de referência do produto"><div><strong>${htmlEscape(row.dataset.item)}</strong><span>${htmlEscape(row.dataset.brand)} • ${htmlEscape(row.dataset.store)}</span><b>${htmlEscape(row.dataset.price)}</b><p>${htmlEscape(row.dataset.imglegend||'Imagem pública de referência.')}</p></div>`;
    tip.classList.add('show'); tip.setAttribute('aria-hidden','false'); moveOfferPreview(ev);
  }
  function moveOfferPreview(ev){
    const tip=els('offerTooltip'); if(!tip || !tip.classList.contains('show')) return;
    const gap=18; const vw=window.innerWidth; const vh=window.innerHeight;
    const rect=tip.getBoundingClientRect();
    let left=ev.clientX+gap; let top=ev.clientY+gap;
    if(left+rect.width>vw-12) left=ev.clientX-rect.width-gap;
    if(top+rect.height>vh-12) top=ev.clientY-rect.height-gap;
    tip.style.left=Math.max(12,left)+'px'; tip.style.top=Math.max(12,top)+'px';
  }
  function hideOfferPreview(){ const tip=els('offerTooltip'); if(!tip) return; tip.classList.remove('show'); tip.setAttribute('aria-hidden','true'); }

  function exportFiltered(){
    const rows=filteredRows(); if(!rows.length) return;
    const keys=Object.keys(rows[0]);
    const esc=v=>`"${clean(v).replace(/"/g,'""')}"`;
    const csv='\ufeff'+keys.join(';')+'\n'+rows.map(r=>keys.map(k=>esc(r[k])).join(';')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='pesquisa_comercial_filtrada.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function render(){
    const rows=filteredRows();
    updateKpis(rows); renderPriceRange(rows); renderDonut(rows); renderAmplitude(rows); renderStoreIndex(rows); renderMix(rows); renderBlukitReference(rows); renderHeatmap(rows); updateInsights(rows); renderTable(rows);
  }

  initFilters(); render();
})();
