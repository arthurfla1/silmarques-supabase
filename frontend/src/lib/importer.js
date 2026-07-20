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
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  const paraInserir = [];
  for (const t of transacoesNovas) {
    let categoria = 'Outros';
    let confirmada = false;

    const regra = regras?.find(r => t.descricao.toLowerCase().includes(r.palavra_chave.toLowerCase()));
    if (regra) {
      categoria = regra.categoria;
      confirmada = true;
    } else if (model) {
      try {
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
        
        const prompt = `Classifique a transação "${t.descricao}". Escolha apenas UMA chave desta lista: agua, energia, internet, telefone, condominio, gas, streaming, escola, cartoes, financiamentos, aluguel, seguro, impostos, cinema, restaurantes, padaria, shopping, online, supermercado, farmacia, transporte, pet, salario, renda_extra, rendimentos, presente, emprestimo, venda, transferencia, outros. Responda APENAS a chave exata em letras minúsculas.`;
        
        const result = await model.generateContent(prompt);
        const resposta = result.response.text().trim().toLowerCase().replace(/[^a-z_]/g, '');
        
        if (matchMap[resposta]) categoria = matchMap[resposta];
        else {
          const achou = Object.keys(matchMap).find(k => resposta.includes(k));
          if (achou) categoria = matchMap[achou];
          else categoria = '✨ Outros';
        }
      } catch (e) {
        console.error('Erro na IA:', e);
        categoria = '✨ Outros';
      }
    }

    paraInserir.push({
      household_id: householdId,
      descricao: t.descricao,
      categoria: categoria,
      valor: t.valor,
      vencimento: t.data,
      status: 'paga',
      forma: 'Cartão de Crédito', 
      responsavel: defaultResponsavel || null,
      visibilidade: defaultVisibilidade || 'Geral',
      cartao_id: defaultCartao || null,
      tipo_transacao: t.tipo_transacao,
      natureza_custo: t.tipo_transacao === 'despesa' ? 'variavel' : null,
      hash_dedup: t.hash,
      importacao_id: importacao?.id,
      categoria_confirmada: confirmada,
      origem_importacao: 'nubank_csv'
    });
  }

  return {
    transacoes: paraInserir,
    duplicados: 0,
    importacao_id: importacao?.id
  };
}
