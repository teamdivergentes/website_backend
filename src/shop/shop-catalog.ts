export interface ShopProduct {
  id: string;
  name: string;
  priceCents: number;
  sizes: string[];
  descKey: string;
  images: { front: string; back: string | null };
  active: boolean;
}

const TEXTILE_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

export const SHOP_CATALOG: readonly ShopProduct[] = [
  {
    id: 'maillotDvg',
    name: 'MAILLOT 2020',
    priceCents: 3990,
    sizes: TEXTILE_SIZES,
    descKey: 'detailsMaillot',
    images: {
      front: 'assets/img/shop/2020_maillot_front_light.png',
      back: 'assets/img/shop/2020_maillot_back_light.png',
    },
    active: true,
  },
  {
    id: 'sweatDvg',
    name: 'HOODIE - TEAM DIVERGENTES',
    priceCents: 3500,
    sizes: TEXTILE_SIZES,
    descKey: 'detailsSweat',
    images: {
      front: 'assets/img/shop/2020_hoodie_front_light.png',
      back: 'assets/img/shop/2020_hoodie_back_light.png',
    },
    active: true,
  },
  {
    id: 'T-shirtDvg',
    name: 'T-SHIRT - TEAM DIVERGENTES',
    priceCents: 2090,
    sizes: TEXTILE_SIZES,
    descKey: 'detailsTshirt',
    images: {
      front: 'assets/img/shop/2020_TShirt_front_light.png',
      back: 'assets/img/shop/2023_TShirt_back_global_light.png',
    },
    active: true,
  },
  {
    id: 'tapisSourisDvg',
    name: 'TAPIS DE SOURIS - TEAM DIVERGENTES',
    priceCents: 1750,
    sizes: [],
    descKey: 'detailsTDS',
    images: { front: 'assets/img/shop/2020_tapis_front_light.png', back: null },
    active: true,
  },
  {
    id: 'maillotDvg_2023',
    name: 'MAILLOT 2023',
    priceCents: 3990,
    sizes: TEXTILE_SIZES,
    descKey: 'detailsMaillot2023',
    images: {
      front: 'assets/img/shop/2023_maillot_front_light.png',
      back: 'assets/img/shop/2023_maillot_back_light.png',
    },
    active: true,
  },
  {
    id: 'tShirtMenpo_2023',
    name: 'T-SHIRT MENPŌ',
    priceCents: 2199,
    sizes: TEXTILE_SIZES,
    descKey: 'detailsMenpoTShirt',
    images: {
      front: 'assets/img/shop/2023_TShirt_front_Menpo_light.png',
      back: 'assets/img/shop/2023_TShirt_back_global_light.png',
    },
    active: true,
  },
  {
    id: 'tShirtYinYang_2023',
    name: 'T-SHIRT YIN YANG',
    priceCents: 2199,
    sizes: TEXTILE_SIZES,
    descKey: 'detailsYinYangTshirt',
    images: {
      front: 'assets/img/shop/2023_TShirt_front_YinYang_light.png',
      back: 'assets/img/shop/2023_TShirt_back_global_light.png',
    },
    active: true,
  },
  {
    id: 'tShirtKanji_2023',
    name: 'T-SHIRT KANJI',
    priceCents: 2199,
    sizes: TEXTILE_SIZES,
    descKey: 'detailsKanjiTshirt',
    images: {
      front: 'assets/img/shop/2023_TShirt_front_Kanji_light.png',
      back: 'assets/img/shop/2023_TShirt_back_global_light.png',
    },
    active: true,
  },
  {
    id: 'hoodieYinYang_2023',
    name: 'HOODIE YIN YANG',
    priceCents: 4250,
    sizes: TEXTILE_SIZES,
    descKey: 'detailsHoodieYinYang',
    images: {
      front: 'assets/img/shop/2023_hoodie_front_YinYang_light.png',
      back: 'assets/img/shop/2023_hoodie_back_YinYang_light.png',
    },
    active: true,
  },
  {
    id: 'hoodieSnake_2023',
    name: 'HOODIE SNAKE',
    priceCents: 4250,
    sizes: TEXTILE_SIZES,
    descKey: 'detailsHoodieSnake',
    images: {
      front: 'assets/img/shop/2023_hoodie_front_Snake_light.png',
      back: 'assets/img/shop/2023_hoodie_back_Snake_light.png',
    },
    active: true,
  },
  {
    id: 'hoodieMenpo_2023',
    name: 'HOODIE MENPŌ',
    priceCents: 4250,
    sizes: TEXTILE_SIZES,
    descKey: 'detailsHoodieMenpo',
    images: {
      front: 'assets/img/shop/2023_hoodie_front_Menpo_light.png',
      back: 'assets/img/shop/2023_hoodie_back_Menpo_light.png',
    },
    active: true,
  },
];

export function getActiveProducts(): ShopProduct[] {
  return SHOP_CATALOG.filter((product) => product.active);
}

export function findActiveProduct(id: string): ShopProduct | undefined {
  return SHOP_CATALOG.find((product) => product.id === id && product.active);
}
