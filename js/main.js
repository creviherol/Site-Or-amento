document.addEventListener('DOMContentLoaded', () => {
  const tbody = document.getElementById('itemsTbody');
  const totalAreaEl = document.getElementById('totalArea');
  const totalCountEl = document.getElementById('totalCount');
  const additionalTbody = document.getElementById('additionalItemsTbody');

  // adicionar BX061 aos itens que são medidos em barras
  const BAR_ITEMS = new Set(['BX064','BX065','BX057','AL15','BX060','U1108','U1109','BX061']);

  // configuração das peças (adicione Janela/Porta 4 folhas)
  const pecaConfig = {
    "Porta pivotante": {
      folhas: { "Móvel": { count: 1 } },
      descontos: { largMovel: 10, altMovel: 15 },
      componentes: [
        { name: "Kit-01", qty: 1 },
        { name: "Puxador", qty: 1 }    ],
      needsPuxador: true
    },
  
    "Janela 2 folhas": {
      folhas: { "Móvel": { count: 1 }, "Fixa": { count: 1 } },
      descontos: {},
      special: 'janela2',
      needsPuxador: false,
      bateItem: '571-BateFecha' // item usado por esta peça
    },
  
    // Nova peça: Porta de correr 2 folhas (mesma lógica/itens da janela, mas usa Kit10)
    "Porta de correr 2 folhas": {
      folhas: { "Móvel": { count: 1 }, "Fixa": { count: 1 } },
      descontos: {},
      special: 'janela2',
      needsPuxador: false,
      bateItem: 'Kit10' // usa Kit10 em vez do 571-BateFecha
    },

    // Porta de correr 1 folha: apenas uma folha móvel com acréscimos específicos
    "Porta de correr 1 folha": {
      folhas: { "Móvel": { count: 1 } },
      descontos: {},
      special: 'porta1correr',
      needsPuxador: false
    },

    // Janela 4 folhas: 2 móveis + 2 fixas
    "Janela 4 folhas": {
      folhas: { "Móvel": { count: 2 }, "Fixa": { count: 2 } },
      descontos: {},
      special: 'janela4',
      needsPuxador: false,
      bateItem: '570-BateFecha'
    },
  
    // Porta de correr 4 folhas: igual à janela 4, mas bateItem = Kit09
    "Porta de correr 4 folhas": {
      folhas: { "Móvel": { count: 2 }, "Fixa": { count: 2 } },
      descontos: {},
      special: 'janela4',
      needsPuxador: false,
      bateItem: 'Kit09'
    },

    // Peça Box: mesma lógica da porta de correr 2 folhas, mas utiliza KitBox
    "Peça Box": {
      folhas: { "Móvel": { count: 1 }, "Fixa": { count: 1 } },
      descontos: {},
      special: 'janela2',
      needsPuxador: false,
      bateItem: 'KitBox'
    },
  
    // Nova peça: Janela Maxim-ar com 1 folha fixa
    "Janela Maxiar/1Fx": {
      folhas: { 
        "Móvel": { count: 1 },
        "Fixa": { count: 1 }
      },
      descontos: {
        largMovel: 10,
        altMovel: 10,
        largFixa: 15,
        altFixa: 15
      },
      special: 'maxiar',
      needsPuxador: false
    }
  };
  
  // tornar Incolor e 8mm os valores padrão (aparecem primeiro na lista)
  const coresVidro = ["Incolor", "Bronze", "Verde"];
  const espessurasVidro = ["8mm", "4mm", "6mm", "10mm"];
  let items = [];
  
  // additionalItems: map name -> { id, qty, usedMm, isBar }
  let additionalItems = {};
  
  const uid = () => 'id-' + Math.random().toString(36).slice(2, 9);
  const arredondaCima50 = (v) => Math.ceil((parseFloat(v)||0)/50)*50;
  
  // --- novo: debounce para evitar re-render a cada tecla ---
  let renderTimer = null;
  function scheduleRender(delay = 250) {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(() => {
      renderTimer = null;
      renderAdditionalTable();
    }, delay);
  }
  
  // função que calcula largura/altura das folhas (trata janela2 e janela4)
  function calculaFolhaComDesconto(item, tipo) {
    const conf = pecaConfig[item.nome];
    if (!conf) return { largura: 0, altura: 0 };

    const vaoL = parseFloat(item.vaoLarguraMm) || 0;
    const vaoA = parseFloat(item.vaoAlturaMm) || 0;

    if (conf.special === 'janela2') {
      if (tipo === 'Móvel') {
        return { largura: Math.max(0, (vaoL / 2) + 50), altura: Math.max(0, vaoA - 25) };
      }
      if (tipo === 'Fixa') {
        return { largura: Math.max(0, (vaoL / 2)), altura: Math.max(0, vaoA - 65) };
      }
    }

    if (conf.special === 'janela4') {
      // para 4 folhas: dividir por 4 (cada folha), aplicar os mesmos deslocamentos de altura/extra de largura para móveis
      if (tipo === 'Móvel') {
        // largura por folha = (vão / 4) + 50, altura = vão - 25 (mantém desconto similar)
        return { largura: Math.max(0, (vaoL / 4) + 50), altura: Math.max(0, vaoA - 25) };
      }
      if (tipo === 'Fixa') {
        // largura por folha = (vão / 4), altura = vão - 65
        return { largura: Math.max(0, (vaoL / 4)), altura: Math.max(0, vaoA - 65) };
      }
    }

    if (conf.special === 'porta1correr') {
      if (tipo === 'Móvel') {
        return {
          largura: Math.max(0, vaoL + 50),
          altura: Math.max(0, vaoA + 40)
        };
      }
    }

    // special handler para Maxim-ar
    if (conf.special === 'maxiar') {
      const vaoL = parseFloat(item.vaoLarguraMm) || 0;
      const vaoA = parseFloat(item.vaoAlturaMm) || 0;
      
      if (tipo === 'Móvel') {
        return {
          largura: Math.max(0, vaoL - conf.descontos.largMovel),
          // agora usa vaoA (altura) em vez de vaoL
          altura: Math.max(0, (vaoA/2) - conf.descontos.altMovel)
        };
      }
      if (tipo === 'Fixa') {
        return {
          largura: Math.max(0, vaoL - conf.descontos.largFixa),
          // agora usa vaoA (altura) em vez de vaoL
          altura: Math.max(0, (vaoA/2) - conf.descontos.altFixa)
        };
      }
    }

    // comportamento padrão (mantido)
    const keySuffix = tipo
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '')
      .replace(/[^a-zA-Z0-9]/g, '');
    const descL = conf.descontos[`larg${keySuffix}`] || 0;
    const descA = conf.descontos[`alt${keySuffix}`] || 0;
    const numFolhasLarg = Object.values(conf.folhas).reduce((sum, f) => sum + (f.count || 0), 0) || 1;
    const largura = (parseFloat(item.vaoLarguraMm) / numFolhasLarg) - descL;
    const altura = parseFloat(item.vaoAlturaMm) - descA;
    return { largura: Math.max(0, largura), altura: Math.max(0, altura) };
  }
  
  function calculaAreaFolha(l, a, qtd) {
    const lw = arredondaCima50(parseFloat(l) || 0) / 1000;
    const ht = arredondaCima50(parseFloat(a) || 0) / 1000;
    return (lw * ht) * (parseInt(qtd) || 0);
  }
  
  function updateTotals() {
    let totalA = 0, totalC = 0;
    items.forEach(it => {
      for (const t in it.folhas) {
        const f = it.folhas[t];
        totalA += calculaAreaFolha(f.larguraMm, f.alturaMm, f.count);
      }
      totalC += parseInt(it.qtd) || 0;
    });
    totalAreaEl.textContent = totalA.toFixed(3);
    totalCountEl.textContent = totalC;
  }
  
  // --- Gerenciamento de Itens Adicionais com coluna "Usado" (barras de 6m) ---
  function ensureAdditional(name) {
    if (!additionalItems[name]) {
      additionalItems[name] = {
        id: uid(),
        qty: 0,
        usedMm: 0,
        isBar: BAR_ITEMS.has(name),
        raw: 0
      };
    }
    return additionalItems[name];
  }
  
  // deltaQty: change in simple unit qty (units), deltaUsedMm: change in mm for bar items, deltaRaw: auxilia itens calculados (ex.: SILOC)
  function addOrUpdateAdditionalItem(name, deltaQty = 0, deltaUsedMm = 0, deltaRaw = 0) {
    if (!name || (deltaQty === 0 && deltaUsedMm === 0 && deltaRaw === 0)) return;
    const obj = ensureAdditional(name);
    if (name === 'SILOC') {
      const delta = deltaRaw !== 0 ? deltaRaw : deltaQty;
      obj.raw = (obj.raw || 0) + (delta || 0);
      if (obj.raw < 0) obj.raw = 0;
      obj.qty = Math.ceil(obj.raw || 0);
    } else {
      obj.qty = (obj.qty || 0) + (deltaQty || 0);
    }
    if (BAR_ITEMS.has(name)) {
      obj.usedMm = (obj.usedMm || 0) + (deltaUsedMm || 0);
    }
    // if both zero or negative remove
    const shouldRemove = name === 'SILOC'
      ? (((obj.raw || 0) <= 0) || isNaN(obj.raw))
      : ((obj.qty <= 0 || isNaN(obj.qty)) && (!obj.usedMm || obj.usedMm <= 0));
    if (shouldRemove) {
      delete additionalItems[name];
    }
    renderAdditionalTable();
  }
  
  // calcula o valor bruto de SILOC (area total das peças / 3.4)
  function computeSilocRaw() {
    let total = 0;
    for (const it of items) {
      const conf = pecaConfig[it.nome];
      if (!conf) continue;
      
      if (conf.special === 'porta1correr') {
        const folhaMovel = it.folhas['Móvel'];
        if (folhaMovel) {
          const areaFolha = (folhaMovel.larguraMm/1000) * (folhaMovel.alturaMm/1000);
          const qtd = parseInt(it.qtd) || 0;
          total += (areaFolha * qtd) / 3.4;
        }
      }

      // incluir janela2, janela4 e maxiar
      if (conf.special === 'janela2' || conf.special === 'janela4' || conf.special === 'maxiar') {
        // para maxiar, usa apenas área da folha fixa
        if (conf.special === 'maxiar') {
          const folhaFixa = it.folhas['Fixa'];
          if (folhaFixa) {
            const areaFixa = (folhaFixa.larguraMm/1000) * (folhaFixa.alturaMm/1000);
            const qtd = parseInt(it.qtd) || 0;
            total += (areaFixa * qtd) / 3.4;
          }
        } else {
          // para janela2/4 usa área total do vão
          const vaoL = parseFloat(it.vaoLarguraMm) || 0;
          const vaoA = parseFloat(it.vaoAlturaMm) || 0;
          const qtd = parseInt(it.qtd) || 0;
          const areaPerPiece = (vaoL/1000) * (vaoA/1000);
          total += (areaPerPiece * qtd) / 3.4;
        }
      }
    }
    return total || 0;
  }
  
  function renderAdditionalTable() {
    additionalTbody.innerHTML = '';
    for (const name in additionalItems) {
      const obj = additionalItems[name];
      const tr = document.createElement('tr');
      const isBar = obj.isBar;
  
      // calcula número de barras necessárias (6m = 6000mm)
      const bars = isBar ? Math.ceil((obj.usedMm || 0) / 6000) : (obj.qty || 0);
  
      // Qtd: para isBar mostra número de barras (não editável), senão mostra input de quantidade
      const qtdCell = isBar
        ? `<td class="qtd-cell">${bars}</td>`
        : (name === 'SILOC'
          ? `<td class="qtd-cell">${obj.qty || 0}</td>`
          : `<td><input type="number" min="0" step="1" value="${obj.qty||0}" data-name="${name}" class="qty-input" style="width:80px;"></td>`);
  
      // Usado:
      let usadoCell = '';
      if (isBar) {
        const usadoVal = obj.usedMm || 0;
        usadoCell = `<td><input type="number" min="0" step="1" value="${usadoVal}" data-name="${name}" class="usado-input" style="width:100px;"></td>`;
      } else {
        if (name === 'SILOC') {
          const silocRaw = (obj.raw != null) ? obj.raw : computeSilocRaw();
          usadoCell = `<td>${silocRaw.toFixed(2)}</td>`;
        } else {
          usadoCell = `<td></td>`;
        }
      }
  
      tr.innerHTML = `<td>${name}</td>
        ${qtdCell}
        ${usadoCell}
        <td><button class="remove-btn">Remover</button></td>`;
      additionalTbody.appendChild(tr);
  
      // listener Usado (mm) — só existe para itens em barra
      if (isBar) {
        const usadoInp = tr.querySelector('.usado-input');
        usadoInp.addEventListener('input', () => {
          const v = parseInt(usadoInp.value) || 0;
          obj.usedMm = v;
          // atualiza qty para refletir barras necessárias
          obj.qty = Math.ceil((obj.usedMm || 0) / 6000);
          // não renderizar imediatamente a cada tecla — debounce
          scheduleRender();
        });
      }
  
      // listener Qtd (apenas para itens não-bar)
      const qtdInp = tr.querySelector('.qty-input');
      if (qtdInp) {
        qtdInp.addEventListener('input', () => {
          const v = parseInt(qtdInp.value) || 0;
          obj.qty = v;
          scheduleRender();
        });
      }
  
      tr.querySelector('.remove-btn').addEventListener('click', () => {
        delete additionalItems[name];
        renderAdditionalTable(); // remoção imediata é OK
      });
    }
  }
  
  // --- Computa contribuições de componentes para um item (retorna map name->{qty, usedMm, raw}) ---
  function computeComponentContribsForItem(item) {
    const conf = pecaConfig[item.nome];
    const contribs = {};
    if (!conf) return contribs;
    const qtd = parseInt(item.qtd) || 0;
    const vaoL = parseFloat(item.vaoLarguraMm) || 0;
    const vaoA = parseFloat(item.vaoAlturaMm) || 0;
  
    if (conf.special === 'janela2' || conf.special === 'janela4') {
      const is4 = conf.special === 'janela4';
      const movCount = conf.folhas['Móvel']?.count || 1;
      const fixaCount = conf.folhas['Fixa']?.count || 1;
      // BX064, BX065, BX057: usados em comprimento = largura total do vão (mm) por peça
      ['BX064','BX065','BX057'].forEach(n => {
        contribs[n] = { qty: 0, usedMm: vaoL * qtd };
      });
  
      // AL15: para 4 folhas é o dobro da altura; para 2 folhas é a altura
      const al15Height = (is4 ? (vaoA * 2) : vaoA) * qtd;
      contribs['AL15'] = { qty: 0, usedMm: al15Height };
  
      // BX060: largura do vão menos soma das larguras das folhas fixas (considera count)
      const larguraFixaIndividual = (item.folhas && item.folhas['Fixa'] && item.folhas['Fixa'].larguraMm) ? item.folhas['Fixa'].larguraMm : 0;
      const usedBX060 = Math.max(0, vaoL - (larguraFixaIndividual * fixaCount));
      contribs['BX060'] = { qty: 0, usedMm: usedBX060 * qtd };
  
      // BX061: novo item = altura da peça (mm) por janela (barra)
      contribs['BX061'] = { qty: 0, usedMm: vaoA * qtd };
  
      // U1108: para 4 folhas será o dobro da altura; para 2 folhas igual altura
      const u1108Used = (is4 ? (vaoA * 2) : vaoA) * qtd;
      contribs['U1108'] = { qty: 0, usedMm: u1108Used };
  
      // U1109: não existe para janela4 (usuário pediu). Para janela2 mantém.
      if (!is4) {
        contribs['U1109'] = { qty: 0, usedMm: vaoA * qtd };
      }
  
      // 125REG: assume-se 2 por folha móvel (2 * movCount per piece)
      contribs['125REG'] = { qty: 2 * movCount * qtd, usedMm: 0 };
  
      // Batente inferior: 2 por peça nas configurações de 4 folhas, 1 caso contrário
      const batenteInferiorQty = (is4 ? 2 : 1) * qtd;
      contribs['Batente inferior'] = { qty: batenteInferiorQty, usedMm: 0 };

      // Batente central: 1 por peça apenas para configurações de 4 folhas
      if (is4) {
        contribs['Batente central'] = { qty: 1 * qtd, usedMm: 0 };
      }
  
      // Cunha: 1 por folha (total folhas = movCount + fixaCount)
      contribs['Cunha'] = { qty: (movCount + fixaCount) * qtd, usedMm: 0 };
  
      // bateItem (571-BateFecha or Kit09/Kit10/etc)
      const bateName = conf.bateItem || '571-BateFecha';
      contribs[bateName] = { qty: 1 * qtd, usedMm: 0 };
  
      // SILOC: acumula área total / 3.4 (arredondamento aplicado somente no somatório final)
      const areaPerPiece = (vaoL/1000) * (vaoA/1000);
      const silocRawTotal = (areaPerPiece * qtd) / 3.4;
      contribs['SILOC'] = { qty: 0, usedMm: 0, raw: silocRawTotal };
  
      return contribs;
    }

    if (conf.special === 'porta1correr') {
      const folhaMovel = item.folhas['Móvel'] || {};
      const larguraFolha = Math.max(0, folhaMovel.larguraMm != null ? folhaMovel.larguraMm : (vaoL + 50));
      const alturaFolha = Math.max(0, folhaMovel.alturaMm != null ? folhaMovel.alturaMm : (vaoA + 40));

      ['BX064','BX065','BX057'].forEach(n => {
        contribs[n] = { qty: 0, usedMm: larguraFolha * 2 * qtd };
      });

      contribs['U1109'] = { qty: 0, usedMm: alturaFolha * qtd };
      contribs['Kit10'] = { qty: 1 * qtd, usedMm: 0 };
      contribs['125REG'] = { qty: 4 * qtd, usedMm: 0 };

      const areaFolha = (larguraFolha/1000) * (alturaFolha/1000);
      contribs['SILOC'] = { qty: 0, usedMm: 0, raw: (areaFolha * qtd) / 3.4 };

      return contribs;
    }

    // comportamento padrão (porta pivotante etc.)
    for (const comp of (conf.componentes || [])) {
      if (comp.name === 'Puxador') {
        const pux = item.puxador || document.getElementById('puxadorSelect')?.value || 'Puxador 1 furo 607';
        contribs[pux] = { qty: (comp.qty || 1) * qtd, usedMm: 0 };
      } else {
        contribs[comp.name] = { qty: (comp.qty || 1) * qtd, usedMm: 0 };
      }
    }
    
    // caso special='maxiar':
    if (conf.special === 'maxiar') {
      // U1108: perímetro da folha fixa
      const folhaFixa = item.folhas['Fixa'];
      if (folhaFixa) {
        // perimetro = 2 * largura + 2 * altura da folha fixa
        const perimetro = 2 * (folhaFixa.larguraMm + folhaFixa.alturaMm);
        contribs['U1108'] = { qty: 0, usedMm: perimetro * qtd };
      }
      
      // KitMAXIAR: 1 por janela
      contribs['KitMAXIAR'] = { qty: 1 * qtd, usedMm: 0 };
      
      // SILOC: area da folha fixa (m²) / 3.4 (arredondamento apenas no total acumulado)
      if (folhaFixa) {
        const areaFixa = (folhaFixa.larguraMm/1000) * (folhaFixa.alturaMm/1000);
        contribs['SILOC'] = { qty: 0, usedMm: 0, raw: (areaFixa * qtd) / 3.4 };
      }
      
      return contribs;
    }
  
    return contribs;
  }
  
  
  // atualiza (recalcula) componentes associados a um item — aplica deltas na tabela adicional
  function updateItemComponents(item) {
    const old = item.componentContribs || {};
    const now = computeComponentContribsForItem(item);

    // union of keys
    const keys = new Set([...Object.keys(old), ...Object.keys(now)]);
    keys.forEach(name => {
      const o = old[name] || { qty: 0, usedMm: 0, raw: 0 };
      const n = now[name] || { qty: 0, usedMm: 0, raw: 0 };
      const deltaQty = (n.qty || 0) - (o.qty || 0);
      const deltaUsedMm = (n.usedMm || 0) - (o.usedMm || 0);
      const deltaRaw = (n.raw || 0) - (o.raw || 0);
      // apply delta
      addOrUpdateAdditionalItem(name, deltaQty, deltaUsedMm, deltaRaw);
    });
  
    // store current contribs
    item.componentContribs = now;
  }
  
  // --- UI: criação de linhas de itens e sublinhas ---
  function addRow(item) {
    const main = document.createElement('tr');
    main.dataset.id = item.id;
    main.innerHTML = `<td>${item.nome}</td>
      <td><input type="number" min="1" value="${item.qtd}" style="width:60px;"></td>
      <td><input type="number" min="0" value="${item.vaoLarguraMm||''}"></td>
      <td><input type="number" min="0" value="${item.vaoAlturaMm||''}"></td>
      <td><select>${coresVidro.map(c=>`<option>${c}</option>`).join('')}</select></td>
      <td><select>${espessurasVidro.map(e=>`<option>${e}</option>`).join('')}</select></td>
      <td class="area">0.000</td>
      <td class="right"><button class="remove-btn">Remover</button></td>`;
    tbody.appendChild(main);
  
    const inpQtd = main.querySelector('td:nth-child(2) input');
    const inpLarg = main.querySelector('td:nth-child(3) input');
    const inpAlt = main.querySelector('td:nth-child(4) input');
    const areaCell = main.querySelector('.area');
    const selectCor = main.querySelector('td:nth-child(5) select');
    const selectEspessura = main.querySelector('td:nth-child(6) select');
  
    // Guardar valores iniciais
    item.cor = item.cor || coresVidro[0];
    item.espessura = item.espessura || espessurasVidro[0];
  
    // Setar valores iniciais nos selects
    selectCor.value = item.cor;
    selectEspessura.value = item.espessura;
  
    // Atualizar o item quando mudar
    selectCor.addEventListener('change', () => {
        item.cor = selectCor.value;
    });
    selectEspessura.addEventListener('change', () => {
        item.espessura = selectEspessura.value;
    });
  
    function atualizarSubLinhas() {
      let totalAreaItem = 0;
      let cur = main.nextSibling;
      while (cur && cur.classList.contains('subrow')) {
        const tipo = cur.dataset.tipo;
        const f = item.folhas[tipo];
        const larg = arredondaCima50(f.larguraMm);
        const alt = arredondaCima50(f.alturaMm);
        const area = calculaAreaFolha(f.larguraMm, f.alturaMm, f.count);
        totalAreaItem += area;
        cur.querySelector('.arred-larg').textContent = larg;
        cur.querySelector('.arred-alt').textContent = alt;
        cur.querySelector('.area').textContent = area.toFixed(3);
        const qtdTxt = f.count > 1 ? ` (x${f.count})` : '';
        cur.querySelector('.folha-nome').textContent = `Folha ${tipo}${qtdTxt}`;
        const inpW = cur.querySelector('td:nth-child(2) input');
        const inpH = cur.querySelector('td:nth-child(3) input');
        if (inpW) inpW.value = f.larguraMm ?? '';
        if (inpH) inpH.value = f.alturaMm ?? '';
        cur = cur.nextSibling;
      }
      areaCell.textContent = totalAreaItem.toFixed(3);
      updateTotals();
    }
  
    function recalcularFolhas() {
      const conf = pecaConfig[item.nome];
      for (const tipo in conf.folhas) {
        if (!item.folhas[tipo].manual) {
          const dims = calculaFolhaComDesconto(item, tipo);
          item.folhas[tipo].larguraMm = Math.round(dims.largura);
          item.folhas[tipo].alturaMm = Math.round(dims.altura);
        }
      }
      atualizarSubLinhas();
      // recomputa contribuições de componentes dependentes de dimensões
      updateItemComponents(item);
    }
  
    inpQtd.addEventListener('input', () => {
      const old = item.qtd || 0;
      const novo = parseInt(inpQtd.value) || 1;
      const delta = novo - old;
      item.qtd = novo;
      const conf = pecaConfig[item.nome];
      // atualizar contagens de folhas
      for (const tipo in conf.folhas) {
        item.folhas[tipo].count = conf.folhas[tipo].count * item.qtd;
      }
      // se peça tem componentes simples (ex: porta) a mudança de qtd vai ajustar via updateItemComponents
      recalcularFolhas();
    });
  
    inpLarg.addEventListener('input', () => {
      item.vaoLarguraMm = parseFloat(inpLarg.value) || 0;
      recalcularFolhas();
    });
  
    inpAlt.addEventListener('input', () => {
      item.vaoAlturaMm = parseFloat(inpAlt.value) || 0;
      recalcularFolhas();
    });
  
    main.querySelector('.remove-btn').addEventListener('click', () => {
      items = items.filter(x => x.id !== item.id);
      // decrementar componentes associados ao item (usar item.componentContribs)
      const old = item.componentContribs || {};
      for (const name in old) {
        const o = old[name];
        // subtrair
        addOrUpdateAdditionalItem(name, - (o.qty || 0), - (o.usedMm || 0), - (o.raw || 0));
      }
      let n = main.nextSibling;
      while (n && n.classList.contains('subrow')) { let t = n.nextSibling; n.remove(); n = t; }
      main.remove(); updateTotals();
    });
  
    // cria sublinhas
    for (const tipo in item.folhas) {
      const f = item.folhas[tipo];
      const sub = document.createElement('tr');
      sub.className = 'subrow';
      sub.dataset.tipo = tipo;
      sub.innerHTML = `<td colspan="2" class="folha-nome">Folha ${tipo}${f.count>1?` (x${f.count})`:''}</td>
        <td><input type="number" min="0" value="${f.larguraMm||''}"></td>
        <td><input type="number" min="0" value="${f.alturaMm||''}"></td>
        <td class="arred-larg"></td>
        <td class="arred-alt"></td>
        <td class="area">0.000</td>
        <td></td>`;
      tbody.appendChild(sub);
  
      const inpW = sub.querySelector('td:nth-child(2) input');
      const inpH = sub.querySelector('td:nth-child(3) input');
      if (inpW) inpW.addEventListener('input', () => { f.larguraMm = parseFloat(inpW.value) || 0; f.manual = true; atualizarSubLinhas(); });
      if (inpH) inpH.addEventListener('input', () => { f.alturaMm = parseFloat(inpH.value) || 0; f.manual = true; atualizarSubLinhas(); });
    }
  
    // inicializa contribuições do item (vazia) e calcula pela primeira vez
    item.componentContribs = {};
    recalcularFolhas();
    updateTotals();
  }
  
  // controla visibilidade do select do puxador
  function togglePuxadorSelect() {
    const ps = document.getElementById('pecaSelect');
    const wrapper = document.getElementById('puxadorWrapper');
    if (!ps || !wrapper) return;
    const conf = pecaConfig[ps.value];
    wrapper.style.display = conf && conf.needsPuxador ? '' : 'none';
  }
  const pecaSelectEl = document.getElementById('pecaSelect');
  if (pecaSelectEl) {
    pecaSelectEl.addEventListener('change', togglePuxadorSelect);
    togglePuxadorSelect();
  }
  
  document.getElementById('addBtn').addEventListener('click', () => {
    const nome = document.getElementById('pecaSelect').value;
    const qtd = parseInt(document.getElementById('qtdDefault').value) || 1;
    const puxador = document.getElementById('puxadorSelect') ? document.getElementById('puxadorSelect').value : 'Puxador 1 furo 607';
    const conf = pecaConfig[nome];
    const folhas = {};
    for (const t in conf.folhas) {
        folhas[t] = { count: conf.folhas[t].count * qtd, baseCount: conf.folhas[t].count, larguraMm: 0, alturaMm: 0, manual: false };
    }
    const item = { 
        id: uid(), 
        nome, 
        qtd, 
        vaoLarguraMm: 0, 
        vaoAlturaMm: 0, 
        folhas, 
        puxador,
        cor: coresVidro[0],
        espessura: espessurasVidro[0]
    };
    items.push(item);
    addRow(item);
    updateItemComponents(item);
});
  
  document.getElementById('clearBtn').addEventListener('click', () => {
    if (confirm('Deseja limpar todas as peças?')) {
      items = []; tbody.innerHTML = ''; updateTotals();
      additionalItems = {}; renderAdditionalTable();
    }
  });
  
  // adicional manual: campo de texto opcional
  document.getElementById('addAdditionalItemBtn').addEventListener('click', () => {
    const typedNameEl = document.getElementById('additionalItemName');
    const typed = typedNameEl ? typedNameEl.value.trim() : '';
    const selectVal = document.getElementById('additionalItemSelect') ? document.getElementById('additionalItemSelect').value : '';
    const itemName = typed || selectVal;
    const itemQty = parseInt(document.getElementById('additionalItemQty').value) || 1;
    if (!itemName) { alert('Informe o nome do item adicional ou escolha um no select.'); return; }
  
    if (BAR_ITEMS.has(itemName)) {
      // for user-added bar items, quantity input is number of meters
      addOrUpdateAdditionalItem(itemName, 0, itemQty * 1000);
    } else {
      addOrUpdateAdditionalItem(itemName, itemQty, 0);
    }
  
    if (typedNameEl) typedNameEl.value = '';
  });
  
  // export to PDF handler (mantive sua versão anterior)
  (function(){
    const exportBtn = document.getElementById('exportPdfBtn');
    if (!exportBtn) return;
    exportBtn.addEventListener('click', () => {
      const container = document.querySelector('.container.card') || document.body;
      const clone = container.cloneNode(true);

      // antes de manipular o clone, copiar valores atuais de inputs/selects
      const originalInputs = container.querySelectorAll('input');
      const cloneInputs = clone.querySelectorAll('input');
      cloneInputs.forEach((inputClone, idx) => {
        if (!originalInputs[idx]) return;
        inputClone.value = originalInputs[idx].value;
      });

      const originalSelects = container.querySelectorAll('select');
      const cloneSelects = clone.querySelectorAll('select');
      cloneSelects.forEach((selectClone, idx) => {
        if (!originalSelects[idx]) return;
        const currentValue = originalSelects[idx].value;
        selectClone.value = currentValue;
        Array.from(selectClone.options || []).forEach(opt => {
          if (opt.value === currentValue) {
            opt.selected = true;
          } else {
            opt.selected = false;
          }
        });
      });

      // remover controles interativos (mantém selects/inputs das linhas)
      clone.querySelectorAll('.controls, .form-group, #addBtn, #clearBtn, #addAdditionalItemBtn, #exportPdfBtn').forEach(n => n.remove());

      // converter inputs em spans (garante pegar value atual)
      clone.querySelectorAll('input').forEach(n => {
        const span = document.createElement('span');
        span.textContent = n.value != null ? n.value : '';
        n.parentNode.replaceChild(span, n);
      });

      // converter selects mantendo valores selecionados
      clone.querySelectorAll('select').forEach(s => {
        const span = document.createElement('span');
        const selectedOption = s.options[s.selectedIndex];
        span.textContent = selectedOption ? selectedOption.textContent : '';
        s.parentNode.replaceChild(span, s);
      });

      // remover quaisquer botões "Remover" que possam ter permanecido
      clone.querySelectorAll('button, .remove-btn').forEach(n => n.remove());
      clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));

      // marcar linhas principais (não subrows) para separador visual e adicionar classe
      clone.querySelectorAll('tr').forEach(row => {
        if (!row.classList.contains('subrow') && !row.querySelector('th')) {
          row.classList.add('pdf-main-row');
        }
      });

      // REMOVER apenas a coluna cujo cabeçalho é "Ações" (procura por "acoes"/"acao" sem acentos)
      clone.querySelectorAll('table').forEach(table => {
        const thead = table.querySelector('thead');
        const headerRow = thead ? thead.querySelector('tr') : table.querySelector('tr');
        if (!headerRow) return;
        const ths = Array.from(headerRow.children);
        const actionIdx = ths.findIndex(th => {
          const txt = (th.textContent || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '');
          return txt === 'acoes' || txt === 'acao' || txt.includes('acao');
        });
        if (actionIdx >= 0) {
          // remove o th do cabeçalho
          const thToRemove = headerRow.children[actionIdx];
          if (thToRemove) thToRemove.remove();
          // remove célula correspondente de todas as linhas (thead/tbody/tfoot)
          table.querySelectorAll('tr').forEach(row => {
            if (row.children.length > actionIdx) {
              row.removeChild(row.children[actionIdx]);
            }
          });
        }

        // remover células vazias finais que podem sobrar (ex.: <td></td>) para evitar coluna em branco
        table.querySelectorAll('tr').forEach(row => {
          while (row.children.length && row.children[row.children.length - 1].textContent.trim() === '') {
            row.removeChild(row.children[row.children.length - 1]);
          }
        });

        // permite que colunas restantes expandam para preencher o espaço (evita "coluna em branco")
        table.style.tableLayout = 'auto';
        table.style.width = '100%';
      });

      // aplicar classe compacta para reduzir largura/espacos no PDF
      clone.classList.add('pdf-compact');
      clone.style.maxWidth = '750px';

      // CSS para evitar quebra dentro de linhas, repetir cabeçalho e adicionar separadores entre peças (linha mais escura)
      const style = document.createElement('style');
      style.textContent = `
        table { page-break-inside: auto; border-collapse: collapse; width:100%; }
        tr    { page-break-inside: avoid; break-inside: avoid; }
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
        td, th { page-break-inside: avoid; break-inside: avoid; }
        /* separador visual entre peças principais (linha mais escura) */
        .pdf-main-row { border-bottom: 2px solid #999999; }
        .pdf-main-row td { padding-bottom: 6px; }
        .pdf-compact td, .pdf-compact th { padding: 6px 8px; font-size: 12px; }
      `;
      clone.insertBefore(style, clone.firstChild);

      const opt = {
        margin:       6,
        filename:     'Orcamento.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['css', 'legacy'] }
      };

      if (typeof html2pdf === 'undefined') {
        alert('html2pdf não carregado. Verifique se a biblioteca foi incluída.');
        return;
      }

      html2pdf().set(opt).from(clone).save().catch(err => {
        console.error('Erro ao gerar PDF:', err);
        alert('Não foi possível gerar o PDF. Veja o console para detalhes.');
      });
    });
  })();
  
  // inicializa adicionais
  renderAdditionalTable();
});