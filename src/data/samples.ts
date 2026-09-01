import { SampleReceipt } from '../types';

export const SAMPLE_RECEIPTS: SampleReceipt[] = [
  {
    id: 'costco-lego-groceries',
    title: 'Costco Wholesale (Lego + Groceries + Pharmacy)',
    store: 'Costco Wholesale #482',
    date: '2025-05-18',
    total: 184.45,
    category_highlight: 'Hobbies/Toys vs Groceries vs Pharmacy',
    description: 'A typical multi-category shopping trip with a Lego Star Wars set, organic groceries, and over-the-counter allergy medicine.',
    image_url: 'https://images.unsplash.com/photo-1554415707-9e4c0197475d?auto=format&fit=crop&w=800&q=80',
    sample_data: {
      store_name: 'Costco Wholesale #482',
      date: '2025-05-18',
      time: '14:23',
      currency: 'ZAR',
      total_amount: 184.45,
      tax_amount: 8.50,
      payment_method: 'Visa **** 4921',
      is_balanced: true,
      splits_sum: 184.45,
      splits: [
        {
          id: 'split-1',
          description: 'Lego Star Wars Imperial Shuttle 75300',
          amount: 69.99,
          category: 'Hobbies & Entertainment',
          quantity: 1,
          unit_price: 69.99,
          notes: 'Special gift purchase (Toy/Hobby split)',
          destination_name: 'Costco Wholesale #482',
          tags: ['receipt-ai', 'lego', 'hobbies']
        },
        {
          id: 'split-2',
          description: 'Kirkland Organic Whole Milk (2-Pack Gallon)',
          amount: 8.49,
          category: 'Groceries',
          quantity: 1,
          unit_price: 8.49,
          notes: 'Weekly dairy supplies',
          destination_name: 'Costco Wholesale #482',
          tags: ['receipt-ai', 'groceries']
        },
        {
          id: 'split-3',
          description: 'Organic Hass Avocados (6 Count)',
          amount: 6.99,
          category: 'Groceries',
          quantity: 1,
          unit_price: 6.99,
          notes: 'Produce',
          destination_name: 'Costco Wholesale #482',
          tags: ['receipt-ai', 'groceries']
        },
        {
          id: 'split-4',
          description: 'Kirkland Signature Paper Towels 12-Roll',
          amount: 22.49,
          category: 'Household',
          quantity: 1,
          unit_price: 22.49,
          notes: 'Paper products and cleaning bulk',
          destination_name: 'Costco Wholesale #482',
          tags: ['receipt-ai', 'household']
        },
        {
          id: 'split-5',
          description: 'Aller-Tec Cetirizine 10mg (365 Tablets)',
          amount: 16.99,
          category: 'Pharmacy & Health',
          quantity: 1,
          unit_price: 16.99,
          notes: 'Annual allergy medication stock',
          destination_name: 'Costco Wholesale #482',
          tags: ['receipt-ai', 'health', 'pharmacy']
        },
        {
          id: 'split-6',
          description: 'Rotisserie Chicken & Bakery Croissants',
          amount: 11.98,
          category: 'Groceries',
          quantity: 2,
          unit_price: 5.99,
          notes: 'Deli and fresh bakery items',
          destination_name: 'Costco Wholesale #482',
          tags: ['receipt-ai', 'groceries']
        },
        {
          id: 'split-7',
          description: 'Kirkland Stainless Steel Cookware Saucepan',
          amount: 39.02,
          category: 'Home & Kitchen',
          quantity: 1,
          unit_price: 39.02,
          notes: 'Kitchen equipment upgrade',
          destination_name: 'Costco Wholesale #482',
          tags: ['receipt-ai', 'kitchen']
        },
        {
          id: 'split-8',
          description: 'Estimated State & Local Sales Tax',
          amount: 8.50,
          category: 'Taxes & Fees',
          notes: 'Itemized sales tax',
          destination_name: 'Costco Wholesale #482',
          tags: ['receipt-ai', 'taxes']
        }
      ]
    }
  },
  {
    id: 'target-electronics-clothing-groceries',
    title: 'Target Supercenter (DualSense Controller + Snacks + T-Shirts)',
    store: 'Target #1789',
    date: '2025-05-12',
    total: 132.84,
    category_highlight: 'Electronics vs Clothing vs Groceries',
    description: 'Target receipt containing a PS5 controller, summer apparel, and grocery snacks.',
    image_url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=800&q=80',
    sample_data: {
      store_name: 'Target #1789',
      date: '2025-05-12',
      time: '18:45',
      currency: 'ZAR',
      total_amount: 132.84,
      tax_amount: 9.35,
      payment_method: 'Apple Pay (Mastercard)',
      is_balanced: true,
      splits_sum: 132.84,
      splits: [
        {
          id: 'target-1',
          description: 'PlayStation 5 DualSense Wireless Controller (Midnight Black)',
          amount: 74.99,
          category: 'Electronics & Gaming',
          quantity: 1,
          unit_price: 74.99,
          notes: 'Gaming peripheral replacement',
          destination_name: 'Target #1789',
          tags: ['receipt-ai', 'gaming', 'electronics']
        },
        {
          id: 'target-2',
          description: 'Goodfellow & Co Men Crewneck T-Shirt (2-Pack)',
          amount: 18.00,
          category: 'Clothing & Apparel',
          quantity: 1,
          unit_price: 18.00,
          notes: 'Basic summer cotton tees',
          destination_name: 'Target #1789',
          tags: ['receipt-ai', 'clothing']
        },
        {
          id: 'target-3',
          description: 'Market Pantry Sparkling Water & Trail Mix',
          amount: 12.50,
          category: 'Groceries',
          quantity: 2,
          unit_price: 6.25,
          notes: 'Beverages and snacks',
          destination_name: 'Target #1789',
          tags: ['receipt-ai', 'groceries']
        },
        {
          id: 'target-4',
          description: 'Method Antibacterial All-Purpose Spray',
          amount: 4.50,
          category: 'Household',
          quantity: 1,
          unit_price: 4.50,
          notes: 'Cleaning refill',
          destination_name: 'Target #1789',
          tags: ['receipt-ai', 'household']
        },
        {
          id: 'target-5',
          description: 'Sales Tax',
          amount: 9.35,
          category: 'Taxes & Fees',
          notes: 'Sales tax on taxable line items',
          destination_name: 'Target #1789',
          tags: ['receipt-ai', 'taxes']
        },
        {
          id: 'target-6',
          description: 'Target Circle Member Discount Promo',
          amount: -5.00,
          category: 'Discounts & Savings',
          notes: 'Store coupon applied',
          destination_name: 'Target #1789',
          tags: ['receipt-ai', 'discount']
        },
        {
          id: 'target-7',
          description: 'Coffee Beans Organic Medium Roast 12oz',
          amount: 18.50,
          category: 'Groceries',
          quantity: 1,
          unit_price: 18.50,
          notes: 'Morning coffee staple',
          destination_name: 'Target #1789',
          tags: ['receipt-ai', 'groceries']
        }
      ]
    }
  },
  {
    id: 'homedepot-tools-garden',
    title: 'The Home Depot (Power Drill + Potting Soil + LED Bulbs)',
    store: 'The Home Depot #0612',
    date: '2025-05-05',
    total: 168.22,
    category_highlight: 'Tools & Hardware vs Lawn & Garden',
    description: 'Home improvement store run separating tool assets from consumable garden supplies.',
    image_url: 'https://images.unsplash.com/photo-1513467535987-fd81bc7d62f8?auto=format&fit=crop&w=800&q=80',
    sample_data: {
      store_name: 'The Home Depot #0612',
      date: '2025-05-05',
      time: '11:15',
      currency: 'ZAR',
      total_amount: 168.22,
      tax_amount: 11.23,
      payment_method: 'Debit Card',
      is_balanced: true,
      splits_sum: 168.22,
      splits: [
        {
          id: 'hd-1',
          description: 'DeWalt 20V MAX Cordless Drill/Driver Kit',
          amount: 99.00,
          category: 'Tools & Hardware',
          quantity: 1,
          unit_price: 99.00,
          notes: 'Tool purchase for home workshop',
          destination_name: 'The Home Depot #0612',
          tags: ['receipt-ai', 'tools', 'hardware']
        },
        {
          id: 'hd-2',
          description: 'Miracle-Gro Moisture Control Potting Mix 50 Qt',
          amount: 17.99,
          category: 'Lawn & Garden',
          quantity: 1,
          unit_price: 17.99,
          notes: 'Balcony flower planter soil',
          destination_name: 'The Home Depot #0612',
          tags: ['receipt-ai', 'garden']
        },
        {
          id: 'hd-3',
          description: 'Philips Warm White LED Bulbs 60W Equivalent (8-Pack)',
          amount: 19.98,
          category: 'Home Improvement',
          quantity: 1,
          unit_price: 19.98,
          notes: 'Living room light bulb replacements',
          destination_name: 'The Home Depot #0612',
          tags: ['receipt-ai', 'home-improvement']
        },
        {
          id: 'hd-4',
          description: 'Gorilla Heavy Duty Duct Tape 35yd',
          amount: 12.49,
          category: 'Household & Maintenance',
          quantity: 1,
          unit_price: 12.49,
          notes: 'General repairs',
          destination_name: 'The Home Depot #0612',
          tags: ['receipt-ai', 'maintenance']
        },
        {
          id: 'hd-5',
          description: 'State & County Sales Tax',
          amount: 11.23,
          category: 'Taxes & Fees',
          notes: 'Sales tax',
          destination_name: 'The Home Depot #0612',
          tags: ['receipt-ai', 'taxes']
        },
        {
          id: 'hd-6',
          description: 'Spring Garden Promo Instant Rebate',
          amount: -1.47,
          category: 'Discounts & Savings',
          notes: 'Store instant rebate',
          destination_name: 'The Home Depot #0612',
          tags: ['receipt-ai', 'discount']
        },
        {
          id: 'hd-7',
          description: 'Heavy Duty Nitrile Work Gloves',
          amount: 9.00,
          category: 'Tools & Hardware',
          notes: 'Gardening and DIY protection',
          destination_name: 'The Home Depot #0612',
          tags: ['receipt-ai', 'tools']
        }
      ]
    }
  }
];

export const CATEGORY_PALETTES: Record<string, { bg: string; text: string; border: string }> = {
  'Hobbies & Entertainment': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  'Toys': { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
  'Groceries': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Household': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  'Pharmacy & Health': { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
  'Electronics & Gaming': { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
  'Clothing & Apparel': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
  'Home Improvement': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  'Tools & Hardware': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  'Lawn & Garden': { bg: 'bg-lime-100', text: 'text-lime-700', border: 'border-lime-200' },
  'Dining & Snacks': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
  'Taxes & Fees': { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300' },
  'Discounts & Savings': { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' },
  'General Expenses': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
};

export const DEFAULT_CATEGORY_LIST = [
  'Groceries',
  'Hobbies & Entertainment',
  'Toys',
  'Electronics & Gaming',
  'Household',
  'Pharmacy & Health',
  'Dining & Snacks',
  'Clothing & Apparel',
  'Home Improvement',
  'Tools & Hardware',
  'Lawn & Garden',
  'Pets & Supplies',
  'Personal Care',
  'Taxes & Fees',
  'Discounts & Savings',
  'General Expenses'
];
