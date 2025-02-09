import type Decimal from 'decimal.js';

export interface TableValue {
    cn: string;
    goodsList: Goods[];
    totalPrice: Decimal;
}

export interface Goods {
    name: string;
    price: Decimal;
    quantity: Decimal;
}