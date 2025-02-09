import Decimal from 'decimal.js';

export class TableValue {
    cn: string;
    goodsList: Goods[];

    constructor(cn: string, goodsList: Goods[]) {
        this.cn = cn;
        this.goodsList = goodsList;
    }

    get totalPrice() {
        return this.goodsList.reduce((previousValue, currentValue) => {
            return previousValue.plus(currentValue.price.mul(currentValue.quantity));
        }, new Decimal(0));
    }

    addGoodsList(goodsList: Goods[]) {
        this.goodsList = this.goodsList.concat(goodsList);
    }
}

export interface Goods {
    name: string;
    price: Decimal;
    quantity: Decimal;
}