import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import Ticket from '../models/Ticket';
import Evento from '../models/Evento';
import User from '../models/User';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import QRCode from 'qrcode';
import { Types } from 'mongoose';

const router = Router();

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
      .populate('owner', 'username email')
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

    // Only event creator or admin can see all tickets
    const isCreator = event.creator.toString() === req.user!.id;
    const isAdmin = req.user!.role === 'ADMINISTRADOR' || req.user!.role === 'ADMIN';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const tickets = await Ticket.find({ event: req.params.eventId })
      .populate('owner', 'username email avatar')
      .sort({ createdAt: -1 });

    return res.json(tickets);
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

    const { ownerName, ownerEmail, ownerPhone } = req.body;

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

    // Generate QR data
    const qrData = await QRCode.toDataURL(JSON.stringify({
      code,
      event: req.params.eventId,
      type: 'ticket'
    }));

    // Create ticket
    const ticket = await Ticket.create({
      event: req.params.eventId,
      code,
      qrData,
      ownerName,
      ownerEmail,
      ownerPhone,
      paymentStatus: 'free',
      paymentId: 'MANUAL'
    });

    return res.status(201).json(ticket);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get single ticket by code (PUBLIC - for QR validation)
router.get('/code/:code', async (req: Request, res: Response) => {
  try {
    let ticket = await Ticket.findOne({ code: req.params.code.toUpperCase() })
      .populate('event', 'title date location ticketConfig')
      .populate('owner', 'username email');

    if (!ticket) return res.status(404).json({ error: 'Entrada no encontrada' });

    // Auto-generate QR if missing (for old tickets)
    if (!ticket.qrData) {
      const qrData = await QRCode.toDataURL(JSON.stringify({
        code: ticket.code,
        event: ticket.event._id || ticket.event,
        type: 'ticket'
      }));
      ticket.qrData = qrData;
      await ticket.save();
    }

    // Return ticket data - QR verification is public
    const ticketObj = ticket.toObject();
    return res.json(ticketObj);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get full ticket details (requires auth - for admin/creator/owner)
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('event', 'title date location creator ticketConfig')
      .populate('owner', 'username email');

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

// Get my tickets
router.get('/my', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tickets = await Ticket.find({ owner: req.user!.id })
      .populate('event', 'title date location imageUrl')
      .sort({ createdAt: -1 });

    return res.json(tickets);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get ticket stats for an event (for creator dashboard)
router.get('/event/:eventId/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const event = await Evento.findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    const isCreator = event.creator.toString() === req.user!.id;
    const isAdmin = req.user!.role === 'ADMINISTRADOR' || req.user!.role === 'ADMIN';

    if (!isCreator && !isAdmin) {
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
router.post('/event/:eventId/create-preference', async (req: Request, res: Response) => {
  try {
    if (!mercadopago) {
      return res.status(500).json({ error: 'MercadoPago no configurado' });
    }

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
    const qrData = JSON.stringify({
      code,
      event: event._id,
      type: 'ticket'
    });

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(qrData);

    // Create ticket first (pending status)
    const ticket = await Ticket.create({
      event: req.params.eventId,
      code,
      qrData,
      ownerName: ownerName || '',
      ownerEmail: ownerEmail || '',
      ownerPhone: ownerPhone || '',
      paymentStatus: 'pending'
    });

    // Create MercadoPago preference
    const preference = new Preference(mercadopago);
    const preferenceData = {
      items: [
        {
          id: ticket._id.toString(),
          title: `Entrada - ${event.title}`,
          description: `Código: ${code}`,
          quantity: 1,
          unit_price: event.ticketConfig.price || 0,
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
router.post('/event/:eventId/create-free', async (req: Request, res: Response) => {
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
    const qrData = JSON.stringify({
      code,
      event: event._id,
      type: 'ticket'
    });

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(qrData);

    // Create ticket with free/paid status
    const ticket = await Ticket.create({
      event: req.params.eventId,
      code,
      qrData,
      ownerName: ownerName || '',
      ownerEmail: ownerEmail || '',
      ownerPhone: ownerPhone || '',
      paymentStatus: event.ticketConfig.price === 0 || event.ticketConfig.isContribution ? 'free' : 'pending'
    });

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

    if (type === 'payment') {
      const paymentId = data.id;
      // In a real implementation, you would verify the payment status with MercadoPago API
      // For now, we assume payment is completed when webhook is called

      // Find ticket by external reference
      const ticket = await Ticket.findById(data.external_reference);
      if (ticket) {
        ticket.paymentId = paymentId;
        ticket.paymentStatus = 'completed';
        await ticket.save();
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

    if (!isCreator && !isAdmin) {
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

    // Generate new QR
    const qrData = await QRCode.toDataURL(JSON.stringify({
      code: ticket.code,
      event: ticket.event._id || ticket.event,
      type: 'ticket'
    }));

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

    if (!isCreator && !isAdmin) {
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
