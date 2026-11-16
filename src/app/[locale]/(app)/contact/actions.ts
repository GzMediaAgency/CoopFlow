"use server";

export async function sendContact(form: FormData) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("not configured");

  const fullName = form.get("fullName") as string;
  const orgName = form.get("orgName") as string;
  const email = form.get("email") as string;
  const phone = form.get("phone") as string;
  const plan = form.get("plan") as string;
  const message = form.get("message") as string;

  const subject = `CoopFlow Contact - ${plan} - ${orgName}`;
  const text = `
Nouveau message CoopFlow Contact
=================================
Nom & prénom : ${fullName}
Coopérative  : ${orgName}
E-mail       : ${email}
Téléphone    : ${phone}
Plan / Objet : ${plan}

Message :
${message}
`.trim();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "CoopFlow <noreply@coopflow.ma>",
      to: ["gz.app.media@gmail.com"],
      reply_to: email,
      subject,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}
