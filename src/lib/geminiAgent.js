// =============================================================
//  geminiAgent.js — REST API directa (sin SDK)
//  Evitamos los problemas de compatibilidad entre SDKs.
//  Usamos fetch nativo contra la API v1beta con el modelo
//  gemini-1.5-flash-001 (versión específica, no alias).
// =============================================================

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL   = 'gemini-flash-latest';
const BASE    = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}`;

if (!API_KEY) {
  console.error('⚠️ VITE_GEMINI_API_KEY no definida. Reinicia npm run dev.');
}

/* ── Declaraciones de funciones para la IA ───────────────────── */
const FUNCTION_DECLARATIONS = [
  {
    name: 'verificarDisponibilidad',
    description: 'Verifica si los números de rifa indicados están disponibles, vendidos o apartados.',
    parameters: {
      type: 'OBJECT',
      properties: {
        numeros: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'Números a consultar, ej: ["031","048"]',
        },
      },
      required: ['numeros'],
    },
  },
  {
    name: 'actualizarEstadoNumeros',
    description: 'Cambia el estado de uno o varios números de rifa a "vendido" o "disponible".',
    parameters: {
      type: 'OBJECT',
      properties: {
        numeros: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'Números a actualizar',
        },
        estado: {
          type: 'STRING',
          enum: ['vendido', 'disponible'],
          description: 'Nuevo estado',
        },
      },
      required: ['numeros', 'estado'],
    },
  },
  {
    name: 'generarTicket',
    description: 'Genera un ticket visual de compra para un cliente.',
    parameters: {
      type: 'OBJECT',
      properties: {
        nombre_comprador: {
          type: 'STRING',
          description: 'Nombre del comprador',
        },
        numeros: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'Números comprados',
        },
      },
      required: ['nombre_comprador', 'numeros'],
    },
  },
];

/* ── Llamada a la API REST ───────────────────────────────────── */
async function callGemini(contents, systemText) {
  const body = {
    systemInstruction: {
      parts: [{ text: systemText }],
    },
    contents,
    tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
    generationConfig: { temperature: 0.2 },
  };

  const resp = await fetch(`${BASE}:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(JSON.stringify(err));
  }

  return resp.json();
}

/**
 * Ejecuta el agente con texto o audio.
 * @param {Object} params
 * @param {string}  [params.textInput]
 * @param {string}  [params.audioBase64]
 * @param {string}  [params.audioMimeType]
 * @param {string}   params.rifaName
 * @param {Function} params.onFunctionCall — async (name, args) => result
 * @returns {Promise<string>}
 */
export async function runAgent({
  textInput,
  audioBase64,
  audioMimeType,
  rifaName,
  onFunctionCall,
}) {
  if (!API_KEY) {
    throw new Error('API key no configurada. Reinicia el servidor (npm run dev).');
  }

  const systemText =
    `Eres el asistente de administración de la rifa "${rifaName}". ` +
    'Ayudas al administrador a verificar números, marcarlos como vendidos/disponibles y generar tickets. ' +
    'Siempre responde en español. Los números van del 000 al 999. ' +
    'Si el usuario dice "el 5", interpreta "005". ' +
    'Confirma siempre la acción realizada con un mensaje claro y amigable.';

  // Construir el primer mensaje del usuario
  const firstParts = [];
  if (audioBase64 && audioMimeType) {
    firstParts.push({ inlineData: { mimeType: audioMimeType, data: audioBase64 } });
    firstParts.push({ text: 'Transcribe y ejecuta la acción indicada en el audio.' });
  } else {
    firstParts.push({ text: textInput || '' });
  }

  // Historial de conversación (multi-turn)
  const contents = [
    { role: 'user', parts: firstParts },
  ];

  // Loop de Function Calling
  let maxIter = 10;
  while (maxIter-- > 0) {
    const data = await callGemini(contents, systemText);
    const candidate = data.candidates?.[0];

    if (!candidate) throw new Error('Respuesta vacía de Gemini');

    const parts = candidate.content?.parts ?? [];

    // Añadir la respuesta del modelo al historial
    contents.push({ role: 'model', parts });

    // ¿Hay llamadas a funciones?
    const fnCalls = parts.filter(p => p.functionCall);

    if (fnCalls.length === 0) {
      // Respuesta de texto final
      const textPart = parts.find(p => p.text);
      return textPart?.text ?? '(sin respuesta)';
    }

    // Ejecutar cada función y construir las respuestas
    const fnResponseParts = [];
    for (const part of fnCalls) {
      const { name, args } = part.functionCall;
      let result;
      try {
        result = await onFunctionCall(name, args);
      } catch (err) {
        console.error(`Error en ${name}:`, err);
        result = { error: err.message };
      }
      fnResponseParts.push({
        functionResponse: { name, response: { result } },
      });
    }

    // Añadir resultados al historial y continuar
    contents.push({ role: 'user', parts: fnResponseParts });
  }

  throw new Error('Se alcanzó el límite de iteraciones en Function Calling.');
}
