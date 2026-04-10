import { Router, Request, Response } from 'express';
import { authMiddleware, optionalAuth, AuthRequest } from '../middleware/auth';
import Ticket from '../models/Ticket';
import Evento from '../models/Evento';
import User from '../models/User';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import QRCode from 'qrcode';
import { Types } from 'mongoose';
import { sendTicketEmail } from '../utils/mailer';

const router = Router();

// Validate BASE_URL configuration
const baseUrl = process.env.BASE_URL || '';
if (!baseUrl) {
  console.warn('[Tickets] WARNING: BASE_URL environment variable is not set. QR codes will generate with relative URLs.');
  console.warn('[Tickets] Please add BASE_URL=https://artedigitaldata.com to your .env file');
}

// Initialize MercadoPago
const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
const mercadopago = mpAccessToken ? new MercadoPagoConfig({ accessToken: mpAccessToken }) : null;

// Generate unique ticket code
function generateTicketCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Get all tickets (admin only)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'ADMINISTRADOR' && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const tickets = await Ticket.find()
      .populate('event', 'title date location')
      .populate('owner', '_id username email')
      .sort({ createdAt: -1 });

    return res.json(tickets);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get tickets for a specific event
router.get('/event/:eventId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const event = await Evento.findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    // Only event creator, admin, or door user can see all tickets
    const isCreator = event.creator.toString() === req.user!.id;
    const isAdmin = req.user!.role === 'ADMINISTRADOR' || req.user!.role === 'ADMIN';
    const isDoorUser = event.doorUsers?.some((id: any) => id.toString() === req.user!.id);

    if (!isCreator && !isAdmin && !isDoorUser) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const tickets = await Ticket.find({ event: req.params.eventId })
      .sort({ createdAt: -1 });

    // Manually populate owner since User is in different database
    const ownerIds = tickets.filter(t => t.owner).map(t => t.owner!.toString());
    const uniqueOwnerIds = [...new Set(ownerIds)];

    // Fetch all users that own tickets
    const users = await User.find({ _id: { $in: uniqueOwnerIds } })
      .select('_id username email displayName avatar');

    // Create a map for quick lookup
    const userMap = new Map();
    users.forEach(u => userMap.set(u._id.toString(), u));

    // Add owner data to each ticket
    const ticketsWithOwner = tickets.map(t => {
      const ticketObj = t.toObject();
      if (t.owner) {
        const ownerData = userMap.get(t.owner.toString());
        if (ownerData) {
          ticketObj.owner = ownerData;
        }
      }
      return ticketObj;
    });

    return res.json(ticketsWithOwner);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Issue manual ticket (creator/admin only)
router.post('/event/:eventId/issue-manual', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const event = await Evento.findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    // Only event creator or admin can issue manual tickets
    const isCreator = event.creator.toString() === req.user!.id;
    const isAdmin = req.user!.role === 'ADMINISTRADOR' || req.user!.role === 'ADMIN';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const { ownerName, ownerEmail, ownerPhone, ownerId } = req.body;

    // Check if max tickets reached
    const ticketCount = await Ticket.countDocuments({ event: req.params.eventId });
    if (ticketCount >= event.ticketConfig.maxTickets) {
      return res.status(400).json({ error: 'Se alcanzó el límite máximo de entradas' });
    }

    // Generate unique code
    let code: string;
    let existingTicket;
    do {
      code = generateTicketCode();
      existingTicket = await Ticket.findOne({ code });
    } while (existingTicket);

    // Generate QR data with scan-redeem URL
    const scanUrl = `https://artedigitaldata.com/scan-redeem.html?code=${code}`;
    const qrData = await QRCode.toDataURL(scanUrl);

    // If ownerId provided, verify user exists and get their data
    let owner = null;
    let finalOwnerName = ownerName;
    let finalOwnerEmail = ownerEmail;

    if (ownerId) {
      const user = await User.findById(ownerId);
      if (!user) {
        return res.status(400).json({ error: 'Usuario no encontrado' });
      }
      owner = user._id;
      // Use user's data if not explicitly provided
      finalOwnerName = ownerName || user.displayName || user.username;
      finalOwnerEmail = ownerEmail || user.email;
    }

    // Create ticket
    const ticket = await Ticket.create({
      event: req.params.eventId,
      code,
      qrData,
      owner,
      ownerName: finalOwnerName,
      ownerEmail: finalOwnerEmail,
      ownerPhone,
      paymentStatus: 'free',
      paymentId: 'MANUAL'
    });

    // Prepare response with owner data
    const ticketObj = ticket.toObject();
    if (ticket.owner) {
      const ownerData = await User.findById(ticket.owner).select('_id username email displayName avatar');
      if (ownerData) {
        ticketObj.owner = ownerData.toObject();
      }
    }

    return res.status(201).json(ticketObj);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get single ticket by code (PUBLIC - for QR validation)
router.get('/code/:code', async (req: Request, res: Response) => {
  try {
    let ticket = await Ticket.findOne({ code: req.params.code.toUpperCase() })
      .populate('event', 'title date location ticketConfig creator');

    if (!ticket) return res.status(404).json({ error: 'Entrada no encontrada' });

    // Auto-generate QR if missing (for old tickets or if qrData is empty)
    if (!ticket.qrData || ticket.qrData === '') {
      const scanUrl = `https://artedigitaldata.com/scan-redeem.html?code=${ticket.code}`;
      const qrData = await QRCode.toDataURL(scanUrl);
      ticket.qrData = qrData;
      await ticket.save();
    }

    // Manually populate owner from auth database
    const ticketObj = ticket.toObject();
    if (ticket.owner) {
      const owner = await User.findById(ticket.owner).select('_id username email displayName avatar');
      if (owner) {
        ticketObj.owner = owner.toObject();
      }
    }

    return res.json(ticketObj);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get my tickets - MUST be before /:id to avoid route collision
router.get('/my', authMiddleware, async (req: AuthRequest, res: Response) => {
  console.log('[Tickets/My] Route hit! URL:', req.originalUrl, 'Method:', req.method);
  try {
    console.log('[Tickets/My] User from token:', req.user);

    // Validar que el ID del usuario sea válido antes de convertir
    if (!req.user?.id || !Types.ObjectId.isValid(req.user.id)) {
      console.error('[Tickets/My] Invalid user ID:', req.user?.id);
      return res.status(400).json({ error: 'ID de usuario inválido', userId: req.user?.id });
    }

    // Convertir el ID del usuario a ObjectId para comparación correcta con MongoDB
    const userObjectId = new Types.ObjectId(req.user!.id);
    console.log('[Tickets/My] Converted ObjectId:', userObjectId);

    // Get user to check their email
    const user = await User.findById(req.user!.id);
    console.log('[Tickets/My] User from DB:', user);
    const userEmail = user?.email;

    // Find tickets by owner OR by ownerEmail (case-insensitive, for tickets purchased before owner linking)
    // Escape special regex characters in email
    const escapedEmail = userEmail?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const query = escapedEmail
      ? { $or: [{ owner: userObjectId }, { ownerEmail: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } }] }
      : { owner: userObjectId };
    console.log('[Tickets/My] Query:', JSON.stringify(query));

    const tickets = await Ticket.find(query)
      .populate('event', 'title date location imageUrl')
      .sort({ createdAt: -1 });
    console.log('[Tickets/My] Tickets found:', tickets.length);

    // Manually populate owner for each ticket
    const ownerIds = tickets.filter(t => t.owner).map(t => t.owner!.toString());
    const uniqueOwnerIds = [...new Set(ownerIds)];

    if (uniqueOwnerIds.length > 0) {
      const users = await User.find({ _id: { $in: uniqueOwnerIds } })
        .select('_id username email displayName avatar');

      const userMap = new Map();
      users.forEach(u => userMap.set(u._id.toString(), u));

      tickets.forEach(t => {
        if (t.owner) {
          const userData = userMap.get(t.owner.toString());
          if (userData) {
            (t as any).owner = userData;
          }
        }
      });
    }

    return res.json(tickets);
  } catch (err: any) {
    console.error('[Tickets/My] ERROR:', err);
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// Get full ticket details (requires auth - for admin/creator/owner)
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    let ticket = await Ticket.findById(req.params.id)
      .populate('event', 'title date location creator ticketConfig');

    if (!ticket) return res.status(404).json({ error: 'Entrada no encontrada' });

    // Manually populate owner from auth database
    const ticketObj = ticket.toObject();
    if (ticket.owner) {
      const owner = await User.findById(ticket.owner).select('_id username email displayName avatar');
      if (owner) {
        ticketObj.owner = owner.toObject();
      }
    }

    ticket = ticketObj as any;

    if (!ticket) return res.status(404).json({ error: 'Entrada no encontrada' });

    // Check permissions
    const event = ticket.event as any;
    const isCreator = event.creator.toString() === req.user!.id;
    const isAdmin = req.user!.role === 'ADMINISTRADOR' || req.user!.role === 'ADMIN';
    const isOwner = ticket.owner?._id?.toString() === req.user!.id;

    if (!isCreator && !isAdmin && !isOwner) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    return res.json(ticket);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get ticket stats for an event (for creator/dashboard)
router.get('/event/:eventId/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const event = await Evento.findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    const isCreator = event.creator.toString() === req.user!.id;
    const isAdmin = req.user!.role === 'ADMINISTRADOR' || req.user!.role === 'ADMIN';
    const isDoorUser = event.doorUsers?.some((id: any) => id.toString() === req.user!.id);

    if (!isCreator && !isAdmin && !isDoorUser) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const stats = await Ticket.aggregate([
      { $match: { event: new Types.ObjectId(req.params.eventId) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          redeemed: { $sum: { $cond: ['$redeemed', 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$redeemed', false] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'completed'] }, 1, 0] } }
        }
      }
    ]);

    return res.json(stats[0] || { total: 0, redeemed: 0, pending: 0, completed: 0 });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Create MercadoPago preference for ticket purchase
router.post('/event/:eventId/create-preference', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const event = await Evento.findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    if (!event.ticketConfig?.enabled) {
      return res.status(400).json({ error: 'Sistema de entradas no activado para este evento' });
    }

    const { ownerName, ownerEmail, ownerPhone, amount } = req.body;

    // Check if max tickets reached
    const ticketCount = await Ticket.countDocuments({ event: req.params.eventId });
    if (ticketCount >= event.ticketConfig.maxTickets) {
      return res.status(400).json({ error: 'Se alcanzó el límite máximo de entradas' });
    }

    const code = generateTicketCode();
    
    // Generate QR with scan-redeem URL
    const scanUrl = `https://artedigitaldata.com/scan-redeem.html?code=${code}`;
    const qrCodeDataUrl = await QRCode.toDataURL(scanUrl);

    // Get user ID if authenticated
    const ownerId = req.user?.id && Types.ObjectId.isValid(req.user.id)
      ? new Types.ObjectId(req.user.id)
      : undefined;

    // Create ticket first (pending status)
    const ticket = await Ticket.create({
      event: req.params.eventId,
      code,
      qrData: qrCodeDataUrl,
      owner: ownerId,
      ownerName: ownerName || '',
      ownerEmail: ownerEmail || '',
      ownerPhone: ownerPhone || '',
      paymentStatus: 'pending'
    });

    // --- Option A: event has a manual payment link (no API token needed) ---
    // Contribution events skip this so the MP API can apply the user-chosen amount
    if (event.ticketConfig.paymentLink && !event.ticketConfig.isContribution) {
      ticket.paymentStatus = 'free';
      await ticket.save();

      // Send confirmation email
      const recipientEmail = ownerEmail || (req.user?.id ? (await User.findById(req.user.id))?.email : undefined);
      if (recipientEmail) {
        sendTicketEmail(recipientEmail, ownerName || 'Usuario', { code, qrData: qrCodeDataUrl }, event).catch(err =>
          console.error('[Tickets] Error sending ticket email:', err)
        );
      }

      return res.json({
        initPoint: event.ticketConfig.paymentLink,
        ticketId: ticket._id,
        code,
        qrCode: qrCodeDataUrl,
        usePaymentLink: true
      });
    }

    // --- Option B: use MercadoPago API (requires access token) ---
    if (!mercadopago) {
      await ticket.deleteOne();
      const msg = event.ticketConfig.isContribution
        ? 'Para eventos con bono contribución es necesario configurar el Access Token de MercadoPago (MERCADOPAGO_ACCESS_TOKEN).'
        : 'MercadoPago no configurado. Configurá el Access Token o agregá un link de pago manual al evento.';
      return res.status(500).json({ error: msg });
    }

    // Determine unit price: use custom amount for contribution mode, otherwise event price
    const unitPrice = event.ticketConfig.isContribution && amount != null
      ? Math.max(1, parseFloat(amount))
      : (event.ticketConfig.price || 1);

    // Create MercadoPago preference
    const preference = new Preference(mercadopago);
    const preferenceData = {
      items: [
        {
          id: ticket._id.toString(),
          title: `Entrada - ${event.title}`,
          description: `Código: ${code}`,
          quantity: 1,
          unit_price: unitPrice,
          currency_id: 'ARS'
        }
      ],
      payer: {
        name: ownerName || 'Comprador',
        email: ownerEmail || 'no-email@example.com'
      },
      external_reference: ticket._id.toString(),
      notification_url: `${process.env.BASE_URL || ''}/api/tickets/webhook`,
      back_urls: {
        success: `${process.env.BASE_URL || ''}/ticket-success.html?ticket=${code}`,
        failure: `${process.env.BASE_URL || ''}/ticket-failed.html?ticket=${code}`,
        pending: `${process.env.BASE_URL || ''}/ticket-pending.html?ticket=${code}`
      },
      auto_return: 'approved'
    };

    const preferenceResult = await preference.create({ body: preferenceData as any });

    return res.json({
      preferenceId: preferenceResult.id,
      initPoint: preferenceResult.init_point,
      ticketId: ticket._id,
      code,
      qrCode: qrCodeDataUrl
    });
  } catch (err: any) {
    console.error('Error creating preference:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Create free ticket (for events with 0 price or contribution mode)
router.post('/event/:eventId/create-free', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const event = await Evento.findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    if (!event.ticketConfig?.enabled) {
      return res.status(400).json({ error: 'Sistema de entradas no activado para este evento' });
    }

    const { ownerName, ownerEmail, ownerPhone } = req.body;

    // Check if max tickets reached
    const ticketCount = await Ticket.countDocuments({ event: req.params.eventId });
    if (ticketCount >= event.ticketConfig.maxTickets) {
      return res.status(400).json({ error: 'Se alcanzó el límite máximo de entradas' });
    }

    const code = generateTicketCode();
    
    // Generate QR with scan-redeem URL
    const scanUrl = `https://artedigitaldata.com/scan-redeem.html?code=${code}`;
    const qrCodeDataUrl = await QRCode.toDataURL(scanUrl);

    // Get user ID if authenticated and convert to ObjectId
    const ownerId = req.user?.id && Types.ObjectId.isValid(req.user.id)
      ? new Types.ObjectId(req.user.id)
      : undefined;

    // Create ticket with free/paid status
    const ticket = await Ticket.create({
      event: req.params.eventId,
      code,
      qrData: qrCodeDataUrl,
      owner: ownerId,
      ownerName: ownerName || '',
      ownerEmail: ownerEmail || '',
      ownerPhone: ownerPhone || '',
      paymentStatus: event.ticketConfig.price === 0 || event.ticketConfig.isContribution ? 'free' : 'pending'
    });

    // Send confirmation email
    const recipientEmail = ownerEmail || (req.user?.id ? (await User.findById(req.user.id))?.email : undefined);
    if (recipientEmail) {
      sendTicketEmail(recipientEmail, ownerName || 'Usuario', { code, qrData: qrCodeDataUrl }, event).catch(err =>
        console.error('[Tickets] Error sending ticket email:', err)
      );
    }

    return res.json({
      ticketId: ticket._id,
      code,
      qrCode: qrCodeDataUrl,
      message: event.ticketConfig.successMessage || '¡Gracias por tu compra!'
    });
  } catch (err: any) {
    console.error('Error creating free ticket:', err);
    return res.status(500).json({ error: err.message });
  }
});

// MercadoPago webhook
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { type, data } = req.body;

    if (type === 'payment' && data?.id && mercadopago) {
      const paymentId = data.id;
      try {
        // Fetch the payment from MP API to get external_reference and status
        const paymentClient = new Payment(mercadopago);
        const payment = await paymentClient.get({ id: paymentId });

        if (payment.external_reference && payment.status === 'approved') {
          const ticket = await Ticket.findById(payment.external_reference).populate('event', 'title date location');
          if (ticket) {
            ticket.paymentId = String(paymentId);
            ticket.paymentStatus = 'completed';
            await ticket.save();

            // Send confirmation email
            const recipientEmail = ticket.ownerEmail || (ticket.owner ? (await User.findById(ticket.owner))?.email : undefined);
            if (recipientEmail && ticket.event) {
              sendTicketEmail(
                recipientEmail,
                ticket.ownerName || 'Usuario',
                { code: ticket.code, qrData: ticket.qrData },
                ticket.event as any
              ).catch(e => console.error('[Tickets] Webhook email error:', e));
            }
          }
        }
      } catch (mpErr) {
        console.error('Webhook MP fetch error:', mpErr);
      }
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Redeem ticket (mark as used)
router.post('/:ticketId/redeem', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await Ticket.findById(req.params.ticketId).populate('event');
    if (!ticket) return res.status(404).json({ error: 'Entrada no encontrada' });

    const event = ticket.event as any;
    const isCreator = event.creator.toString() === req.user!.id;
    const isAdmin = req.user!.role === 'ADMINISTRADOR' || req.user!.role === 'ADMIN';
    const isDoorUser = event.doorUsers?.some((id: any) => id.toString() === req.user!.id);

    if (!isCreator && !isAdmin && !isDoorUser) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    if (ticket.redeemed) {
      return res.status(400).json({ error: 'Esta entrada ya fue canjeada' });
    }

    ticket.redeemed = true;
    ticket.redeemedAt = new Date();
    await ticket.save();

    return res.json({ message: 'Entrada canjeada exitosamente', ticket });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Regenerate QR (admin/creator only)
router.post('/:ticketId/regenerate-qr', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await Ticket.findById(req.params.ticketId).populate('event');
    if (!ticket) return res.status(404).json({ error: 'Entrada no encontrada' });

    // Check permissions
    const event = ticket.event as any;
    const isCreator = event.creator.toString() === req.user!.id;
    const isAdmin = req.user!.role === 'ADMINISTRADOR' || req.user!.role === 'ADMIN';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    // Generate new QR with scan-redeem URL
    const scanUrl = `https://artedigitaldata.com/scan-redeem.html?code=${ticket.code}`;
    const qrData = await QRCode.toDataURL(scanUrl);

    ticket.qrData = qrData;
    await ticket.save();

    return res.json(ticket);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Redeem by code (for QR scanner)
router.post('/redeem-by-code', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    const ticket = await Ticket.findOne({ code: code.toUpperCase() }).populate('event');
    if (!ticket) return res.status(404).json({ error: 'Entrada no encontrada' });

    const event = ticket.event as any;
    const isCreator = event.creator.toString() === req.user!.id;
    const isAdmin = req.user!.role === 'ADMINISTRADOR' || req.user!.role === 'ADMIN';
    const isDoorUser = event.doorUsers?.some((id: any) => id.toString() === req.user!.id);

    if (!isCreator && !isAdmin && !isDoorUser) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    if (ticket.redeemed) {
      return res.status(400).json({ error: 'Esta entrada ya fue canjeada', ticket });
    }

    ticket.redeemed = true;
    ticket.redeemedAt = new Date();
    await ticket.save();

    return res.json({ message: 'Entrada canjeada exitosamente', ticket });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete ticket
router.delete('/:ticketId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await Ticket.findById(req.params.ticketId).populate('event');
    if (!ticket) return res.status(404).json({ error: 'Entrada no encontrada' });

    const event = ticket.event as any;
    const isCreator = event.creator.toString() === req.user!.id;
    const isAdmin = req.user!.role === 'ADMINISTRADOR' || req.user!.role === 'ADMIN';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    await ticket.deleteOne();
    return res.json({ message: 'Entrada eliminada' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
