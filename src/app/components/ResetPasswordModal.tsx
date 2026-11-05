import { useEffect, useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import { apiClient } from "../api/client";
import { isPasswordValid, validatePassword } from "../utils/passwordValidation";

interface ResetPasswordModalProps {
  isOpen: boolean;
  email: string;
  onClose: () => void;
}

type ResetStep = "verify" | "password" | "success";

export default function ResetPasswordModal({ isOpen, email, onClose }: ResetPasswordModalProps) {
  const [step, setStep] = useState<ResetStep>("verify");
  const [verificationCode, setVerificationCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const checks = validatePassword(newPassword);
  const passwordIsValid = isPasswordValid(checks);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  useEffect(() => {
    if (!isOpen) return;
    setStep("verify");
    setVerificationCode("");
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setStatus(null);
  }, [isOpen, email]);

  if (!isOpen) return null;

  const verifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(verificationCode)) {
      setStatus({ type: "error", msg: "Enter the 6-digit verification code sent to your email." });
      return;
    }

    setIsLoading(true);
    setStatus(null);
    try {
      const response = await apiClient.post("/verify-reset-code", {
        email,
        otp_code: verificationCode,
      });
      setResetToken(response.data.reset_token);
      setStep("password");
    } catch (error: any) {
      setStatus({ type: "error", msg: error.response?.data?.detail || "The verification code could not be confirmed." });
    } finally {
      setIsLoading(false);
    }
  };

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!passwordIsValid) {
      setStatus({ type: "error", msg: "Please meet all password requirements." });
      return;
    }
    if (!passwordsMatch) {
      setStatus({ type: "error", msg: "New passwords do not match." });
      return;
    }

    setIsLoading(true);
    setStatus(null);
    try {
      await apiClient.post("/update-password", {
        email,
        reset_token: resetToken,
        new_password: newPassword,
      });
      setStep("success");
      setStatus({ type: "success", msg: "Your password was updated successfully. You can now sign in." });
    } catch (error: any) {
      const message = error.response?.data?.detail || "Failed to update password.";
      setStatus({ type: "error", msg: message });
      if (message.toLowerCase().includes("reset session")) {
        setResetToken("");
        setStep("verify");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    if (!isLoading) onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="reset-password-title">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
          <div>
            <h3 id="reset-password-title" className="text-lg font-semibold text-gray-900">
              {step === "verify" ? "Verify your identity" : step === "password" ? "Create a new password" : "Password updated"}
            </h3>
            <p className="mt-1 break-all text-sm text-gray-500">{email}</p>
          </div>
          <button type="button" onClick={closeModal} disabled={isLoading} aria-label="Close password reset" className="cursor-pointer rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6">
          {status && (
            <p role={status.type === "error" ? "alert" : "status"} className={`mb-4 text-sm ${status.type === "success" ? "text-gray-700" : "text-red-600"}`}>{status.msg}</p>
          )}

          {step === "verify" && (
            <form onSubmit={verifyCode} className="space-y-5">
              <p className="text-sm leading-relaxed text-gray-600">Enter the six-digit code sent to your registered email. You can create a new password after the code is verified.</p>
              <div>
                <label htmlFor="reset-code" className="mb-2 block text-sm font-medium text-gray-700">Verification code</label>
                <input id="reset-code" type="text" inputMode="numeric" autoComplete="one-time-code" required maxLength={6} autoFocus value={verificationCode}
                  onChange={(event) => { setStatus(null); setVerificationCode(event.target.value.replace(/\D/g, "")); }}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-lg font-semibold tracking-[0.35em] text-gray-900 outline-none focus:border-gray-500"
                  placeholder="000000" />
              </div>
              <button type="submit" disabled={isLoading || verificationCode.length !== 6} className="h-10 w-full cursor-pointer rounded-lg bg-[#DD7230] text-sm font-medium text-white hover:bg-[#c66224] disabled:cursor-not-allowed disabled:opacity-50">
                {isLoading ? "Verifying…" : "Verify code"}
              </button>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={updatePassword} className="space-y-5">
              <p className="text-sm text-gray-600">Your code was verified. Create a new password below.</p>
              <PasswordInput id="new-reset-password" label="New password" value={newPassword} visible={showPassword} onVisibility={() => setShowPassword((value) => !value)} onChange={(value) => { setStatus(null); setNewPassword(value); }} autoFocus />

              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">Password requirements</p>
                <div className="space-y-1">
                  <Requirement valid={checks.length} text="8+ characters" />
                  <Requirement valid={checks.uppercase} text="Uppercase letter" />
                  <Requirement valid={checks.number} text="Number" />
                  <Requirement valid={checks.special} text="Special character" />
                </div>
              </div>

              <PasswordInput id="confirm-reset-password" label="Confirm new password" value={confirmPassword} visible={showConfirmPassword} onVisibility={() => setShowConfirmPassword((value) => !value)} onChange={(value) => { setStatus(null); setConfirmPassword(value); }} />
              {confirmPassword.length > 0 && (
                <p className={`text-sm ${passwordsMatch ? "text-gray-600" : "text-red-600"}`}>
                  {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                </p>
              )}
              <button type="submit" disabled={isLoading || !passwordIsValid || !passwordsMatch} className="h-10 w-full cursor-pointer rounded-lg bg-[#DD7230] text-sm font-medium text-white hover:bg-[#c66224] disabled:cursor-not-allowed disabled:opacity-50">
                {isLoading ? "Updating…" : "Update password"}
              </button>
            </form>
          )}

          {step === "success" && (
            <div>
              <p className="mb-5 text-sm text-gray-600">Use your new password the next time you sign in.</p>
              <button type="button" onClick={closeModal} className="h-10 w-full cursor-pointer rounded-lg bg-[#DD7230] text-sm font-medium text-white hover:bg-[#c66224]">Return to sign in</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PasswordInput({ id, label, value, visible, onVisibility, onChange, autoFocus = false }: { id: string; label: string; value: string; visible: boolean; onVisibility: () => void; onChange: (value: string) => void; autoFocus?: boolean }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <input id={id} type={visible ? "text" : "password"} autoComplete="new-password" required autoFocus={autoFocus} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-gray-300 py-2.5 pl-3 pr-16 text-sm text-gray-900 outline-none focus:border-gray-500" placeholder="Enter new password" />
        <button type="button" onClick={onVisibility} aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-gray-500 hover:text-gray-900">
          {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}

function Requirement({ valid, text }: { valid: boolean; text: string }) {
  return <p className={`text-sm ${valid ? "text-gray-900" : "text-gray-500"}`}>• {text}</p>;
}
