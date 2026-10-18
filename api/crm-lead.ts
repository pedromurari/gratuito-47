// Vercel Serverless Function — Registra lead no CRM e cria usuário na área de membros
// Usa formato (req, res) porque o runtime Node.js não suporta Web API handler (req.json)

export const config = {
  maxDuration: 30,
};

const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout:${label}`)), ms)
    ),
  ]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// POST com retry — a inserção em disparo_leads às vezes falha com 409 (violação de
// FK em campanha_id) mesmo a campanha existindo; retry curto resolve na prática.
async function postDisparoLeadComRetry(
  url: string, headers: Record<string, string>, body: string, tentativas = 3
): Promise<Response> {
  let ultimaResposta: Response | null = null;
  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    const r = await fetch(url, { method: 'POST', headers, body });
    if (r.ok) return r;
    ultimaResposta = r;
    const corpo = await r.clone().text().catch(() => '');
    console.error(`[DISPARO_INSERT_FALHA] tentativa ${tentativa}/${tentativas} status:${r.status} body:${corpo}`);
    if (tentativa < tentativas) await sleep(300 * tentativa);
  }
  return ultimaResposta as Response;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const crmUrl = process.env.CRM_SUPABASE_URL?.trim();
  const crmKey = process.env.CRM_SUPABASE_SERVICE_KEY?.trim();
  const lancamentoId = process.env.LANCAMENTO_ID?.trim();

  if (!crmUrl || !crmKey || !lancamentoId) {
    console.error('Variáveis de ambiente do CRM não configuradas');
    res.status(500).json({ error: 'Configuração incompleta' });
    return;
  }

  try {
    const { nome, email, whatsapp, cidade, utm_source, utm_medium, utm_campaign, utm_content, utm_term } = req.body;

    const now = new Date().toISOString();
    const phoneClean = (whatsapp ?? '').replace(/\D/g, '');

    // ── Operações críticas em paralelo ───────────────────────────────────────
    const membersUrl = process.env.MEMBERS_AREA_URL;
    const membersKey = process.env.MEMBERS_AREA_API_KEY;

    const crmPromise = withTimeout(
      fetch(`${crmUrl}/rest/v1/lancamento_leads`, {
        method: 'POST',
        headers: {
          apikey: crmKey,
          Authorization: `Bearer ${crmKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lancamento_id: lancamentoId,
          nome, email, whatsapp, cidade,
          fase: 'planilha', crm: false,
          data_entrada: now, ultima_atividade: now,
        }),
      }),
      3000,
      'crm-insert'
    );

    const userPromise = (membersUrl && membersKey)
      ? withTimeout(
          fetch(`${membersUrl}/api/criar-usuario`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${membersKey}`,
            },
            body: JSON.stringify({ email, nome, whatsapp, route: 'semanadodespertar-47' }),
          }).then((r) => r.json()),
          4000,
          'criar-usuario'
        )
      : Promise.resolve(null);

    // ── Operações secundárias em paralelo ────────────────────────────────────
    const sheetsUrl = process.env.SHEETS_WEBHOOK_URL?.trim();
    const gasPromise = sheetsUrl
      ? withTimeout(
          (() => {
            const p = new URLSearchParams({ nome: nome ?? '', email: email ?? '', whatsapp: whatsapp ?? '' });
            if (utm_source)   p.set('utm_source',   utm_source);
            if (utm_medium)   p.set('utm_medium',   utm_medium);
            if (utm_campaign) p.set('utm_campaign', utm_campaign);
            if (utm_content)  p.set('utm_content',  utm_content);
            if (utm_term)     p.set('utm_term',     utm_term);
            return fetch(`${sheetsUrl}?${p.toString()}`, { method: 'GET' });
          })(),
          2000,
          'gas'
        )
      : Promise.resolve(null);

    const disparoCampanhaId = '15cb2548-faab-4c2a-9e27-6fd664cfa512';
    // ordem em segundos (não milissegundos) para caber em integer do PostgreSQL
    const ordemSegundos = Math.floor(Date.now() / 1000);

    const disparoPromise = withTimeout(
      postDisparoLeadComRetry(
        `${crmUrl}/rest/v1/disparo_leads`,
        {
          apikey: crmKey,
          Authorization: `Bearer ${crmKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        JSON.stringify({ campanha_id: disparoCampanhaId, nome, phone: phoneClean, status: 'pendente', ordem: ordemSegundos }),
      ).then(async (r) => {
        // O disparo-runner marca a campanha como 'concluido' sempre que a fila esvazia, e
        // campanha concluída não processa mais nada. Com lead entrando o dia todo, reativa
        // (só se estiver concluída; o next_send_at fica como está, respeitando o delay).
        await fetch(`${crmUrl}/rest/v1/disparo_campanhas?id=eq.${disparoCampanhaId}&status=eq.concluido`, {
          method: 'PATCH',
          headers: {
            apikey: crmKey,
            Authorization: `Bearer ${crmKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ status: 'ativo' }),
        }).catch(() => {});
        return r;
      }),
      9000,
      'disparo'
    );

    const boasVindasPromise = withTimeout(
      fetch(`${crmUrl}/functions/v1/boas-vindas-enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: crmKey },
        body: JSON.stringify({ funnel_name: 'Turma #47', nome, email, whatsapp }),
      }),
      4000,
      'boas-vindas'
    );

    // ── Aguarda tudo em paralelo ──────────────────────────────────────────────
    const [crmResult, userResult, gasResult, disparoResult, boasVindasResult] =
      await Promise.allSettled([crmPromise, userPromise, gasPromise, disparoPromise, boasVindasPromise]);

    // Log de status (inclui projeto Supabase para diagnóstico)
    const crmProjectRef = crmUrl?.match(/https:\/\/([^.]+)\./)?.[1] ?? 'unknown';
    console.log('[CRM_PROJECT]', crmProjectRef);
    console.log('[CRM]', crmResult.status, crmResult.status === 'rejected' ? (crmResult as PromiseRejectedResult).reason : '');
    if (crmResult.status === 'fulfilled') {
      const r = (crmResult as PromiseFulfilledResult<Response>).value;
      console.log('[CRM_STATUS]', r.status, r.ok ? 'ok' : 'FAIL');
    }
    console.log('[USER]', userResult.status, userResult.status === 'rejected' ? (userResult as PromiseRejectedResult).reason : '');
    console.log('[GAS]', gasResult.status, gasResult.status === 'fulfilled' && (gasResult as PromiseFulfilledResult<Response | null>).value ? `status:${((gasResult as PromiseFulfilledResult<Response>).value)?.status}` : (gasResult.status === 'rejected' ? (gasResult as PromiseRejectedResult).reason : ''));
    console.log('[DISPARO]', disparoResult.status, disparoResult.status === 'rejected' ? (disparoResult as PromiseRejectedResult).reason : '');
    if (disparoResult.status === 'fulfilled') {
      const r = (disparoResult as PromiseFulfilledResult<Response>).value;
      console.log('[DISPARO_STATUS]', r.status, r.ok ? 'ok' : 'FAIL_APOS_RETRIES');
    }
    console.log('[BOAS-VINDAS]', boasVindasResult.status);

    // CRM insert falhou → log mas não bloqueia o lead
    if (crmResult.status === 'rejected') {
      console.error('[CRM] REJECTED — lead continua para loginUrl');
    } else {
      const crmResponse = (crmResult as PromiseFulfilledResult<Response>).value;
      if (!crmResponse.ok) {
        console.error('[CRM] INSERT falhou com status:', crmResponse.status, '— lead continua para loginUrl');
      }
    }

    const loginUrl: string | null =
      userResult.status === 'fulfilled' && (userResult as PromiseFulfilledResult<{ loginUrl?: string } | null>).value?.loginUrl
        ? (userResult as PromiseFulfilledResult<{ loginUrl: string }>).value.loginUrl
        : null;

    console.log('[LOGIN_URL]', loginUrl ?? 'null — lead irá para /login');

    res.status(200).json({ success: true, loginUrl });
  } catch (error) {
    console.error('Erro na função crm-lead:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
}
