import { http } from './http';

export interface CaptchaResponse {
    id: string;
    image: string;
}

export async function getCaptcha(): Promise<CaptchaResponse> {
    const response = await http.get<CaptchaResponse>('/captcha');

    return response.data;
}