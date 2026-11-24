import Midtrans from 'midtrans-client';

const midtransClient = new Midtrans.CoreApi({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
});

export default midtransClient;