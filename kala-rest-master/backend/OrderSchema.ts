import mongoose, { Schema, Document } from 'mongoose';
import { IPlan, PlanSchema } from './PlanSchema';

export interface IOrder extends Document {
  id: string;
  lastModified: Date;
  submited: boolean;
  plans: IPlan[];
}

export const OrderSchema = new Schema<IOrder>({
  id: String,
  lastModified: Date,
  submited: Boolean,
  plans: [PlanSchema],
});

export default mongoose.model<IOrder>('Order', OrderSchema);
