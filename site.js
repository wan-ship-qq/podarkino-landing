const fallbackProducts = [
  {
    title: "Подарочный набор орехов в шоколаде",
    description: "Ореховое ассорти с арахисом для учителя, воспитателя, близких людей и пикника.",
    image: "assets/tea-sweets.jpg",
    url: "https://ozon.ru/t/C6C1SG5",
    button: "Купить на Ozon",
    visible: true
  }
];

const productsRoot = document.querySelector("[data-products]");
const defaultContent = {
  storeUrl: "https://www.ozon.ru/seller/podarkino/"
};

function productCard(product) {
  const article = document.createElement("article");
  article.className = "product-card";

  const imageWrap = document.createElement("div");
  imageWrap.className = "product-img";

  if (product.image) {
    const image = document.createElement("img");
    image.src = product.image;
    image.alt = product.title || "Подарок из магазина Подаркино";
    image.loading = "lazy";
    imageWrap.append(image);
  }

  const title = document.createElement("h3");
  title.textContent = product.title || "Подарок";

  const description = document.createElement("p");
  description.textContent = product.description || "";

  const link = document.createElement("a");
  link.href = product.url || "https://www.ozon.ru/seller/podarkino/";
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = product.button || "Купить на Ozon";

  article.append(imageWrap, title, description, link);
  return article;
}

function renderProducts(products) {
  if (!productsRoot) return;

  const visibleProducts = products.filter((product) => product.visible !== false);
  productsRoot.replaceChildren(...visibleProducts.map(productCard));
}

async function loadProducts() {
  if (!productsRoot) return;

  try {
    const response = await fetch("data/products.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Products not available");
    const products = await response.json();
    renderProducts(Array.isArray(products) && products.length ? products : fallbackProducts);
  } catch (error) {
    renderProducts(fallbackProducts);
  }
}

function applyContent(content) {
  const data = { ...defaultContent, ...content };

  document.querySelectorAll("[data-content]").forEach((element) => {
    const key = element.dataset.content;
    if (typeof data[key] === "string") {
      element.textContent = data[key];
    }
  });

  document.querySelectorAll("[data-link='store']").forEach((element) => {
    if (data.storeUrl) element.href = data.storeUrl;
  });
}

async function loadContent() {
  try {
    const response = await fetch("data/content.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Content not available");
    applyContent(await response.json());
  } catch (error) {
    applyContent(defaultContent);
  }
}

loadProducts();
loadContent();
