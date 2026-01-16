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

export const POST: APIRoute = async (context) => {
  try {
    // ✅ Cloudflare runtime env (Pages Functions)
    const runtimeEnv =
      (context.locals as any)?.runtime?.env || (context as any)?.env || {};

    // ✅ Read env from runtime first, fallback to import.meta.env
    const RESEND_API_KEY =
      runtimeEnv.RESEND_API_KEY || import.meta.env.RESEND_API_KEY;
    const ADMIN_EMAIL =
      runtimeEnv.ADMIN_EMAIL || import.meta.env.ADMIN_EMAIL;
    const FROM_EMAIL =
      runtimeEnv.FROM_EMAIL || import.meta.env.FROM_EMAIL;

    // ✅ If missing, return which ones are missing (so we stop guessing)
    if (!RESEND_API_KEY || !ADMIN_EMAIL || !FROM_EMAIL) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Missing env vars",
          seen: {
            RESEND_API_KEY: !!RESEND_API_KEY,
            ADMIN_EMAIL: !!ADMIN_EMAIL,
            FROM_EMAIL: !!FROM_EMAIL,
          },
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await context.request.formData();

    // honeypot spam check
    const hp = String(data.get("website") || "").trim();
    if (hp) {
      return new Response(
        JSON.stringify({ ok: false, error: "Spam detected" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // fields from your form
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
    const row = (label, value) => `
<tr>
  <td style="padding:10px 12px;background:#f9fbff;border-bottom:1px solid #eef2f8;width:38%;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#53607a;font-weight:700;">
    ${label}
  </td>
  <td style="padding:10px 12px;border-bottom:1px solid #eef2f8;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#111827;">
    ${value}
  </td>
</tr>
`;
    const adminHtml = `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f6fb;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:24px 0;">
      <tr>
        <td align="center" style="padding:0 12px;">
          
          <!-- Card -->
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e9edf5;">
            
            <!-- Header -->
            <tr>
              <td style="padding:18px 20px;background:#0b1220;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td>
                      <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#9db1ff;letter-spacing:1px;text-transform:uppercase;">
                        Krishna Logistics
                      </div>
                      <div style="font-family:Arial,Helvetica,sans-serif;font-size:22px;color:#ffffff;font-weight:700;line-height:1.2;margin-top:6px;">
                        New Quote Request
                      </div>
                    </td>
                    <td align="right" style="vertical-align:top;">
                      <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#c9d2ff;">
                        ${esc(new Date().toLocaleString())}
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:18px 20px;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1b2233;line-height:1.6;">
                  You received a new quote request. Details are below:
                </div>

                <!-- Details table -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;border:1px solid #eef2f8;border-radius:12px;overflow:hidden;">
                  ${row("Full Name", esc(name))}
                  ${row("Email", esc(email))}
                  ${row("Phone", esc(phone))}
                  ${row("Company", esc(company || "-"))}
                  ${row("Transport Type", esc(type || "-"))}
                  ${row("Shift Timing", esc(shift || "-"))}
                  ${row("Pickup Location", esc(pickup || "-"))}
                  ${row("Drop Location", esc(drop || "-"))}
                  ${row("Employees Count", esc(count || "-"))}
                  ${row("Start Date", esc(start || "-"))}
                </table>

                <!-- CTA -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;">
                  <tr>
                    <td>
                      <a href="mailto:${encodeURIComponent(email)}"
                        style="display:inline-block;font-family:Arial,Helvetica,sans-serif;background:#2f6bff;color:#ffffff;text-decoration:none;padding:12px 14px;border-radius:10px;font-size:14px;font-weight:700;">
                        Reply to Customer
                      </a>
                    </td>
                    <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6b748a;">
                      Reply-To is set to the customer’s email.
                    </td>
                  </tr>
                </table>

                <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6b748a;line-height:1.6;margin-top:14px;">
                  Tip: If you don’t see emails, check spam/quarantine and confirm your domain is verified in Resend.
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:16px 20px;background:#f8fafc;border-top:1px solid #eef2f8;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6b748a;line-height:1.6;">
                  Krishna Logistics • Employee Transport & Corporate Mobility<br/>
                  This is an automated notification from your website form.
                </div>
              </td>
            </tr>

          </table>
          <!-- /Card -->

        </td>
      </tr>
    </table>
  </body>
</html>
`;

    // user confirmation
   const userHtml = `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f6fb;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:24px 0;">
      <tr>
        <td align="center" style="padding:0 12px;">
          
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e9edf5;">
            
            <!-- Header -->
            <tr>
              <td style="padding:22px 20px;background:linear-gradient(135deg,#0b1220,#18244a);">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#b7c6ff;letter-spacing:1px;text-transform:uppercase;">
                  Krishna Logistics
                </div>
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:22px;color:#ffffff;font-weight:800;line-height:1.2;margin-top:6px;">
                  We received your quote request ✅
                </div>
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#d7e0ff;line-height:1.6;margin-top:10px;">
                  Hi ${esc(name)}, thanks for contacting us. Our team will get back to you shortly.
                </div>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:18px 20px;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1b2233;line-height:1.7;">
                  Here’s a copy of the details you submitted:
                </div>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;border:1px solid #eef2f8;border-radius:12px;overflow:hidden;">
                  ${row("Transport Type", esc(type || "-"))}
                  ${row("Shift Timing", esc(shift || "-"))}
                  ${row("Pickup Location", esc(pickup || "-"))}
                  ${row("Drop Location", esc(drop || "-"))}
                  ${row("Employees Count", esc(count || "-"))}
                  ${row("Start Date", esc(start || "-"))}
                </table>

                <!-- Contact strip -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                  <tr>
                    <td style="padding:14px 14px;background:#f8fafc;border:1px solid #eef2f8;border-radius:12px;">
                      <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#111827;font-weight:700;">
                        Need immediate help?
                      </div>
                      <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#4b5563;line-height:1.6;margin-top:4px;">
                        Call us: <a href="tel:+919966933500" style="color:#2f6bff;text-decoration:none;font-weight:700;">+91 99669 33500</a>
                        <br/>
                        Email: <a href="mailto:kanishk@krishnalogistics.com" style="color:#2f6bff;text-decoration:none;font-weight:700;">kanishk@krishnalogistics.com</a>
                      </div>
                    </td>
                  </tr>
                </table>

                <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6b748a;line-height:1.6;margin-top:14px;">
                  If you did not submit this request, you can ignore this email.
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:16px 20px;background:#f8fafc;border-top:1px solid #eef2f8;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6b748a;line-height:1.6;">
                  © ${new Date().getFullYear()} Krishna Logistics. All rights reserved.
                </div>
              </td>
            </tr>

          </table>

        </td>
      </tr>
    </table>
  </body>
</html>
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
        // ✅ Resend REST API expects "reply_to"
        reply_to: email,
        html: adminHtml,
      }),
    });

    if (!adminRes.ok) {
      const body = await adminRes.text();
      return new Response(
        JSON.stringify({
          ok: false,
          where: "admin",
          status: adminRes.status,
          body,
        }),
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
        JSON.stringify({
          ok: false,
          where: "user",
          status: userRes.status,
          body,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Server error",
        details: String(err?.message || err || ""),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
