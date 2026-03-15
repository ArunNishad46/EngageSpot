import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiUserPlus, FiCheck } from 'react-icons/fi';

const InputField = ({ label, name, value, onChange, type = 'text', icon: Icon, placeholder, showToggle, toggleState, onToggle, error }) => (
  <div>
    <label className="block text-sm font-medium text-dark-500 mb-2">
      {label}
    </label>
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" size={18} />
      <input
        type={showToggle ? (toggleState ? 'text' : 'password') : type}
        name={name}
        value={value}
        onChange={onChange}
        className={`input-field pl-11 ${showToggle ? 'pr-11' : ''} ${error ? 'input-field-error' : ''}`}
        placeholder={placeholder}
        autoComplete={name === 'email' ? 'email' : name === 'name' ? 'name' : 'new-password'}
      />
      {showToggle && (
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors-fast"
          aria-label={toggleState ? 'Hide password' : 'Show password'}
        >
          {toggleState ? <FiEyeOff size={18} /> : <FiEye size={18} />}
        </button>
      )}
    </div>
    {error && (
      <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
        <span className="w-1 h-1 bg-red-400 rounded-full" />
        {error}
      </p>
    )}
  </div>
);

const Register = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Name is required';
    else if (formData.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    if (!formData.email.trim()) errs.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) errs.email = 'Please enter a valid email';
    if (!formData.password) errs.password = 'Password is required';
    else if (formData.password.length < 8) errs.password = 'Password must be at least 8 characters';
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password))
      errs.password = 'Must contain uppercase, lowercase, and number';
    if (!formData.confirmPassword) errs.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const getPasswordStrength = () => {
    const p = formData.password;
    if (!p) return { level: 0, label: '', color: '' };
    let score = 0;
    if (p.length >= 8) score++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^a-zA-Z\d]/.test(p)) score++;
    if (p.length >= 12) score++;
    if (score <= 1) return { level: 1, label: 'Weak', color: 'bg-red-500' };
    if (score <= 2) return { level: 2, label: 'Fair', color: 'bg-yellow-500' };
    if (score <= 3) return { level: 3, label: 'Good', color: 'bg-blue-500' };
    return { level: 4, label: 'Strong', color: 'bg-green-500' };
  };

  const strength = getPasswordStrength();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const result = await register({
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
    });
    setLoading(false);
    if (result.success) {
      navigate('/verify-email', {
        state: {
          email: formData.email.trim().toLowerCase(),
          userId: result.userId,
          fromRegister: true,
        },
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 pt-24">
      <div className="card w-full max-w-md p-8 animate-scale-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 gradient-primary rounded-2xl mb-4 shadow-glow-primary">
            <FiUserPlus className="text-white" size={26} />
          </div>
          <h1 className="text-3xl font-bold gradient-text-primary">Create Account</h1>
          <p className="text-dark-400 mt-2">Join EngageSpot today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            icon={FiUser}
            placeholder="Enter your full name"
            error={errors.name}
          />

          <InputField
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            icon={FiMail}
            placeholder="Enter your email"
            error={errors.email}
          />

          <div>
            <InputField
              label="Password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              icon={FiLock}
              placeholder="Create a password"
              showToggle
              toggleState={showPassword}
              onToggle={() => setShowPassword(!showPassword)}
              error={errors.password}
            />
            {formData.password && (
              <div className="mt-2.5 space-y-1.5">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        i <= strength.level ? strength.color : 'bg-dark-300/50'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-dark-400">
                  Strength: <span className={`font-medium ${
                    strength.level <= 1 ? 'text-red-400'
                      : strength.level <= 2 ? 'text-yellow-400'
                      : strength.level <= 3 ? 'text-blue-400'
                      : 'text-green-400'
                  }`}>{strength.label}</span>
                </p>
              </div>
            )}
          </div>

          <InputField
            label="Confirm Password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            icon={FiLock}
            placeholder="Confirm your password"
            showToggle
            toggleState={showConfirmPassword}
            onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
            error={errors.confirmPassword}
          />

          {formData.confirmPassword && formData.password === formData.confirmPassword && (
            <div className="flex items-center gap-1.5 text-green-400 text-xs">
              <FiCheck size={14} />
              <span>Passwords match</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-base font-semibold mt-2"
          >
            {loading ? <div className="spinner" /> : <><FiUserPlus size={18} /> Create Account</>}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-dark-200/50" />
          </div>
          <div className="relative flex justify-center">
            <span className="px-4 text-sm text-dark-400 bg-dark-100">or</span>
          </div>
        </div>

        <p className="text-center text-dark-400 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 font-semibold transition-colors-fast">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

