// Vercel Serverless Function — Proxy para a API de municípios do IBGE
// Necessário porque o navegador bloqueia a chamada direta ao IBGE por CORS

export const config = {
  runtime: 'edge',
};

export default async function handler(): Promise<Response> {
  try {
    const res = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios');
    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Falha ao buscar municípios' }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (error) {
    console.error('Erro ao buscar municípios do IBGE:', error);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
