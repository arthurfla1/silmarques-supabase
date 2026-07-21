import Papa from 'papaparse';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './supabase';

async function hashString(str) {
  const msgUint8 = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function processarExtratoCSV(file, householdId, defaultResponsavel, defaultVisibilidade, defaultCartao) {
  // 1. Ler o arquivo
  const text = await file.text();

  // 2. Criar importacao no BD
  const { data: importacao } = await supabase
    .from('importacoes')
    .insert({
      household_id: householdId,
      nome_arquivo: file.name,
      tipo_arquivo: 'csv',
      status: 'processando'
    })
    .select()
    .single();

  // 3. Parse CSV (Nubank)
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  
  const transacoesBrutas = parsed.data
    .map(row => {
      const rawValor = row.amount || row.Valor || row.valor || '0';
      const rawDesc = row.title || row.Descrição || row.descricao || '';
      const rawData = row.date || row.Data || row.data;
      
      let valStr = rawValor.toString().replace(/\./g, '').replace(',', '.');
      let valorNum = parseFloat(valStr);
      
      let tipo = 'despesa';
      let descLower = rawDesc.toLowerCase();
      
      if (descLower.includes('pagamento recebido') || descLower.includes('pagamento da fatura') || descLower.includes('pagamento em lotérica')) {
        tipo = 'transferencia';
      } else if (valorNum < 0 && row.amount) {
        tipo = 'receita';
      } else if (valorNum > 0 && (row.Valor || row.Identificador)) {
         tipo = 'receita';
      }
      
      return {
        data: rawData,
        descricao: rawDesc,
        valor: Math.abs(valorNum),
        tipo_transacao: tipo
      };
    })
    .filter(t => t.data && !isNaN(t.valor) && t.valor > 0);

  // 4. Normalização e Deduplicação
  const transacoesNorm = [];
  for (const t of transacoesBrutas) {
    const hash = await hashString(`${t.data}_${t.descricao}_${t.valor}`);
    transacoesNorm.push({ ...t, hash });
  }

  // We no longer filter out duplicates automatically, so all are considered 'novas'
  const transacoesNovas = transacoesNorm;

  if (transacoesNovas.length === 0) {
    return { transacoes: [], duplicados: 0, importacao_id: importacao?.id };
  }

  // 5. Classificação
  const { data: regras } = await supabase.from('regras_classificacao').select('*').eq('household_id', householdId);
  
  let genAI = null;
  let model = null;
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ 
      model: "gemini-flash-latest",
      generationConfig: { responseMimeType: "application/json" }
    });
  }

  const matchMap = {
    'agua': '💧 Água', 'energia': '⚡ Energia', 'internet': '🌐 Internet',
    'telefone': '📱 Telefone', 'condominio': '🏢 Condomínio', 'gas': '🔥 Gás',
    'streaming': '📺 Streaming', 'escola': '📚 Escola', 'cartoes': '💳 Cartões',
    'financiamentos': '🏦 Financiamentos', 'aluguel': '🏠 Aluguel', 'seguro': '🛡️ Seguro Residencial',
    'impostos': '🧾 Impostos', 'cinema': '🍿 Cinema', 'restaurantes': '🍽️ Restaurantes',
    'padaria': '🥖 Padaria', 'shopping': '🛍️ Compras em Shopping', 'online': '📦 Compras Online',
    'supermercado': '🛒 Supermercado', 'farmacia': '💊 Farmácia', 'transporte': '🚗 Transporte/Combustível',
    'pet': '🐶 Pet', 'salario': '💰 Salário', 'renda_extra': '🚀 Renda Extra / Freelance',
    'rendimentos': '📈 Rendimentos / Investimentos', 'presente': '🎁 Presente / Doação',
    'emprestimo': '🤝 Empréstimo Recebido', 'venda': '📦 Venda de Itens',
    'transferencia': '🔄 Transferência', 'outros': '✨ Outros'
  };

  const chavesPermitidas = Object.keys(matchMap).join(', ');

  // 1. Pre-process and find matching local rules
  const transacoesComIA = [];
  const paraInserir = [];
  
  for (let i = 0; i < transacoesNovas.length; i++) {
    const t = transacoesNovas[i];
    const regra = regras?.find(r => t.descricao.toLowerCase().includes(r.palavra_chave.toLowerCase()));
    
    if (regra) {
      paraInserir[i] = { t, categoria: regra.categoria, confirmada: true };
    } else {
      paraInserir[i] = { t, categoria: '✨ Outros', confirmada: false };
      transacoesComIA.push({ index: i, descricao: t.descricao });
    }
  }

  // 2. Classificação em Lote com Gemini (apenas as que não tem regra local)
  if (model && transacoesComIA.length > 0) {
    try {
      const prompt = `Classifique as seguintes transações bancárias.
Escolha apenas UMA chave desta lista para cada transação: ${chavesPermitidas}.
Retorne APENAS um array JSON válido (sem formatação markdown, sem blocos \`\`\`json), contendo APENAS strings, onde cada elemento corresponde, na mesma ordem exata, à categoria da transação correspondente.

Transações:
${transacoesComIA.map(x => `- ${x.descricao}`).join('\n')}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim().replace(/^```(json)?|```$/g, '').trim();
      
      let categoriasIA = [];
      try {
        categoriasIA = JSON.parse(text);
      } catch (e) {
        console.error('Falha ao fazer parse do JSON da IA:', text);
      }

      if (Array.isArray(categoriasIA)) {
        for (let j = 0; j < transacoesComIA.length; j++) {
          const idxObj = transacoesComIA[j];
          let resposta = (categoriasIA[j] || '').toLowerCase().replace(/[^a-z_]/g, '');
          
          let categoriaFinal = '✨ Outros';
          if (matchMap[resposta]) categoriaFinal = matchMap[resposta];
          else {
            const achou = Object.keys(matchMap).find(k => resposta.includes(k));
            if (achou) categoriaFinal = matchMap[achou];
          }
          paraInserir[idxObj.index].categoria = categoriaFinal;
        }
      }
    } catch (e) {
      console.error('Erro na requisição em lote da IA:', e);
      alert('Erro na IA: ' + e.message);
    }
  } else if (transacoesComIA.length > 0 && !model) {
    alert("API Key do Gemini ausente! As transações ficarão como 'Outros'. Verifique se a chave foi inserida corretamente na Vercel e se o deploy foi refeito.");
  }

  // 3. Montar array final
  const resultados = paraInserir.map(({ t, categoria, confirmada }) => ({
    household_id: householdId,
    descricao: t.descricao,
    categoria: categoria,
    valor: t.valor,
    vencimento: t.data,
    status: 'paga',
    forma: 'Cartão', 
    responsavel: defaultResponsavel || null,
    visibilidade: defaultVisibilidade || 'Geral',
    cartao_id: defaultCartao || null,
    tipo_transacao: t.tipo_transacao,
    natureza_custo: t.tipo_transacao === 'despesa' ? 'variavel' : null,
    hash_dedup: t.hash,
    importacao_id: importacao?.id,
    categoria_confirmada: confirmada,
    origem_importacao: 'nubank_csv'
  }));

  return {
    transacoes: resultados,
    duplicados: 0,
    importacao_id: importacao?.id
  };
}
