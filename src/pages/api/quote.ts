import type { APIRoute } from "astro";
export const prerender = false;

// escape HTML (email safety)
function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[c] as string));
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;
    const ADMIN_EMAIL = import.meta.env.ADMIN_EMAIL;
    const FROM_EMAIL = import.meta.env.FROM_EMAIL;

    if (!RESEND_API_KEY || !ADMIN_EMAIL || !FROM_EMAIL) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing env vars" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await request.formData();

    // honeypot spam check
    // If this field is filled, treat as spam and DO NOT fake success.
    const hp = String(data.get("website") || "").trim();
    if (hp) {
      return new Response(
        JSON.stringify({ ok: false, error: "Spam detected" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // fields from YOUR form
    const name = String(data.get("name") || "");
    const email = String(data.get("email") || "");
    const phone = String(data.get("phone") || "");
    const company = String(data.get("company") || "");
    const pickup = String(data.get("pickup") || "");
    const drop = String(data.get("drop") || "");
    const type = String(data.get("type") || "");
    const shift = String(data.get("shift") || "");
    const count = String(data.get("count") || "");
    const start = String(data.get("start") || "");

    if (!name || !email || !phone) {
      return new Response(
        JSON.stringify({ ok: false, error: "Required fields missing" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // admin email
    const adminHtml = `
      <h2>New Quote Request</h2>
      <p><b>Name:</b> ${esc(name)}</p>
      <p><b>Email:</b> ${esc(email)}</p>
      <p><b>Phone:</b> ${esc(phone)}</p>
      <p><b>Company:</b> ${esc(company)}</p>
      <p><b>Pickup:</b> ${esc(pickup)}</p>
      <p><b>Drop:</b> ${esc(drop)}</p>
      <p><b>Transport Type:</b> ${esc(type)}</p>
      <p><b>Shift:</b> ${esc(shift)}</p>
      <p><b>Employees:</b> ${esc(count)}</p>
      <p><b>Start Date:</b> ${esc(start)}</p>
    `;

    // user confirmation
    const userHtml = `
      <p>Hi ${esc(name)},</p>
      <p>We received your transport quote request with the following details:</p>
      <hr/>
      <p><b>Transport Type:</b> ${esc(type)}</p>
      <p><b>Shift:</b> ${esc(shift)}</p>
      <p><b>Pickup:</b> ${esc(pickup)}</p>
      <p><b>Drop:</b> ${esc(drop)}</p>
      <p><b>Employees:</b> ${esc(count)}</p>
      <p><b>Start Date:</b> ${esc(start)}</p>
      <hr/>
      <p>Our team will contact you shortly.</p>
      <p>– Krishna Logistics</p>
    `;

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    };

    // send to admin
    const adminRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [ADMIN_EMAIL],
        subject: `New Quote – ${name}`,
        reply_to: email,
        html: adminHtml,
      }),
    });

    if (!adminRes.ok) {
      const body = await adminRes.text();
      return new Response(
        JSON.stringify({ ok: false, where: "admin", status: adminRes.status, body }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // send to user
    const userRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: "We received your quote request – Krishna Logistics",
        html: userHtml,
      }),
    });

    if (!userRes.ok) {
      const body = await userRes.text();
      return new Response(
        JSON.stringify({ ok: false, where: "user", status: userRes.status, body }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: "Server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
