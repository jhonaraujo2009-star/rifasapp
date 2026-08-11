// =============================================================
//  geminiAgent.js — REST API directa (sin SDK)
//  ✅ Optimizado:
//    - Modelo: gemini-2.5-flash (más rápido e inteligente)
//    - Timeout: 15 segundos por llamada (no se queda pegado)
//    - Callbacks de progreso en tiempo real
// =============================================================

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL   = 'gemini-flash-lite-latest';
const BASE    = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}`;
const TIMEOUT = 15000; // 15 segundos máximo por llamada

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

/* ── Llamada a la API REST con timeout ──────────────────────── */
async function callGemini(contents, systemText) {
  const body = {
    systemInstruction: {
      parts: [{ text: systemText }],
    },
    contents,
    tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
    generationConfig: { temperature: 0.2 },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const resp = await fetch(`${BASE}:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(JSON.stringify(err));
    }

    return resp.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('⏱️ Gemini tardó demasiado en responder (más de 15 segundos). Intenta de nuevo.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ejecuta el agente con texto.
 * @param {Object} params
 * @param {string}   params.textInput
 * @param {string}   params.rifaName
 * @param {Function} params.onFunctionCall — async (name, args) => result
 * @param {Function} [params.onProgress]   — (stepText) => void  — progreso en tiempo real
 * @param {Array}    [params.history]      — historial previo de conversación
 * @returns {Promise<{text: string, history: Array}>}  — respuesta + historial actualizado
 */
export async function runAgent({
  textInput,
  rifaName,
  onFunctionCall,
  onProgress,
  history = [],
}) {
  if (!API_KEY) {
    throw new Error('API key no configurada. Reinicia el servidor (npm run dev).');
  }

  const progress = onProgress || (() => {});

  const systemText =
    `Eres el asistente de administración de la rifa "${rifaName}". ` +
    'Ayudas al administrador a verificar números, marcarlos como vendidos/disponibles y generar tickets. ' +
    'Siempre responde en español. Los números van del 000 al 999. ' +
    'Si el usuario dice "el 5", interpreta "005". ' +
    'Responde de forma breve y directa. ' +
    'Si el usuario se refiere a algo mencionado antes en la conversación (como "esos números"), recuerda el contexto. ' +
    'Confirma siempre la acción realizada con un mensaje claro y amigable.';

  // Construir el mensaje actual del usuario
  progress('💬 Procesando mensaje...');
  const firstParts = [{ text: textInput || '' }];

  // Historial de conversación: mensajes anteriores + mensaje actual
  // Limitar historial a los últimos 20 mensajes para no exceder el contexto
  const trimmedHistory = history.slice(-20);
  const contents = [
    ...trimmedHistory,
    { role: 'user', parts: firstParts },
  ];

  // Loop de Function Calling
  let maxIter = 10;
  while (maxIter-- > 0) {
    progress('🧠 Pensando...');
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
      progress('✅ Listo');
      const textPart = parts.find(p => p.text);
      const replyText = textPart?.text ?? '(sin respuesta)';
      return { text: replyText, history: contents };
    }

    // Ejecutar cada función y construir las respuestas
    const fnResponseParts = [];
    for (const part of fnCalls) {
      const { name, args } = part.functionCall;
      const friendlyNames = {
        verificarDisponibilidad: '🔍 Consultando números...',
        actualizarEstadoNumeros: '✏️ Actualizando estado...',
        generarTicket: '🎫 Generando ticket...',
      };
      progress(friendlyNames[name] || `⚙️ Ejecutando ${name}...`);

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
    progress('🧠 Generando respuesta...');
  }

  throw new Error('Se alcanzó el límite de iteraciones en Function Calling.');
}