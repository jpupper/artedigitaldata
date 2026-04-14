import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

export const sendResetPasswordEmail = async (email: string, token: string) => {
  const baseUrl = process.env.FRONTEND_URL || 'https://fullscreencode.com';
  const resetUrl = `${baseUrl}/artedigitaldata/reset-password.html?token=${token}`;

  const mailOptions = {
    from: `"Arte Digital Data" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Recuperación de contraseña - Arte Digital Data',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; background-color: #0d0d12; color: #e5e5e5; padding: 40px; border-radius: 20px; border: 1px solid rgba(0, 245, 255, 0.2); box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);">
        <div style="text-align: center; mb-8">
            <h1 style="margin: 0; color: #00f5ff; font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px;">Arte Digital <span style="color: #ff00e0;">Data</span></h1>
        </div>
        <div style="background: rgba(255,255,255,0.03); padding: 30px; border-radius: 15px; margin-top: 20px;">
            <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">¿Olvidaste tu contraseña?</h2>
            <p style="color: #94a3b8; line-height: 1.6;">No te preocupes, suele pasar. Hacé clic en el botón de abajo para elegir una nueva contraseña y volver a la comunidad.</p>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${resetUrl}" style="background: linear-gradient(135deg, #00f5ff, #ff00e0); color: #0d0d12; padding: 18px 32px; text-decoration: none; border-radius: 12px; font-weight: 900; display: inline-block; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 15px rgba(0, 245, 255, 0.3);">Restablecer Contraseña</a>
            </div>
            
            <p style="font-size: 13px; color: #64748b; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.05); pt-4 text-align: center;">
                Si el botón no funciona, copiá y pegá este link en tu navegador:<br>
                <span style="color: #00f5ff; word-break: break-all;">${resetUrl}</span>
            </p>
        </div>
        <p style="font-size: 12px; color: #475569; text-align: center; margin-top: 30px;">
          Este enlace expirará en 1 hora. Si no solicitaste este cambio, ignorá este mail.
        </p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

export const sendTicketEmail = async (
  email: string,
  ownerName: string,
  ticket: { code: string; qrData: string },
  event: { title: string; date: Date | string; location?: string }
) => {
  const eventDate = new Date(event.date).toLocaleDateString('es-AR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });
  const eventTime = new Date(event.date).toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit'
  });
  const ticketUrl = `${process.env.BASE_URL || 'https://artedigitaldata.com'}/ticket-success.html?ticket=${ticket.code}`;

  // Extract base64 content from data URI for CID embedding
  const base64Match = ticket.qrData.match(/^data:image\/(png|jpeg|gif);base64,(.+)$/);
  const qrAttachment = base64Match
    ? { filename: 'qr-entrada.png', content: Buffer.from(base64Match[2], 'base64'), cid: 'qrcode' }
    : null;
  const qrImgSrc = qrAttachment ? 'cid:qrcode' : ticket.qrData;

  const mailOptions = {
    from: `"Arte Digital Data" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Tu entrada para ${event.title} - Arte Digital Data`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; background-color: #0d0d12; color: #e5e5e5; padding: 40px; border-radius: 20px; border: 1px solid rgba(255,0,224,0.2); box-shadow: 0 0 20px rgba(0,0,0,0.5);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="margin: 0; color: #00f5ff; font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px;">Arte Digital <span style="color: #ff00e0;">Data</span></h1>
        </div>
        <div style="background: rgba(255,255,255,0.03); padding: 30px; border-radius: 15px;">
          <h2 style="color: #ffffff; margin-top: 0; font-size: 22px;">¡Tu entrada está lista! 🎟️</h2>
          <p style="color: #94a3b8; line-height: 1.6;">Hola <strong style="color:#ffffff;">${ownerName}</strong>, acá está tu entrada para el evento:</p>

          <div style="background: rgba(255,0,224,0.05); border: 1px solid rgba(255,0,224,0.2); border-radius: 12px; padding: 20px; margin: 24px 0;">
            <h3 style="margin: 0 0 12px; color: #ff00e0; font-size: 20px;">${event.title}</h3>
            <p style="margin: 6px 0; color: #94a3b8;"><strong style="color:#ffffff;">📅 Fecha:</strong> ${eventDate}</p>
            <p style="margin: 6px 0; color: #94a3b8;"><strong style="color:#ffffff;">🕐 Hora:</strong> ${eventTime} hs</p>
            ${event.location ? `<p style="margin: 6px 0; color: #94a3b8;"><strong style="color:#ffffff;">📍 Lugar:</strong> ${event.location}</p>` : ''}
          </div>

          <div style="text-align: center; margin: 28px 0;">
            <p style="color: #64748b; font-size: 12px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">Código de entrada</p>
            <div style="background: #1a1a2e; border: 2px solid #ff00e0; border-radius: 12px; padding: 16px 24px; display: inline-block;">
              <span style="font-size: 32px; font-weight: 900; color: #ff00e0; letter-spacing: 6px; font-family: monospace;">${ticket.code}</span>
            </div>
          </div>

          <div style="text-align: center; margin: 28px 0;">
            <p style="color: #64748b; font-size: 12px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;">QR para la entrada</p>
            <img src="${qrImgSrc}" alt="QR Entrada" width="200" height="200" style="width: 200px; height: 200px; border-radius: 12px; border: 2px solid rgba(255,0,224,0.3);">
          </div>

          <div style="text-align: center; margin-top: 28px;">
            <a href="${ticketUrl}" style="background: linear-gradient(135deg, #ff00e0, #9333ea); color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 900; display: inline-block; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 15px rgba(255,0,224,0.3);">Ver mi entrada</a>
          </div>
        </div>
        <p style="font-size: 12px; color: #475569; text-align: center; margin-top: 30px;">
          Presentá este QR o el código en la entrada del evento.<br>Ante cualquier consulta respondé este mail.
        </p>
      </div>
    `,
    ...(qrAttachment ? { attachments: [qrAttachment] } : {}),
  };

  return transporter.sendMail(mailOptions);
};
