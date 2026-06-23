import Razorpay from 'razorpay';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { amount } = req.body;

  if (!amount || amount < 100) {
    return res.status(400).json({ error: 'Invalid amount. Minimum amount is 100 paise.' });
  }

  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount, // amount in the smallest currency unit (paise)
      currency: 'INR',
      receipt: `receipt_order_${Math.random().toString(36).substring(7)}`,
    };

    const order = await razorpay.orders.create(options);

    return res.status(200).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    return res.status(500).json({ error: 'Failed to create order', details: error.message });
  }
}
