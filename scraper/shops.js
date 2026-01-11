export const SHOPS = [
  {
    id: "domod",
    search: q => `https://domod.ba/pretraga?keywords=${encodeURIComponent(q)}`,
    item: ".product-item",
    title: ".product-title a",
    price: ".price-new, .price"
  },
  {
    id: "ekupi",
    search: q => `https://www.ekupi.ba/bs/search/?text=${encodeURIComponent(q)}`,
    item: ".product-card",
    title: ".product-card__title",
    price: ".product__price--discount, .product__price"
  },
  {
    id: "technoshop",
    search: q => `https://technoshop.ba/proizvodi?pretraga=${encodeURIComponent(q)}`,
    item: ".product",
    title: ".product-title a",
    price: ".price, .amount"
  },
  {
    id: "tehnomag",
    search: q => `https://tehnomag.com/proizvodi/?search_q=${encodeURIComponent(q)}`,
    item: ".product",
    title: ".woocommerce-loop-product__title",
    price: "ins .amount, .woocommerce-Price-amount"
  }
];
