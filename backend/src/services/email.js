const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || 'noreply@drivecompare.com';

/**
 * Send rate alert email with top 3 quotes.
 */
async function sendRateAlertEmail({ to, userName, vehicle, quotes }) {
  const top3 = quotes.slice(0, 3);
  const vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  const quoteRows = top3.map((q, i) => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;">
        <strong>${i === 0 ? '⭐ ' : ''}${q.providerName}</strong><br>
        <span style="color:#666;font-size:13px;">${q.coverageType}</span>
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;text-align:right;">
        <strong>$${q.annualPremium.toLocaleString()}/yr</strong><br>
        <span style="color:#666;font-size:13px;">$${q.monthlyPremium}/mo</span>
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;text-align:right;">
        <a href="${q.providerUrl}" style="background:#185FA5;color:white;padding:6px 14px;border-radius:6px;text-decoration:none;font-size:13px;">View</a>
      </td>
    </tr>`).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a;">
      <div style="margin-bottom:24px;">
        <h1 style="font-size:22px;margin:0 0 4px;">DriveCompare</h1>
        <p style="color:#666;margin:0;font-size:14px;">Rate Alert</p>
      </div>

      <p>Hi ${userName},</p>
      <p>Here are the latest insurance rates for your <strong>${vehicleName}</strong>. 
      Rates change frequently — comparing now could save you money.</p>

      <table style="width:100%;border-collapse:collapse;border:1px solid #e8e8e8;border-radius:8px;overflow:hidden;margin:20px 0;">
        <thead>
          <tr style="background:#f8f9fa;">
            <th style="padding:10px 16px;text-align:left;font-size:12px;color:#666;font-weight:500;">Provider</th>
            <th style="padding:10px 16px;text-align:right;font-size:12px;color:#666;font-weight:500;">Premium</th>
            <th style="padding:10px 16px;text-align:right;font-size:12px;color:#666;font-weight:500;"></th>
          </tr>
        </thead>
        <tbody>${quoteRows}</tbody>
      </table>

      <p style="font-size:13px;color:#666;">
        Want to see all providers? 
        <a href="${process.env.FRONTEND_URL}/quotes?vehicleId=${vehicle.id}">View full comparison</a>
      </p>

      <hr style="border:none;border-top:1px solid #f0f0f0;margin:24px 0;">
      <p style="font-size:12px;color:#999;">
        You're receiving this because you set up rate alerts for your ${vehicleName}. 
        <a href="${process.env.FRONTEND_URL}/alerts">Manage alerts</a>
      </p>
    </body>
    </html>`;

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Your ${vehicleName} rate alert — best rate: $${top3[0].annualPremium.toLocaleString()}/yr`,
    html,
  });
}

module.exports = { sendRateAlertEmail };
