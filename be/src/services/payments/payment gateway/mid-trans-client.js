import Midtrans from 'midtrans-client';

const midtransClient = new Midtrans.CoreApi({
  isProduction: process.env.NODE_ENV === 'production',
  serverKey: process.env.MIDTRANS_SERVER_KEY,
});

export default midtransClient;