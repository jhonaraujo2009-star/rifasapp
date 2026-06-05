// =============================================================
//  geminiAgent.js
//  Lógica del agente Gemini: inicialización, herramientas (Tools)
//  y función principal runAgent() que maneja el loop de
//  Function Calling hasta obtener una respuesta de texto final.
// =============================================================
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

/* ── Definición de herramientas (Function Declarations) ──────── */
const tools = [
  {
    functionDeclarations: [
      {
        name: 'verificarDisponibilidad',
        description:
          'Verifica si los números de rifa indicados están disponibles, vendidos o apartados en la base de datos.',
        parameters: {
          type: 'OBJECT',
          properties: {
            numeros: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              description:
                'Lista de números de rifa a consultar. Ejemplo: ["031", "048", "125"].',
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
          type: 'OBJECT',
          properties: {
            numeros: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              description: 'Lista de números a actualizar.',
            },
            estado: {
              type: 'STRING',
              enum: ['vendido', 'disponible'],
              description: 'Nuevo estado para los números.',
            },
          },
          required: ['numeros', 'estado'],
        },
      },
      {
        name: 'generarTicket',
        description:
          'Genera un ticket visual de compra para un cliente con sus números de rifa.',
        parameters: {
          type: 'OBJECT',
          properties: {
            nombre_comprador: {
              type: 'STRING',
              description: 'Nombre completo del comprador.',
            },
            numeros: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              description: 'Números adquiridos por el comprador.',
            },
          },
          required: ['nombre_comprador', 'numeros'],
        },
      },
    ],
  },
];

/**
 * Ejecuta el agente con un input de texto o audio.
 *
 * @param {Object} params
 * @param {string}  [params.textInput]      - Texto del usuario
 * @param {string}  [params.audioBase64]    - Audio en base64
 * @param {string}  [params.audioMimeType]  - MIME del audio (ej: 'audio/webm')
 * @param {string}   params.rifaName        - Nombre de la rifa activa
 * @param {Function} params.onFunctionCall  - Callback (name, args) => result
 * @returns {Promise<string>} Texto final del agente
 */
export async function runAgent({ textInput, audioBase64, audioMimeType, rifaName, onFunctionCall }) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    tools,
    systemInstruction: `Eres un asistente de administración inteligente para la rifa "${rifaName}".
Tu función es ayudar al administrador a gestionar los números de rifa mediante comandos de voz o texto.

REGLAS:
- Si el admin pide verificar o saber el estado de números → llama verificarDisponibilidad.
- Si pide marcar como vendido o disponible → llama actualizarEstadoNumeros.
- Si pide hacer/generar un ticket o comprobante → llama generarTicket con el nombre del comprador y los números.
- Puedes llamar múltiples funciones en una sola respuesta si el comando lo requiere (ej: marcar como vendido Y generar ticket).
- Siempre responde en español confirmando exactamente lo que hiciste con un mensaje amigable y claro.
- Los números de rifa van del 000 al 999. Si el usuario dice "el 31", entiéndelo como "031".`,
  });

  /* ── Construir partes del mensaje ───────────────────────── */
  const parts = [];

  if (audioBase64 && audioMimeType) {
    parts.push({ inlineData: { mimeType: audioMimeType, data: audioBase64 } });
    parts.push({ text: 'Transcribe este audio y ejecuta la acción que indica el administrador.' });
  } else {
    parts.push({ text: textInput || '' });
  }

  /* ── Loop de Function Calling ───────────────────────────── */
  const chat = model.startChat();
  let response = await chat.sendMessage(parts);

  // Mientras haya llamadas a funciones pendientes, las ejecutamos
  while (response.response.functionCalls()?.length > 0) {
    const calls = response.response.functionCalls();
    const functionResults = [];

    for (const call of calls) {
      let result;
      try {
        result = await onFunctionCall(call.name, call.args);
      } catch (err) {
        result = { error: err.message };
      }

      functionResults.push({
        functionResponse: {
          name: call.name,
          response: { result },
        },
      });
    }

    response = await chat.sendMessage(functionResults);
  }

  return response.response.text();
}
