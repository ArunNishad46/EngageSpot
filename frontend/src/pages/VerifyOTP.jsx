import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiShield, FiCheck, FiRefreshCw } from 'react-icons/fi';

const VerifyOTP = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(120);
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { verify2FA } = useAuth();

  const type = location.state?.type || 'verify';
  const userId = location.state?.userId;

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleChange = (index, value) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((d, i) => { if (index + i < 6) newOtp[index + i] = d; });
      setOtp(newOtp);
      inputRefs.current[Math.min(index + digits.length, 5)]?.focus();
    } else {
      const newOtp = [...otp];
      newOtp[index] = value.replace(/\D/g, '');
      setOtp(newOtp);
      if (value && index < 5) inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0)
      inputRefs.current[index - 1]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) return toast.error('Please enter the complete code');

    setLoading(true);
    try {
      if (type === '2fa') {
        const result = await verify2FA(code);
        if (result.success) navigate('/');
      } else {
        const { data } = await authAPI.verifyEmail({ code, userId });
        toast.success(data.message);
        navigate('/');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Verification failed');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      if (type === 'verify') {
        const { data } = await authAPI.resendVerification();
        toast.success(data.message);
      }
      setCountdown(120);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend code');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 pt-24">
      <div className="card w-full max-w-md p-8 animate-scale-in">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="btn-ghost mb-6 text-sm -ml-2"
        >
          <FiArrowLeft size={16} />
          Back
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 gradient-primary rounded-2xl mb-4 shadow-glow-primary">
            <FiShield className="text-white" size={26} />
          </div>
          <h1 className="text-2xl font-bold gradient-text-primary">
            {type === '2fa' ? 'Two-Factor Authentication' : 'Verify Email'}
          </h1>
          <p className="text-dark-400 mt-2">
            Enter the 6-digit code sent to your email
          </p>
        </div>

        {/* OTP Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-2 sm:gap-3">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={`
                  w-11 h-14 sm:w-12 sm:h-14 text-center text-2xl font-bold
                  bg-dark-200 border-2 rounded-xl text-white
                  focus:outline-none transition-all duration-200
                  ${digit
                    ? 'border-primary-500 ring-2 ring-primary-500/20'
                    : 'border-dark-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
                  }
                `}
                disabled={loading}
                autoComplete="off"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || otp.some((d) => !d)}
            className="btn-primary w-full py-3 text-base font-semibold"
          >
            {loading ? (
              <div className="spinner" />
            ) : (
              <>
                <FiCheck size={18} />
                Verify
              </>
            )}
          </button>
        </form>

        {/* Resend */}
        <div className="text-center mt-6">
          {countdown > 0 ? (
            <p className="text-dark-400 text-sm">
              Resend code in{' '}
              <span className="text-primary-400 font-bold font-mono">{countdown}s</span>
            </p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resendLoading}
              className="text-primary-400 hover:text-primary-300 font-medium text-sm flex items-center justify-center gap-2 mx-auto transition-colors-fast"
            >
              {resendLoading ? (
                <div className="spinner spinner-sm spinner-primary" />
              ) : (
                <FiRefreshCw size={14} />
              )}
              Didn't receive code? Resend
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;

