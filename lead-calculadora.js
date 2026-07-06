// api/lead-calculadora.js
// Função serverless independente da Vercel — projeto separado, sem Next.js.
// Recebe o lead da calculadora e salva no Supabase + Google Sheets.

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // service role, nunca a chave pública aqui
);

const GOOGLE_SHEETS_WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

async function salvarNaPlanilha(lead) {
  try {
    await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead),
    });
  } catch (err) {
    console.error('Falha ao salvar lead na planilha:', err);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { nome, whatsapp, objetivo, percentual_gordura, classificacao } = req.body;

    if (!nome || !whatsapp || !objetivo) {
      return res.status(400).json({ error: 'Campos obrigatórios: nome, whatsapp, objetivo' });
    }

    // 1. Salva no Supabase (fonte de verdade)
    const { data, error } = await supabase
      .from('leads_calculadora')
      .insert({ nome, whatsapp, objetivo, percentual_gordura, classificacao })
      .select()
      .single();

    if (error) throw error;

    // 2. Salva também na planilha (visão rápida)
    await salvarNaPlanilha({ nome, whatsapp, objetivo, percentual_gordura, classificacao });

    return res.status(200).json({ success: true, leadId: data.id });
  } catch (err) {
    console.error('Erro no endpoint lead-calculadora:', err);
    return res.status(500).json({ error: err.message });
  }
};
