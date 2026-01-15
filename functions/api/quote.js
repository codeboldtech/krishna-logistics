export async function onRequest({ request, env }) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const formData = await request.formData();
  const data = Object.fromEntries(formData.entries());

  // Honeypot spam protection (your hidden field name="website")
  if (data.website) {
    return new Response(null, {
      status: 303,
      headers: { Location: new URL("/thank-you/", request.url).toString() },
    });
  }

  // Basic required fields
  const name = (data.name || "").trim();
  const email = (data.email || "").trim();
  const phone = (data.phone || "").trim();

  if (!name || !email || !phone) {
    // If required fields missing, send back to contact or show simple message
    return new Response("Missing required fields", { status: 400 });
  }

  // Collect all fields (safe defaults)
  const payload = {
    name,
    email,
    phone,
    company: (data.company || "").trim(),
    pickup: (data.pickup || "").trim(),
    drop: (data.drop || "").trim(),
    type: (data.type || "").trim(),
    shift: (data.shift || "").trim(),
    count: (data.count || "").trim(),
    start: (data.start || "").trim(),
  };

  // Email templates (simple + clean)
  const adminHtml = `
    <h2>New Quote Request – Krishna Logistics</h2>
    <table cellpadding="6" cellspacing="0" border="0">
      <tr><td><strong>Name</strong></td><td>${payload.name}</td></tr>
      <tr><td><strong>Email</strong></td><td>${payload.email}</td></tr>
      <tr><td><strong>Phone</strong></td><td>${payload.phone}</td></tr>
      <tr><td><strong>Company</strong></td><td>${payload.company}</td></tr>
      <tr><td><strong>Pickup</strong></td><td>${payload.pickup}</td></tr>
      <tr><td><strong>Drop</strong></td><td>${payload.drop}</td></tr>
      <tr><td><strong>Transport Type</strong></td><td>${payload.type}</td></tr>
      <tr><td><strong>Shift</strong></td><td>${payload.shift}</td></tr>
      <tr><td><strong>Employees</strong></td><td>${payload.count}</td></tr>
      <tr><td><strong>Start Date</strong></td><td>${payload.start}</td></tr>
    </table>
  `;

  const userHtml = `
    <p>Hi ${payload.name},</p>
    <p>Thanks for contacting <strong>Krishna Logistics</strong>. We’ve received your request and our team will reach out shortly.</p>
    <p><strong>Your details:</strong></p>
    <ul>
      <li><strong>Phone:</strong> ${payload.phone}</li>
      <li><strong>Pickup:</strong> ${payload.pickup}</li>
      <li><strong>Drop:</strong> ${payload.drop}</li>
      <li><strong>Transport Type:</strong> ${payload.type}</li>
      <li><strong>Shift:</strong> ${payload.shift}</li>
    </ul>
    <p>If it’s urgent, call us at <strong>+91 99669 33500</strong>.</p>
    <p>— Krishna Logistics</p>
  `;

  // Send to admin + user via Resend
  // Required env vars:
  // RESEND_API_KEY (Secret)
  // ADMIN_EMAIL (Plaintext)
  const headers = {
    Authorization: `Bearer ${env.re_YQQANyVz_JDieuDamayrEAksakjgSp8Kc}`,
    "Content-Type": "application/json",
  };

  // 1) Admin email
  const adminRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers,
    body: JSON.stringify({
      from: "Krishna Logistics <no-reply@mail.krishna-logistics.in>",
      to: [env.kanishk@krishnalogistics.com],
      subject: `New Quote Request – ${payload.name}`,
      reply_to: payload.email,
      html: adminHtml,
    }),
  });

  // 2) User auto-reply
  const userRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers,
    body: JSON.stringify({
      from: "Krishna Logistics <no-reply@mail.krishna-logistics.in>",
      to: [payload.email],
      subject: "We received your request – Krishna Logistics",
      html: userHtml,
    }),
  });

  // If Resend fails, show a friendly message (still redirect optional)
  if (!adminRes.ok || !userRes.ok) {
    console.log("Resend admin status:", adminRes.status);
    console.log("Resend user status:", userRes.status);

    return new Response(null, {
      status: 303,
      headers: { Location: new URL("/thank-you/", request.url).toString() },
    });
  }

  // ✅ Success redirect
  return new Response(null, {
    status: 303,
    headers: { Location: new URL("/thank-you/", request.url).toString() },
  });
}
