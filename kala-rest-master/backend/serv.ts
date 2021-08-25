import Koa from 'koa';
import dotenv from 'dotenv';
import next from 'next';
import session from 'koa-session';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import koaBody from 'koa-body';
import multer from 'koa-multer';
import cors from 'koa-cors';
import mongoose from 'mongoose';
import User, { IUser } from './UserSchema';
import Order from './OrderSchema';
import Plan, { IPlan } from './PlanSchema';
import fs from 'fs';
import { File } from 'formidable';
import mailserv from '@sendgrid/mail';
import { plannerBase64Contents } from './Kalaplanbase64';
import { pdfIndices } from './PdfIndices';
// import { grid } from 'multer-gridfs-storage';

dotenv.config();

const port = parseInt(process.env.PORT!, 10) || 80;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

mailserv.setApiKey(process.env.SENDGRID_API_KEY!);

const getEmailHtml = (name: string, email: string, orderId: string) => `
<!DOCTYPE html>
<html
  lang="en"
  xmlns="http://www.w3.org/1999/xhtml"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:o="urn:schemas-microsoft-com:office:office"
>
  <head>
    <meta charset="UTF-8" />
  </head>
  <body>
    <p>Name: ${name}</p>
    <p>Email: ${email}</p>
    <p>Order: #${orderId}</p>
  </body>
</html>
`;

enum States {
  Error,
  OK,
  Empty_Customer,
  Empty_Order,
  Empty_Type,
  Customer_Not_Found,
  Order_Not_Found,
  Type_Not_Found,
  Request_Too_Many,
  Order_Has_Been_Submitedd,
}

interface Attachment {
  content: string;
  filename: string;
  type: string;
  disposition: string;
  contentId: string;
}

app.prepare().then(async () => {
  const server = new Koa();
  server.use(cors());

  // server.use(async (ctx, next) => {
  //   ctx.set('Access-Control-Allow-Origin', '*');
  //   ctx.set(
  //     'Access-Control-Allow-Headers',
  //     'Origin, Access-Control-Allow-Origin, X-Requested-With, Content-Type, Accept',
  //   );
  //   ctx.set('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
  //   next();
  // });

  const router = new Router();

  const connection = mongoose.connection;
  connection.on('error', console.error.bind(console, 'connection error:'));
  connection.once('open', function () {
    // we're connected!
    console.log('connected...');
  });

  await mongoose.connect('mongodb://localhost/kalaplan', { useNewUrlParser: true });

  server.use(session({ secure: true, sameSite: 'none' }, server));
  server.use(bodyParser());

  // select
  router.get('/plan', async ctx => {
    const customer: string = ctx.query.customer;
    const orderId: string = ctx.query.orderId;
    const type: string = ctx.query.type;

    if (!customer) {
      ctx.body = { state: States.Empty_Customer };
      return;
    }

    // const user = await User.findOne({ customer }).select('-plans.pdf').exec();
    let user: IUser | null = null;

    if (orderId) {
      user = await User.findOne({ customer }).select('-orders.plans.pdf').exec();
    } else {
      user = await User.findOne({ customer }).select('-orders.plans').exec();
    }

    if (!user) {
      ctx.body = { state: States.Customer_Not_Found };
      return;
    }

    if (!orderId) {
      ctx.body = { state: States.OK, data: user.orders };
      return;
    }

    const index = user.orders.findIndex(order => order.id === orderId);
    if (index === -1) {
      ctx.body = { state: States.Order_Not_Found };
      return;
    }

    const order = user.orders[index];

    if (type) {
      const index = order.plans.findIndex(item => item.type === type);

      if (index > -1) {
        ctx.body = { state: States.OK, data: order.plans[index] };
      } else {
        ctx.body = { state: States.Type_Not_Found };
      }
    } else {
      ctx.body = { state: States.OK, data: order.plans };
    }
  });

  // send pdf to email
  router.post('/plan', async ctx => {
    const emailTo = process.env.RECEIVE_PDF_EMAIL;

    const customer: string = ctx.request.body.customer;
    const orderId: string = ctx.request.body.orderId;
    const customerName: string = ctx.request.body.customerName ?? '';
    const customerEmail: string = ctx.request.body.customerEmail ?? '';

    if (!customer) {
      ctx.body = { state: States.Empty_Customer };
      return;
    }

    if (!orderId) {
      ctx.body = { state: States.Empty_Order };
      return;
    }

    // send
    const user = await User.findOne({ customer }).exec();
    if (!user) {
      ctx.body = { state: States.Customer_Not_Found };
      return;
    }

    const index = user.orders.findIndex(order => order.id === orderId);
    if (index === -1) {
      ctx.body = { state: States.Order_Not_Found };
      return;
    }

    const order = user.orders[index];
    if (order.submited) {
      ctx.body = { state: States.Order_Has_Been_Submitedd };
      return;
    }

    const now = new Date();
    const pre = user.submitTime ? user.submitTime.getTime() : 0;

    user.submitTime = now;
    order.submited = true;

    if (now.getTime() - pre < 1000) {
      ctx.body = { state: States.Request_Too_Many };
    } else {
      const attachments: Attachment[] = [];

      plannerBase64Contents.forEach(element => {
        const type = element.type;

        const index = order.plans.findIndex(plan => plan.type === type);
        const plan = order.plans[index];

        const dir = `./pdfs/${customer}/${orderId}/${pdfIndices[type]}.pdf`;

        let content = element.content;

        if (fs.existsSync(dir)) {
          const buffer = fs.readFileSync(dir);
          content = buffer.toString('base64');
        }

        // WARN : This is TEST code A:
        // element.content = content;

        attachments.push({
          content: content,
          filename: `${type}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment',
          contentId: type,
        });
      });

      // WARN : This is TEST code B:
      // fs.writeFileSync('planner base64.json', JSON.stringify(plannerBase64Contents));

      // user.plans.forEach(plan => {
      //   // plan.pdf
      //   if (plan.pdf) {
      //     attachments.push({
      //       content: plan.pdf.toString('base64'),
      //       filename: `${plan.type}.pdf`,
      //       type: 'application/pdf',
      //       disposition: 'attachment',
      //       contentId: plan.type,
      //     });
      //   }
      // });

      const message = {
        from: customerEmail,
        to: emailTo,
        subject: `[kalaplan] Here is the custom planner from ${customerName}`,
        html: getEmailHtml(customerName, customerEmail, orderId),
        attachments,
      };

      // console.log(message);

      const result = await mailserv.send(message);
      // console.log(result);

      user.save();

      ctx.body = { state: States.OK };
    }
  });

  // update
  router.put('/plan', koaBody({ multipart: true }), async ctx => {
    if (!ctx.request.files) {
      ctx.body = { state: States.Error };
      return;
    }

    const json = ctx.request.files.json as File;
    if (!json) {
      ctx.body = { state: States.Error };
      return;
    }

    const jsonse = fs.readFileSync(json.path, 'utf-8');
    const body = JSON.parse(jsonse);

    const pdf = ctx.request.files.pdf as File;
    // fs.writeFileSync('t.pdf', buffer);

    const customer: string = body.customer;
    const orderId: string = body.orderId;
    const type: string = body.type;

    if (!customer) {
      ctx.body = { state: States.Empty_Customer };
      return;
    }

    if (!orderId) {
      ctx.body = { state: States.Empty_Order };
      return;
    }

    if (!type) {
      ctx.body = { state: States.Empty_Type };
      return;
    }

    let user = await User.findOne({ customer }).exec();
    if (!user) {
      user = new User({ customer, orders: [] });
    }

    let index = -1;
    index = user.orders.findIndex(order => order.id === orderId);
    if (index === -1) {
      index = user.orders.push(new Order({ id: orderId, submited: false, plans: [] })) - 1;
    }
    const order = user.orders[index];
    order.lastModified = new Date();

    const plan = new Plan(body);
    if (pdf) {
      const buffer = fs.readFileSync(pdf.path);
      // plan.pdf = buffer;

      const dir = `./pdfs/${customer}/${orderId}/`;

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(dir + `${pdfIndices[type]}.pdf`, buffer);

      // get pdf string
      // fs.writeFileSync(`${type.replace(/\//g, '')}.md`, buffer.toString('base64'));
    }

    index = order.plans.findIndex(item => item.type === type);
    if (index > -1) {
      order.plans[index] = plan;
    } else {
      order.plans.push(plan);
    }

    await user.save();

    ctx.body = { state: States.OK };
  });

  // // delete
  // router.delete('/plan', async ctx => {
  //   const add = ctx.request.body;
  //   const customer: string = add.customer;
  //   const type: string = add.type;

  //   if (!customer) {
  //     ctx.body = { state: States.Empty_Customer };
  //     return;
  //   }

  //   if (!type) {
  //     ctx.body = { state: States.Empty_Type };
  //     return;
  //   }

  //   let plans = table[customer];
  //   if (!plans) {
  //     plans = [];
  //     table[customer] = plans;
  //   }

  //   const index = plans.findIndex(item => item.type === type);
  //   if (index) {
  //     plans.splice(index, 0);
  //   }

  //   ctx.body = { state: States.OK };
  // });

  server.use(router.allowedMethods());
  server.use(router.routes());

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
