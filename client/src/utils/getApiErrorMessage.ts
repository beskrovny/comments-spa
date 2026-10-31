import axios from "axios";

export function getApiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error
      ? error.message
      : "Произошла неизвестная ошибка.";
  }

  const responseData = error.response?.data;

  if (responseData && typeof responseData === "object") {
    const message = responseData.message;

    if (Array.isArray(message)) {
      return message.join(". ");
    }

    if (typeof message === "string") {
      if (message === "File too large") {
        return "Размер одного файла не должен превышать 5 MB.";
      }

      return message;
    }
  }

  if (error.response?.status === 413) {
    return "Размер загружаемого файла превышает допустимый лимит.";
  }

  return error.message || "Не удалось отправить комментарий.";
}
