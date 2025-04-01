// types/response.ts
interface ResponseData {
    code: number;
    data: any;
    message: string;
}

// utils/response.ts
export const success = (data: any, message = 'success', code = 200): ResponseData => ({
    code,
    data,
    message,
});

export const error = (data: any, message = 'error', code = 500): ResponseData => ({
    code,
    data,
    message,
});