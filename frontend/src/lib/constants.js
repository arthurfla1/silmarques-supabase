export const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
};
export const fmtMoney = (v) =>
  (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const todayStr = () => new Date().toISOString().slice(0, 10);
export const addDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
export const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  const t = new Date(todayStr() + 'T00:00:00');
  return Math.round((d - t) / 86400000);
};
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const CONTA_CATEGORIAS = ['Água', 'Energia', 'Internet', 'Telefone', 'Condomínio', 'Gás', 'Streaming', 'Escola', 'Cartões', 'Financiamentos','Aluguel', 'Seguro Residencial', 'Impostos', 'Cinema','Restaurantes','Padaria','Outros'];
export const ESTOQUE_CATEGORIAS = ['Alimentos','Bebidas','Produtos de Limpeza','Higiene Pessoal','Medicamentos','Ração Pet','Utilidades Domésticas','Outros'];
export const ESTOQUE_LOCAIS = ['Geladeira','Freezer','Despensa','Armário','Lavanderia','Banheiro','Garagem'];
export const LIMPEZA_AMBIENTES = ['Sala','Cozinha','Quartos','Banheiros','Área de Serviço','Quintal','Garagem'];
export const LIMPEZA_FREQ = ['Diária','Semanal','Quinzenal','Mensal','Eventual'];
export const LIMPEZA_PRIORIDADES = ['Baixa','Média','Alta','Urgente'];
export const VEICULO_CATEGORIAS = ['Manutenção Preventiva','Manutenção Corretiva','Troca de Óleo','Pneus','Freios','Suspensão','Elétrica','Funilaria','Pintura','Batida/Colisão','Revisão','Seguro','Documentação','Acessórios','Outros'];
export const DOC_CATEGORIAS = ['Escritura','IPTU','Contratos','Seguro Residencial','Notas Fiscais','Comprovantes','Manuais','Garantias','Certificados','Documentos dos Veículos','Documentos Pessoais','Outros'];
export const BEM_CATEGORIAS = ['Eletrodomésticos','Eletrônicos','Móveis','Ferramentas','Equipamentos de Cozinha','Ar-condicionado','Informática','Veículos','Outros'];
export const COMPRA_UNIDADES = ['Kg','g','Unidade','Caixa','Maço','L','ml','Pacote'];
export const MERCADO_CATEGORIAS = ['Hortifruti','Açougue','Frios','Padaria','Limpeza','Higiene Pessoal','Bebidas','Congelados','Mercearia','Pet','Utilidades Domésticas'];
export const PERMISSOES = ['Administrador','Morador','Colaborador'];
export const FEIRA_ITENS = {
  'Frutas': ['Banana','Maçã','Pera','Uva','Manga','Mamão','Melão','Melancia','Laranja','Limão','Abacaxi'],
  'Verduras': ['Alface','Couve','Rúcula','Agrião','Espinafre'],
  'Legumes': ['Batata','Cenoura','Tomate','Pepino','Chuchu','Beterraba','Abobrinha','Cebola','Alho'],
};
export const CAR_BRANDS = {
  'Toyota': ['Corolla','Hilux','Yaris','SW4','RAV4'],
  'Honda': ['Civic','CG 160','HR-V','Fit','City'],
  'Volkswagen': ['Gol','Polo','T-Cross','Saveiro','Virtus'],
  'Chevrolet': ['Onix','Tracker','S10','Spin','Cruze'],
  'Fiat': ['Argo','Strada','Toro','Mobi','Pulse','Cronos','Fastback'],
  'Hyundai': ['HB20','Creta','HB20S'],
  'BYD': ['Dolphin','Dolphin Mini','Song Plus','Song Pro','Seal','Yuan Plus','King','Tan','Shark'],
  'GWM': ['Haval H6','Ora 03','Ora 05','Haval H9','Poer P30'],
  'Caoa Chery': ['Tiggo 5X','Tiggo 7','Tiggo 8','Arrizo 6'],
  'Yamaha': ['Fazer 250','MT-03','XTZ 250'],
  'JEEP': ['Renegade','Compass','Commander'],
  'Renault': ['Kwid','Duster','Oroch'],
  'Kia': ['Sportage','Sonet'],
  'Land Rover': ['Defender','Discovery','Range Rover'],
  'BMW': ['ix5', 'iX2','iX1','i7','i4','X1','X2','X3','X5','X6','X7','M2','M3','M4','Série 1','Série 2','Série 3','Série 4','Série 5'],
  'Mercedes-Benz': ['C-Class','E-Class','S-Class','GLA','GLB','GLC','GLE','GLS'],
  'Audi': ['A4','A6','A8','Q3','Q5','Q7','Q8'],
  'Volvo': ['XC40','XC60','XC90'],
  'Mini': ['Mini Cooper','Mini Countryman'],
  'Outra': ['Outro modelo'],
};

export function downloadCSV(data, filename) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
