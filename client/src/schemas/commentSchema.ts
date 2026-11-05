import { z } from "zod";
import { validateHtml } from "../utils/htmlValidator";

export const commentSchema = z.object({
  userName: z
    .string()
    .trim()
    .min(1, "Введите имя")
    .max(100, "Максимум 100 символов")
    .regex(
    /^[a-zA-Z0-9]+$/,
    "Имя должно содержать только латинские буквы и цифры",
    ),
    
  email: z
    .string()
    .trim()
    .min(1, "Введите email")
    .email("Некорректный email")
    .max(254, "Максимум 254 символа"),

  homePage: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^https?:\/\/.+/i.test(value),
      "Введите корректный URL с http:// или https://",
    )
    .max(255, "Максимум 255 символов"),

  text: z
    .string()
    .trim()
    .min(1, "Введите текст комментария")
    .max(10000, "Максимум 10000 символов")
    .superRefine((value, ctx) => {
      const result = validateHtml(value);
      if (result.valid) return;
      ctx.addIssue({
        code: "custom",
        message: result.error || "Некорректный HTML в комментарии",
      });
    }),

  captchaId: z.string().min(1, "CAPTCHA не загружена"),

  captchaAnswer: z.string().min(1, "Введите проверочный код"),
});

export type CommentFormValues = z.infer<typeof commentSchema>;
