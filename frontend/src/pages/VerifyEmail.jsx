import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiCheck, FiRefreshCw, FiShield, FiArrowLeft } from 'react-icons/fi';

const VerifyEmail = () => {
  const { user, verifyEmail, resendVerification, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(120);
  const inputRefs = useRef([]);

  const userId = location.state?.userId;
  const email = location.state?.email || user?.email || '';

  useEffect(() => {
    if (!userId && !user) navigate('/login');
  }, [userId, user, navigate]);

  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
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
      return;
    }
    const newOtp = [...otp];
    newOtp[index] = value.replace(/\D/g, '');
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0)
      inputRefs.current[index - 1]?.focus();
    if (e.key === 'Enter') handleVerify();
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) return;
    setLoading(true);
    const result = await verifyEmail(code, userId);
    setLoading(false);
    if (result.success) {
      navigate('/');
    } else {
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResendLoading(true);
    const result = await resendVerification(userId);
    setResendLoading(false);
    if (result.success) {
      setCountdown(120);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const maskEmail = (email) => {
    if (!email) return '';
    const [local, domain] = email.split('@');
    return local.length <= 3
      ? `${local}***@${domain}`
      : `${local.slice(0, 3)}***@${domain}`;
  };

  const formatCountdown = (s) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return min > 0 ? `${min}:${sec.toString().padStart(2, '0')}` : `${s}s`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-900">
      <div className="w-full max-w-md animate-scale-in">
        <div className="card p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 gradient-primary rounded-2xl mb-4 shadow-glow-primary">
              <FiMail className="text-white" size={30} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Verify Your Email
            </h1>
            <p className="text-dark-400">
              We've sent a 6-digit verification code to
            </p>
            <p className="text-primary-400 font-semibold mt-1.5 text-sm">
              {maskEmail(email)}
            </p>
          </div>

          {/* Info Box */}
          <div className="card p-4 mb-6 flex items-start gap-3 !border-primary-500/20 !bg-primary-500/5">
            <FiShield className="text-primary-400 mt-0.5 shrink-0" size={20} />
            <p className="text-sm text-dark-500">
              Please check your inbox and spam folder. The code will expire in <span className="font-semibold text-primary-400">10 minutes</span>.
            </p>
          </div>

          {/* OTP Input */}
          <form onSubmit={handleVerify}>
            <div className="flex justify-center gap-2 sm:gap-3 mb-6">
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

            {/* Verify Button */}
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
                  Verify Email
                </>
              )}
            </button>
          </form>

          {/* Resend Section */}
          <div className="text-center mt-6">
            <p className="text-dark-400 text-sm mb-2">
              Didn't receive the code?
            </p>
            {countdown > 0 ? (
              <p className="text-dark-400 text-sm">
                Resend code in{' '}
                <span className="text-primary-400 font-bold font-mono">
                  {formatCountdown(countdown)}
                </span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resendLoading}
                className="text-primary-400 hover:text-primary-300 font-medium flex items-center justify-center gap-2 mx-auto transition-colors-fast text-sm"
              >
                {resendLoading ? (
                  <div className="spinner spinner-sm spinner-primary" />
                ) : (
                  <FiRefreshCw size={16} />
                )}
                Resend verification code
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dark-200/50" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 text-sm text-dark-400 bg-dark-100">or</span>
            </div>
          </div>

          {/* Use Different Account */}
          <button onClick={handleLogout} className="btn-secondary w-full py-3">
            <FiArrowLeft size={16} />
            Use a different account
          </button>
        </div>

        {/* Help Text */}
        <p className="text-center text-dark-400 text-xs mt-6">
          Having trouble?{' '}
          <a
            href="mailto:support@engagespot.com"
            className="text-primary-400 hover:text-primary-300 font-medium transition-colors-fast"
          >
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;

