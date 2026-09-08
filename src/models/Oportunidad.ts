import mongoose, { Schema, Document, Types } from 'mongoose';

// =============================================
// TIPOS DE OPORTUNIDAD
// =============================================
// 1. CONVOCATORIA_OBRA -> Convocatoria de obra para evento
// 2. OPORTUNIDAD_LABORAL -> Oportunidades laborales
// 3. COLABORACION -> Colaboración en proyectos

export type TipoOportunidad = 'convocatoria_obra' | 'oportunidad_laboral' | 'colaboracion';

// =============================================
// PARÁMETROS DE PRESENTACIÓN (Convocatoria de Obra)
// =============================================
export interface IParametroPresentacion {
  key: string;           // identificador único del campo
  label: string;         // nombre visible del campo
  type: 'text' | 'textarea' | 'url' | 'file' | 'reel';
  required: boolean;
  placeholder?: string;
  descripcion?: string;
}

// =============================================
// INSCRIPCIÓN / POSTULACIÓN
// =============================================
export interface IInscripcion {
  usuario: Types.ObjectId;
  oportunidad: Types.ObjectId;
  datos: Record<string, any>;  // datos dinámicos según parámetros
  estado: 'pendiente' | 'aceptada' | 'rechazada';
  mensaje?: string;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================
// OPORTUNIDAD
// =============================================
export interface IOportunidad extends Document {
  tipo: TipoOportunidad;
  titulo: string;
  descripcion: string;
  creador: Types.ObjectId;
  
  // Campos específicos de CONVOCATORIA_OBRA
  basesCondiciones?: string;
  lugarExposicion?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
  imagenUrl?: string;
  parametrosPresentacion?: IParametroPresentacion[];
  
  // Campos específicos de OPORTUNIDAD_LABORAL
  nombrePuesto?: string;
  productoraEmpresa?: string;
  
  // Campos específicos de COLABORACION
  nombreProyecto?: string;
  colaboracionPedida?: string;
  
  // Compartidos
  activa: boolean;
  inscripciones: Types.ObjectId[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// =============================================
// ESQUEMAS
// =============================================

const ParametroPresentacionSchema: Schema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ['text', 'textarea', 'url', 'file', 'reel'], default: 'text' },
    required: { type: Boolean, default: false },
    placeholder: { type: String, default: '' },
    descripcion: { type: String, default: '' },
  },
  { _id: false }
);

const OportunidadSchema: Schema = new Schema(
  {
    tipo: {
      type: String,
      enum: ['convocatoria_obra', 'oportunidad_laboral', 'colaboracion'],
      required: true,
    },
    titulo: { type: String, required: true, trim: true },
    descripcion: { type: String, default: '' },
    creador: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    
    // Convocatoria de Obra
    basesCondiciones: { type: String, default: '' },
    lugarExposicion: { type: String, default: '' },
    fechaDesde: { type: Date },
    fechaHasta: { type: Date },
    imagenUrl: { type: String, default: '' },
    parametrosPresentacion: { type: [ParametroPresentacionSchema], default: [] },
    
    // Oportunidad Laboral
    nombrePuesto: { type: String, default: '' },
    productoraEmpresa: { type: String, default: '' },
    
    // Colaboración
    nombreProyecto: { type: String, default: '' },
    colaboracionPedida: { type: String, default: '' },
    
    // Compartidos
    activa: { type: Boolean, default: true },
    inscripciones: [{ type: Schema.Types.ObjectId, ref: 'Inscripcion' }],
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

// =============================================
// INSCRIPCIÓN SCHEMA
// =============================================
const InscripcionSchema: Schema = new Schema(
  {
    usuario: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    oportunidad: { type: Schema.Types.ObjectId, ref: 'Oportunidad', required: true },
    datos: { type: Schema.Types.Mixed, default: {} },
    estado: {
      type: String,
      enum: ['pendiente', 'aceptada', 'rechazada'],
      default: 'pendiente',
    },
    mensaje: { type: String, default: '' },
  },
  { timestamps: true }
);

// Índice compuesto para evitar inscripciones duplicadas
InscripcionSchema.index({ usuario: 1, oportunidad: 1 }, { unique: true });

export const Oportunidad = mongoose.model<IOportunidad>('Oportunidad', OportunidadSchema);
export const Inscripcion = mongoose.model<IInscripcion>('Inscripcion', InscripcionSchema);

export default Oportunidad;
