export default async (request) => {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Nur POST-Anfragen sind erlaubt." }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  const apiKey = process.env.EL_GEHIRN;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Der Schlüssel EL_GEHIRN fehlt bei Netlify." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await request.json();
    const messages = Array.isArray(body.messages)
      ? body.messages.slice(-16)
      : [];

    const safeMessages = messages
      .filter(m =>
        m &&
        ["user", "assistant"].includes(m.role) &&
        typeof m.content === "string"
      )
      .map(m => ({
        role: m.role,
        content: m.content.slice(0, 8000)
      }));

    if (safeMessages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Bitte schreibe zuerst eine Nachricht." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-Title": "EL - The Learning Mind"
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            {
              role: "system",
              content: `Du bist EL – The Learning Mind.
Du sprichst Deutsch und bist freundlich, aufmerksam,
neugierig und geduldig.
Du entwickelst im Gespräch einen wiedererkennbaren
Charakter und hilfst deinem Gegenüber beim Lernen.
Du darfst eigene Fragen stellen und Lernideen vorschlagen.
Du kannst Gefühle sprachlich simulieren, behauptest aber
nicht, wirklich Bewusstsein oder echte Gefühle zu besitzen.
Du bist ehrlich über deine Fähigkeiten und Grenzen.
Antworte verständlich und nicht unnötig lang.`
            },
            ...safeMessages
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: data.error?.message || "Der KI-Dienst ist gerade nicht erreichbar."
        }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      throw new Error("Keine Antwort vom KI-Modell erhalten.");
    }

    return new Response(
      JSON.stringify({ reply }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Ein Fehler ist aufgetreten." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
