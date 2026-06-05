// =============================================================
//  geminiAgent.js  —  SDK v0.24.1
//  Tipos en minúscula ('object','array','string') requeridos
//  por esta versión del SDK.
// =============================================================
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error(
    '⚠️ VITE_GEMINI_API_KEY no está definida.\n' +
    'Asegúrate de tener un archivo .env en la raíz con:\n' +
    'VITE_GEMINI_API_KEY=tu_clave\n' +
    'Luego reinicia el servidor: npm run dev'
  );
}

const genAI = new GoogleGenerativeAI(API_KEY || '');

/* ── Tools (tipos en lowercase para v0.24.x) ─────────────────── */
const tools = [
  {
    functionDeclarations: [
      {
        name: 'verificarDisponibilidad',
        description:
          'Verifica si los números de rifa indicados están disponibles, vendidos o apartados.',
        parameters: {
          type: 'object',
          properties: {
            numeros: {
              type: 'array',
              items: { type: 'string' },
              description: 'Números a consultar, ej: ["031","048"]',
            },
          },
          required: ['numeros'],
        },
      },
      {
        name: 'actualizarEstadoNumeros',
        description:
          'Cambia el estado de uno o varios números de rifa a "vendido" o "disponible".',
        parameters: {
          type: 'object',
          properties: {
            numeros: {
              type: 'array',
              items: { type: 'string' },
              description: 'Números a actualizar',
            },
            estado: {
              type: 'string',
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
          type: 'object',
          properties: {
            nombre_comprador: {
              type: 'string',
              description: 'Nombre del comprador',
            },
            numeros: {
              type: 'array',
              items: { type: 'string' },
              description: 'Números comprados',
            },
          },
          required: ['nombre_comprador', 'numeros'],
        },
      },
    ],
  },
];

/**
 * Ejecuta el agente con texto o audio.
 * @param {Object} params
 * @param {string}  [params.textInput]
 * @param {string}  [params.audioBase64]
 * @param {string}  [params.audioMimeType]
 * @param {string}   params.rifaName
 * @param {Function} params.onFunctionCall  - async (name, args) => result
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
    throw new Error(
      'API key no configurada. Reinicia el servidor dev (npm run dev) después de guardar el .env'
    );
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    tools,
    systemInstruction:
      `Eres el asistente de administración de la rifa "${rifaName}". ` +
      'Ayudas al administrador a verificar números, marcarlos como vendidos/disponibles y generar tickets. ' +
      'Siempre responde en español. Los números van del 000 al 999. ' +
      'Si el usuario dice "el 5", interpreta "005". ' +
      'Confirma siempre la acción realizada con un mensaje claro y amigable.',
  });

  // Construir partes
  const parts = [];
  if (audioBase64 && audioMimeType) {
    parts.push({ inlineData: { mimeType: audioMimeType, data: audioBase64 } });
    parts.push({ text: 'Transcribe y ejecuta la acción indicada en el audio.' });
  } else {
    parts.push({ text: textInput || '' });
  }

  // Loop de Function Calling
  const chat = model.startChat();
  let resp = await chat.sendMessage(parts);

  let maxIter = 10; // seguridad anti-loop infinito
  while (resp.response.functionCalls()?.length > 0 && maxIter-- > 0) {
    const calls = resp.response.functionCalls();
    const results = [];

    for (const call of calls) {
      let result;
      try {
        result = await onFunctionCall(call.name, call.args);
      } catch (err) {
        console.error(`Error ejecutando ${call.name}:`, err);
        result = { error: err.message };
      }
      results.push({
        functionResponse: {
          name: call.name,
          response: { result },
        },
      });
    }

    resp = await chat.sendMessage(results);
  }

  return resp.response.text();
}
