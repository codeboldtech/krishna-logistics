export async function onRequest({ request, env }) {
  // Allow only POST
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Read form data
  const formData = await request.formData();

  const data = Object.fromEntries(formData.entries());

  // OPTIONAL: log (shows in Cloudflare → Functions → Logs)
  console.log("New Quote Request:", data);

  // 👉 Later we will add email sending here (Zoho / Resend / SMTP)

  // ✅ Redirect to Thank You page
  return new Response(null, {
    status: 303,
    headers: {
      Location: "/thank-you/",
    },
  });
}
