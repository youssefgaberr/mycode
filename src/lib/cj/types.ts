/**
 * Shapes of the CJ API responses we use. CJ is inconsistent about number vs
 * string fields, so numeric fields are typed `number | string` and parsed
 * with `num()` in catalog.ts.
 */

type Num = number | string | null | undefined;

export interface CjListProduct {
  id: string;
  nameEn?: string;
  sku?: string;
  bigImage?: string;
  sellPrice?: Num;
  nowPrice?: Num;
  listedNum?: Num;
  isVideo?: Num;
  warehouseInventoryNum?: Num;
  deliveryCycle?: string;
  threeCategoryName?: string;
  supplierName?: string;
}

export interface CjListV2Data {
  content?: { productList?: CjListProduct[] }[];
  totalRecords?: number;
}

export interface CjVariantInventory {
  countryCode: string;
  totalInventory?: Num;
  cjInventory?: Num;
  factoryInventory?: Num;
}

export interface CjVariant {
  vid: string;
  pid?: string;
  variantNameEn?: string | null;
  variantSku?: string;
  variantKey?: string | null;
  variantImage?: string | null;
  variantLength?: Num;
  variantWidth?: Num;
  variantHeight?: Num;
  variantWeight?: Num;
  variantSellPrice?: Num;
  inventories?: CjVariantInventory[];
}

export interface CjProductDetail {
  pid: string;
  productNameEn?: string;
  productSku?: string;
  bigImage?: string;
  productImageSet?: string[];
  productImage?: string;
  productWeight?: Num;
  packingWeight?: Num;
  productKeyEn?: string;
  materialNameEn?: string;
  materialNameEnSet?: string[];
  sellPrice?: Num;
  description?: string;
  status?: string;
  productVideo?: string[];
  variants?: CjVariant[];
}

export interface CjInventoryByPid {
  inventories?: { countryCode: string; totalInventoryNum?: Num }[];
  variantInventories?: { vid: string; inventory?: CjVariantInventory[] }[];
}

export interface CjVideo {
  id?: string;
  videoId?: string;
  videoUrl?: string;
  videoState?: string;
  videoType?: number;
}

export interface CjFreightOption {
  logisticAging?: string;
  logisticPrice?: Num;
  logisticName?: string;
  totalPostageFee?: Num;
}

export interface CjOrderCreateRequest {
  orderNumber: string;
  shippingZip?: string;
  shippingCountryCode: string;
  shippingCountry: string;
  shippingProvince: string;
  shippingCity: string;
  shippingPhone?: string;
  shippingCustomerName: string;
  shippingAddress: string;
  shippingAddress2?: string;
  remark?: string;
  logisticName: string;
  fromCountryCode: string;
  /** 3 = create the order only; you pay for it yourself in CJ (no automatic spending). */
  payType: 3;
  /** 1 = sandbox order (no real charge, no real shipment). */
  isSandbox: 0 | 1;
  platform?: string;
  products: { vid: string; quantity: number; storeLineItemId?: string }[];
}

export interface CjOrderCreateResult {
  orderId?: string;
  orderNumber?: string;
  shipmentOrderId?: string;
  orderAmount?: Num;
  productAmount?: Num;
  postageAmount?: Num;
  actualPayment?: Num;
  orderStatus?: string;
  logisticsMiss?: boolean | string;
  interceptOrderReasons?: { code?: number; message?: string }[];
}

export interface CjOrderDetail {
  orderId: string;
  orderNum?: string;
  cjOrderId?: string | null;
  orderStatus?: string;
  subStatus?: string | null;
  orderAmount?: Num;
  logisticName?: string | null;
  trackNumber?: string | null;
  trackingUrl?: string | null;
  trackingProvider?: string | null;
  isSandbox?: number;
}
