const axios = require("axios");

const BASE_URL = process.env.FIVESIM_BASE_URL || "https://5sim.net/v1";
const API_KEY = process.env.FIVESIM_API_KEY;

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    Accept: "application/json",
  },
});

async function getCountries() {
  // Public endpoint, no auth needed, but using the authed client is fine too.
  const { data } = await client.get("/guest/countries");
  return data;
}

async function getProducts(country, operator = "any") {
  const { data } = await client.get(`/guest/products/${country}/${operator}`);
  return data; // { productName: { Category, Qty, Price }, ... }
}

async function getPrices(country, product) {
  const { data } = await client.get("/guest/prices", { params: { country, product } });
  return data;
}

/**
 * Rent/buy an activation number.
 * GET /user/buy/activation/{country}/{operator}/{product}
 */
async function buyActivation({ country, operator = "any", product }) {
  const { data } = await client.get(`/user/buy/activation/${country}/${operator}/${product}`);
  return data; // { id, phone, operator, product, price, status, expires, sms: [] }
}

async function checkOrder(orderId) {
  const { data } = await client.get(`/user/check/${orderId}`);
  return data;
}

async function finishOrder(orderId) {
  const { data } = await client.get(`/user/finish/${orderId}`);
  return data;
}

async function cancelOrder(orderId) {
  const { data } = await client.get(`/user/cancel/${orderId}`);
  return data;
}

async function getBalance() {
  const { data } = await client.get("/user/profile");
  return data;
}

module.exports = {
  getCountries,
  getProducts,
  getPrices,
  buyActivation,
  checkOrder,
  finishOrder,
  cancelOrder,
  getBalance,
};
