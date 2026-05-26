import iphone13_1 from '../assets/images/products/iphone13.jpg'
import iphone13_2 from '../assets/images/products/iphone13_2.jpg'
import iphone13_3 from '../assets/images/products/iphone13_3.jpg'
import dellLaptop1 from '../assets/images/products/Dell_laptop_1.jpg'
import dellLaptop2 from '../assets/images/products/Dell_laptop_2.jpg'
import dellLaptop3 from '../assets/images/products/Dell_laptop_3.jpg'
import heroSprint1 from '../assets/images/products/Hero_Sprint_1.jpg'
import heroSprint2 from '../assets/images/products/Hero_Sprint_2.jpg'
import sonyHeadphones1 from '../assets/images/products/Sony_Headphones_1.jpg'
import sonyHeadphones2 from '../assets/images/products/Sony_Headphones_2.jpg'
import ikea1 from '../assets/images/products/IKEA_1.jpg'
import ikea2 from '../assets/images/products/IKEA_2.jpg'

export const mockListings = [
  {
    _id: "1",
    title: "iPhone 13 - 128GB Midnight Black",
    description: "Excellent condition, barely used. No scratches, comes with original box and charger. Face ID works perfectly, battery health at 90%. Selling because I upgraded to iPhone 15.",
    price: { amount: 50000, negotiable: true },
    category: { id: "mobiles", name: "Mobiles" },
    attributes: { brand: "Apple", ram: "6GB", storage: "128GB", battery: "90%", color: "Midnight Black" },
    images: [iphone13_1, iphone13_2, iphone13_3],
    seller: "user_1",
    location: { city: "Delhi", state: "Delhi" },
    status: "active",
    viewsCount: 15,
    favoritesCount: 3,
    createdAt: new Date().toISOString()
  },
  {
    _id: "2",
    title: "Dell Inspiron 15 Laptop",
    description: "Used for 1 year. Intel i5 10th Gen, 8GB RAM, 512GB SSD. Minor wear on lid but screen is perfect. Battery lasts ~5 hours. Comes with original charger and bag.",
    price: { amount: 35000, negotiable: true },
    category: { id: "laptops", name: "Laptops" },
    attributes: { brand: "Dell", processor: "Intel i5 10th Gen", ram: "8GB", storage: "512GB SSD", battery: "75%" },
    images: [dellLaptop1, dellLaptop2, dellLaptop3],
    seller: "user_2",
    location: { city: "Mumbai", state: "Maharashtra" },
    status: "active",
    viewsCount: 40,
    favoritesCount: 8,
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    _id: "3",
    title: "Hero Sprint 26T Mountain Cycle",
    description: "Used for 6 months. Good tyres, all gears working fine. Frame has no damage. Great for daily commute or trail rides. Selling as I'm relocating.",
    price: { amount: 3500, negotiable: false },
    category: { id: "sports", name: "Sports" },
    attributes: { brand: "Hero", color: "Red", size: "26T", gears: "21-speed", condition: "Good" },
    images: [heroSprint1, heroSprint2],
    seller: "user_3",
    location: { city: "Pune", state: "Maharashtra" },
    status: "sold",
    viewsCount: 22,
    favoritesCount: 1,
    createdAt: new Date(Date.now() - 172800000).toISOString()
  },
  {
    _id: "4",
    title: "Sony WH-1000XM4 Headphones",
    description: "6 months old, noise cancellation works perfectly. 30-hour battery life, multipoint connection. Includes original carry case and 3.5mm cable. No scratches.",
    price: { amount: 18000, negotiable: true },
    category: { id: "electronics", name: "Electronics" },
    attributes: { brand: "Sony", color: "Black", warranty: "6 months left", batteryLife: "30 hours", connectivity: "Bluetooth 5.0" },
    images: [sonyHeadphones1, sonyHeadphones2],
    seller: "user_4",
    location: { city: "Bengaluru", state: "Karnataka" },
    status: "active",
    viewsCount: 60,
    favoritesCount: 12,
    createdAt: new Date(Date.now() - 259200000).toISOString()
  },
  {
    _id: "5",
    title: "IKEA Study Table",
    description: "Bought 2 years ago. Small dent on one side, otherwise in good shape. Easy to disassemble for transport. Dimensions: 120cm x 60cm. White finish, clean surface.",
    price: { amount: 4500, negotiable: true },
    category: { id: "furniture", name: "Furniture" },
    attributes: { brand: "IKEA", material: "Wood", color: "White", dimensions: "120cm x 60cm", condition: "Good" },
    images: [ikea1, ikea2],
    seller: "user_5",
    location: { city: "Hyderabad", state: "Telangana" },
    status: "active",
    viewsCount: 10,
    favoritesCount: 2,
    createdAt: new Date(Date.now() - 345600000).toISOString()
  }
]
