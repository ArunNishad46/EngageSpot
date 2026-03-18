import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FiGithub, FiLinkedin, FiMail, FiArrowRight, FiArrowLeft,
  FiMessageSquare, FiUsers, FiShield, FiZap, FiImage, FiVideo,
  FiMic, FiFile, FiSmile, FiCheck, FiExternalLink, FiHeart
} from 'react-icons/fi';

const teamMembers = [
  {
    name: 'Arun',
    role: 'Full Stack Developer (MERN)',
    image: '/arun-linkedin.png',
    bio: 'Building robust and secure backend systems.',
    github: 'https://github.com/arunnishad46',
    linkedin: 'https://www.linkedin.com/in/arun-nishad-8b94a3287',
    email: '1242arun@gmail.com',
  },
  {
    name: 'Bharat Gupta',
    role: 'Frontend Designer',
    image: '/bharat-gupta.jpeg',
    bio: 'Creating beautiful and intuitive user interfaces.',
    github: 'https://github.com/sarahwilson',
    linkedin: 'https://linkedin.com/in/sarahwilson',
    email: 'sarah@example.com',
  },
];

const features = [
  { icon: FiMessageSquare, title: 'Real-time Messaging', description: 'Instant message delivery with typing indicators and read receipts.' },
  { icon: FiUsers, title: 'Group Chats', description: 'Create groups, add members, and collaborate seamlessly.' },
  { icon: FiShield, title: 'Secure & Private', description: 'Two-factor authentication and secure password hashing.' },
  { icon: FiZap, title: 'Lightning Fast', description: 'Built with Socket.IO for real-time performance.' },
  { icon: FiImage, title: 'Image Sharing', description: 'Share photos with preview and cloud storage.' },
  { icon: FiVideo, title: 'Video Sharing', description: 'Send and receive video messages easily.' },
  { icon: FiMic, title: 'Voice Messages', description: 'Record and send audio messages on the fly.' },
  { icon: FiFile, title: 'File Sharing', description: 'Share documents, PDFs, and other files.' },
  { icon: FiSmile, title: 'Emoji Support', description: 'Express yourself with a full emoji picker.' },
];

const techStack = [
  { name: 'MongoDB', color: 'from-green-500 to-green-600' },
  { name: 'Express.js', color: 'from-gray-500 to-gray-700' },
  { name: 'React 19', color: 'from-blue-400 to-blue-600' },
  { name: 'Node.js', color: 'from-green-600 to-green-700' },
  { name: 'Socket.IO', color: 'from-gray-600 to-gray-800' },
  { name: 'Tailwind CSS', color: 'from-cyan-400 to-cyan-600' },
  { name: 'Cloudinary', color: 'from-blue-500 to-indigo-600' },
  { name: 'JWT Auth', color: 'from-purple-500 to-purple-700' },
  { name: 'Brevo Email', color: 'from-blue-600 to-blue-800' },
];

const About = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-900 pt-16">
      {/* Back Button (logged-in) */}
      {user && (
        <div className="fixed top-4 left-4 z-50">
          <Link to="/" className="btn-secondary shadow-lg hover-lift">
            <FiArrowLeft size={18} />
            <span>Back to Chats</span>
          </Link>
        </div>
      )}

      {/* ─── Hero Section ─── */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        {/* BG Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-600/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full text-sm font-medium text-primary-400 mb-8">
            <FiMessageSquare size={16} />
            <span>Real-time Chat Application</span>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Connect with Anyone,{' '}
            <span className="bg-gradient-to-r from-primary-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Anywhere
            </span>
          </h1>

          {/* Description */}
          <p className="text-lg md:text-xl text-dark-500 max-w-3xl mx-auto mb-10 leading-relaxed">
            EngageSpot is a modern, feature-rich messaging platform built with the MERN stack.
            Experience seamless real-time communication with our secure and intuitive application.
          </p>

          {/* CTA */}
          {!user && (
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/register"
                className="btn-primary px-8 py-4 text-base hover:scale-105 hover:shadow-glow-primary"
              >
                Get Started Free
                <FiArrowRight size={20} />
              </Link>
              <Link to="/login" className="btn-secondary px-8 py-4 text-base">
                Sign In
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ─── Features Section ─── */}
      <section className="py-20 bg-dark-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="section-header justify-center mb-4">
              <FiZap size={14} />
              Features
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Powerful Features
            </h2>
            <p className="text-dark-400 max-w-2xl mx-auto">
              Everything you need for seamless communication in one place
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, description }, index) => (
              <div
                key={index}
                className="group card card-hover p-6"
              >
                <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 group-hover:shadow-glow-primary transition-slow">
                  <Icon size={24} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {title}
                </h3>
                <p className="text-dark-400 text-sm leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Team Section ─── */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="section-header justify-center mb-4">
              <FiUsers size={14} />
              Team
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Meet Our Team
            </h2>
            <p className="text-dark-400 max-w-2xl mx-auto">
              The talented developers behind EngageSpot
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 place-items-center">
            {teamMembers.map((member, index) => (
              <div
                key={index}
                className="group card card-hover w-full max-w-sm p-8 text-center"
              >
                {/* Avatar */}
                <div className="relative w-28 h-28 mx-auto mb-5">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full rounded-2xl object-cover ring-4 ring-dark-200 group-hover:ring-primary-500/50 transition-slow shadow-lg"
                  />
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-500 rounded-full border-3 border-dark-100 flex items-center justify-center shadow-glow-green">
                    <FiCheck size={12} className="text-white" />
                  </div>
                </div>

                {/* Info */}
                <h3 className="text-lg font-bold text-white mb-1">
                  {member.name}
                </h3>
                <p className="text-primary-400 font-medium text-sm mb-2">
                  {member.role}
                </p>
                <p className="text-dark-400 text-sm mb-5 line-clamp-2">
                  {member.bio}
                </p>

                {/* Social */}
                <div className="flex justify-center gap-2">
                  {[
                    { href: member.github, icon: FiGithub, hover: 'hover:bg-white hover:text-gray-900' },
                    { href: member.linkedin, icon: FiLinkedin, hover: 'hover:bg-blue-600 hover:text-white' },
                    { href: `mailto:${member.email}`, icon: FiMail, hover: 'hover:bg-red-500 hover:text-white' },
                  ].map(({ href, icon: SocialIcon, hover }, i) => (
                    <a
                      key={i}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`btn-ghost p-2.5 !bg-dark-200 !text-dark-400 !rounded-xl ${hover} transition-all duration-200`}
                    >
                      <SocialIcon size={18} />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Tech Stack Section ─── */}
      <section className="py-20 bg-dark-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="section-header justify-center mb-4">
              <FiExternalLink size={14} />
              Stack
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Built With Modern Tech
            </h2>
            <p className="text-dark-400 max-w-2xl mx-auto">
              Powered by cutting-edge technologies for the best experience
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {techStack.map((tech, index) => (
              <div
                key={index}
                className={`
                  px-5 py-2.5 bg-gradient-to-r ${tech.color}
                  text-white rounded-full font-medium text-sm
                  shadow-lg hover:scale-110 hover:shadow-xl
                  transition-slow cursor-default select-none
                `}
              >
                {tech.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Section ─── */}
      {!user && (
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="relative overflow-hidden rounded-3xl p-10 md:p-16 shadow-2xl">
              {/* BG Gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-purple-600" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]" />

              <div className="relative">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Ready to Start Chatting?
                </h2>
                <p className="text-white/80 mb-8 max-w-xl mx-auto leading-relaxed">
                  Join thousands of users who are already enjoying seamless communication with EngageSpot.
                </p>
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-primary-600 rounded-xl font-semibold shadow-xl hover:shadow-2xl hover:scale-105 transition-slow"
                >
                  Create Free Account
                  <FiArrowRight size={20} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── Footer ─── */}
      <footer className="py-8 border-t border-dark-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center shadow-sm">
                <FiMessageSquare className="text-white" size={16} />
              </div>
              <span className="font-bold gradient-text-primary">EngageSpot</span>
            </div>

            {/* Copyright */}
            <p className="flex items-center gap-1 text-dark-400 text-sm text-center">
              © {new Date().getFullYear()} EngageSpot. Built with <FiHeart className='gradient-primary animate-pulse' /> by our amazing team.
            </p>

            {/* Links */}
            {!user && (
              <div className="flex gap-4">
                <Link to="/login" className="text-dark-400 hover:text-primary-400 text-sm transition-colors-fast font-medium">
                  Sign In
                </Link>
                <Link to="/register" className="text-dark-400 hover:text-primary-400 text-sm transition-colors-fast font-medium">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default About;

