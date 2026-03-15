import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  FiMail, FiLock, FiEye, FiEyeOff, FiArrowLeft,
  FiKey, FiCheck, FiSend,
} from 'react-icons/fi';

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authAPI.forgotPassword({ email });
      toast.success(data.message);
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters');

    setLoading(true);
    try {
      const { data } = await authAPI.resetPassword({ email, code, newPassword });
      toast.success(data.message);
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // Step indicator
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-3 mb-8">
      {[1, 2].map((s) => (
        <div key={s} className="flex items-center gap-3">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300
            ${step >= s
              ? 'gradient-primary text-white shadow-glow-primary'
              : 'bg-dark-200 text-dark-400'
            }
          `}>
            {step > s ? <FiCheck size={14} /> : s}
          </div>
          {s < 2 && (
            <div className={`w-12 h-0.5 rounded-full transition-all duration-300 ${
              step > 1 ? 'bg-primary-500' : 'bg-dark-300'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 pt-24">
      <div className="card w-full max-w-md p-8 animate-scale-in">
        {/* Back */}
        <Link to="/login" className="btn-ghost mb-6 text-sm -ml-2">
          <FiArrowLeft size={16} />
          Back to Login
        </Link>

        {/* Header */}
        <div className="text-center mb-2">
          <div className="inline-flex items-center justify-center w-14 h-14 gradient-primary rounded-2xl mb-4 shadow-glow-primary">
            <FiKey className="text-white" size={26} />
          </div>
          <h1 className="text-2xl font-bold gradient-text-primary">
            Reset Password
          </h1>
          <p className="text-dark-400 mt-2 text-sm">
            {step === 1
              ? 'Enter your email to receive a reset code'
              : 'Enter the code and your new password'}
          </p>
        </div>

        <StepIndicator />

        {step === 1 ? (
          <form onSubmit={handleSendCode} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-dark-500 mb-2">
                Email Address
              </label>
              <div className="relative">
                <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-11"
                  placeholder="Enter your email"
                  required
                  autoFocus
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 font-semibold">
              {loading ? (
                <div className="spinner" />
              ) : (
                <>
                  <FiSend size={16} />
                  Send Reset Code
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-5">
            {/* Reset Code */}
            <div>
              <label className="block text-sm font-medium text-dark-500 mb-2">
                Reset Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="input-field text-center text-2xl tracking-[0.5em] font-mono font-bold"
                placeholder="000000"
                maxLength={6}
                required
                autoFocus
                inputMode="numeric"
              />
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-dark-500 mb-2">
                New Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field pl-11 pr-11"
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors-fast"
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-dark-500 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field pl-11"
                  placeholder="Confirm new password"
                  required
                />
              </div>
            </div>

            {/* Match indicator */}
            {confirmPassword && newPassword === confirmPassword && (
              <div className="flex items-center gap-1.5 text-green-400 text-xs">
                <FiCheck size={14} />
                <span>Passwords match</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 font-semibold">
              {loading ? (
                <div className="spinner" />
              ) : (
                <>
                  <FiCheck size={16} />
                  Reset Password
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-secondary w-full"
            >
              Use Different Email
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;

