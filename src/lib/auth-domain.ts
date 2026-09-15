import { z } from "zod";

export const MIN_PASSWORD_LENGTH = 4;

export function normalizeIndianPhone(input: string): {
  success: boolean;
  e164?: string;
  error?: string;
} {
  if (!input || typeof input !== "string") {
    return { success: false, error: "Enter your phone number." };
  }
  const digits = input.replace(/\D/g, "");
  let tenDigits = digits;

  if (digits.length === 12 && digits.startsWith("91")) {
    tenDigits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    tenDigits = digits.slice(1);
  }

  if (tenDigits.length !== 10 || !/^[6-9]\d{9}$/.test(tenDigits)) {
    return { success: false, error: "Enter a valid 10-digit Indian mobile number." };
  }

  return { success: true, e164: `+91${tenDigits}` };
}

export function validatePassword(password: string): { success: boolean; error?: string } {
  if (!password || typeof password !== "string") {
    return { success: false, error: "Enter your password." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      success: false,
      error: `Use a password with at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  return { success: true };
}

export function maskPhone(e164OrPhone: string): string {
  const normalized = normalizeIndianPhone(e164OrPhone);
  const target = normalized.success && normalized.e164 ? normalized.e164 : e164OrPhone;
  if (target.length < 4) return target;
  const last4 = target.slice(-4);
  return `******${last4}`;
}

export const registerSchema = z
  .object({
    phone: z.string().min(1, "Enter your phone number."),
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Use a password with at least ${MIN_PASSWORD_LENGTH} characters.`),
    confirmPassword: z.string().min(1, "Confirm your password."),
    displayName: z.string().trim().max(80).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  phone: z.string().min(1, "Enter your phone number."),
  password: z.string().min(1, "Enter your password."),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(1, "Enter your phone number."),
  token: z.string().trim().min(6, "Enter the 6-digit verification code.").max(6),
  type: z.enum(["signup", "recovery"]).default("signup"),
});

export const forgotPasswordSchema = z.object({
  phone: z.string().min(1, "Enter your phone number."),
});

export const resetPasswordSchema = z
  .object({
    phone: z.string().min(1, "Enter your phone number."),
    token: z.string().trim().min(6, "Enter the verification code."),
    newPassword: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Use a password with at least ${MIN_PASSWORD_LENGTH} characters.`),
    confirmNewPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match.",
    path: ["confirmNewPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Use a password with at least ${MIN_PASSWORD_LENGTH} characters.`),
    confirmNewPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match.",
    path: ["confirmNewPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
