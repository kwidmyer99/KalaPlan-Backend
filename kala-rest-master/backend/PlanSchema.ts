import mongoose, { Schema, Document } from 'mongoose';

export interface IPlan extends Document {
  type: string;
  v: string;
  texts: string[];
  pdf?: Buffer;
}

export const PlanSchema = new mongoose.Schema<IPlan>({
  type: String,
  v: String,
  texts: [String],
  pdf: Buffer,
});

export default mongoose.model<IPlan>('Plan', PlanSchema);
