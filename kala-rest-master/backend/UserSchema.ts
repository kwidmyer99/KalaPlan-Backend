import mongoose, { Schema, Document } from 'mongoose';
import { IOrder, OrderSchema } from './OrderSchema';

export interface IUser extends Document {
  customer: string;
  submitTime: Date;
  orders: IOrder[];
}

const UserSchema = new mongoose.Schema<IUser>({
  customer: String,
  submitTime: Date,
  orders: [OrderSchema],
});

export default mongoose.model<IUser>('User', UserSchema);
