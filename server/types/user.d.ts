export interface IUser {
    _id?: string;
    name: string;
    email: string;
    age: number;
    createdAt?: Date;
}

export interface ICreateUserDto {
    name: string;
    email: string;
    age: number;
}

export interface IUpdateUserDto {
    name?: string;
    email?: string;
    age?: number;
}