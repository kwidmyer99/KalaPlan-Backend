import fs from 'fs';
import mongoose from 'mongoose';
import User, { IUser } from './UserSchema';
import Order from './OrderSchema';
import Plan, { IPlan } from './PlanSchema';
import { pdfIndices } from './PdfIndices';

const connection = mongoose.connection;
connection.on('error', console.error.bind(console, 'connection error:'));
connection.once('open', function () {
  // we're connected!
  console.log('connecting...');
});

const exportPdf = async () => {
  const mo = await mongoose.connect('mongodb://localhost/kalaplan', { useNewUrlParser: true });
  if (mo) {
    console.log('connect success');
  }
  const users = await User.find({});
  users.forEach(user => {
    user.orders.forEach(order => {
      order.plans.forEach(plan => {
        const dir = `./pdfs/${user.customer}/${order.id}/`;
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        console.log(dir + `${pdfIndices[plan.type]}.pdf is processing`);
        if (plan.pdf) {
          fs.writeFileSync(dir + `${pdfIndices[plan.type]}.pdf`, plan.pdf);
        }
        console.log(dir + ` ${pdfIndices[plan.type]}.pdf is created or updated`);
      });
    });
  });
  console.log('finish processing');

  mo.disconnect();
};

exportPdf();
