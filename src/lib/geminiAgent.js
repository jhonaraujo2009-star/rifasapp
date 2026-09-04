// =============================================================
//  geminiAgent.js — REST API directa (sin SDK)
//  ✅ Optimizado:
//    - Fallback automático: gemini-3.5-flash-lite → 2.0-flash → 1.5-flash
//    - Si un modelo da 503/429, salta al siguiente SIN demora
//    - Timeout: 30 segundos por modelo
//    - Callbacks de progreso en tiempo real
// =============================================================

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Modelos en orden de prioridad: el más rápido primero, fallback si hay 503
const MODELS = [
  'gemini-3.5-flash-lite',   // ⚡ Más rápido y ligero (reemplaza 2.0-flash-lite)
  'gemini-2.0-flash',        // ⚡ Rápido, buen balance
  'gemini-1.5-flash',        // ⚡ Backup confiable
];
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const TIMEOUT  = 30000; // 30 segundos máximo por llamada

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
    description: 'Cambia el estado de uno o varios números de rifa a "vendido" o "disponible". Si el usuario menciona el nombre del comprador (ej: "a nombre de Daniel Lara"), incluirlo en nombre_comprador.',
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
        nombre_comprador: {
          type: 'STRING',
          description: 'Nombre de la persona que compra los números. Solo cuando el estado es "vendido" y el usuario lo menciona.',
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

/* ── Llamada a la API REST con timeout y fallback automático ── */
async function callGemini(contents, systemText) {
  const body = {
    systemInstruction: {
      parts: [{ text: systemText }],
    },
    contents,
    tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
    generationConfig: { temperature: 0.2 },
  };

  let lastError = null;

  for (const model of MODELS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);

    try {
      const url = `${API_BASE}/${model}:generateContent?key=${API_KEY}`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (resp.ok) {
        console.log(`✅ Respuesta exitosa con modelo: ${model}`);
        return resp.json();
      }

      const err = await resp.json();
      const code = err?.error?.code || resp.status;

      // 503 (sobrecarga) o 429 (límite de cuota): intentar siguiente modelo
      if (code === 503 || code === 429) {
        console.warn(`⚠️ ${model} no disponible (${code}), intentando siguiente modelo...`);
        lastError = new Error(`${model}: ${err?.error?.message || `Error ${code}`}`);
        continue;
      }

      // Otro error: fallar inmediatamente
      throw new Error(JSON.stringify(err));
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn(`⏱️ ${model} tardó demasiado, intentando siguiente modelo...`);
        lastError = new Error(`${model}: timeout`);
        continue;
      }
      // Si no es timeout ni 503/429, propagar el error
      if (!lastError || (!err.message.includes('503') && !err.message.includes('429'))) {
        throw err;
      }
      lastError = err;
    } finally {
      clearTimeout(timer);
    }
  }

  // Si todos los modelos fallaron
  throw new Error(
    '❌ Todos los modelos están sobrecargados. Intenta de nuevo en unos segundos.\n' +
    `Último error: ${lastError?.message || 'desconocido'}`
  );
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
    'IMPORTANTE: Cuando el usuario diga "véndeme el X a nombre de [persona]" o "el X para [persona]", ' +
    'SIEMPRE incluye el nombre de la persona en el campo nombre_comprador al llamar actualizarEstadoNumeros. ' +
    'Si el usuario no menciona un nombre, no incluyas nombre_comprador. ' +
    'Confirma siempre la acción realizada con un mensaje claro y amigable, incluyendo el nombre del comprador si fue proporcionado.';

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