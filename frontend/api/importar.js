import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';
import Papa from 'papaparse';
import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';

export const config = {
  api: {
    bodyParser: false,
  },
};

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

// Fallback to anonymous key for local dev if service role is missing
// In production, you MUST use SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  try {
    // 1. Extrair usuário do token JWT
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token || token === 'undefined') return res.status(401).json({ erro: 'Não autenticado (token ausente ou undefined)' });

    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return res.status(401).json({ 
        erro: 'Token inválido', 
        detalhe: authError?.message || 'Usuário não encontrado',
        url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL ? 'URL OK' : 'URL MISSING'
      });
    }
    const usuarioId = userData.user.id;

    // Buscar o household_id
    const { data: profile } = await supabase.from('profiles').select('household_id').eq('id', usuarioId).single();
    const householdId = profile?.household_id;
    if (!householdId) return res.status(400).json({ erro: 'Household não encontrado' });

    // 2. Parse do form (multipart/form-data)
    const form = formidable({ multiples: false });
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const file = files.arquivo;
    if (!file) return res.status(400).json({ erro: 'Nenhum arquivo enviado' });

    const responsavel = Array.isArray(fields.responsavel) ? fields.responsavel[0] : fields.responsavel;
    const visibilidade = Array.isArray(fields.visibilidade) ? fields.visibilidade[0] : fields.visibilidade || 'Geral';
    const cartaoId = Array.isArray(fields.cartao_id) ? fields.cartao_id[0] : fields.cartao_id;

    const filePath = Array.isArray(file) ? file[0].filepath : file.filepath;
    const fileName = Array.isArray(file) ? file[0].originalFilename : file.originalFilename;
    const fileContent = fs.readFileSync(filePath, 'utf8');

    // Registra a importacao (opcional, bom para log)
    const { data: importacao } = await supabase
      .from('importacoes')
      .insert({
        household_id: householdId,
        nome_arquivo: fileName,
        tipo_arquivo: 'csv',
        status: 'processando'
      })
      .select()
      .single();

    // 3. Parse CSV (Nubank)
    // O CSV do Nubank tem as colunas: date, title, amount
    const parsed = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
    
    const transacoesBrutas = parsed.data
      .map(row => {
        // Suporte a diferentes formatos de CSV
        const rawValor = row.amount || row.Valor || row.valor || '0';
        const rawDesc = row.title || row.Descrição || row.descricao || '';
        const rawData = row.date || row.Data || row.data;
        
        let valStr = rawValor.toString().replace(/\./g, '').replace(',', '.');
        let valorNum = parseFloat(valStr);
        
        // Em faturas de cartão, compras são positivas e pagamentos são negativos.
        // Em conta corrente, compras são negativas e receitas são positivas.
        // Como o padrão do Nubank Cartão é compras > 0, vamos usar o valor absoluto para a interface,
        // e usar a flag tipo_transacao.
        
        let tipo = 'despesa';
        let descLower = rawDesc.toLowerCase();
        
        if (descLower.includes('pagamento recebido') || descLower.includes('pagamento da fatura') || descLower.includes('pagamento em lotérica')) {
          tipo = 'transferencia';
        } else if (valorNum < 0 && row.amount) {
          // No cartão Nubank, valor negativo é estorno ou pagamento (entrada de limite)
          tipo = 'receita';
        } else if (valorNum > 0 && (row.Valor || row.Identificador)) {
           // Se for conta corrente, valor positivo é entrada (receita)
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
    const transacoesNorm = transacoesBrutas.map(t => {
      // Hash: data + descricao + valor
      const hash = crypto.createHash('sha256').update(`${t.data}_${t.descricao}_${t.valor}`).digest('hex');
      return { ...t, hash };
    });

    // Buscar hashes já existentes
    const hashes = transacoesNorm.map(t => t.hash);
    const { data: existentes } = await supabase
      .from('contas')
      .select('hash_dedup')
      .eq('household_id', householdId)
      .in('hash_dedup', hashes);

    const setExistentes = new Set((existentes || []).map(e => e.hash_dedup));
    const transacoesNovas = transacoesNorm.filter(t => !setExistentes.has(t.hash));

    if (transacoesNovas.length === 0) {
      if (importacao) await supabase.from('importacoes').update({ status: 'concluido', total_duplicados: transacoesNorm.length }).eq('id', importacao.id);
      return res.status(200).json({ importado: 0, duplicados: transacoesNorm.length });
    }

    // 5. Classificação (Regras -> IA)
    // A. Buscar regras fixas
    const { data: regras } = await supabase.from('regras_classificacao').select('*').eq('household_id', householdId);
    
    // B. Preparar Gemini
    let genAI = null;
    let model = null;
    if (process.env.GEMINI_API_KEY) {
      genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    const paraInserir = [];
    for (const t of transacoesNovas) {
      let categoria = 'Outros';
      let confirmada = false;

      // Match por regra
      const regra = regras?.find(r => t.descricao.toLowerCase().includes(r.palavra_chave.toLowerCase()));
      if (regra) {
        categoria = regra.categoria;
        confirmada = true;
      } else if (model) {
        // Match por IA
        try {
          const matchMap = {
            'agua': '💧 Água',
            'energia': '⚡ Energia',
            'internet': '🌐 Internet',
            'telefone': '📱 Telefone',
            'condominio': '🏢 Condomínio',
            'gas': '🔥 Gás',
            'streaming': '📺 Streaming',
            'escola': '📚 Escola',
            'cartoes': '💳 Cartões',
            'financiamentos': '🏦 Financiamentos',
            'aluguel': '🏠 Aluguel',
            'seguro': '🛡️ Seguro Residencial',
            'impostos': '🧾 Impostos',
            'cinema': '🍿 Cinema',
            'restaurantes': '🍽️ Restaurantes',
            'padaria': '🥖 Padaria',
            'shopping': '🛍️ Compras em Shopping',
            'online': '📦 Compras Online',
            'supermercado': '🛒 Supermercado',
            'farmacia': '💊 Farmácia',
            'transporte': '🚗 Transporte/Combustível',
            'pet': '🐶 Pet',
            'salario': '💰 Salário',
            'renda_extra': '🚀 Renda Extra / Freelance',
            'rendimentos': '📈 Rendimentos / Investimentos',
            'presente': '🎁 Presente / Doação',
            'emprestimo': '🤝 Empréstimo Recebido',
            'venda': '📦 Venda de Itens',
            'transferencia': '🔄 Transferência',
            'outros': '✨ Outros'
          };
          
          const prompt = `Classifique a transação "${t.descricao}". Escolha apenas UMA chave desta lista: agua, energia, internet, telefone, condominio, gas, streaming, escola, cartoes, financiamentos, aluguel, seguro, impostos, cinema, restaurantes, padaria, shopping, online, supermercado, farmacia, transporte, pet, salario, renda_extra, rendimentos, presente, emprestimo, venda, transferencia, outros. Responda APENAS a chave exata em letras minúsculas.`;
          
          const result = await model.generateContent(prompt);
          const resposta = result.response.text().trim().toLowerCase().replace(/[^a-z_]/g, '');
          
          if (matchMap[resposta]) {
            categoria = matchMap[resposta];
          } else {
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
        forma: 'Cartão de Crédito', // assumindo padrão Nubank fatura
        responsavel: responsavel || null,
        visibilidade: visibilidade,
        cartao_id: cartaoId || null,
        tipo_transacao: t.tipo_transacao,
        natureza_custo: t.tipo_transacao === 'despesa' ? 'variavel' : null,
        hash_dedup: t.hash,
        importacao_id: importacao?.id,
        categoria_confirmada: confirmada,
        origem_importacao: 'nubank_csv'
      });
    }

    // 6. Inserir no banco
    const { error: insertError } = await supabase.from('contas').insert(paraInserir);
    if (insertError) throw insertError;

    if (importacao) {
      await supabase.from('importacoes').update({
        status: 'concluido',
        total_lancamentos: paraInserir.length,
        total_duplicados: transacoesNorm.length - transacoesNovas.length
      }).eq('id', importacao.id);
    }

    res.status(200).json({
      importado: paraInserir.length,
      duplicados: transacoesNorm.length - transacoesNovas.length,
      precisa_revisao: paraInserir.filter(p => !p.categoria_confirmada).length
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro interno no servidor', detalhe: error.message });
  }
}
