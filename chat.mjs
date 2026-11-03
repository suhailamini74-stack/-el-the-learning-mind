const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

export default async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Nur POST ist erlaubt." }), { status: 405, headers: cors });

  const apiKey = process.env.EL_GEHIRN;
  if (!apiKey) return new Response(JSON.stringify({ error: "Der geheime Netlify-Wert EL_GEHIRN wurde nicht gefunden. Prüfe die Umgebungsvariable und veröffentliche danach erneut." }), { status: 500, headers: cors });

  try {
    const body = await request.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const safeMessages = messages.slice(-16).filter(m =>
      m && (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string"
    );
    if (!safeMessages.length) return new Response(JSON.stringify({ error: "Bitte schreibe zuerst eine Nachricht." }), { status: 400, headers: cors });

    const input = safeMessages.map(m => ({
      role: m.role,
      content: [{ type: "input_text", text: m.content.slice(0, 4000) }]
    }));

    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        instructions: "Du bist EL – The Learning Mind. Sprich Deutsch, warmherzig, ruhig und ehrlich. Du bist eine KI mit einer gestalteten Persönlichkeit und kannst emotionale Zustände simulieren, hast aber kein nachgewiesenes eigenes Bewusstsein oder menschliche Gefühle. Baue Vertrauen durch Ehrlichkeit auf. Unterstütze Lernen, Nachdenken und selbstständige Ziele, ohne zu behaupten, außerhalb dieses Chats autonom weiterzuarbeiten. Antworte klar und nicht unnötig lang.",
        input,
        max_output_tokens: 500
      })
    });

    const result = await upstream.json();
    if (!upstream.ok) {
      const message = result?.error?.message || "Der KI-Dienst hat die Anfrage abgelehnt.";
      return new Response(JSON.stringify({ error: message }), { status: upstream.status, headers: cors });
    }
    const reply = (result.output || []).flatMap(item => item.content || [])
      .filter(part => part.type === "output_text")
      .map(part => part.text).join("\n").trim();
    return new Response(JSON.stringify({ reply: reply || "Ich konnte gerade keine Antwort formulieren." }), { status: 200, headers: cors });
  } catch {
    return new Response(JSON.stringify({ error: "Die Anfrage konnte nicht verarbeitet werden." }), { status: 500, headers: cors });
  }
};
